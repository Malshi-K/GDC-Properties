// Enhanced AdminUsersTab with GlobalDataContext integration
"use client";
import { useState, useEffect } from 'react';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function AdminUsersTab({ onUpdateRole, onRefresh }) {
  const { user } = useAuth();
  const { fetchData, updateData, invalidateCache } = useGlobalData();
  const [users, setUsers] = useState([]);
  const [updating, setUpdating] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cache keys for different data types
  const CACHE_KEYS = {
    PROFILES: 'admin_users_profiles',
    AUTH_USERS: 'admin_users_auth',
    COMBINED_USERS: 'admin_users_combined'
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Enhanced fetch users function using GlobalDataContext
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('=== FETCHING USERS WITH GLOBAL DATA CONTEXT ===');
      
      // Try to get cached combined users first - FIX: Check the actual cached data structure
      let cachedUsers = null;
      try {
        cachedUsers = await fetchData(
          { _cached_key: CACHE_KEYS.COMBINED_USERS },
          { useCache: true }
        );
        
        // Check if cached data is valid and not empty
        if (cachedUsers && Array.isArray(cachedUsers) && cachedUsers.length > 0) {
          console.log(`✅ Using cached users data: ${cachedUsers.length} users`);
          setUsers(cachedUsers);
          setIsLoading(false);
          return;
        } else {
          console.log('📦 Cached data is empty or invalid, fetching fresh data');
        }
      } catch (cacheError) {
        console.log('🔍 No cache found, proceeding with fresh fetch');
      }

      // Fetch profiles data using GlobalDataContext
      console.log('🔄 Fetching profiles from database...');
      const profilesData = await fetchData({
        table: 'profiles',
        select: '*',
        filters: {}, // Empty filters object
        orderBy: { column: 'created_at', ascending: false }
      }, {
        useCache: true,
        ttl: 5 * 60 * 1000, // 5 minutes cache
        onError: (error) => {
          console.error('Failed to fetch profiles:', error);
          setError(`Failed to fetch profiles: ${error.message}`);
        }
      });

      console.log('📊 Profiles data received:', profilesData);

      if (!profilesData || !Array.isArray(profilesData) || profilesData.length === 0) {
        console.log('❌ No profiles found in database');
        setUsers([]);
        setError('No user profiles found in the database');
        return;
      }

      console.log(`✅ Found ${profilesData.length} profiles`);

      // Try to get auth users data (may not be available in all environments)
      let authUsersData = null;
      
      try {
        console.log('🔐 Attempting to fetch auth users...');
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && authData?.users) {
          authUsersData = authData.users;
          console.log(`✅ Successfully fetched ${authUsersData.length} auth users`);
          
          // Cache auth users data
          updateData(CACHE_KEYS.AUTH_USERS, authUsersData);
        } else {
          console.log('⚠️ Auth admin query failed or not available:', authError);
        }
      } catch (authErr) {
        console.log('⚠️ Auth.admin.listUsers not available:', authErr);
      }

      // Combine the data
      let combinedUsers = [];

      if (authUsersData && Array.isArray(authUsersData)) {
        console.log('🔗 Combining auth and profile data...');
        combinedUsers = authUsersData.map(authUser => {
          const profile = profilesData.find(p => p.id === authUser.id);
          
          return {
            id: authUser.id,
            email: authUser.email,
            created_at: authUser.created_at,
            email_confirmed_at: authUser.email_confirmed_at,
            last_sign_in_at: authUser.last_sign_in_at,
            // Profile data
            full_name: profile?.full_name || null,
            phone: profile?.phone || null,
            address: profile?.address || null,
            role: profile?.role || 'property_seeker',
            profile_image_url: profile?.profile_image_url || null,
            preferences: profile?.preferences || null,
            // Helper fields
            has_profile: !!profile,
            profile_created_at: profile?.created_at || null,
            updated_at: profile?.updated_at || null,
          };
        });
      } else {
        console.log('📋 Using profiles data only (no auth data available)...');
        combinedUsers = profilesData.map(profile => ({
          id: profile.id,
          email: profile.email || `user-${profile.id?.slice(0, 8)}@system.local`,
          created_at: profile.created_at,
          email_confirmed_at: null,
          last_sign_in_at: null,
          // Profile data
          full_name: profile.full_name || null,
          phone: profile.phone || null,
          address: profile.address || null,
          role: profile.role || 'property_seeker',
          profile_image_url: profile.profile_image_url || null,
          preferences: profile.preferences || null,
          // Helper fields
          has_profile: true,
          profile_created_at: profile.created_at,
          updated_at: profile.updated_at || null,
        }));
      }

      console.log(`🎯 Final combined users (${combinedUsers.length}):`, combinedUsers);
      
      // Cache the combined users data
      updateData(CACHE_KEYS.COMBINED_USERS, combinedUsers);
      updateData(CACHE_KEYS.PROFILES, profilesData);
      
      setUsers(combinedUsers);
      
      if (combinedUsers.length === 0) {
        setError('No users found after combining data');
      } else {
        setError(null); // Clear any previous errors
      }
      
    } catch (error) {
      console.error('💥 Error in fetchUsers:', error);
      setError(`Unexpected error: ${error.message}`);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced role update function with proper database persistence
  const handleRoleUpdate = async (userId, newRole) => {
    console.log(`🚀 Starting role update for user ${userId} to ${newRole}`);
    setUpdating(userId);
    
    try {
      console.log(`🔄 Updating user ${userId} role to ${newRole}`);
      
      // First, try to check if profile exists
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id, role, updated_at')
        .eq('id', userId)
        .maybeSingle();

      console.log('📋 Existing profile check:', { existingProfile, selectError });

      let updatedProfile = null;
      let updateError = null;

      if (existingProfile) {
        // Profile exists, use UPDATE
        console.log('📝 Profile exists, using UPDATE...');
        const { data, error } = await supabase
          .from('profiles')
          .update({ 
            role: newRole,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();
        
        updatedProfile = data;
        updateError = error;
        console.log('📝 UPDATE result:', { data, error });
      } else {
        // Profile doesn't exist, use INSERT
        console.log('➕ Profile doesn\'t exist, using INSERT...');
        const { data, error } = await supabase
          .from('profiles')
          .insert({ 
            id: userId, 
            role: newRole,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        updatedProfile = data;
        updateError = error;
        console.log('➕ INSERT result:', { data, error });
      }

      // If UPDATE/INSERT failed, try UPSERT as fallback with better configuration
      if (updateError) {
        console.log('⚠️ UPDATE/INSERT failed, trying UPSERT fallback:', updateError);
        
        const { data, error } = await supabase
          .from('profiles')
          .upsert({ 
            id: userId, 
            role: newRole,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()
          .single();
        
        updatedProfile = data;
        updateError = error;
        console.log('🔄 UPSERT result:', { data, error });
      }

      if (updateError) {
        console.error('💥 All database update methods failed:', updateError);
        setError(`Database update failed: ${updateError.message}`);
        alert(`Failed to update user role: ${updateError.message}`);
        return; // Exit early, setUpdating(null) will be called in finally
      }

      console.log('✅ Database update successful:', updatedProfile);

      // Update local state
      const updatedUsers = users.map(u => 
        u.id === userId ? { 
          ...u, 
          role: newRole, 
          has_profile: true,
          updated_at: updatedProfile?.updated_at || new Date().toISOString()
        } : u
      );
      
      setUsers(updatedUsers);

      // Update cached data
      updateData(CACHE_KEYS.COMBINED_USERS, updatedUsers);
      
      // Invalidate related cache entries to ensure fresh data on next fetch
      invalidateCache('profiles');
      invalidateCache('admin_users');

      // Call the provided onUpdateRole callback if available
      if (onUpdateRole && typeof onUpdateRole === 'function') {
        try {
          await onUpdateRole(userId, newRole);
          console.log('📞 onUpdateRole callback completed successfully');
        } catch (callbackError) {
          console.warn('⚠️ onUpdateRole callback failed:', callbackError);
          // Don't throw here as the database update was successful
        }
      }

      console.log(`🎉 Successfully updated user ${userId} role to ${newRole}`);
      
      // Clear any previous errors
      setError(null);
      
    } catch (error) {
      console.error('💥 Error in handleRoleUpdate:', error);
      setError(`Failed to update user role: ${error.message}`);
      alert(`Failed to update user role: ${error.message}\n\nPlease check the console for more details.`);
    } finally {
      // This is crucial - always clear the updating state
      console.log(`🔓 Clearing updating state for user ${userId}`);
      setUpdating(null);
    }
  };

  // Refresh function that clears cache and refetches
  const handleRefresh = async () => {
    // Clear all user-related cache
    invalidateCache('admin_users');
    invalidateCache('profiles');
    
    // Call external refresh if provided
    if (onRefresh && typeof onRefresh === 'function') {
      onRefresh();
    }
    
    // Refetch data
    await fetchUsers();
  };

  // Test direct query function
  const testDirectQuery = async () => {
    console.log('=== TESTING DIRECT QUERY ===');
    
    try {
      const testData = await fetchData({
        table: 'profiles',
        select: 'id, full_name, role, created_at',
        limit: 5
      }, {
        useCache: false // Force fresh data for testing
      });
        
      console.log('Direct query test result:', testData);
    } catch (err) {
      console.error('Direct query test failed:', err);
    }
  };

  // Simple test role update function for debugging
  const testRoleUpdate = async () => {
    console.log('=== TESTING ROLE UPDATE ===');
    
    if (!user?.id) {
      console.error('No user ID available for testing');
      return;
    }

    try {
      console.log('Testing role update on current user:', user.id);
      
      // Get current role
      const { data: currentProfile, error: selectError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      console.log('Current profile:', { currentProfile, selectError });
      
      if (selectError) {
        console.error('Could not fetch current profile:', selectError);
        return;
      }

      // Try to update updated_at field (minimal change)
      const { data: updateResult, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();
      
      console.log('Update result:', { updateResult, updateError });
      
    } catch (error) {
      console.error('Test role update failed:', error);
    }
  };

  // Helper function to get role badge styling - standardized roles only
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': 
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'property_owner': 
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'property_seeker': 
        return 'bg-green-100 text-green-800 border border-green-200';
      default: 
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Helper function to get role display name - standardized roles only
  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin': 
        return 'Administrator';
      case 'property_owner': 
        return 'Property Owner';
      case 'property_seeker': 
        return 'Property Seeker';
      default: 
        return 'Property Seeker';
    }
  };

  // Helper function to check if user is property owner
  const isPropertyOwner = (role) => {
    return role === 'property_owner';
  };

  // Helper function to check if user is property seeker
  const isPropertySeeker = (role) => {
    return role === 'property_seeker' || !role;
  };

  // Filter users based on search and role filter
  const filteredUsers = users.filter(userItem => {
    const matchesSearch = 
      userItem.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesRole = filterRole === 'all';
    if (!matchesRole) {
      if (filterRole === 'property_owner') {
        matchesRole = isPropertyOwner(userItem.role);
      } else if (filterRole === 'property_seeker') {
        matchesRole = isPropertySeeker(userItem.role);
      } else {
        matchesRole = userItem.role === filterRole;
      }
    }
    
    return matchesSearch && matchesRole;
  });

  // Role statistics using standardized roles only
  const roleStats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    property_owner: users.filter(u => u.role === 'property_owner').length,
    property_seeker: users.filter(u => u.role === 'property_seeker' || !u.role).length,
  };

  return (
    <div className="space-y-6 text-custom-gray">
      {/* Header with Debug Tools */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-600">Manage user roles and permissions</p>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Users
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div className="sm:w-48">
            <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Role
            </label>
            <select
              id="roleFilter"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrators</option>
              <option value="property_owner">Property Owners</option>
              <option value="property_seeker">Property Seekers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{roleStats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Admins</p>
              <p className="text-2xl font-bold text-gray-900">{roleStats.admin}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Property Owners</p>
              <p className="text-2xl font-bold text-gray-900">{roleStats.property_owner}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Property Seekers</p>
              <p className="text-2xl font-bold text-gray-900">{roleStats.property_seeker}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Users ({filteredUsers.length})</h2>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {error ? 'Please check the error message above.' : 
               searchTerm || filterRole !== 'all' ? 'Try adjusting your search or filter criteria.' : 'No users have been created yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {userItem.full_name || 'No name provided'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {userItem.id?.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {userItem.email}
                      </div>
                      {userItem.email_confirmed_at && (
                        <div className="text-xs text-green-600">✓ Verified</div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(userItem.role || 'property_seeker')}`}>
                        {getRoleDisplayName(userItem.role || 'property_seeker')}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        {userItem.has_profile ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Profile Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⚠ No Profile
                          </span>
                        )}
                        {userItem.updated_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            Updated: {new Date(userItem.updated_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {userItem.role !== 'admin' ? (
                        <div className="flex space-x-2">
                          {!isPropertyOwner(userItem.role) && (
                            <button
                              onClick={() => handleRoleUpdate(userItem.id, 'property_owner')}
                              disabled={updating === userItem.id}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {updating === userItem.id ? 'Updating...' : 'Make Owner'}
                            </button>
                          )}
                          
                          {!isPropertySeeker(userItem.role) && (
                            <button
                              onClick={() => handleRoleUpdate(userItem.id, 'property_seeker')}
                              disabled={updating === userItem.id}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {updating === userItem.id ? 'Updating...' : 'Make Seeker'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-400">
                          <span className="text-xs">Administrator</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}