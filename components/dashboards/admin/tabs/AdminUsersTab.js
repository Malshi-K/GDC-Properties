// Optimized AdminUsersTab with Smart Caching
"use client";
import { useState, useEffect, useRef } from "react";
import { useGlobalData } from "@/contexts/GlobalDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function AdminUsersTab({ onUpdateRole, onRefresh }) {
  const { user } = useAuth();
  const { fetchData, updateData, invalidateCache, isReady } = useGlobalData();
  const [users, setUsers] = useState([]);
  const [updating, setUpdating] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [isLoading, setIsLoading] = useState(false); // Changed default to false
  const [error, setError] = useState(null);
  const [roleRequests, setRoleRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
  
  // Track initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const initializationRef = useRef(false);

  // Cache keys
  const CACHE_KEY = "admin_users_with_email";
  const ROLE_REQUESTS_CACHE_KEY = "admin_role_requests";
  
  // Cache TTL - 10 minutes
  const CACHE_TTL = 10 * 60 * 1000;

  // Initialize data only once when context is ready
  useEffect(() => {
    if (!isReady || initializationRef.current) {
      return;
    }

    console.log("AdminUsersTab: Context ready, initializing data...");
    initializationRef.current = true;
    initializeData();
  }, [isReady]);

  // Smart initialization that checks cache first
  const initializeData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if we have recent cached data
      const cachedUsers = await checkCachedData(CACHE_KEY);
      const cachedRequests = await checkCachedData(ROLE_REQUESTS_CACHE_KEY);

      if (cachedUsers && cachedRequests) {
        console.log("Using cached data - no fetch needed");
        setUsers(cachedUsers);
        setRoleRequests(cachedRequests);
        setIsInitialized(true);
        setLastFetch(Date.now());
        setIsLoading(false);
        return;
      }

      // Fetch fresh data if cache is stale or missing
      console.log("Cache miss or stale - fetching fresh data");
      await Promise.all([
        fetchUsers(false), // Use cache if available, but fetch if needed
        fetchRoleRequests(false)
      ]);

      setIsInitialized(true);
      setLastFetch(Date.now());
    } catch (error) {
      console.error("Failed to initialize data:", error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if cached data exists and is fresh
  const checkCachedData = async (cacheKey) => {
    try {
      // First check memory cache
      const memoryData = await fetchData(
        { _cached_key: cacheKey },
        { useCache: true, ttl: CACHE_TTL }
      );
      
      if (memoryData && Array.isArray(memoryData) && memoryData.length > 0) {
        console.log(`Fresh data found in cache for ${cacheKey}`);
        return memoryData;
      }
      
      return null;
    } catch (error) {
      console.warn(`Error checking cache for ${cacheKey}:`, error);
      return null;
    }
  };

  // Optimized fetchUsers - only fetches if needed
  const fetchUsers = async (forceFresh = false) => {
    try {
      console.log("=== FETCHING USERS FROM PROFILES ===");

      const usersData = await fetchData(
        {
          table: "profiles",
          select: "*",
          filters: {},
          orderBy: { column: "created_at", ascending: false },
        },
        {
          useCache: !forceFresh,
          ttl: CACHE_TTL,
          onError: (error) => {
            console.error("Failed to fetch users:", error);
            throw error;
          },
        }
      );

      if (!usersData || !Array.isArray(usersData)) {
        console.log("No users data received");
        setUsers([]);
        setError("No users found in the database");
        return;
      }

      // Process users data
      const processedUsers = usersData.map((profile) => ({
        id: profile.id,
        email: profile.email || `user-${profile.id?.slice(0, 8)}@system.local`,
        created_at: profile.created_at,
        email_confirmed_at: null,
        last_sign_in_at: null,
        full_name: profile.full_name || null,
        phone: profile.phone || null,
        address: profile.address || null,
        role: profile.role || "tenant",
        profile_image_url: profile.profile_image_url || null,
        preferences: profile.preferences || null,
        has_profile: true,
        profile_created_at: profile.created_at,
        updated_at: profile.updated_at || null,
        has_pending_request:
          profile.preferences?.role_request?.status === "pending",
      }));

      console.log(`✅ Processed ${processedUsers.length} users`);

      setUsers(processedUsers);
      updateData(CACHE_KEY, processedUsers);
      setError(null);
    } catch (error) {
      console.error("💥 Error in fetchUsers:", error);
      setError(`Failed to fetch users: ${error.message}`);
      setUsers([]);
    }
  };

  // Optimized fetchRoleRequests with caching
  const fetchRoleRequests = async (forceFresh = false) => {
    console.log("=== FETCHING ROLE REQUESTS ===");

    try {
      // Check cache first if not forcing fresh
      if (!forceFresh) {
        const cached = await checkCachedData(ROLE_REQUESTS_CACHE_KEY);
        if (cached) {
          setRoleRequests(cached);
          return;
        }
      }

      const { data: requests, error } = await supabase
        .from("role_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!error && requests && requests.length > 0) {
        console.log(`✅ Found ${requests.length} requests in role_requests table`);
        setRoleRequests(requests);
        updateData(ROLE_REQUESTS_CACHE_KEY, requests);
        return;
      }

      console.log("Checking profiles.preferences for pending requests...");

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .not("preferences", "is", null);

      if (profileError) {
        console.error("Error fetching profiles:", profileError);
        setRoleRequests([]);
        updateData(ROLE_REQUESTS_CACHE_KEY, []);
        return;
      }

      const pendingRequests = [];

      if (profiles && profiles.length > 0) {
        profiles.forEach((profile) => {
          try {
            let prefs = profile.preferences;
            if (typeof prefs === "string") {
              prefs = JSON.parse(prefs);
            }

            if (prefs?.role_request?.status === "pending") {
              pendingRequests.push({
                id: `${profile.id}_request`,
                user_id: profile.id,
                user_email: profile.email || "No email",
                user_name: profile.full_name || "No name",
                requested_role: prefs.role_request.requested_role || "landlord",
                business_name: prefs.role_request.business_name || "",
                business_type: prefs.role_request.business_type || "",
                additional_info: prefs.role_request.additional_info || "",
                created_at: prefs.role_request.requested_at || profile.created_at,
                status: "pending",
              });
            }
          } catch (err) {
            console.error(`Error processing profile ${profile.id}:`, err);
          }
        });
      }

      console.log(`✅ Found ${pendingRequests.length} pending requests`);
      setRoleRequests(pendingRequests);
      updateData(ROLE_REQUESTS_CACHE_KEY, pendingRequests);
    } catch (error) {
      console.error("Error in fetchRoleRequests:", error);
      setRoleRequests([]);
      updateData(ROLE_REQUESTS_CACHE_KEY, []);
    }
  };

  // Show loading state only during initial load
  if (!isReady) {
    return (
      <div className="space-y-6 text-custom-blue">
        <div className="bg-white rounded-lg shadow border p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Initializing...</p>
        </div>
      </div>
    );
  }

  // Manual refresh function - forces fresh fetch
  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear cache
      invalidateCache(CACHE_KEY);
      invalidateCache(ROLE_REQUESTS_CACHE_KEY);
      invalidateCache("profiles");

      // Fetch fresh data
      await Promise.all([
        fetchUsers(true), // Force fresh fetch
        fetchRoleRequests(true)
      ]);

      setLastFetch(Date.now());
    } catch (error) {
      setError(`Failed to refresh data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if data is stale (older than 5 minutes for auto-refresh suggestion)
  const isDataStale = () => {
    if (!lastFetch) return false;
    return Date.now() - lastFetch > 5 * 60 * 1000; // 5 minutes
  };

  // Role update function with optimistic updates
  const handleRoleUpdate = async (userId, newRole, isApproval = false) => {
    console.log(`🚀 Starting role update for user ${userId} to ${newRole}`);
    setUpdating(userId);

    try {
      const profileUpdate = {
        role: newRole,
        updated_at: new Date().toISOString(),
      };

      if (isApproval) {
        profileUpdate.preferences = {
          role_request: {
            status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: user.email,
          },
        };
      }

      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", userId)
        .select()
        .single();

      if (updateError) {
        console.error("💥 Database update failed:", updateError);
        setError(`Database update failed: ${updateError.message}`);
        alert(`Failed to update user role: ${updateError.message}`);
        return;
      }

      // Update role_requests table if approval
      if (isApproval) {
        const { error: requestUpdateError } = await supabase
          .from("role_requests")
          .update({
            status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: user.email,
          })
          .eq("user_id", userId);

        if (requestUpdateError) {
          console.log("Note: role_requests update failed:", requestUpdateError);
        }

        // Remove from pending requests (optimistic update)
        setRoleRequests((prev) => {
          const updated = prev.filter((r) => r.user_id !== userId);
          updateData(ROLE_REQUESTS_CACHE_KEY, updated);
          return updated;
        });
      }

      // Optimistic update to local users state
      setUsers((prev) => {
        const updated = prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                role: newRole,
                updated_at: updatedProfile?.updated_at || new Date().toISOString(),
                has_pending_request: false,
              }
            : u
        );
        updateData(CACHE_KEY, updated);
        return updated;
      });

      // Invalidate relevant caches to ensure consistency
      invalidateCache("profiles");

      if (onUpdateRole && typeof onUpdateRole === "function") {
        await onUpdateRole(userId, newRole);
      }

      alert(
        `Successfully ${isApproval ? "approved" : "updated"} ${
          updatedProfile.full_name || "user"
        } as ${getRoleDisplayName(newRole)}.`
      );

      setError(null);
    } catch (error) {
      console.error("💥 Error in handleRoleUpdate:", error);
      setError(`Failed to update user role: ${error.message}`);
      alert(`Failed to update user role: ${error.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const handleRejectRequest = async (userId) => {
    if (!confirm("Are you sure you want to reject this role request?")) {
      return;
    }

    setUpdating(userId);

    try {
      await supabase
        .from("profiles")
        .update({
          preferences: {
            role_request: {
              status: "rejected",
              rejected_at: new Date().toISOString(),
              rejected_by: user.email,
            },
          },
        })
        .eq("id", userId);

      await supabase
        .from("role_requests")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
          rejected_by: user.email,
        })
        .eq("user_id", userId);

      // Optimistic update
      setRoleRequests((prev) => {
        const updated = prev.filter((r) => r.user_id !== userId);
        updateData(ROLE_REQUESTS_CACHE_KEY, updated);
        return updated;
      });
      
      alert("Role request rejected successfully.");
    } catch (error) {
      console.error("Failed to reject request:", error);
      alert("Failed to reject request: " + error.message);
    } finally {
      setUpdating(null);
    }
  };

  // Helper functions
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-orange-100 text-orange-800 border border-red-200";
      case "landlord":
        return "bg-gray-100 text-gray-800 border border-gray-200";
      case "tenant":
        return "bg-green-100 text-green-800 border border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "landlord":
        return "Landlord";
      case "tenant":
        return "Tenant";
      default:
        return "Tenant";
    }
  };

  const isPropertyOwner = (role) => role === "landlord";
  const isPropertySeeker = (role) => role === "tenant" || !role;

  // Filter users
  const filteredUsers = users.filter((userItem) => {
    const matchesSearch =
      userItem.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.id?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesRole = filterRole === "all";
    if (!matchesRole) {
      if (filterRole === "landlord") {
        matchesRole = userItem.role === "landlord";
      } else if (filterRole === "tenant") {
        matchesRole = userItem.role === "tenant" || !userItem.role;
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
    landlord: users.filter((u) => u.role === "landlord").length,
    tenant: users.filter((u) => u.role === "tenant" || !u.role).length,
    pending_requests: roleRequests.length,
  };

  return (
    <div className="space-y-6 text-custom-blue">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-600">Manage user roles and permissions</p>          
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-custom-blue text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("users")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "users"
                ? "border-custom-orange text-custom-orange"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`py-2 px-1 border-b-2 font-medium text-sm relative ${
              activeTab === "requests"
                ? "border-custom-orange text-custom-orange"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Role Requests
            {roleRequests.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {roleRequests.length}
              </span>
            )}
          </button>
        </nav>
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
                <button
                  onClick={handleRefresh}
                  className="mt-2 underline hover:no-underline"
                >
                  Try refreshing the data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State - only show during refresh or initial load */}
      {isLoading && !isInitialized && (
        <div className="bg-white rounded-lg shadow border p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading users...</p>
        </div>
      )}

      {/* Content - show once data is loaded */}
      {isInitialized && (
        <>
          {activeTab === "requests" ? (
            /* Role Requests Tab Content */
            <div className="space-y-6">
              {roleRequests.length === 0 ? (
                <div className="bg-white rounded-lg shadow border p-8 text-center">
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No pending requests
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    There are no pending role upgrade requests at this time.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow border overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold">
                      Pending Role Requests ({roleRequests.length})
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {roleRequests.map((request) => (
                      <div
                        key={request.user_id}
                        className="p-6 hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h3 className="text-lg font-medium text-gray-900">
                                {request.user_name || "No name provided"}
                              </h3>
                              <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Pending Approval
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">
                              {request.user_email}
                            </p>
                            <div className="mt-4 space-y-2">
                              <div className="flex items-center text-sm">
                                <span className="font-medium text-gray-700 w-32">
                                  Requested Role:
                                </span>
                                <span className="text-gray-900">
                                  {getRoleDisplayName(request.requested_role)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4 flex space-x-2">
                            <button
                              onClick={() =>
                                handleRoleUpdate(
                                  request.user_id,
                                  request.requested_role,
                                  true
                                )
                              }
                              disabled={updating === request.user_id}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {updating === request.user_id
                                ? "Processing..."
                                : "Approve"}
                            </button>
                            <button
                              onClick={() =>
                                handleRejectRequest(request.user_id)
                              }
                              disabled={updating === request.user_id}
                              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Users Tab Content */
            <>
              {/* Search and Filter */}
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
                      <option value="landlord">Landlords</option>
                      <option value="tenant">Tenants</option>
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
                      <p className="text-sm font-medium text-gray-500">
                        Total Users
                      </p>
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
                      <p className="text-sm font-medium text-gray-500">
                        Admins
                      </p>
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
                        Landlords
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {roleStats.landlord}
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
                        Tenants
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {roleStats.tenant}
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

                {filteredUsers.length === 0 ? (
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
                              {userItem.has_pending_request && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Has pending request
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                                  userItem.role || "tenant"
                                )}`}
                              >
                                {getRoleDisplayName(userItem.role || "tenant")}
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
                                    {new Date(
                                      userItem.updated_at
                                    ).toLocaleDateString()}
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
                                        handleRoleUpdate(
                                          userItem.id,
                                          "landlord"
                                        )
                                      }
                                      disabled={updating === userItem.id}
                                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {updating === userItem.id
                                        ? "Updating..."
                                        : "Make Owner"}
                                    </button>
                                  )}
                                  {!isPropertySeeker(userItem.role) && (
                                    <button
                                      onClick={() =>
                                        handleRoleUpdate(userItem.id, "tenant")
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
            </>
          )}
        </>
      )}
    </div>
  );
}
