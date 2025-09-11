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
  const [roleRequests, setRoleRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("users"); // 'users' or 'requests'

  // Cache key for users data
  const CACHE_KEY = "admin_users_with_email";

  useEffect(() => {
    console.log("AdminUsersTab mounted, fetching data...");
    fetchUsers();
    fetchRoleRequests();
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
        has_pending_request:
          profile.preferences?.role_request?.status === "pending", // Add this line
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

  const fetchRoleRequests = async () => {
    console.log("=== FETCHING ROLE REQUESTS ===");

    try {
      // Method 1: Try to fetch from role_requests table
      console.log("Attempting to fetch from role_requests table...");

      const { data: requests, error } = await supabase
        .from("role_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching from role_requests:", error);
        console.log("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      } else {
        console.log(
          `✅ Fetched ${
            requests?.length || 0
          } pending requests from role_requests table`
        );
        console.log("Requests data:", requests);
      }

      if (!error && requests && requests.length > 0) {
        setRoleRequests(requests);
        return; // Success, exit early
      }

      // Method 2: Fallback to checking profiles.preferences
      console.log("Attempting fallback to profiles.preferences...");

      // First, get all profiles with non-null preferences
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .not("preferences", "is", null);

      if (profileError) {
        console.error("Error fetching profiles:", profileError);
        setRoleRequests([]);
        return;
      }

      console.log(`Found ${profiles?.length || 0} profiles with preferences`);

      if (profiles && profiles.length > 0) {
        const pendingRequests = [];

        profiles.forEach((profile) => {
          try {
            // Parse preferences if it's a string
            let prefs = profile.preferences;
            if (typeof prefs === "string") {
              try {
                prefs = JSON.parse(prefs);
              } catch (parseError) {
                console.error(
                  `Failed to parse preferences for profile ${profile.id}:`,
                  parseError
                );
                return;
              }
            }

            // Check if there's a pending role request
            if (prefs?.role_request?.status === "pending") {
              const request = {
                id: `${profile.id}_request`,
                user_id: profile.id,
                user_email: profile.email || "No email",
                user_name: profile.full_name || "No name",
                requested_role:
                  prefs.role_request.requested_role || "property_owner",
                business_name: prefs.role_request.business_name || "",
                business_type: prefs.role_request.business_type || "",
                additional_info: prefs.role_request.additional_info || "",
                created_at:
                  prefs.role_request.requested_at || profile.created_at,
                status: "pending",
              };

              pendingRequests.push(request);
              console.log(`Found pending request for user ${profile.email}`);
            }
          } catch (err) {
            console.error(`Error processing profile ${profile.id}:`, err);
          }
        });

        console.log(
          `✅ Found ${pendingRequests.length} pending requests from profiles`
        );
        setRoleRequests(pendingRequests);
      } else {
        console.log("No profiles with preferences found");
        setRoleRequests([]);
      }
    } catch (error) {
      console.error("Unexpected error in fetchRoleRequests:", error);
      setRoleRequests([]);
    }
  };

  // Enhanced role update function
  const handleRoleUpdate = async (userId, newRole, isApproval = false) => {
    console.log(`🚀 Starting role update for user ${userId} to ${newRole}`);
    setUpdating(userId);

    try {
      // Use a different variable name to avoid shadowing updateData from context
      const profileUpdate = {
        role: newRole,
        updated_at: new Date().toISOString(),
      };

      // Add preferences update if this is an approval
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

      // If this is an approval, update role_requests table
      if (isApproval) {
        // Update role_requests table (don't worry if this fails)
        const { error: requestUpdateError } = await supabase
          .from("role_requests")
          .update({
            status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: user.email,
          })
          .eq("user_id", userId);

        if (requestUpdateError) {
          console.log(
            "Note: role_requests update failed, but continuing:",
            requestUpdateError
          );
        }

        // Send approval email (optional)
        try {
          const response = await fetch("/api/send-role-approval-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_email: updatedProfile.email,
              user_name: updatedProfile.full_name,
              new_role: newRole,
            }),
          });

          if (response.ok) {
            console.log("Approval email sent successfully");
          }
        } catch (emailError) {
          console.log(
            "Email sending failed, but role was updated:",
            emailError
          );
        }

        // Remove from pending requests
        setRoleRequests(roleRequests.filter((r) => r.user_id !== userId));
      }

      // Update local state
      const updatedUsers = users.map((u) =>
        u.id === userId
          ? {
              ...u,
              role: newRole,
              updated_at:
                updatedProfile?.updated_at || new Date().toISOString(),
              has_pending_request: false,
            }
          : u
      );

      setUsers(updatedUsers);

      // Use the updateData function from context correctly
      updateData(CACHE_KEY, updatedUsers);
      invalidateCache("profiles");
      invalidateCache("admin_users");

      if (onUpdateRole && typeof onUpdateRole === "function") {
        await onUpdateRole(userId, newRole);
      }

      // Show success message
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

      setRoleRequests(roleRequests.filter((r) => r.user_id !== userId));
      alert("Role request rejected successfully.");
    } catch (error) {
      console.error("Failed to reject request:", error);
      alert("Failed to reject request: " + error.message);
    } finally {
      setUpdating(null);
    }
  };

  // Refresh function that clears cache and refetches

  // Test function to check if email sync is working

  // Helper functions remain the same...
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-orange-100 text-orange-800 border border-red-200";
      case "property_owner":
        return "bg-gray-100 text-gray-800 border border-gray-200";
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
    pending_requests: roleRequests.length, // Add this line
  };

  return (
    <div className="space-y-6 text-custom-blue">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-600">Manage user roles and permissions</p>
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
        <div className="bg-orange-50 border border-red-200 text-orange-700 px-4 py-3 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-orange-400"
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
              <h3 className="text-sm font-medium text-orange-800">Error</h3>
              <div className="mt-2 text-sm text-orange-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <div key={request.user_id} className="p-6 hover:bg-gray-50">
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
                          {request.business_name && (
                            <div className="flex items-center text-sm">
                              <span className="font-medium text-gray-700 w-32">
                                Business Name:
                              </span>
                              <span className="text-gray-900">
                                {request.business_name}
                              </span>
                            </div>
                          )}
                          {request.business_type && (
                            <div className="flex items-center text-sm">
                              <span className="font-medium text-gray-700 w-32">
                                Business Type:
                              </span>
                              <span className="text-gray-900">
                                {request.business_type
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                              </span>
                            </div>
                          )}
                          {request.additional_info && (
                            <div className="text-sm mt-2">
                              <span className="font-medium text-gray-700">
                                Additional Information:
                              </span>
                              <p className="mt-1 text-gray-600 bg-gray-50 p-2 rounded">
                                {request.additional_info}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center text-sm text-gray-500">
                            <span className="font-medium w-32">Requested:</span>
                            <span>
                              {new Date(request.created_at).toLocaleString()}
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
                          onClick={() => handleRejectRequest(request.user_id)}
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
        /* Users Tab - All your existing content */
        <>
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
                          {userItem.has_pending_request && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Has pending request
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                              userItem.role || "property_seeker"
                            )}`}
                          >
                            {getRoleDisplayName(
                              userItem.role || "property_seeker"
                            )}
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
                                      "property_owner"
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
                                    handleRoleUpdate(
                                      userItem.id,
                                      "property_seeker"
                                    )
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
    </div>
  );
}
