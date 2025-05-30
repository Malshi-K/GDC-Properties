// components/dashboards/user/ViewingRequestsTab.js
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { formatDate } from '@/lib/utils/formatters';
import { supabase } from '@/lib/supabase';
import { createClient } from "@supabase/supabase-js";
import { toast } from 'react-hot-toast';

// Initialize Supabase client for storage
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * ViewingRequestsTab component for user dashboard
 * This component shows viewing requests submitted by the user
 */
const ViewingRequestsTab = ({ viewingRequests: propViewingRequests = [], loading: propLoading = false, onRefresh }) => {
  const { user } = useAuth();
  const { loading, data, invalidateCache } = useGlobalData();
  
  console.log('ViewingRequestsTab mounted for user:', user?.id);
  console.log('Props received:', { 
    propViewingRequests, 
    propViewingRequestsLength: propViewingRequests?.length,
    propLoading 
  });
  
  const [cancelingId, setCancelingId] = useState(null);
  const [propertyImages, setPropertyImages] = useState({});
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Use props first, then fallback to global context
  const viewingRequests = propViewingRequests && propViewingRequests.length > 0 
    ? propViewingRequests 
    : getUserViewingRequestsDataFallback().data;
    
  const requestsLoading = propLoading || getUserViewingRequestsDataFallback().loading;

  // Fallback function to get data from global context (same as before)
  function getUserViewingRequestsDataFallback() {
    if (!user?.id) return { data: [], loading: false };
    
    const cacheKey = `user_viewing_requests_${user.id}`;
    const isLoading = loading[cacheKey];
    const requestsData = data[cacheKey];
    
    console.log('Fallback getUserViewingRequestsData:', { 
      cacheKey, 
      isLoading, 
      requestsData,
      requestsDataType: typeof requestsData,
      dataKeys: Object.keys(data),
      hasData: !!requestsData,
      isArray: Array.isArray(requestsData),
      length: requestsData?.length,
      firstItem: requestsData?.[0]
    });
    
    // Handle both array and object responses
    let finalData = [];
    if (Array.isArray(requestsData)) {
      finalData = requestsData;
    } else if (requestsData && typeof requestsData === 'object' && requestsData.data) {
      finalData = Array.isArray(requestsData.data) ? requestsData.data : [];
    } else if (requestsData) {
      console.warn('Unexpected data format:', requestsData);
      finalData = [];
    }
    
    return {
      data: finalData,
      loading: Boolean(isLoading)
    };
  }
  
  console.log('Final component state:', { 
    viewingRequests, 
    viewingRequestsType: typeof viewingRequests,
    viewingRequestsLength: viewingRequests?.length,
    requestsLoading, 
    userId: user?.id, 
    isArray: Array.isArray(viewingRequests),
    firstRequest: viewingRequests?.[0]
  });

  // Add a direct data check
  useEffect(() => {
    console.log('🔍 Component data check:', {
      propViewingRequests,
      propViewingRequestsLength: propViewingRequests?.length,
      propLoading,
      finalViewingRequests: viewingRequests,
      finalLength: viewingRequests?.length
    });
  }, [propViewingRequests, propLoading, viewingRequests]);

  // Get unique property IDs from requests - memoized for performance
  const propertyIds = useMemo(() => {
    const ids = new Set();
    if (Array.isArray(viewingRequests)) {
      viewingRequests.forEach(request => {
        if (request.property_id) {
          ids.add(request.property_id);
        }
      });
    }
    return Array.from(ids);
  }, [viewingRequests]);
  
  // Fetch property images only if needed (when properties exist and don't have images yet)
  useEffect(() => {
    // Skip if the parent is still loading data or no properties to fetch
    if (requestsLoading || propertyIds.length === 0) return;
    
    // Check which property IDs don't have images yet
    const missingPropertyIds = propertyIds.filter(id => !propertyImages[id]);
    
    // If all properties already have images, do nothing
    if (missingPropertyIds.length === 0) return;
    
    const fetchPropertyImages = async () => {
      try {
        setImageLoading(true);
        const newPropertyImages = { ...propertyImages };
        
        // Get all missing properties data in a single query
        const { data: propertiesData, error: propertiesError } = await supabase
          .from('properties')
          .select('id, images, owner_id')
          .in('id', missingPropertyIds);
        
        if (propertiesError) {
          console.error('Error fetching properties data:', propertiesError);
          setImageLoading(false);
          return;
        }
        
        // Process all properties in parallel with Promise.all
        const imagePromises = propertiesData.map(async (property) => {
          if (!property.images || property.images.length === 0) {
            // Store null to avoid repeated fetching for properties without images
            return [property.id, null];
          }
          
          try {
            // Get the first image from the property
            const firstImage = property.images[0];
            
            // Normalize the path
            const normalizedPath = firstImage.includes("/")
              ? firstImage
              : `${property.owner_id}/${firstImage}`;
              
            // Get signed URL for the image
            const { data: urlData, error: urlError } = await supabaseClient.storage
              .from("property-images")
              .createSignedUrl(normalizedPath, 60 * 60); // 1 hour expiry
              
            if (urlError) {
              console.error(`Error getting signed URL for property ${property.id}:`, urlError);
              return [property.id, null];
            }
            
            return [property.id, urlData.signedUrl];
          } catch (error) {
            console.error(`Error processing image for property ${property.id}:`, error);
            return [property.id, null];
          }
        });
        
        // Wait for all image promises to complete
        const results = await Promise.all(imagePromises);
        
        // Update the property images state with all results at once
        results.forEach(([propertyId, url]) => {
          newPropertyImages[propertyId] = url;
        });
        
        setPropertyImages(newPropertyImages);
      } catch (error) {
        console.error('Error in bulk image loading:', error);
      } finally {
        setImageLoading(false);
      }
    };
    
    fetchPropertyImages();
  }, [propertyIds, propertyImages, requestsLoading]);

  // Get the appropriate status badge based on the status
  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': 
        return { 
          className: 'bg-green-100 text-green-800',
          text: 'Approved' 
        };
      case 'pending': 
        return { 
          className: 'bg-yellow-100 text-yellow-800',
          text: 'Pending' 
        };
      case 'declined': 
        return { 
          className: 'bg-red-100 text-red-800',
          text: 'Declined' 
        };
      case 'canceled': 
        return { 
          className: 'bg-gray-100 text-gray-800',
          text: 'Canceled' 
        };
      case 'completed': 
        return { 
          className: 'bg-blue-100 text-blue-800',
          text: 'Completed' 
        };
      default: 
        return { 
          className: 'bg-gray-100 text-gray-800',
          text: status.charAt(0).toUpperCase() + status.slice(1)
        };
    }
  };

  // Toggle expanded view for a request
  const toggleExpand = (requestId) => {
    if (expandedRequest === requestId) {
      setExpandedRequest(null);
    } else {
      setExpandedRequest(requestId);
    }
  };

  // Handle cancellation of a viewing request
  const handleCancelRequest = async (requestId) => {
    try {
      setCancelingId(requestId);
      
      const { error } = await supabase
        .from('viewing_requests')
        .update({ status: 'canceled' })
        .eq('id', requestId);
        
      if (error) throw error;
      
      // Invalidate cache to refresh data
      invalidateCache(`user_viewing_requests_${user.id}`);
      
      toast.success('Viewing request cancelled successfully');
    } catch (error) {
      console.error('Error cancelling viewing request:', error);
      toast.error('Failed to cancel viewing request');
    } finally {
      setCancelingId(null);
    }
  };
  
  // Handle suggesting a new time
  const handleSuggestNewTime = (requestId) => {
    // This would open a modal to suggest a new time
    // For now we'll just show a toast
    toast.info('Feature coming soon: Suggest a new time');
  };

  // Force refresh function - use the provided onRefresh or fallback
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      // Fallback refresh
      if (!user?.id) return;
      
      // Invalidate cache
      invalidateCache(`user_viewing_requests_${user.id}`);
      
      // Clear property images to force reload
      setPropertyImages({});
    }
    
    toast.info('Refreshing viewing requests...');
  };

  // Simplified loading state - combines parent loading and image loading
  const isLoading = requestsLoading || imageLoading;
  
  console.log('Component state:', { isLoading, requestsLoading, imageLoading, viewingRequestsLength: viewingRequests?.length });
  
  if (isLoading && (!viewingRequests || viewingRequests.length === 0)) {
    return (
      <div className="max-w-6xl mx-auto text-gray-600">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            My Viewing Requests
          </h2>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-custom-red text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto text-gray-600">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          My Viewing Requests
        </h2>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-custom-red text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* DEBUG SECTION - Remove this once working */}
      <div className="mb-6 p-4 bg-yellow-100 border border-yellow-300 rounded">
        <h3 className="font-semibold mb-2">🐛 Debug Info:</h3>
        <p><strong>Viewing Requests Length:</strong> {viewingRequests?.length || 0}</p>
        <p><strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
        <p><strong>Data Type:</strong> {typeof viewingRequests}</p>
        <p><strong>Is Array:</strong> {Array.isArray(viewingRequests) ? 'Yes' : 'No'}</p>
        {viewingRequests && viewingRequests.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer">View Raw Data</summary>
            <pre className="mt-2 p-2 bg-white text-xs overflow-auto max-h-40">
              {JSON.stringify(viewingRequests, null, 2)}
            </pre>
          </details>
        )}
      </div>
      
      {(!viewingRequests || !Array.isArray(viewingRequests) || viewingRequests.length === 0) ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No viewing requests</h3>
            <p className="text-gray-500 mb-4">
              {!Array.isArray(viewingRequests) 
                ? `Data format issue: ${typeof viewingRequests}` 
                : "You haven't requested any property viewings yet."
              }
            </p>
            <Link 
              href="/search" 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-red hover:bg-red-700"
            >
              Browse Properties
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {viewingRequests.map(request => {
            const statusBadge = getStatusBadge(request.status);
            const isExpanded = expandedRequest === request.id;
            
            return (
              <div key={request.id} className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                {/* Compact View - Always visible */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                  onClick={() => toggleExpand(request.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                      <div className="h-12 w-12 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                        {propertyImages[request.property_id] ? (
                          <div className="relative h-full w-full">
                            <Image 
                              src={propertyImages[request.property_id]}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full w-full">
                            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {request.properties?.title || request.property_title || 'Property Viewing'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(request.proposed_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                        {statusBadge.text}
                      </span>
                      <svg 
                        className={`h-5 w-5 text-gray-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <div className="p-4">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Property Image - Larger in expanded view */}
                        <div className="w-full md:w-1/3 h-48 md:h-auto rounded-lg overflow-hidden bg-gray-100">
                          {propertyImages[request.property_id] ? (
                            <div className="relative w-full h-48 md:h-64">
                              <Image 
                                src={propertyImages[request.property_id]}
                                alt={request.properties?.title || request.property_title || 'Property Image'}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-48 md:h-64 flex items-center justify-center bg-gray-200 text-gray-400">
                              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                                  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                                  d="M9 22V12h6v10" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {/* Request Details */}
                        <div className="w-full md:w-2/3">
                          <div className="mb-4">
                            <h3 className="text-xl font-semibold text-gray-900 mb-1">
                              <Link href={`/properties/${request.property_id}`} className="hover:text-custom-red">
                                {request.properties?.title || request.property_title || 'Property Viewing'}
                              </Link>
                            </h3>
                            <p className="text-gray-600 mb-2">
                              {request.properties?.location || request.property_location || 'Location not specified'}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Proposed Viewing Date</p>
                              <p className="font-medium">{formatDate(request.proposed_date)}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Request Made On</p>
                              <p>{formatDate(request.created_at)}</p>
                            </div>
                          </div>
                          
                          {request.message && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-500">Message</p>
                              <p className="mt-1 p-3 bg-gray-50 rounded-md">{request.message}</p>
                            </div>
                          )}
                          
                          {/* Action buttons */}
                          <div className="flex flex-wrap justify-end gap-2 mt-4">
                            {/* For users viewing their own requests */}
                            {request.status === 'pending' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelRequest(request.id);
                                }}
                                disabled={cancelingId === request.id}
                                className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                              >
                                {cancelingId === request.id ? 'Cancelling...' : 'Cancel Request'}
                              </button>
                            )}
                            
                            {/* For approved requests */}
                            {request.status === 'approved' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.info('Calendar feature coming soon');
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                              >
                                Add to Calendar
                              </button>
                            )}
                            
                            <Link
                              href={`/properties/${request.property_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="px-4 py-2 border border-custom-red text-custom-red rounded-md text-sm font-medium bg-white hover:bg-red-50"
                            >
                              View Property
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ViewingRequestsTab;