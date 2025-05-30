"use client";

import { useState, useEffect } from "react";
import { useGlobalData } from "@/contexts/GlobalDataContext";
import { useAuth } from "@/contexts/AuthContext";
import PropertyCard from "../property/PropertyCard";

// Cache TTL constants
const CACHE_TTL = {
  PROPERTIES: 10 * 60 * 1000, // 10 minutes
  VIEWING_REQUESTS: 5 * 60 * 1000, // 5 minutes
  APPLICATIONS: 5 * 60 * 1000, // 5 minutes
};

export default function PropertiesTab({
  onEdit,
  onDelete,
  onAddNew,
  onViewAllRequests,
  onViewAllApplications,
  onRefresh,
}) {
  const { user } = useAuth();
  const { fetchData, invalidateCache, loading } = useGlobalData();
  
  // Local state for data
  const [properties, setProperties] = useState([]);
  const [viewingRequests, setViewingRequests] = useState([]);
  const [applications, setApplications] = useState([]);
  const [processedProperties, setProcessedProperties] = useState([]);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [processingError, setProcessingError] = useState(null);

  // Generate cache keys
  const getCacheKeys = () => {
    if (!user?.id) return {};
    return {
      properties: `owner_properties_${user.id}`,
      viewingRequests: `owner_viewing_requests_${user.id}`,
      applications: `owner_applications_${user.id}`
    };
  };

  // Fetch data with correct relationships
  const fetchAllData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setProcessingError(null);

    try {
      const cacheKeys = getCacheKeys();

      console.log("🔄 Fetching dashboard data for user:", user.id);

      // Fetch properties (owner's properties)
      let propertiesData = [];
      try {
        propertiesData = await fetchData({
          table: 'properties',
          select: '*',
          filters: [{ column: 'owner_id', operator: 'eq', value: user.id }],
          orderBy: { column: 'created_at', ascending: false }
        }, { 
          useCache: true, 
          ttl: CACHE_TTL.PROPERTIES,
          _cached_key: cacheKeys.properties 
        });
        
        console.log("✅ Properties fetched:", propertiesData?.length || 0);
      } catch (error) {
        console.error("❌ Error fetching properties:", error);
        propertiesData = [];
      }

      // Fetch viewing requests for owner's properties
      let viewingRequestsData = [];
      try {
        viewingRequestsData = await fetchData({
          table: 'viewing_requests',
          select: '*',
          filters: [{ column: 'owner_id', operator: 'eq', value: user.id }],
          orderBy: { column: 'created_at', ascending: false }
        }, { 
          useCache: true, 
          ttl: CACHE_TTL.VIEWING_REQUESTS,
          _cached_key: cacheKeys.viewingRequests 
        });
        
        console.log("✅ Viewing requests fetched:", viewingRequestsData?.length || 0);
      } catch (error) {
        console.error("❌ Error fetching viewing requests:", error);
        viewingRequestsData = [];
      }

      // Fetch applications for owner's properties
      let applicationsData = [];
      try {
        applicationsData = await fetchData({
          table: 'rental_applications',
          select: '*',
          filters: [{ column: 'owner_id', operator: 'eq', value: user.id }],
          orderBy: { column: 'created_at', ascending: false }
        }, { 
          useCache: true, 
          ttl: CACHE_TTL.APPLICATIONS,
          _cached_key: cacheKeys.applications 
        });
        
        console.log("✅ Applications fetched:", applicationsData?.length || 0);
      } catch (error) {
        console.error("❌ Error fetching applications:", error);
        applicationsData = [];
      }

      // Set the data (ensure arrays)
      setProperties(Array.isArray(propertiesData) ? propertiesData : []);
      setViewingRequests(Array.isArray(viewingRequestsData) ? viewingRequestsData : []);
      setApplications(Array.isArray(applicationsData) ? applicationsData : []);

      console.log("✅ All data loaded successfully:", {
        properties: Array.isArray(propertiesData) ? propertiesData.length : 0,
        viewingRequests: Array.isArray(viewingRequestsData) ? viewingRequestsData.length : 0,
        applications: Array.isArray(applicationsData) ? applicationsData.length : 0
      });

      // Clear any previous errors
      setProcessingError(null);

    } catch (error) {
      console.error("❌ Error in fetchAllData:", error);
      setProcessingError(error.message || "Failed to load data");
      
      // Set empty arrays on error
      setProperties([]);
      setViewingRequests([]);
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      fetchAllData();
    }
  }, [user?.id]);

  // Process properties data to combine with related viewing requests and applications
  useEffect(() => {
    if (isLoading || !Array.isArray(properties)) {
      setProcessedProperties([]);
      return;
    }

    try {
      console.log("🔄 Processing properties data...", {
        properties: properties.length,
        viewingRequests: viewingRequests.length,
        applications: applications.length
      });

      const processed = properties.map(property => {
        if (!property || !property.id) return null;
        
        try {
          const propertyId = property.id;
          
          // Filter viewing requests for this property
          const propertyViewingRequests = Array.isArray(viewingRequests) 
            ? viewingRequests.filter(request => 
                request && request.property_id === propertyId
              )
            : [];
          
          // Filter applications for this property
          const propertyApplications = Array.isArray(applications)
            ? applications.filter(application => 
                application && application.property_id === propertyId
              )
            : [];
          
          console.log(`Property ${propertyId}: ${propertyViewingRequests.length} viewing requests, ${propertyApplications.length} applications`);
          
          return {
            ...property,
            viewing_requests: propertyViewingRequests,
            applications: propertyApplications
          };
        } catch (err) {
          console.error("Error processing individual property:", property, err);
          // Return property without related data on error
          return {
            ...property,
            viewing_requests: [],
            applications: []
          };
        }
      }).filter(Boolean); // Remove any null values
      
      console.log("✅ Properties processed successfully:", processed.length);
      setProcessedProperties(processed);
      
    } catch (err) {
      console.error("❌ Error in properties processing:", err);
      setProcessingError(err.message);
      setProcessedProperties([]);
    }
  }, [properties, viewingRequests, applications, isLoading]);

  // Enhanced refresh function that uses GlobalDataContext
  const handleRefresh = async () => {
    if (!user?.id) return;
    
    console.log("🔄 Refreshing dashboard data...");
    
    const cacheKeys = getCacheKeys();
    
    // Invalidate all related caches
    invalidateCache(cacheKeys.properties);
    invalidateCache(cacheKeys.viewingRequests);
    invalidateCache(cacheKeys.applications);
    
    // Fetch fresh data
    await fetchAllData();
    
    // Call parent refresh if provided
    if (typeof onRefresh === 'function') {
      onRefresh();
    }
  };

  // Enhanced delete handler that invalidates cache
  const handleDelete = async (propertyId) => {
    if (typeof onDelete === 'function') {
      await onDelete(propertyId);
      
      // Refresh data after deletion
      await handleRefresh();
    }
  };

  // Enhanced edit handler
  const handleEdit = (propertyId) => {
    if (typeof onEdit === 'function') {
      onEdit(propertyId);
    }
  };

  // Enhanced add new handler
  const handleAddNew = () => {
    if (typeof onAddNew === 'function') {
      onAddNew();
    }
  };

  // Get pending counts safely
  const pendingViewings = Array.isArray(viewingRequests) 
    ? viewingRequests.filter(r => r?.status === 'pending').length 
    : 0;
  const pendingApplications = Array.isArray(applications) 
    ? applications.filter(a => a?.status === 'pending').length 
    : 0;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Properties</h2>
          
          {/* Quick stats */}
          {!isLoading && (
            <div className="flex gap-4 text-sm text-gray-600">
              <span className="px-2 py-1 bg-blue-100 rounded-full">
                {processedProperties.length} properties
              </span>
              {viewingRequests.length > 0 && (
                <span className="px-2 py-1 bg-purple-100 rounded-full">
                  {viewingRequests.length} total viewings
                </span>
              )}
              {pendingViewings > 0 && (
                <span className="px-2 py-1 bg-yellow-100 rounded-full">
                  {pendingViewings} pending viewings
                </span>
              )}
              {applications.length > 0 && (
                <span className="px-2 py-1 bg-indigo-100 rounded-full">
                  {applications.length} total applications
                </span>
              )}
              {pendingApplications > 0 && (
                <span className="px-2 py-1 bg-green-100 rounded-full">
                  {pendingApplications} pending applications
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 sm:px-4 rounded-md transition-colors duration-300 flex items-center text-sm sm:text-base disabled:opacity-50"
            title="Refresh data"
          >
            <svg
              className={`h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Add new property button */}
          <button
            onClick={handleAddNew}
            className="bg-custom-red hover:bg-red-700 text-white font-medium py-2 px-3 sm:px-4 rounded-md transition-colors duration-300 flex items-center text-sm sm:text-base whitespace-nowrap"
            disabled={isLoading}
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span>Add New Property</span>
          </button>
        </div>
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
          <div className="font-medium mb-1">Debug Info:</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div>User ID: {user?.id}</div>
              <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
              {processingError && <div className="text-red-600">Error: {processingError}</div>}
            </div>
            <div>
              <div>Properties: {properties.length}</div>
              <div>Viewing Requests: {viewingRequests.length}</div>
              <div>Applications: {applications.length}</div>
              <div>Processed Properties: {processedProperties.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Content based on state */}
      {isLoading ? (
        <div className="flex justify-center my-8 sm:my-12">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-t-2 border-b-2 border-custom-red mb-4"></div>
            <p className="text-gray-600 text-sm">Loading properties...</p>
          </div>
        </div>
      ) : processingError ? (
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm sm:text-base font-medium">Error Loading Data</p>
            <p className="text-xs text-gray-500 mt-1">{processingError}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-block mt-3 sm:mt-4 bg-custom-red text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm sm:text-base"
          >
            Try Again
          </button>
        </div>
      ) : processedProperties.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 22V12h6v10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Found</h3>
          <p className="text-gray-500 text-sm sm:text-base mb-4">
            You haven't added any properties yet. Start by adding your first property to rent.
          </p>
          <button
            onClick={handleAddNew}
            className="inline-block bg-custom-red text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors text-sm sm:text-base font-medium"
          >
            Add Your First Property
          </button>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Properties list */}
          {processedProperties.map((property) => (
            <PropertyCard
              key={property?.id || `property-${Math.random()}`}
              property={property}
              viewingRequests={property?.viewing_requests || []}
              applications={property?.applications || []}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}

          {/* Quick action buttons */}
          {(viewingRequests.length > 0 || applications.length > 0) && (
            <div className="bg-white shadow rounded-lg p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-4">
                {viewingRequests.length > 0 && (
                  <button
                    onClick={() => onViewAllRequests && onViewAllRequests()}
                    className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View All Viewing Requests 
                    <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {viewingRequests.length}
                    </span>
                  </button>
                )}
                
                {applications.length > 0 && (
                  <button
                    onClick={() => onViewAllApplications && onViewAllApplications()}
                    className="flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View All Applications
                    <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                      {applications.length}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}