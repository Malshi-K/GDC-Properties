"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";

// Import services
import { propertyService } from "@/lib/services/propertyService";

// Import shared components
import SettingsTab from "@/components/dashboards/common/SettingsTab";

// Import owner components
import PropertiesTab from "@/components/dashboards/owner/tabs/PropertiesTab";
import OwnerViewingRequestsTab from "@/components/dashboards/owner/tabs/ViewingRequestsTab";
import ApplicationsTab from "@/components/dashboards/owner/tabs/ApplicationsTab";
import AnalyticsTab from "@/components/dashboards/owner/tabs/AnalyticsTab";
import AddEditPropertyModal from "@/components/dashboards/owner/property/AddEditPropertyModal";

// Import user components
import PropertyApplications from "@/components/dashboards/user/tabs/PropertyApplications";
import SavedProperties from "@/components/dashboards/user/tabs/SavedProperties";
import UserViewingRequestsTab from "@/components/dashboards/user/tabs/ViewingRequestsTab";
import DashboardSidebar from "@/components/dashboards/common/DashboardSidebar";

// Dashboard data tabs skeleton loader component
const TabSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
    <div className="space-y-4">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="bg-gray-200 rounded h-24"></div>
      ))}
    </div>
  </div>
);

export default function Dashboard() {
  const { user, profile, userRole, isLoading } = useAuth();

  // State to track if component is mounted (for local storage operations)
  const [mounted, setMounted] = useState(false);

  // Define default active tabs based on role
  const defaultOwnerTab = "properties";
  const defaultUserTab = "viewingRequests";

  // Initialize active tab state with appropriate default
  const [activeTab, setActiveTab] = useState(() => {
    // We'll set this properly after component mounts
    return userRole === "owner" ? defaultOwnerTab : defaultUserTab;
  });

  // Handle localStorage for tab persistence after component mounts
  useEffect(() => {
    setMounted(true);

    // Get saved tab from localStorage if it exists
    if (typeof window !== "undefined") {
      const storageKey = `dashboard_${userRole}_tab`;
      const savedTab = localStorage.getItem(storageKey);

      if (savedTab) {
        setActiveTab(savedTab);
      } else {
        // Set default if no saved tab
        setActiveTab(userRole === "owner" ? defaultOwnerTab : defaultUserTab);
      }
    }
  }, [userRole]);

  // Save active tab to localStorage when it changes
  useEffect(() => {
    if (mounted && typeof window !== "undefined" && userRole) {
      const storageKey = `dashboard_${userRole}_tab`;
      localStorage.setItem(storageKey, activeTab);
    }
  }, [activeTab, userRole, mounted]);

  // ----- OWNER DASHBOARD STATE & FUNCTIONS -----
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [editPropertyId, setEditPropertyId] = useState(null);
  const [properties, setProperties] = useState([]);
  const [viewingRequests, setViewingRequests] = useState([]);
  const [rentalApplications, setRentalApplications] = useState([]);
  const [loading, setLoading] = useState({
    properties: true,
    viewings: true,
    applications: true,
    favorites: true,
  });
  const [error, setError] = useState({
    properties: null,
    viewings: null,
    applications: null,
    favorites: null,
  });

  // ----- USER DASHBOARD STATE & FUNCTIONS -----
  const [favorites, setFavorites] = useState([]);
  const [userApplications, setUserApplications] = useState([]);
  const [userViewingRequests, setUserViewingRequests] = useState([]);

  // ----- IMPROVED CACHE SYSTEM FOR ALL DATA -----
  // Cache state with expiry timestamps for both owner and user data
  const [dataCache, setDataCache] = useState({
    // Owner data
    properties: { data: null, timestamp: null },
    viewingRequests: { data: null, timestamp: null },
    applications: { data: null, timestamp: null },
    // User data
    favorites: { data: null, timestamp: null },
    userApplications: { data: null, timestamp: null },
    userViewingRequests: { data: null, timestamp: null },
  });

  // Cache expiry - 5 minutes
  const CACHE_EXPIRY = 5 * 60 * 1000;

  // Function to determine if cached data is valid and exists
  const isCacheValid = (key) => {
    if (!dataCache[key]?.data || !dataCache[key]?.timestamp) return false;
    return Date.now() - dataCache[key].timestamp < CACHE_EXPIRY;
  };

  // ----- IMPROVED DATA LOADING -----
  // Unified fetch approach that uses cache
  useEffect(() => {
    // Don't attempt to load if user data isn't ready
    if (!user || !userRole || !mounted) return;

    // Load data based on user role
    if (userRole === "owner") {
      // Only fetch properties when they're needed and not already cached
      if (activeTab === "properties" && !isCacheValid("properties")) {
        fetchProperties(false); // false = don't force reload
      }
      // Only fetch viewing requests when needed and not already cached
      if (
        (activeTab === "viewings" || activeTab === "properties") &&
        !isCacheValid("viewingRequests")
      ) {
        fetchViewingRequests(false);
      }
      // Only fetch applications when needed and not already cached
      if (
        (activeTab === "applications" || activeTab === "properties") &&
        !isCacheValid("applications")
      ) {
        fetchRentalApplications(false);
      }
    } else if (userRole === "user") {
      // Load data for the active tab if not cached
      const tabDataMap = {
        favorites: () =>
          !isCacheValid("favorites") && fetchUserFavorites(false),
        applications: () =>
          !isCacheValid("userApplications") && fetchUserApplications(false),
        viewingRequests: () =>
          !isCacheValid("userViewingRequests") &&
          fetchUserViewingRequests(false),
      };

      // Execute the appropriate fetch function if it exists for this tab
      if (tabDataMap[activeTab]) {
        tabDataMap[activeTab]();
      }
    }
  }, [user, userRole, activeTab, mounted]);

  // ----- OWNER DATA LOADING FUNCTIONS -----
  const fetchProperties = async (forceReload = true) => {
    // If we have valid cached data and we're not forcing a reload, use cache
    if (isCacheValid("properties") && !forceReload) {
      setProperties(dataCache.properties.data);
      setLoading((prev) => ({ ...prev, properties: false }));
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, properties: true }));

      // Fetch properties
      const { data: propertiesData, error: propertiesError } =
        await propertyService.getOwnerProperties();

      if (propertiesError) throw propertiesError;

      // Get viewing requests and applications data (prefer cached if available)
      let viewingData = [];
      let applicationsData = [];

      if (isCacheValid("viewingRequests")) {
        viewingData = dataCache.viewingRequests.data;
      } else {
        const { data, error } = await propertyService.getAllViewingRequests();
        if (!error) {
          viewingData = data || [];
          // Update the cache
          setDataCache((prev) => ({
            ...prev,
            viewingRequests: { data: viewingData, timestamp: Date.now() },
          }));
          setViewingRequests(viewingData);
        }
      }

      if (isCacheValid("applications")) {
        applicationsData = dataCache.applications.data;
      } else {
        const { data, error } = await propertyService.getAllApplications();
        if (!error) {
          applicationsData = data || [];
          // Update the cache
          setDataCache((prev) => ({
            ...prev,
            applications: { data: applicationsData, timestamp: Date.now() },
          }));
          setRentalApplications(applicationsData);
        }
      }

      // Combine the data
      const propertiesWithRelatedData = propertiesData.map((property) => ({
        ...property,
        viewing_requests: viewingData.filter(
          (req) => req.property_id === property.id
        ),
        applications: applicationsData.filter(
          (app) => app.property_id === property.id
        ),
      }));

      // Update states and cache
      setProperties(propertiesWithRelatedData || []);
      setDataCache((prev) => ({
        ...prev,
        properties: { data: propertiesWithRelatedData, timestamp: Date.now() },
      }));
      setError((prev) => ({ ...prev, properties: null }));
    } catch (err) {
      console.error("Error fetching properties:", err);
      setError((prev) => ({ ...prev, properties: err.message }));
      toast.error("Failed to load properties");
    } finally {
      setLoading((prev) => ({ ...prev, properties: false }));
    }
  };

  const fetchViewingRequests = async (forceReload = true) => {
    // If we have valid cached data and we're not forcing a reload, use cache
    if (isCacheValid("viewingRequests") && !forceReload) {
      setViewingRequests(dataCache.viewingRequests.data);
      setLoading((prev) => ({ ...prev, viewings: false }));
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, viewings: true }));
      const { data, error } = await propertyService.getAllViewingRequests();

      if (error) throw error;

      // Update state and cache
      setViewingRequests(data || []);
      setDataCache((prev) => ({
        ...prev,
        viewingRequests: { data: data || [], timestamp: Date.now() },
      }));
      setError((prev) => ({ ...prev, viewings: null }));
    } catch (err) {
      console.error("Error fetching viewing requests:", err);
      setError((prev) => ({ ...prev, viewings: err.message }));
      toast.error("Failed to load viewing requests");
    } finally {
      setLoading((prev) => ({ ...prev, viewings: false }));
    }
  };

  const fetchRentalApplications = async (forceReload = true) => {
    // If we have valid cached data and we're not forcing a reload, use cache
    if (isCacheValid("applications") && !forceReload) {
      setRentalApplications(dataCache.applications.data);
      setLoading((prev) => ({ ...prev, applications: false }));
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, applications: true }));
      const { data, error } = await propertyService.getAllApplications();

      if (error) throw error;

      // Update state and cache
      setRentalApplications(data || []);
      setDataCache((prev) => ({
        ...prev,
        applications: { data: data || [], timestamp: Date.now() },
      }));
      setError((prev) => ({ ...prev, applications: null }));
    } catch (err) {
      console.error("Error fetching applications:", err);
      setError((prev) => ({ ...prev, applications: err.message }));
      toast.error("Failed to load rental applications");
    } finally {
      setLoading((prev) => ({ ...prev, applications: false }));
    }
  };

  // Handle property actions
  const handleEditProperty = (propertyId) => {
    setEditPropertyId(propertyId);
    setShowAddPropertyModal(true);
  };

  const handleDeleteProperty = async (propertyId) => {
    if (confirm("Are you sure you want to delete this property?")) {
      try {
        const { error } = await propertyService.deleteProperty(propertyId);

        if (error) throw error;

        // Update local state and cache after successful deletion
        const updatedProperties = properties.filter(
          (property) => property.id !== propertyId
        );

        setProperties(updatedProperties);
        setDataCache((prev) => ({
          ...prev,
          properties: {
            data: updatedProperties,
            timestamp: Date.now(),
          },
        }));

        toast.success("Property deleted successfully");
      } catch (error) {
        console.error("Error deleting property:", error);
        toast.error("Failed to delete property. Please try again.");
      }
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

        // Update local state and cache
        const updatedProperties = properties.map((property) =>
          property.id === editPropertyId ? result : property
        );

        setProperties(updatedProperties);
        setDataCache((prev) => ({
          ...prev,
          properties: {
            data: updatedProperties,
            timestamp: Date.now(),
          },
        }));

        toast.success("Property updated successfully");
      } else {
        // Add new property
        const { data, error } = await propertyService.createProperty({
          ...formData,
          owner_id: user.id,
        });

        if (error) throw error;
        result = data;

        // Update local state and cache with newly created property
        const updatedProperties = [result, ...properties];

        setProperties(updatedProperties);
        setDataCache((prev) => ({
          ...prev,
          properties: {
            data: updatedProperties,
            timestamp: Date.now(),
          },
        }));

        toast.success("Property added successfully");
      }

      // Close modal after successful save
      setShowAddPropertyModal(false);
      setEditPropertyId(null);
    } catch (error) {
      console.error("Error saving property:", error);
      toast.error("Failed to save property. Please try again.");
    }
  };

  // Handle viewing request actions for owners
  const handleViewingRequestStatusUpdate = async (requestId, status) => {
    try {
      const { data, error } = await propertyService.updateViewingRequestStatus(
        requestId,
        status
      );

      if (error) throw error;

      // Update local state and cache
      const updatedRequests = viewingRequests.map((request) =>
        request.id === requestId ? { ...request, status } : request
      );

      setViewingRequests(updatedRequests);
      setDataCache((prev) => ({
        ...prev,
        viewingRequests: {
          data: updatedRequests,
          timestamp: Date.now(),
        },
      }));

      toast.success(`Viewing request ${status}`);
    } catch (error) {
      console.error("Error updating viewing request:", error);
      toast.error("Failed to update viewing request. Please try again.");
    }
  };

  // Handle rental application actions
  const handleApplicationStatusUpdate = async (applicationId, status) => {
    try {
      const { data, error } = await propertyService.updateApplicationStatus(
        applicationId,
        status
      );

      if (error) throw error;

      // Update local state and cache
      const updatedApplications = rentalApplications.map((application) =>
        application.id === applicationId
          ? { ...application, status }
          : application
      );

      setRentalApplications(updatedApplications);
      setDataCache((prev) => ({
        ...prev,
        applications: {
          data: updatedApplications,
          timestamp: Date.now(),
        },
      }));

      toast.success(`Application ${status}`);
    } catch (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application. Please try again.");
    }
  };

  // ----- USER DATA LOADING FUNCTIONS -----
  // Fetch user's favorite properties with caching
  const fetchUserFavorites = async (forceReload = true) => {
    if (!user) return;

    // Use cached data if available and not forcing reload
    if (isCacheValid("favorites") && !forceReload) {
      setFavorites(dataCache.favorites.data);
      setLoading((prev) => ({ ...prev, favorites: false }));
      return;
    }

    setLoading((prev) => ({ ...prev, favorites: true }));

    try {
      // Get favorites from Supabase
      const { data, error } = await supabase
        .from("favorites")
        .select(
          `
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
          `
        )
        .eq("user_id", user.id);

      if (error) throw error;

      // Filter out any null property entries
      const validData = data.filter((item) => item.properties !== null);

      // Format the data for display
      const formattedFavorites = validData.map((item) => ({
        id: item.id,
        propertyId: item.property_id,
        ...item.properties,
        owner_id: item.properties.owner_id,
      }));

      // Update state and cache
      setFavorites(formattedFavorites);
      setDataCache((prev) => ({
        ...prev,
        favorites: {
          data: formattedFavorites,
          timestamp: Date.now(),
        },
      }));
    } catch (error) {
      console.error("Error fetching favorites:", error);
      toast.error("Failed to load saved properties.");
    } finally {
      setLoading((prev) => ({ ...prev, favorites: false }));
    }
  };

  // Fetch rental applications for user with improved caching
  const fetchUserApplications = async (forceReload = true) => {
    if (!user) return;

    // Use cached data if available and not forcing reload
    if (isCacheValid("userApplications") && !forceReload) {
      setUserApplications(dataCache.userApplications.data);
      setLoading((prev) => ({ ...prev, applications: false }));
      return;
    }

    setLoading((prev) => ({ ...prev, applications: true }));

    try {
      // Get applications from Supabase
      const { data, error } = await supabase
        .from("rental_applications")
        .select(
          `
          *,
          properties (
            id,
            title,
            location,
            price,
            images
          )
        `
        )
        .eq("user_id", user.id);

      if (error) throw error;

      // Format the data for display
      const formattedApplications = data.map((item) => {
        // Get the first image from the images array if it exists
        const firstImage =
          item.properties?.images && item.properties.images.length > 0
            ? item.properties.images[0]
            : null;

        return {
          id: item.id,
          property_id: item.property_id,
          user_id: item.user_id,
          owner_id: item.owner_id,
          employment_status: item.employment_status,
          income: item.income,
          credit_score: item.credit_score,
          message: item.message,
          status: item.status,
          created_at: item.created_at,
          updated_at: item.updated_at,
          property_title: item.properties?.title || "Property",
          property_location: item.properties?.location || "",
          property_price: item.properties?.price || 0,
          property_image: firstImage || "",
        };
      });

      // Update state and cache
      setUserApplications(formattedApplications);
      setDataCache((prev) => ({
        ...prev,
        userApplications: {
          data: formattedApplications,
          timestamp: Date.now(),
        },
      }));
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications.");
    } finally {
      setLoading((prev) => ({ ...prev, applications: false }));
    }
  };

  // Fetch viewing requests for user with improved caching
  const fetchUserViewingRequests = async (forceReload = true) => {
    if (!user) return;

    // Use cached data if available and not forcing reload
    if (isCacheValid("userViewingRequests") && !forceReload) {
      setUserViewingRequests(dataCache.userViewingRequests.data);
      setLoading((prev) => ({ ...prev, viewings: false }));
      return;
    }

    setLoading((prev) => ({ ...prev, viewings: true }));

    try {
      // Get viewing requests from Supabase
      const { data, error } = await supabase
        .from("viewing_requests")
        .select(
          `
          *,
          properties (
            id,
            title,
            location,
            price,
            images
          )
        `
        )
        .eq("user_id", user.id);

      if (error) throw error;

      // Format the data for display
      const formattedRequests = data.map((item) => {
        // Get the first image from the images array if it exists
        const firstImage =
          item.properties?.images && item.properties.images.length > 0
            ? item.properties.images[0]
            : null;

        return {
          id: item.id,
          property_id: item.property_id,
          user_id: item.user_id,
          owner_id: item.owner_id,
          proposed_date: item.proposed_date,
          message: item.message,
          status: item.status,
          user_phone: item.user_phone,
          created_at: item.created_at,
          updated_at: item.updated_at,
          property_title: item.properties?.title || "Property",
          property_location: item.properties?.location || "",
          property_price: item.properties?.price || 0,
          property_image: firstImage || "",
        };
      });

      // Update state and cache
      setUserViewingRequests(formattedRequests);
      setDataCache((prev) => ({
        ...prev,
        userViewingRequests: {
          data: formattedRequests,
          timestamp: Date.now(),
        },
      }));
    } catch (error) {
      console.error("Error fetching viewing requests:", error);
      toast.error("Failed to load viewing requests.");
    } finally {
      setLoading((prev) => ({ ...prev, viewings: false }));
    }
  };

  // Remove a property from favorites
  const removeFavorite = async (favoriteId) => {
    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;

      // Update local state and cache
      const updatedFavorites = favorites.filter(
        (favorite) => favorite.id !== favoriteId
      );

      setFavorites(updatedFavorites);
      setDataCache((prev) => ({
        ...prev,
        favorites: {
          data: updatedFavorites,
          timestamp: Date.now(),
        },
      }));

      toast.success("Property removed from favorites");
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Failed to remove property from favorites");
    }
  };

  // Get property being edited if any
  const propertyToEdit = editPropertyId
    ? properties.find((property) => property.id === editPropertyId)
    : null;

  if (!userRole) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Loading dashboard...</h2>
          <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      {/* Remove the outer padding/margin and make dashboard full height and width */}
      <div className="flex h-screen w-screen overflow-hidden">
        {/* Sidebar - Fixed width with no margins/padding */}
        <div className="h-full">
          <DashboardSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            user={user}
            profile={profile}
          />
        </div>

        {/* Main Content Area - With scrolling */}
        <div className="flex-1 overflow-y-auto bg-gray-100 py-20 sm:py-10 px-10">
          {/* Main Content - Owner Dashboard */}
          {userRole === "owner" && (
            <div>
              {/* Properties Tab */}
              {activeTab === "properties" && (
                <PropertiesTab
                  properties={properties}
                  loading={loading.properties}
                  error={error.properties}
                  viewingRequests={viewingRequests}
                  applications={rentalApplications}
                  onEdit={handleEditProperty}
                  onDelete={handleDeleteProperty}
                  onAddNew={() => {
                    setEditPropertyId(null);
                    setShowAddPropertyModal(true);
                  }}
                  onViewAllRequests={() => setActiveTab("viewings")}
                  onViewAllApplications={() => setActiveTab("applications")}
                  onRefresh={() => fetchProperties(true)} // Force reload
                />
              )}

              {/* Viewing Requests Tab */}
              {activeTab === "viewings" && (
                <OwnerViewingRequestsTab
                  viewingRequests={viewingRequests}
                  loading={loading.viewings}
                  error={error.viewings}
                  onStatusUpdate={handleViewingRequestStatusUpdate}
                  onRefresh={() => fetchViewingRequests(true)} // Force reload
                />
              )}

              {/* Applications Tab */}
              {activeTab === "applications" && (
                <ApplicationsTab
                  applications={rentalApplications}
                  loading={loading.applications}
                  error={error.applications}
                  onStatusUpdate={handleApplicationStatusUpdate}
                  onRefresh={() => fetchRentalApplications(true)} // Force reload
                />
              )}

              {/* Analytics Tab */}
              {activeTab === "analytics" && <AnalyticsTab />}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <SettingsTab user={user} profile={profile} />
              )}
            </div>
          )}

          {/* Main Content - User Dashboard */}
          {userRole === "user" && (
            <div>
              {activeTab === "viewingRequests" && (
                <div>
                  {loading.viewings && !dataCache.userViewingRequests.data ? (
                    <TabSkeleton />
                  ) : (
                    <UserViewingRequestsTab
                      viewingRequests={userViewingRequests}
                      setViewingRequests={setUserViewingRequests}
                      isOwner={false}
                      loading={loading.viewings}
                    />
                  )}
                </div>
              )}

              {activeTab === "applications" && (
                <div>
                  {loading.applications && !dataCache.userApplications.data ? (
                    <TabSkeleton />
                  ) : (
                    <PropertyApplications
                      applications={userApplications}
                      setApplications={setUserApplications}
                      loading={loading.applications}
                    />
                  )}
                </div>
              )}

              {activeTab === "favorites" && (
                <div>
                  {loading.favorites && !dataCache.favorites.data ? (
                    <TabSkeleton />
                  ) : (
                    <SavedProperties
                      favorites={favorites}
                      loadingFavorites={loading.favorites}
                      onRemoveFavorite={removeFavorite}
                    />
                  )}
                </div>
              )}

              {activeTab === "settings" && (
                <SettingsTab user={user} profile={profile} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Property Modal - Only for owner */}
      {userRole === "owner" && showAddPropertyModal && (
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
