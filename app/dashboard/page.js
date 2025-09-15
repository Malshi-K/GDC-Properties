"use client";
export const dynamic = 'force-dynamic';
import { useState, useEffect } from "react";
import { useGlobalData } from "@/contexts/GlobalDataContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { toast } from "react-hot-toast";

// Import services
import { propertyService } from "@/lib/services/propertyService";

// Import shared components
import SettingsTab from "@/components/dashboards/common/SettingsTab";
import DashboardSidebar from "@/components/dashboards/common/DashboardSidebar";

// Import owner components
import PropertiesTab from "@/components/dashboards/owner/tabs/PropertiesTab";
import OwnerViewingRequestsTab from "@/components/dashboards/owner/tabs/ViewingRequestsTab";
import ApplicationsTab from "@/components/dashboards/owner/tabs/ApplicationsTab";
import AnalyticsTab from "@/components/dashboards/owner/tabs/AnalyticsTab";
import AddEditPropertyModal from "@/components/dashboards/owner/property/AddEditPropertyModal";

// Import user components
import UserViewingRequestsTab from "@/components/dashboards/user/tabs/ViewingRequestsTab";
import PropertyApplications from "@/components/dashboards/user/tabs/PropertyApplications";
import SavedProperties from "@/components/dashboards/user/tabs/SavedProperties";

// Import admin components
import AdminUsersTab from "@/components/dashboards/admin/tabs/AdminUsersTab";
import AdminPropertiesTab from "@/components/dashboards/admin/tabs/AdminPropertiesTab";
import AdminAnalyticsTab from "@/components/dashboards/admin/tabs/AdminAnalyticsTab";
import PaymentsTab from "@/components/dashboards/owner/tabs/PaymentsTab";
import { useAuth } from "@/contexts/AuthContext";

// Cache TTL constants
const CACHE_TTL = {
  PROPERTIES: 10 * 60 * 1000, // 10 minutes
  VIEWING_REQUESTS: 5 * 60 * 1000, // 5 minutes
  APPLICATIONS: 5 * 60 * 1000, // 5 minutes
  FAVORITES: 10 * 60 * 1000, // 10 minutes
  ADMIN_DATA: 5 * 60 * 1000, // 5 minutes for admin data
};

// Helper function to get default tab based on role
const getDefaultTab = (role) => {
  switch (role) {
    case "admin":
      return "users";
    case "landlord":
      return "properties";
    case "tenant":
      return "viewingRequests";
    default:
      return "viewingRequests";
  }
};

// Helper function to check if user is owner
const isOwner = (role) => {
  return role === "landlord";
};

// Helper function to check if user is Tenant
const isUser = (role) => {
  return role === "tenant";
};

export default function Dashboard() {
  const { removeFavorite } = useGlobalData();
  const { user, profile, userRole, updateUserRole } = useAuth();
  const { fetchData, updateData, invalidateCache, loading, data } =
    useGlobalData();

  // State management
  const [mounted, setMounted] = useState(false);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [editPropertyId, setEditPropertyId] = useState(null);

  // Store the actual data for editing
  const [currentProperties, setCurrentProperties] = useState([]);
  const [currentViewingRequests, setCurrentViewingRequests] = useState([]);
  const [currentApplications, setCurrentApplications] = useState([]);
  const [currentUserViewingRequests, setCurrentUserViewingRequests] = useState(
    []
  );
  const [currentUserApplications, setCurrentUserApplications] = useState([]);
  const [currentUserFavorites, setCurrentUserFavorites] = useState([]);

  // Active tab state with role-based defaults
  const [activeTab, setActiveTab] = useState(() => {
    return getDefaultTab(userRole);
  });

  // Handle localStorage for tab persistence
  useEffect(() => {
    setMounted(true);

    if (typeof window !== "undefined") {
      const storageKey = `dashboard_${userRole}_tab`;
      const savedTab = localStorage.getItem(storageKey);

      if (savedTab) {
        setActiveTab(savedTab);
      } else {
        setActiveTab(getDefaultTab(userRole));
      }
    }
  }, [userRole]);

  // Save active tab to localStorage
  useEffect(() => {
    if (mounted && typeof window !== "undefined" && userRole) {
      const storageKey = `dashboard_${userRole}_tab`;
      localStorage.setItem(storageKey, activeTab);
    }
  }, [activeTab, userRole, mounted]);

  // Get current properties from GlobalDataContext data
  useEffect(() => {
    if (user?.id && isOwner(userRole)) {
      const cacheKey = `owner_properties_${user.id}`;
      const properties = data[cacheKey];

      if (Array.isArray(properties)) {
        setCurrentProperties(properties);
      }
    }
  }, [data, user?.id, userRole]);

  // Get current user viewing requests from GlobalDataContext data
  useEffect(() => {
    if (user?.id && isUser(userRole)) {
      const cacheKey = `user_viewing_requests_${user.id}`;
      const userViewingRequests = data[cacheKey];

      if (Array.isArray(userViewingRequests)) {
        setCurrentUserViewingRequests(userViewingRequests);
      }
    }
  }, [data, user?.id, userRole]);

  // Get current user applications from GlobalDataContext data
  useEffect(() => {
    if (user?.id && isUser(userRole)) {
      const cacheKey = `user_applications_${user.id}`;
      const userApplications = data[cacheKey];

      if (Array.isArray(userApplications)) {
        setCurrentUserApplications(userApplications);
      }
    }
  }, [data, user?.id, userRole]);

  // Get current user favorites from GlobalDataContext data
  useEffect(() => {
    if (user?.id && isUser(userRole)) {
      const cacheKey = `user_favorites_${user.id}`;
      const userFavorites = data[cacheKey];

      if (Array.isArray(userFavorites)) {
        setCurrentUserFavorites(userFavorites);
      }
    }
  }, [data, user?.id, userRole]);

  // Fetch data when tabs become active
  useEffect(() => {
    if (!user?.id || !userRole) return;

    // Fetch data based on active tab and user role
    if (isOwner(userRole)) {
      if (activeTab === "properties") {
        getOwnerProperties();
      } else if (activeTab === "viewings") {
        getViewingRequests();
      } else if (activeTab === "applications") {
        getRentalApplications();
      }
    } else if (isUser(userRole)) {
      if (activeTab === "favorites") {
        getUserFavorites();
      } else if (activeTab === "applications") {
        getUserApplications();
      } else if (activeTab === "viewingRequests") {
        getUserViewingRequests();
      }
    } else if (userRole === "admin") {
      if (activeTab === "users") {
        getAllUsers();
      } else if (activeTab === "properties") {
        getAllProperties();
      } else if (activeTab === "analytics") {
        getSystemAnalytics();
      }
    }
  }, [activeTab, user?.id, userRole, mounted]);

  // ----- ADMIN DATA FETCHING FUNCTIONS -----
  const getAllUsers = async () => {
    if (!user || userRole !== "admin") return [];
    const cacheKey = "admin_all_users";
    try {
      const users = await fetchData(
        {
          table: "profiles",
          select: "*",
          orderBy: { column: "created_at", ascending: false },
        },
        {
          useCache: true,
          ttl: CACHE_TTL.ADMIN_DATA,
          _cached_key: cacheKey,
        }
      );

      return users;
    } catch (error) {
      console.error("Error fetching all users:", error);
      return [];
    }
  };

  const getAllProperties = async () => {
    if (!user || userRole !== "admin") return [];
    const cacheKey = "admin_all_properties";
    try {
      const properties = await fetchData(
        {
          table: "properties",
          select: `
        *,
        profiles!properties_owner_id_fkey (
          id,
          full_name,
          email
        )
      `,
          orderBy: { column: "created_at", ascending: false },
        },
        {
          useCache: true,
          ttl: CACHE_TTL.ADMIN_DATA,
          _cached_key: cacheKey,
        }
      );

      return properties;
    } catch (error) {
      console.error("Error fetching all properties:", error);
      return [];
    }
  };

  const getSystemAnalytics = async () => {
    if (!user || userRole !== "admin") return {};
    const cacheKey = "admin_analytics";
    try {
      // Fetch multiple analytics data
      const [
        usersCount,
        propertiesCount,
        applicationsCount,
        viewingRequestsCount,
      ] = await Promise.all([
        fetchData({ table: "profiles", select: "count", count: "exact" }),
        fetchData({ table: "properties", select: "count", count: "exact" }),
        fetchData({
          table: "rental_applications",
          select: "count",
          count: "exact",
        }),
        fetchData({
          table: "viewing_requests",
          select: "count",
          count: "exact",
        }),
      ]);

      const analytics = {
        totalUsers: usersCount?.count || 0,
        totalProperties: propertiesCount?.count || 0,
        totalApplications: applicationsCount?.count || 0,
        totalViewingRequests: viewingRequestsCount?.count || 0,
      };

      // Cache the analytics
      updateData(cacheKey, analytics);
      return analytics;
    } catch (error) {
      console.error("Error fetching system analytics:", error);
      return {};
    }
  };

  // Admin role update function
  // const updateUserRole = async (userId, newRole) => {
  //   try {
  //     const { error } = await supabase
  //       .from("profiles")
  //       .update({
  //         role: newRole,
  //         updated_at: new Date().toISOString(),
  //       })
  //       .eq("id", userId);
  //     if (error) throw error;

  //     // Invalidate admin cache
  //     invalidateCache("admin_all_users");

  //     toast.success(`User role updated to ${newRole} successfully!`);
  //     return true;
  //   } catch (error) {
  //     console.error("Error updating user role:", error);
  //     toast.error("Failed to update user role");
  //     return false;
  //   }
  // };
  const handleRoleChange = async () => {
    const result = await updateUserRole("user-id-here", "admin");
    if (result.success) console.log("Role updated");
  };

  // Debug useEffect for user viewing requests
  useEffect(() => {
    if (isUser(userRole) && user?.id) {
      const cacheKey = `user_viewing_requests_${user.id}`;
      const requestsData = data[cacheKey];

      console.log("Dashboard Debug - User Viewing Requests:", {
        userRole,
        userId: user.id,
        activeTab,
        cacheKey,
        hasData: !!requestsData,
        dataLength: requestsData?.length,
        requestsData,
        allDataKeys: Object.keys(data),
        loadingKeys: Object.keys(loading),
      });
    }
  }, [userRole, user?.id, activeTab, data, loading]);

  // Debug useEffect for user applications
  useEffect(() => {
    if (isUser(userRole) && user?.id) {
      const cacheKey = `user_applications_${user.id}`;
      const applicationsData = data[cacheKey];

      console.log("Dashboard Debug - User Applications:", {
        userRole,
        userId: user.id,
        activeTab,
        cacheKey,
        hasData: !!applicationsData,
        dataLength: applicationsData?.length,
        applicationsData,
        allDataKeys: Object.keys(data),
        loadingKeys: Object.keys(loading),
      });
    }
  }, [userRole, user?.id, activeTab, data, loading]);

  // Debug useEffect for user favorites
  useEffect(() => {
    if (isUser(userRole) && user?.id) {
      const cacheKey = `user_favorites_${user.id}`;
      const favoritesData = data[cacheKey];

      console.log("Dashboard Debug - User Favorites:", {
        userRole,
        userId: user.id,
        activeTab,
        cacheKey,
        hasData: !!favoritesData,
        dataLength: favoritesData?.length,
        favoritesData,
        allDataKeys: Object.keys(data),
        loadingKeys: Object.keys(loading),
      });
    }
  }, [userRole, user?.id, activeTab, data, loading]);

  // ----- DATA FETCHING FUNCTIONS USING GLOBAL CONTEXT -----
  
  // Owner data functions
  const getOwnerProperties = async () => {
    if (!user) return [];
    const cacheKey = `owner_properties_${user.id}`;

    try {
      const properties = await fetchData(
        {
          table: "properties",
          select: "*",
          filters: [{ column: "owner_id", operator: "eq", value: user.id }],
          orderBy: { column: "created_at", ascending: false },
        },
        {
          useCache: true,
          ttl: CACHE_TTL.PROPERTIES,
          _cached_key: cacheKey,
        }
      );

      // Update current properties for editing
      if (Array.isArray(properties)) {
        setCurrentProperties(properties);
      }

      return properties;
    } catch (error) {
      console.error("Error fetching owner properties:", error);
      return [];
    }
  };

  const getViewingRequests = async () => {
    if (!user) return [];
    const cacheKey = `owner_viewing_requests_${user.id}`;

    try {
      console.log("Fetching viewing requests for owner:", user.id);

      const viewingRequests = await fetchData(
        {
          table: "viewing_requests",
          select: `
          *,
          properties!viewing_requests_property_id_fkey (
            id,
            title,
            location,
            price,
            images,
            owner_id
          )
        `,
          filters: [{ column: "owner_id", operator: "eq", value: user.id }],
          orderBy: { column: "created_at", ascending: false },
        },
        {
          useCache: true,
          ttl: CACHE_TTL.VIEWING_REQUESTS,
          _cached_key: cacheKey,
        }
      );

      console.log("Fetched viewing requests with properties:", viewingRequests);

      // Update current viewing requests
      if (Array.isArray(viewingRequests)) {
        setCurrentViewingRequests(viewingRequests);
      }

      return viewingRequests;
    } catch (error) {
      console.error("Error fetching viewing requests:", error);

      // If the explicit foreign key relationship fails, try a simpler approach
      console.log("Trying fallback query without explicit foreign key...");
      try {
        const fallbackRequests = await fetchData(
          {
            table: "viewing_requests",
            select: `
            *,
            properties (
              id,
              title,
              location,
              price,
              images,
              owner_id
            )
          `,
            filters: [{ column: "owner_id", operator: "eq", value: user.id }],
            orderBy: { column: "created_at", ascending: false },
          },
          {
            useCache: false, // Don't cache fallback
            ttl: CACHE_TTL.VIEWING_REQUESTS,
          }
        );

        console.log("Fallback viewing requests:", fallbackRequests);

        if (Array.isArray(fallbackRequests)) {
          setCurrentViewingRequests(fallbackRequests);
        }

        return fallbackRequests;
      } catch (fallbackError) {
        console.error("Fallback query also failed:", fallbackError);
        return [];
      }
    }
  };

  const getRentalApplications = async () => {
    if (!user) return [];
    const cacheKey = `owner_applications_${user.id}`;

    try {
      console.log("Fetching applications for owner:", user.id);

      const applications = await fetchData(
        {
          table: "rental_applications",
          select: `
          *,
          properties!rental_applications_property_id_fkey (
            id,
            title,
            location,
            price,
            images,
            owner_id
          )
        `,
          filters: [{ column: "owner_id", operator: "eq", value: user.id }],
          orderBy: { column: "created_at", ascending: false },
        },
        {
          useCache: true,
          ttl: CACHE_TTL.APPLICATIONS,
          _cached_key: cacheKey,
        }
      );

      console.log("Fetched applications with properties:", applications);

      // Update current applications
      if (Array.isArray(applications)) {
        setCurrentApplications(applications);
      }

      return applications;
    } catch (error) {
      console.error("Error fetching applications:", error);

      // If the explicit foreign key relationship fails, try a simpler approach
      console.log("Trying fallback query for applications...");
      try {
        const fallbackApplications = await fetchData(
          {
            table: "rental_applications",
            select: `
            *,
            properties (
              id,
              title,
              location,
              price,
              images,
              owner_id
            )
          `,
            filters: [{ column: "owner_id", operator: "eq", value: user.id }],
            orderBy: { column: "created_at", ascending: false },
          },
          {
            useCache: false, // Don't cache fallback
            ttl: CACHE_TTL.APPLICATIONS,
          }
        );

        console.log("Fallback applications:", fallbackApplications);

        if (Array.isArray(fallbackApplications)) {
          setCurrentApplications(fallbackApplications);
        }

        return fallbackApplications;
      } catch (fallbackError) {
        console.error(
          "Fallback query for applications also failed:",
          fallbackError
        );
        return [];
      }
    }
  };

  // User data functions
  const getUserFavorites = async () => {
    if (!user) return [];
    const cacheKey = `user_favorites_${user.id}`;

    try {
      console.log("Fetching user favorites for:", user.id);

      const userFavorites = await fetchData(
        {
          table: "favorites",
          select: `
          id,
          property_id,
          properties!favorites_property_id_fkey (
            id,
            title,
            location,
            price,
            bedrooms,
            bathrooms,
            images,
            owner_id
          )
        `,
          filters: [{ column: "user_id", operator: "eq", value: user.id }],
          orderBy: { column: "created_at", ascending: false },
        },
        {
          useCache: true,
          ttl: CACHE_TTL.FAVORITES,
          _cached_key: cacheKey,
        }
      );

      console.log("Fetched user favorites with properties:", userFavorites);

      // Update current user favorites
      if (Array.isArray(userFavorites)) {
        setCurrentUserFavorites(userFavorites);
      }

      return userFavorites;
    } catch (error) {
      console.error("Error fetching user favorites:", error);

      // If the explicit foreign key relationship fails, try a simpler approach
      console.log("Trying fallback query for user favorites...");
      try {
        const fallbackFavorites = await fetchData(
          {
            table: "favorites",
            select: `
            id,
            property_id,
            properties (
              id,
              title,
              location,
              price,
              bedrooms,
              bathrooms,
              images,
              owner_id
            )
          `,
            filters: [{ column: "user_id", operator: "eq", value: user.id }],
            orderBy: { column: "created_at", ascending: false },
          },
          {
            useCache: false, // Don't cache fallback
            ttl: CACHE_TTL.FAVORITES,
          }
        );

        console.log("Fallback user favorites:", fallbackFavorites);

        if (Array.isArray(fallbackFavorites)) {
          setCurrentUserFavorites(fallbackFavorites);
        }

        return fallbackFavorites;
      } catch (fallbackError) {
        console.error(
          "Fallback query for user favorites also failed:",
          fallbackError
        );
        return [];
      }
    }
  };

  const getUserApplications = async () => {
    if (!user) return [];
    const cacheKey = `user_applications_${user.id}`;

    try {
      console.log("Fetching user applications for:", user.id);

      const userApplications = await fetchData(
        {
          table: "rental_applications",
          select: `
          *,
          properties!rental_applications_property_id_fkey (
            id,
            title,
            location,
            price,
            images,
            owner_id
          )
        `,
          filters: [{ column: "user_id", operator: "eq", value: user.id }],
          orderBy: { column: "created_at", ascending: false },
        },
        {
          useCache: true,
          ttl: CACHE_TTL.APPLICATIONS,
          _cached_key: cacheKey,
        }
      );

      console.log(
        "Fetched user applications with properties:",
        userApplications
      );

      // Update current user applications
      if (Array.isArray(userApplications)) {
        setCurrentUserApplications(userApplications);
      }

      return userApplications;
    } catch (error) {
      console.error("Error fetching user applications:", error);

      // If the explicit foreign key relationship fails, try a simpler approach
      console.log("Trying fallback query for user applications...");
      try {
        const fallbackApplications = await fetchData(
          {
            table: "rental_applications",
            select: `
            *,
            properties (
              id,
              title,
              location,
              price,
              images,
              owner_id
            )
          `,
            filters: [{ column: "user_id", operator: "eq", value: user.id }],
            orderBy: { column: "created_at", ascending: false },
          },
          {
            useCache: false, // Don't cache fallback
            ttl: CACHE_TTL.APPLICATIONS,
          }
        );

        console.log("Fallback user applications:", fallbackApplications);

        if (Array.isArray(fallbackApplications)) {
          setCurrentUserApplications(fallbackApplications);
        }

        return fallbackApplications;
      } catch (fallbackError) {
        console.error(
          "Fallback query for user applications also failed:",
          fallbackError
        );
        return [];
      }
    }
  };

  const getUserViewingRequests = async () => {
    if (!user) return [];
    const cacheKey = `user_viewing_requests_${user.id}`;

    try {
      console.log("Fetching user viewing requests for:", user.id);

      const userViewingRequests = await fetchData(
        {
          table: "viewing_requests",
          select: `
          *,
          properties!viewing_requests_property_id_fkey (
            id,
            title,
            location,
            price,
            images,
            owner_id
          )
        `,
          filters: [{ column: "user_id", operator: "eq", value: user.id }],
          orderBy: { column: "created_at", ascending: false },
        },
        {
          useCache: true,
          ttl: CACHE_TTL.VIEWING_REQUESTS,
          _cached_key: cacheKey,
        }
      );

      console.log(
        "Fetched user viewing requests with properties:",
        userViewingRequests
      );

      // Update current user viewing requests
      if (Array.isArray(userViewingRequests)) {
        setCurrentUserViewingRequests(userViewingRequests);
      }

      return userViewingRequests;
    } catch (error) {
      console.error("Error fetching user viewing requests:", error);

      // If the explicit foreign key relationship fails, try a simpler approach
      console.log("Trying fallback query for user viewing requests...");
      try {
        const fallbackRequests = await fetchData(
          {
            table: "viewing_requests",
            select: `
            *,
            properties (
              id,
              title,
              location,
              price,
              images,
              owner_id
            )
          `,
            filters: [{ column: "user_id", operator: "eq", value: user.id }],
            orderBy: { column: "created_at", ascending: false },
          },
          {
            useCache: false, // Don't cache fallback
            ttl: CACHE_TTL.VIEWING_REQUESTS,
          }
        );

        console.log("Fallback user viewing requests:", fallbackRequests);

        if (Array.isArray(fallbackRequests)) {
          setCurrentUserViewingRequests(fallbackRequests);
        }

        return fallbackRequests;
      } catch (fallbackError) {
        console.error(
          "Fallback query for user viewing requests also failed:",
          fallbackError
        );
        return [];
      }
    }
  };

  // ----- PROPERTY MANAGEMENT FUNCTIONS -----
  const handleEditProperty = (propertyId) => {
    setEditPropertyId(propertyId);
    setShowAddPropertyModal(true);
  };

  const handleDeleteProperty = async (propertyId) => {
    if (!confirm("Are you sure you want to delete this property?")) {
      return;
    }

    try {
      const { error } = await propertyService.deleteProperty(propertyId);
      if (error) throw error;

      // Invalidate related caches
      invalidateCache(`owner_properties_${user.id}`);
      invalidateCache(`owner_viewing_requests_${user.id}`);
      invalidateCache(`owner_applications_${user.id}`);

      toast.success("Property deleted successfully");
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error("Failed to delete property. Please try again.");
    }
  };

  const handleSaveProperty = async (formData) => {
    try {
      let result;

      if (editPropertyId) {
        // Update existing property
        const { data, error } = await propertyService.updateProperty(
          editPropertyId,
          formData
        );
        if (error) throw error;
        result = data;
        toast.success("Property updated successfully");
      } else {
        // Add new property
        const { data, error } = await propertyService.createProperty({
          ...formData,
          owner_id: user.id,
        });
        if (error) throw error;
        result = data;
        toast.success("Property added successfully");
      }

      // Invalidate cache to refresh data
      invalidateCache(`owner_properties_${user.id}`);

      // Close modal
      setShowAddPropertyModal(false);
      setEditPropertyId(null);
    } catch (error) {
      console.error("Error saving property:", error);
      toast.error("Failed to save property. Please try again.");
    }
  };

  // ----- STATUS UPDATE FUNCTIONS -----
  const handleViewingRequestStatusUpdate = async (requestId, status) => {
    try {
      const { data, error } = await propertyService.updateViewingRequestStatus(
        requestId,
        status
      );
      if (error) throw error;

      // Invalidate relevant caches
      invalidateCache(`owner_viewing_requests_${user.id}`);
      invalidateCache(`user_viewing_requests_${user.id}`);

      toast.success(`Viewing request ${status}`);
    } catch (error) {
      console.error("Error updating viewing request:", error);
      toast.error("Failed to update viewing request. Please try again.");
    }
  };

  const handleApplicationStatusUpdate = async (applicationId, status) => {
    try {
      const { data, error } = await propertyService.updateApplicationStatus(
        applicationId,
        status
      );
      if (error) throw error;

      // Invalidate relevant caches
      invalidateCache(`owner_applications_${user.id}`);
      invalidateCache(`user_applications_${user.id}`);

      toast.success(`Application ${status}`);
    } catch (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application. Please try again.");
    }
  };

  // ----- USER FUNCTIONS -----
  // const removeFavorite = async (favoriteId) => {
  //   try {
  //     const { error } = await supabase
  //       .from("favorites")
  //       .delete()
  //       .eq("id", favoriteId);

  //     if (error) throw error;

  //     // Invalidate cache
  //     invalidateCache(`user_favorites_${user.id}`);

  //     toast.success("Property removed from favorites");
  //   } catch (error) {
  //     console.error("Error removing favorite:", error);
  //     toast.error("Failed to remove property from favorites");
  //   }
  // };
  const handleRemoveFavorite = async () => {
    const result = await removeFavorite("favorite-id-here");
    if (result.success) console.log("Favorite removed");
  };

  // Function to handle user application updates
  const handleUserApplicationUpdate = (updatedApplications) => {
    setCurrentUserApplications(updatedApplications);

    // Also update the cache
    const cacheKey = `user_applications_${user.id}`;
    updateData(cacheKey, updatedApplications);
  };

  // ----- HELPER FUNCTIONS -----
  // Force refresh function
  const forceRefresh = () => {
    if (!user) return;

    if (isOwner(userRole)) {
      invalidateCache(`owner_properties_${user.id}`);
      invalidateCache(`owner_viewing_requests_${user.id}`);
      invalidateCache(`owner_applications_${user.id}`);
    } else {
      invalidateCache(`user_favorites_${user.id}`);
      invalidateCache(`user_applications_${user.id}`);
      invalidateCache(`user_viewing_requests_${user.id}`);
    }
  };

  // Get property being edited using currentProperties state
  const propertyToEdit =
    editPropertyId && Array.isArray(currentProperties)
      ? currentProperties.find((property) => property.id === editPropertyId)
      : null;

  // Get viewing requests data and loading state
  const getViewingRequestsData = () => {
    if (!user?.id || !isOwner(userRole)) return { data: [], loading: false };

    const cacheKey = `owner_viewing_requests_${user.id}`;
    const isLoading = loading[cacheKey];
    const requestsData = data[cacheKey] || currentViewingRequests;

    // If no data and not loading, trigger fetch
    if (!requestsData?.length && !isLoading && activeTab === "viewings") {
      getViewingRequests();
    }

    return {
      data: Array.isArray(requestsData) ? requestsData : [],
      loading: Boolean(isLoading),
    };
  };

  // Get applications data and loading state
  const getApplicationsData = () => {
    if (!user?.id || !isOwner(userRole)) return { data: [], loading: false };

    const cacheKey = `owner_applications_${user.id}`;
    const isLoading = loading[cacheKey];
    const applicationsData = data[cacheKey] || currentApplications;

    // If no data and not loading, trigger fetch
    if (
      !applicationsData?.length &&
      !isLoading &&
      activeTab === "applications"
    ) {
      getRentalApplications();
    }

    return {
      data: Array.isArray(applicationsData) ? applicationsData : [],
      loading: Boolean(isLoading),
    };
  };

  // Get user viewing requests data and loading state
  const getUserViewingRequestsData = () => {
    if (!user?.id || !isUser(userRole)) return { data: [], loading: false };

    const cacheKey = `user_viewing_requests_${user.id}`;
    const isLoading = loading[cacheKey];
    const requestsData = data[cacheKey] || currentUserViewingRequests;

    // If no data and not loading, trigger fetch
    if (
      !requestsData?.length &&
      !isLoading &&
      activeTab === "viewingRequests"
    ) {
      getUserViewingRequests();
    }

    return {
      data: Array.isArray(requestsData) ? requestsData : [],
      loading: Boolean(isLoading),
    };
  };

  // Get user applications data and loading state
  const getUserApplicationsData = () => {
    if (!user?.id || !isUser(userRole)) return { data: [], loading: false };

    const cacheKey = `user_applications_${user.id}`;
    const isLoading = loading[cacheKey];
    const applicationsData = data[cacheKey] || currentUserApplications;

    // If no data and not loading, trigger fetch
    if (
      !applicationsData?.length &&
      !isLoading &&
      activeTab === "applications"
    ) {
      getUserApplications();
    }

    return {
      data: Array.isArray(applicationsData) ? applicationsData : [],
      loading: Boolean(isLoading),
    };
  };

  // Get user favorites data and loading state
  const getUserFavoritesData = () => {
    if (!user?.id || !isUser(userRole)) return { data: [], loading: false };

    const cacheKey = `user_favorites_${user.id}`;
    const isLoading = loading[cacheKey];
    const favoritesData = data[cacheKey] || currentUserFavorites;

    // If no data and not loading, trigger fetch
    if (!favoritesData?.length && !isLoading && activeTab === "favorites") {
      getUserFavorites();
    }

    return {
      data: Array.isArray(favoritesData) ? favoritesData : [],
      loading: Boolean(isLoading),
    };
  };

  // Loading state for initial user role determination
  if (!userRole) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="relative h-24 w-24 mb-4">
            <div className="absolute inset-0 border-4 border-custom-orange border-opacity-20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-custom-orange rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-custom-orange text-sm font-medium">
                Loading...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen w-screen overflow-hidden">
        {/* Sidebar */}
        <div className="h-full">
          <DashboardSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            user={user}
            profile={profile}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-100 py-20 sm:py-10 px-10">
          {/* Admin Dashboard */}
          {userRole === "admin" && (
            <div>
              {/* Users Management Tab */}
              {activeTab === "users" && (
                <AdminUsersTab
                  onUpdateRole={handleRoleChange}
                  onRefresh={() => {
                    invalidateCache("admin_all_users");
                    getAllUsers();
                  }}
                />
              )}

              {/* All Properties Tab */}
              {activeTab === "properties" && (
                <AdminPropertiesTab
                  onRefresh={() => {
                    invalidateCache("admin_all_properties");
                    getAllProperties();
                  }}
                />
              )}

              {/* System Analytics Tab */}
              {activeTab === "analytics" && (
                <AdminAnalyticsTab
                  onRefresh={() => {
                    invalidateCache("admin_analytics");
                    getSystemAnalytics();
                  }}
                />
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <SettingsTab user={user} profile={profile} />
              )}
            </div>
          )}

          {/* Owner Dashboard */}
          {isOwner(userRole) && (
            <div>
              {/* Properties Tab */}
              {activeTab === "properties" && (
                <PropertiesTab
                  onEdit={handleEditProperty}
                  onDelete={handleDeleteProperty}
                  onAddNew={() => {
                    setEditPropertyId(null);
                    setShowAddPropertyModal(true);
                  }}
                  onViewAllRequests={() => setActiveTab("viewings")}
                  onViewAllApplications={() => setActiveTab("applications")}
                  onRefresh={forceRefresh}
                />
              )}

              {/* Viewing Requests Tab */}
              {activeTab === "viewings" && (
                <OwnerViewingRequestsTab
                  viewingRequests={getViewingRequestsData().data}
                  loading={getViewingRequestsData().loading}
                  error={null}
                  onStatusUpdate={handleViewingRequestStatusUpdate}
                  onRefresh={() => {
                    invalidateCache(`owner_viewing_requests_${user.id}`);
                    getViewingRequests();
                  }}
                />
              )}

              {/* Applications Tab */}
              {activeTab === "applications" && (
                <ApplicationsTab
                  applications={getApplicationsData().data}
                  loading={getApplicationsData().loading}
                  error={null}
                  onStatusUpdate={handleApplicationStatusUpdate}
                  onRefresh={() => {
                    invalidateCache(`owner_applications_${user.id}`);
                    getRentalApplications();
                  }}
                />
              )}

              {activeTab === "payments" && (
                <PaymentsTab
                  onRefresh={() => {
                    invalidateCache(`owner_payments_${user.id}`);
                  }}
                />
              )}

              {/* Analytics Tab */}
              {activeTab === "analytics" && (
                <AnalyticsTab
                  properties={getOwnerProperties}
                  viewingRequests={getViewingRequests}
                  applications={getRentalApplications}
                  onRefresh={forceRefresh}
                />
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <SettingsTab user={user} profile={profile} />
              )}
            </div>
          )}

          {/* User Dashboard */}
          {isUser(userRole) && (
            <div>
              {/* Viewing Requests Tab */}
              {activeTab === "viewingRequests" && (
                <UserViewingRequestsTab
                  viewingRequests={getUserViewingRequestsData().data}
                  loading={getUserViewingRequestsData().loading}
                  onRefresh={() => {
                    invalidateCache(`user_viewing_requests_${user.id}`);
                    getUserViewingRequests();
                  }}
                />
              )}

              {/* Applications Tab */}
              {activeTab === "applications" && (
                <PropertyApplications
                  applications={getUserApplicationsData().data}
                  setApplications={handleUserApplicationUpdate}
                  loading={getUserApplicationsData().loading}
                  onRefresh={() => {
                    invalidateCache(`user_applications_${user.id}`);
                    getUserApplications();
                  }}
                />
              )}

              {/* Favorites Tab */}
              {activeTab === "favorites" && (
                <SavedProperties
                  favorites={getUserFavoritesData().data}
                  loadingFavorites={getUserFavoritesData().loading}
                  onRemoveFavorite={handleRemoveFavorite}
                  onRefresh={() => {
                    invalidateCache(`user_favorites_${user.id}`);
                    getUserFavorites();
                  }}
                />
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <SettingsTab user={user} profile={profile} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Property Modal */}
      {isOwner(userRole) && showAddPropertyModal && (
        <AddEditPropertyModal
          isOpen={showAddPropertyModal}
          onClose={() => {
            setShowAddPropertyModal(false);
            setEditPropertyId(null);
          }}
          property={propertyToEdit}
          onSave={handleSaveProperty}
        />
      )}
    </ProtectedRoute>
  );
}
