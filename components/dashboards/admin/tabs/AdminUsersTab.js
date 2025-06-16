// Simplified AdminUsersTab - now email is in profiles table
"use client";
import { useState, useEffect } from "react";
import { useGlobalData } from "@/contexts/GlobalDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function AdminUsersTab({ onUpdateRole, onRefresh }) {
  const { user } = useAuth();
  const { fetchData, updateData, invalidateCache } = useGlobalData();
  const [users, setUsers] = useState([]);
  const [updating, setUpdating] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cache key for users data
  const CACHE_KEY = "admin_users_with_email";

  useEffect(() => {
    fetchUsers();
  }, []);

  // Simplified fetch users function - now email is in profiles table
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("=== FETCHING USERS FROM PROFILES WITH EMAIL ===");

      // Try to get cached users first
      let cachedUsers = null;
      try {
        cachedUsers = await fetchData(
          { _cached_key: CACHE_KEY },
          { useCache: true }
        );

        if (
          cachedUsers &&
          Array.isArray(cachedUsers) &&
          cachedUsers.length > 0
        ) {
          console.log(
            `✅ Using cached users data: ${cachedUsers.length} users`
          );
          setUsers(cachedUsers);
          setIsLoading(false);
          return;
        }
      } catch (cacheError) {
        console.log("🔍 No cache found, proceeding with fresh fetch");
      }

      // Fetch all user data from profiles table (now includes email)
      console.log("🔄 Fetching users from profiles table...");
      const usersData = await fetchData(
        {
          table: "profiles",
          select: "*",
          filters: {},
          orderBy: { column: "created_at", ascending: false },
        },
        {
          useCache: true,
          ttl: 5 * 60 * 1000, // 5 minutes cache
          onError: (error) => {
            console.error("Failed to fetch users:", error);
            setError(`Failed to fetch users: ${error.message}`);
          },
        }
      );

      console.log("📊 Users data received:", usersData);

      if (!usersData || !Array.isArray(usersData) || usersData.length === 0) {
        console.log("❌ No users found in database");
        setUsers([]);
        setError("No users found in the database");
        return;
      }

      // Transform the data to match your component's expected format
      const processedUsers = usersData.map((profile) => ({
        id: profile.id,
        email: profile.email || `user-${profile.id?.slice(0, 8)}@system.local`,
        created_at: profile.created_at,
        email_confirmed_at: null, // This would need to come from auth.users if needed
        last_sign_in_at: null, // This would need to come from auth.users if needed
        // Profile data
        full_name: profile.full_name || null,
        phone: profile.phone || null,
        address: profile.address || null,
        role: profile.role || "property_seeker",
        profile_image_url: profile.profile_image_url || null,
        preferences: profile.preferences || null,
        // Helper fields
        has_profile: true, // Since we're getting data from profiles table
        profile_created_at: profile.created_at,
        updated_at: profile.updated_at || null,
      }));

      console.log(
        `🎯 Final processed users (${processedUsers.length}):`,
        processedUsers
      );

      // Cache the processed users data
      updateData(CACHE_KEY, processedUsers);

      setUsers(processedUsers);
      setError(null);
    } catch (error) {
      console.error("💥 Error in fetchUsers:", error);
      setError(`Failed to fetch users: ${error.message}`);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced role update function
  const handleRoleUpdate = async (userId, newRole) => {
    console.log(`🚀 Starting role update for user ${userId} to ${newRole}`);
    setUpdating(userId);

    try {
      console.log(`🔄 Updating user ${userId} role to ${newRole}`);

      // Update using direct Supabase query
      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (updateError) {
        console.error("💥 Database update failed:", updateError);
        setError(`Database update failed: ${updateError.message}`);
        alert(`Failed to update user role: ${updateError.message}`);
        return;
      }

      console.log("✅ Database update successful:", updatedProfile);

      // Update local state
      const updatedUsers = users.map((u) =>
        u.id === userId
          ? {
              ...u,
              role: newRole,
              updated_at:
                updatedProfile?.updated_at || new Date().toISOString(),
            }
          : u
      );

      setUsers(updatedUsers);

      // Update cached data
      updateData(CACHE_KEY, updatedUsers);

      // Invalidate related cache entries
      invalidateCache("profiles");
      invalidateCache("admin_users");

      // Call the provided onUpdateRole callback if available
      if (onUpdateRole && typeof onUpdateRole === "function") {
        try {
          await onUpdateRole(userId, newRole);
          console.log("📞 onUpdateRole callback completed successfully");
        } catch (callbackError) {
          console.warn("⚠️ onUpdateRole callback failed:", callbackError);
        }
      }

      console.log(`🎉 Successfully updated user ${userId} role to ${newRole}`);
      setError(null);
    } catch (error) {
      console.error("💥 Error in handleRoleUpdate:", error);
      setError(`Failed to update user role: ${error.message}`);
      alert(
        `Failed to update user role: ${error.message}\n\nPlease check the console for more details.`
      );
    } finally {
      console.log(`🔓 Clearing updating state for user ${userId}`);
      setUpdating(null);
    }
  };

  // Refresh function that clears cache and refetches
  const handleRefresh = async () => {
    // Clear cache
    invalidateCache("admin_users");
    invalidateCache("profiles");

    // Call external refresh if provided
    if (onRefresh && typeof onRefresh === "function") {
      onRefresh();
    }

    // Refetch data
    await fetchUsers();
  };

  // Test function to check if email sync is working
  const testEmailSync = async () => {
    console.log("=== TESTING EMAIL SYNC ===");

    try {
      // Check if profiles have email field
      const { data: sampleProfiles, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .limit(3);

      console.log("Sample profiles with email:", sampleProfiles);

      if (error) {
        console.error("Test failed:", error);
        alert(`Test failed: ${error.message}`);
        return;
      }

      const hasEmails = sampleProfiles?.some(
        (p) => p.email && !p.email.includes("@system.local")
      );

      if (hasEmails) {
        alert("✅ Email sync is working! Profiles have real email addresses.");
      } else {
        alert(
          "⚠️ Email sync may not be working. Check if you ran the SQL scripts."
        );
      }
    } catch (error) {
      console.error("Test email sync failed:", error);
      alert(`Test failed: ${error.message}`);
    }
  };

  // Helper functions remain the same...
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border border-red-200";
      case "property_owner":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "property_seeker":
        return "bg-green-100 text-green-800 border border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "property_owner":
        return "Property Owner";
      case "property_seeker":
        return "Property Seeker";
      default:
        return "Property Seeker";
    }
  };

  const isPropertyOwner = (role) => role === "property_owner";
  const isPropertySeeker = (role) => role === "property_seeker" || !role;

  // Filter users based on search and role filter
  const filteredUsers = users.filter((userItem) => {
    const matchesSearch =
      userItem.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.id?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesRole = filterRole === "all";
    if (!matchesRole) {
      if (filterRole === "property_owner") {
        matchesRole = isPropertyOwner(userItem.role);
      } else if (filterRole === "property_seeker") {
        matchesRole = isPropertySeeker(userItem.role);
      } else {
        matchesRole = userItem.role === filterRole;
      }
    }

    return matchesSearch && matchesRole;
  });

  // Role statistics
  const roleStats = {
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    property_owner: users.filter((u) => u.role === "property_owner").length,
    property_seeker: users.filter(
      (u) => u.role === "property_seeker" || !u.role
    ).length,
  };

  return (
    <div className="space-y-6 text-custom-gray">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-600">Manage user roles and permissions</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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
            <label
              htmlFor="roleFilter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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
              <img
                src="/images/icons/5.png"
                alt="Total Users"
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {roleStats.total}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <img
                src="/images/icons/6.png"
                alt="Administrators"
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {roleStats.admin}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <img
                src="/images/icons/7.png"
                alt="Administrators"
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">
                Property Owners
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {roleStats.property_owner}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <img
                src="/images/icons/8.png"
                alt="Administrators"
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">
                Property Seekers
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {roleStats.property_seeker}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">
            Users ({filteredUsers.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No users found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {error
                ? "Please check the error message above."
                : searchTerm || filterRole !== "all"
                ? "Try adjusting your search or filter criteria."
                : "No users have been created yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((userItem) => (
                  <tr
                    key={userItem.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {userItem.full_name || "No name provided"}
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
                      {userItem.email &&
                        !userItem.email.includes("@system.local") && (
                          <div className="text-xs text-green-600">
                            ✓ Real Email
                          </div>
                        )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                          userItem.role || "property_seeker"
                        )}`}
                      >
                        {getRoleDisplayName(userItem.role || "property_seeker")}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Profile Complete
                        </span>
                        {userItem.updated_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            Updated:{" "}
                            {new Date(userItem.updated_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {userItem.role !== "admin" ? (
                        <div className="flex space-x-2">
                          {!isPropertyOwner(userItem.role) && (
                            <button
                              onClick={() =>
                                handleRoleUpdate(userItem.id, "property_owner")
                              }
                              disabled={updating === userItem.id}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {updating === userItem.id
                                ? "Updating..."
                                : "Make Owner"}
                            </button>
                          )}

                          {!isPropertySeeker(userItem.role) && (
                            <button
                              onClick={() =>
                                handleRoleUpdate(userItem.id, "property_seeker")
                              }
                              disabled={updating === userItem.id}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {updating === userItem.id
                                ? "Updating..."
                                : "Make Seeker"}
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
