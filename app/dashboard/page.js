"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
import PropertyApplications from "@/components/dashboards/user/tabs/PropertyApplications";
import SavedProperties from "@/components/dashboards/user/tabs/SavedProperties";
import UserViewingRequestsTab from "@/components/dashboards/user/tabs/ViewingRequestsTab";

// Cache TTL constants
const CACHE_TTL = {
  PROPERTIES: 10 * 60 * 1000, // 10 minutes
  VIEWING_REQUESTS: 5 * 60 * 1000, // 5 minutes
  APPLICATIONS: 5 * 60 * 1000, // 5 minutes
  FAVORITES: 10 * 60 * 1000, // 10 minutes
};

// Dashboard skeleton loader component
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
  const { fetchData, updateData, invalidateCache, loading, data } = useGlobalData();

  // State management
  const [mounted, setMounted] = useState(false);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [editPropertyId, setEditPropertyId] = useState(null);

  // FIXED: Add state to store the actual properties data for editing
  const [currentProperties, setCurrentProperties] = useState([]);

  // Define default active tabs based on role
  const defaultOwnerTab = "properties";
  const defaultUserTab = "viewingRequests";

  // Active tab state
  const [activeTab, setActiveTab] = useState(() => {
    return userRole === "owner" ? defaultOwnerTab : defaultUserTab;
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
        setActiveTab(userRole === "owner" ? defaultOwnerTab : defaultUserTab);
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

  // FIXED: Get current properties from GlobalDataContext data
  useEffect(() => {
    if (user?.id && userRole === 'owner') {
      const cacheKey = `owner_properties_${user.id}`;
      const properties = data[cacheKey];
      
      if (Array.isArray(properties)) {
        setCurrentProperties(properties);
      }
    }
  }, [data, user?.id, userRole]);

  // ----- DATA FETCHING FUNCTIONS USING GLOBAL CONTEXT -----

  // Owner data functions
  const getOwnerProperties = async () => {
    if (!user) return [];
    const cacheKey = `owner_properties_${user.id}`;
    
    try {
      const properties = await fetchData({
        table: 'properties',
        select: '*',
        filters: [{ column: 'owner_id', operator: 'eq', value: user.id }],
        orderBy: { column: 'created_at', ascending: false }
      }, { 
        useCache: true, 
        ttl: CACHE_TTL.PROPERTIES,
        _cached_key: cacheKey 
      });
      
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
      return await fetchData({
        table: 'viewing_requests',
        select: '*',
        filters: [{ column: 'owner_id', operator: 'eq', value: user.id }],
        orderBy: { column: 'created_at', ascending: false }
      }, { 
        useCache: true, 
        ttl: CACHE_TTL.VIEWING_REQUESTS,
        _cached_key: cacheKey 
      });
    } catch (error) {
      console.error("Error fetching viewing requests:", error);
      return [];
    }
  };

  const getRentalApplications = async () => {
    if (!user) return [];
    const cacheKey = `owner_applications_${user.id}`;
    
    try {
      return await fetchData({
        table: 'rental_applications',
        select: '*',
        filters: [{ column: 'owner_id', operator: 'eq', value: user.id }],
        orderBy: { column: 'created_at', ascending: false }
      }, { 
        useCache: true, 
        ttl: CACHE_TTL.APPLICATIONS,
        _cached_key: cacheKey 
      });
    } catch (error) {
      console.error("Error fetching applications:", error);
      return [];
    }
  };

  // User data functions
  const getUserFavorites = async () => {
    if (!user) return [];
    const cacheKey = `user_favorites_${user.id}`;
    
    try {
      return await fetchData({
        table: 'favorites',
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
        filters: [{ column: 'user_id', operator: 'eq', value: user.id }],
        orderBy: { column: 'created_at', ascending: false }
      }, { 
        useCache: true, 
        ttl: CACHE_TTL.FAVORITES,
        _cached_key: cacheKey 
      });
    } catch (error) {
      console.error("Error fetching favorites:", error);
      return [];
    }
  };

  const getUserApplications = async () => {
    if (!user) return [];
    const cacheKey = `user_applications_${user.id}`;
    
    try {
      return await fetchData({
        table: 'rental_applications',
        select: `
          *,
          properties (
            id,
            title,
            location,
            price,
            images
          )
        `,
        filters: [{ column: 'user_id', operator: 'eq', value: user.id }],
        orderBy: { column: 'created_at', ascending: false }
      }, { 
        useCache: true, 
        ttl: CACHE_TTL.APPLICATIONS,
        _cached_key: cacheKey 
      });
    } catch (error) {
      console.error("Error fetching user applications:", error);
      return [];
    }
  };

  const getUserViewingRequests = async () => {
    if (!user) return [];
    const cacheKey = `user_viewing_requests_${user.id}`;
    
    try {
      return await fetchData({
        table: 'viewing_requests',
        select: `
          *,
          properties (
            id,
            title,
            location,
            price,
            images
          )
        `,
        filters: [{ column: 'user_id', operator: 'eq', value: user.id }],
        orderBy: { column: 'created_at', ascending: false }
      }, { 
        useCache: true, 
        ttl: CACHE_TTL.VIEWING_REQUESTS,
        _cached_key: cacheKey 
      });
    } catch (error) {
      console.error("Error fetching user viewing requests:", error);
      return [];
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
      invalidateCache(`user_viewing_requests`);

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
      invalidateCache(`user_applications`);

      toast.success(`Application ${status}`);
    } catch (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application. Please try again.");
    }
  };

  // ----- USER FUNCTIONS -----
  
  const removeFavorite = async (favoriteId) => {
    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;

      // Invalidate cache
      invalidateCache(`user_favorites_${user.id}`);

      toast.success("Property removed from favorites");
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Failed to remove property from favorites");
    }
  };

  // ----- HELPER FUNCTIONS -----
  
  // Force refresh function
  const forceRefresh = () => {
    if (!user) return;
    
    if (userRole === 'owner') {
      invalidateCache(`owner_properties_${user.id}`);
      invalidateCache(`owner_viewing_requests_${user.id}`);
      invalidateCache(`owner_applications_${user.id}`);
    } else {
      invalidateCache(`user_favorites_${user.id}`);
      invalidateCache(`user_applications_${user.id}`);
      invalidateCache(`user_viewing_requests_${user.id}`);
    }
  };

  // FIXED: Get property being edited using currentProperties state
  const propertyToEdit = editPropertyId && Array.isArray(currentProperties)
    ? currentProperties.find(property => property.id === editPropertyId)
    : null;

  // Loading state for initial user role determination
  if (!userRole) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="relative h-24 w-24 mb-4">
            <div className="absolute inset-0 border-4 border-custom-red border-opacity-20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-custom-red rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-custom-red text-sm font-medium">Loading...</span>
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
          {/* Owner Dashboard */}
          {userRole === "owner" && (
            <div>
              {/* Properties Tab - Updated to use new PropertiesTab */}
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

              {/* Other tabs would go here */}
              {activeTab === "viewings" && (
                <div className="text-center py-12">
                  <p>Viewing Requests Tab - Coming Soon</p>
                </div>
              )}

              {activeTab === "applications" && (
                <div className="text-center py-12">
                  <p>Applications Tab - Coming Soon</p>
                </div>
              )}

              {activeTab === "analytics" && (
                <div className="text-center py-12">
                  <p>Analytics Tab - Coming Soon</p>
                </div>
              )}

              {activeTab === "settings" && (
                <SettingsTab user={user} profile={profile} />
              )}
            </div>
          )}

          {/* User Dashboard */}
          {userRole === "user" && (
            <div>
              {activeTab === "viewingRequests" && (
                <div className="text-center py-12">
                  <p>User Viewing Requests Tab - Coming Soon</p>
                </div>
              )}

              {activeTab === "applications" && (
                <div className="text-center py-12">
                  <p>User Applications Tab - Coming Soon</p>
                </div>
              )}

              {activeTab === "favorites" && (
                <div className="text-center py-12">
                  <p>User Favorites Tab - Coming Soon</p>
                </div>
              )}

              {activeTab === "settings" && (
                <SettingsTab user={user} profile={profile} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Property Modal */}
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