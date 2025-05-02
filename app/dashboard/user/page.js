"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";

// Import components
import DashboardSidebar from "@/components/dashboards/user/DashboardSidebar";
import PropertyApplications from "@/components/dashboards/user/tabs/PropertyApplications";
import SavedProperties from "@/components/dashboards/user/tabs/SavedProperties";
import ViewingRequestsTab from "@/components/dashboards/user/tabs/ViewingRequestsTab";
import ProfileCard from "@/components/dashboards/ProfileCard";
import SettingsTab from "@/components/dashboards/SettingsTab";

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

/**
 * User Dashboard Page with optimized data loading
 */
export default function UserDashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    // Get last active tab from localStorage if available
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('userDashboardTab');
      return savedTab || "viewingRequests";
    }
    return "viewingRequests";
  });
  
  // Data states
  const [favorites, setFavorites] = useState([]);
  const [applications, setApplications] = useState([]);
  const [viewingRequests, setViewingRequests] = useState([]);
  
  // Loading states (separate for each tab)
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [loadingViewingRequests, setLoadingViewingRequests] = useState(false);
  
  // Cache state with expiry timestamps
  const [dataCache, setDataCache] = useState({
    favorites: { data: null, timestamp: null },
    applications: { data: null, timestamp: null },
    viewingRequests: { data: null, timestamp: null }
  });
  
  // Cache expiry - 5 minutes
  const CACHE_EXPIRY = 5 * 60 * 1000;
  
  // Track current tab for focused data loading
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userDashboardTab', activeTab);
    }
    
    // Load data for the active tab if not cached or cache expired
    loadTabData(activeTab);
    
    // Prefetch data for other tabs after active tab is loaded
    prefetchOtherTabs(activeTab);
  }, [activeTab, user]);
  
  // Function to determine if cached data is valid
  const isCacheValid = (tabName) => {
    if (!dataCache[tabName]?.timestamp) return false;
    return Date.now() - dataCache[tabName].timestamp < CACHE_EXPIRY;
  };
  
  // Load data for the current active tab
  const loadTabData = async (tabName) => {
    if (!user) return;
    
    // Check if we have valid cached data first
    if (isCacheValid(tabName)) {
      switch (tabName) {
        case 'favorites':
          setFavorites(dataCache.favorites.data);
          break;
        case 'applications':
          setApplications(dataCache.applications.data);
          break;
        case 'viewingRequests':
          setViewingRequests(dataCache.viewingRequests.data);
          break;
      }
      return;
    }
    
    // Otherwise fetch fresh data
    switch (tabName) {
      case 'favorites':
        await fetchFavorites();
        break;
      case 'applications':
        await fetchApplications();
        break;
      case 'viewingRequests':
        await fetchViewingRequests();
        break;
    }
  };
  
  // Prefetch data for other tabs after a delay
  const prefetchOtherTabs = async (currentTab) => {
    if (!user) return;
    
    // Wait for active tab to finish loading
    setTimeout(async () => {
      const tabsToLoad = ['favorites', 'applications', 'viewingRequests'].filter(
        tab => tab !== currentTab && !isCacheValid(tab)
      );
      
      for (const tab of tabsToLoad) {
        switch (tab) {
          case 'favorites':
            if (!loadingFavorites && !isCacheValid('favorites')) {
              fetchFavorites(true); // true = background fetch
            }
            break;
          case 'applications':
            if (!loadingApplications && !isCacheValid('applications')) {
              fetchApplications(true);
            }
            break;
          case 'viewingRequests':
            if (!loadingViewingRequests && !isCacheValid('viewingRequests')) {
              fetchViewingRequests(true);
            }
            break;
        }
      }
    }, 500);
  };

  // Fetch user's favorite properties
  const fetchFavorites = async (isBackgroundFetch = false) => {
    if (!user) return;
    if (!isBackgroundFetch) setLoadingFavorites(true);

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
      const validData = data.filter(item => item.properties !== null);

      // Format the data for display
      const formattedFavorites = validData.map((item) => ({
        id: item.id,
        propertyId: item.property_id,
        ...item.properties,
        owner_id: item.properties.owner_id, 
      }));

      // Update state and cache
      setFavorites(formattedFavorites);
      setDataCache(prev => ({
        ...prev,
        favorites: { 
          data: formattedFavorites, 
          timestamp: Date.now() 
        }
      }));
    } catch (error) {
      console.error("Error fetching favorites:", error);
      if (!isBackgroundFetch) {
        toast.error("Failed to load saved properties.");
      }
    } finally {
      if (!isBackgroundFetch) setLoadingFavorites(false);
    }
  };

  // Fetch rental applications
  const fetchApplications = async (isBackgroundFetch = false) => {
    if (!user) return;
    if (!isBackgroundFetch) setLoadingApplications(true);

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
      setApplications(formattedApplications);
      setDataCache(prev => ({
        ...prev,
        applications: { 
          data: formattedApplications, 
          timestamp: Date.now() 
        }
      }));
    } catch (error) {
      console.error("Error fetching applications:", error);
      if (!isBackgroundFetch) {
        toast.error("Failed to load applications.");
      }
    } finally {
      if (!isBackgroundFetch) setLoadingApplications(false);
    }
  };

  // Fetch viewing requests
  const fetchViewingRequests = async (isBackgroundFetch = false) => {
    if (!user) return;
    if (!isBackgroundFetch) setLoadingViewingRequests(true);

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
      setViewingRequests(formattedRequests);
      setDataCache(prev => ({
        ...prev,
        viewingRequests: { 
          data: formattedRequests, 
          timestamp: Date.now() 
        }
      }));
    } catch (error) {
      console.error("Error fetching viewing requests:", error);
      if (!isBackgroundFetch) {
        toast.error("Failed to load viewing requests.");
      }
    } finally {
      if (!isBackgroundFetch) setLoadingViewingRequests(false);
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

      // Update local state
      setFavorites(favorites.filter((favorite) => favorite.id !== favoriteId));
      
      // Update cache
      setDataCache(prev => ({
        ...prev,
        favorites: { 
          data: favorites.filter((favorite) => favorite.id !== favoriteId), 
          timestamp: Date.now() 
        }
      }));
      
      toast.success("Property removed from favorites");
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Failed to remove property from favorites");
    }
  };

  // Determine if we're loading the active tab
  const isActiveTabLoading = useMemo(() => {
    switch (activeTab) {
      case 'viewingRequests': return loadingViewingRequests;
      case 'applications': return loadingApplications;
      case 'favorites': return loadingFavorites;
      default: return false;
    }
  }, [activeTab, loadingViewingRequests, loadingApplications, loadingFavorites]);

  return (
    <ProtectedRoute allowedRoles={["user"]}>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
              <Link href="/" className="text-custom-red hover:text-red-700">
                Return to Home
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <ProfileCard user={user} profile={profile} />
              <DashboardSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {activeTab === "viewingRequests" && (
                <div>
                  {loadingViewingRequests && !dataCache.viewingRequests.data ? (
                    <TabSkeleton />
                  ) : (
                    <ViewingRequestsTab
                      viewingRequests={viewingRequests}
                      setViewingRequests={setViewingRequests}
                      isOwner={false}
                      loading={loadingViewingRequests}
                    />
                  )}
                </div>
              )}

              {activeTab === "applications" && (
                <div>
                  {loadingApplications && !dataCache.applications.data ? (
                    <TabSkeleton />
                  ) : (
                    <PropertyApplications
                      applications={applications}
                      setApplications={setApplications}
                      loading={loadingApplications}
                    />
                  )}
                </div>
              )}

              {activeTab === "favorites" && (
                <div>
                  {loadingFavorites && !dataCache.favorites.data ? (
                    <TabSkeleton />
                  ) : (
                    <SavedProperties
                      favorites={favorites}
                      loadingFavorites={loadingFavorites}
                      onRemoveFavorite={removeFavorite}
                    />
                  )}
                </div>
              )}

              {activeTab === "settings" && (
                <SettingsTab user={user} profile={profile} />
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}