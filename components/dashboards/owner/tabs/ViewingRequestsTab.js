"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { formatDate } from "@/utils/formatters";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";

export default function ViewingRequestsTab({ 
  viewingRequests = [], 
  loading = false, 
  error = null, 
  onStatusUpdate,
  onRefresh 
}) {
  const [actionInProgress, setActionInProgress] = useState(null);
  const [propertyImages, setPropertyImages] = useState({});
  const [imageLoading, setImageLoading] = useState(false); // Start as false until we know we need to load

  // Get unique property IDs from viewing requests 
  const propertyIds = useMemo(() => {
    const ids = new Set();
    viewingRequests.forEach(request => {
      if (request.property_id) {
        ids.add(request.property_id);
      }
    });
    return Array.from(ids);
  }, [viewingRequests]);

  // Fetch property images in bulk - only if necessary
  useEffect(() => {
    // Skip if the parent is still loading data
    if (loading) return;
    
    // Skip if we have no properties to fetch
    if (propertyIds.length === 0) {
      return;
    }

    // Check which property IDs don't have images yet
    const missingPropertyIds = propertyIds.filter(id => !propertyImages[id]);
    
    // If all properties already have images, do nothing
    if (missingPropertyIds.length === 0) {
      return;
    }
    
    const fetchPropertyImages = async () => {
      try {
        setImageLoading(true);
        
        // Only fetch the missing property images
        const { data: propertiesData, error: propertiesError } = await supabase
          .from('properties')
          .select('id, images, owner_id')
          .in('id', missingPropertyIds);
          
        if (propertiesError) {
          console.error('Error fetching properties data:', propertiesError);
          setImageLoading(false);
          return;
        }
        
        // Process all properties in parallel
        const newPropertyImages = { ...propertyImages };
        const imagePromises = propertiesData.map(async (property) => {
          if (!property.images || property.images.length === 0) {
            // Store a placeholder for properties without images to avoid refetching
            newPropertyImages[property.id] = null;
            return;
          }
          
          try {
            // Get the first image from the property
            const firstImage = property.images[0];
            
            // Normalize the path
            const normalizedPath = firstImage.includes("/")
              ? firstImage
              : `${property.owner_id}/${firstImage}`;
              
            // Get signed URL for the image - with short expiry to avoid caching issues
            const { data: urlData, error: urlError } = await supabase.storage
              .from("property-images")
              .createSignedUrl(normalizedPath, 60 * 60); // 1 hour expiry
              
            if (urlError) {
              console.error(`Error getting signed URL for property ${property.id}:`, urlError);
              newPropertyImages[property.id] = null; // Store null to prevent refetching
              return;
            }
            
            // Store the URL
            newPropertyImages[property.id] = urlData.signedUrl;
          } catch (error) {
            console.error(`Error processing image for property ${property.id}:`, error);
            newPropertyImages[property.id] = null; // Store null to prevent refetching
          }
        });
        
        // Wait for all image promises to complete
        await Promise.allSettled(imagePromises);
        
        // Update state with all images at once
        setPropertyImages(newPropertyImages);
      } catch (error) {
        console.error('Error in bulk image loading:', error);
      } finally {
        setImageLoading(false);
      }
    };
    
    fetchPropertyImages();
  }, [propertyIds, propertyImages, loading]);

  // Get the appropriate status color and text based on the status
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

  // Handle viewing request status update
  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      setActionInProgress(requestId);
      await onStatusUpdate(requestId, newStatus);
      toast.success(`Viewing request ${newStatus} successfully`);
    } catch (error) {
      console.error(`Error ${newStatus} viewing request:`, error);
      toast.error(`Failed to ${newStatus} viewing request`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Simplified loading logic - only loading if parent data is loading or we're fetching images
  const isLoading = loading || imageLoading;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Property Viewing Requests</h2>
          
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            disabled={isLoading}
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Property Viewing Requests</h2>
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          <p>Error: {error}</p>
        </div>
        <button 
          onClick={onRefresh}
          className="text-custom-red hover:text-red-700 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  // Filter out canceled requests as per requirement
  const activeRequests = viewingRequests.filter(request => request.status !== 'canceled');

  return (
    <div className="max-w-6xl mx-auto text-gray-600">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Property Viewing Requests</h2>
        
        <button
          onClick={onRefresh}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        >
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      
      {activeRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No viewing requests</h3>
          <p className="mt-1 text-sm text-gray-500">You don't have any property viewing requests at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeRequests.map((request) => {
            const statusBadge = getStatusBadge(request.status);
            return (
              <div key={request.id} className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Property Image */}
                    <div className="w-full md:w-1/3 lg:w-1/4 h-52 md:h-auto">
                      {propertyImages[request.property_id] ? (
                        <div className="relative w-full h-52 md:h-40 lg:h-48 rounded-lg overflow-hidden">
                          <Image 
                            src={propertyImages[request.property_id]}
                            alt={request.property_title || 'Property Image'}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              e.target.src = "/placeholder-image.jpg";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-52 md:h-40 lg:h-48 flex items-center justify-center bg-gray-100 rounded-lg text-gray-400">
                          <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                              d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                              d="M9 22V12h6v10" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Request Details */}
                    <div className="w-full md:w-2/3 lg:w-3/4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {request.property_title || 'Property'}
                          </h3>
                          <p className="text-gray-600">
                            Request from {request.user_name || request.user_id}
                          </p>
                        </div>
                        <div className="mt-2 sm:mt-0">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}
                          >
                            {statusBadge.text}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Proposed Viewing Date</p>
                          <p className="font-medium text-gray-900">
                            {formatDate ? formatDate(request.proposed_date) : 
                              new Date(request.proposed_date).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Request Made On</p>
                          <p className="text-gray-900">
                            {formatDate ? formatDate(request.created_at) : 
                              new Date(request.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {request.message && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-500">Message</p>
                          <p className="mt-1 bg-gray-50 p-3 rounded-md text-gray-700">
                            {request.message}
                          </p>
                        </div>
                      )}
                      
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h4>                        
                      <div className="bg-gray-50 p-4 rounded-md mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium">{request.user_email || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="font-medium">{request.user_phone || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action buttons based on current status */}
                      <div className="flex flex-wrap justify-end gap-2 mt-4">
                        {request.status === "pending" && (
                          <>
                            <button 
                              onClick={() => window.alert("Feature coming soon: Suggest a new time")}
                              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Suggest New Time
                            </button>
                            <button 
                              onClick={() => handleStatusUpdate(request.id, 'approved')}
                              disabled={actionInProgress === request.id}
                              className="px-4 py-2 border border-green-500 rounded-md text-sm font-medium text-white bg-green-500 hover:bg-green-600 disabled:opacity-50"
                            >
                              {actionInProgress === request.id ? 'Processing...' : 'Approve'}
                            </button>
                            <button 
                              onClick={() => handleStatusUpdate(request.id, 'declined')}
                              disabled={actionInProgress === request.id}
                              className="px-4 py-2 border border-red-500 rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                            >
                              {actionInProgress === request.id ? 'Processing...' : 'Decline'}
                            </button>
                          </>
                        )}
                        
                        {request.status === "approved" && (
                          <button 
                            onClick={() => handleStatusUpdate(request.id, 'completed')}
                            disabled={actionInProgress === request.id}
                            className="px-4 py-2 border border-gray-500 rounded-md text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                          >
                            {actionInProgress === request.id ? 'Processing...' : 'Mark as Completed'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}