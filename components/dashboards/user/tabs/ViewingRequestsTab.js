// components/dashboards/user/ViewingRequestsTab.js
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { formatDate } from '@/lib/utils/formatters';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { useImageLoader } from '@/lib/services/imageLoaderService'; // NEW: Import useImageLoader

/**
 * ViewingRequestsTab component for user dashboard
 * This component shows viewing requests submitted by the user
 */
const ViewingRequestsTab = ({ viewingRequests: propViewingRequests = [], loading: propLoading = false, onRefresh }) => {
  const { user } = useAuth();
  const { loading, data, invalidateCache } = useGlobalData();
  const { propertyImages, loadPropertyImage, isPropertyImageLoading, preloadPropertiesImages } = useImageLoader(); // NEW: Use imageLoader
  
  console.log('ViewingRequestsTab mounted for user:', user?.id);
  console.log('Props received:', { 
    propViewingRequests, 
    propViewingRequestsLength: propViewingRequests?.length,
    propLoading 
  });
  
  const [cancelingId, setCancelingId] = useState(null);
  const [expandedRequest, setExpandedRequest] = useState(null);

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

  // NEW: Enhanced properties data for image loading - extract properties from viewing requests
  const propertiesForImageLoading = useMemo(() => {
    if (!Array.isArray(viewingRequests)) return [];
    
    return viewingRequests
      .filter(request => request.property_id && request.properties)
      .map(request => ({
        id: request.property_id,
        owner_id: request.properties.owner_id || request.property_owner_id,
        images: request.properties.images || [],
        title: request.properties.title || request.property_title
      }))
      .filter(property => property.owner_id && property.images && property.images.length > 0);
  }, [viewingRequests]);

  // NEW: Load property images using the imageLoader service
  useEffect(() => {
    if (!requestsLoading && propertiesForImageLoading.length > 0) {
      console.log('🖼️ Loading images for properties:', propertiesForImageLoading.map(p => p.id));
      
      // Load individual images for properties that need them
      propertiesForImageLoading.forEach(property => {
        if (!propertyImages[property.id] && !isPropertyImageLoading(property.id)) {
          loadPropertyImage(property.id, property.owner_id, property.images[0]);
        }
      });
      
      // Optional: Preload remaining images in batches for better UX
      const unloadedProperties = propertiesForImageLoading.filter(
        property => !propertyImages[property.id] && !isPropertyImageLoading(property.id)
      );
      
      if (unloadedProperties.length > 0) {
        // Small delay to avoid overwhelming the system
        setTimeout(() => {
          preloadPropertiesImages(unloadedProperties);
        }, 100);
      }
    }
  }, [
    requestsLoading,
    propertiesForImageLoading,
    propertyImages,
    isPropertyImageLoading,
    loadPropertyImage,
    preloadPropertiesImages
  ]);

  // NEW: Check if any images are still loading
  const someImagesLoading = useMemo(() => {
    return propertiesForImageLoading.some(property => isPropertyImageLoading(property.id));
  }, [propertiesForImageLoading, isPropertyImageLoading]);

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
    }
    
    toast.info('Refreshing viewing requests...');
  };

  // NEW: Updated loading state - combines parent loading and image loading
  const isLoading = requestsLoading || someImagesLoading;
  
  console.log('Component state:', { 
    isLoading, 
    requestsLoading, 
    someImagesLoading, 
    viewingRequestsLength: viewingRequests?.length,
    propertiesForImageLoadingLength: propertiesForImageLoading.length
  });
  
  if (isLoading && (!viewingRequests || viewingRequests.length === 0)) {
    return (
      <div className="max-w-6xl mx-auto text-gray-600">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            My Viewing Requests
          </h2>
          <button
            onClick={handleRefresh}
            disabled={requestsLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-red disabled:opacity-50"
          >
            <svg
              className={`-ml-0.5 mr-2 h-4 w-4 ${requestsLoading ? 'animate-spin' : ''}`}
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
          disabled={requestsLoading}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-red disabled:opacity-50"
        >
          <svg
            className={`-ml-0.5 mr-2 h-4 w-4 ${requestsLoading ? 'animate-spin' : ''}`}
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
          Refresh
        </button>
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
            
            // NEW: Get property image and loading state from imageLoader
            const propertyImage = propertyImages[request.property_id];
            const imageLoading = isPropertyImageLoading(request.property_id);
            
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
                        {/* NEW: Enhanced image handling with loading state */}
                        {imageLoading ? (
                          <div className="flex items-center justify-center h-full w-full">
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-custom-red"></div>
                          </div>
                        ) : propertyImage ? (
                          <div className="relative h-full w-full">
                            <Image 
                              src={propertyImage}
                              alt={request.properties?.title || request.property_title || "Property"}
                              fill
                              className="object-cover"
                              sizes="48px"
                              priority={false}
                              loading="lazy"
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
                          {/* NEW: Enhanced large image handling with loading state */}
                          {imageLoading ? (
                            <div className="w-full h-48 md:h-64 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
                            </div>
                          ) : propertyImage ? (
                            <div className="relative w-full h-48 md:h-64">
                              <Image 
                                src={propertyImage}
                                alt={request.properties?.title || request.property_title || 'Property Image'}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 33vw"
                                priority={false}
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-48 md:h-64 flex items-center justify-center bg-gray-200 text-gray-400">
                              <div className="text-center">
                                <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                                    d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                                    d="M9 22V12h6v10" />
                                </svg>
                                <p className="text-sm">No image available</p>
                              </div>
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
                                className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
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