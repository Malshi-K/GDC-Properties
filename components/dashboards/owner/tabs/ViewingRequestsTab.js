"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { formatDate } from "@/lib/utils/formatters";
import { toast } from "react-hot-toast";
import { useImageLoader } from "@/lib/services/imageLoaderService";

export default function ViewingRequestsTab({ 
  viewingRequests = [], 
  loading = false, 
  error = null, 
  onStatusUpdate,
  onRefresh 
}) {
  const [actionInProgress, setActionInProgress] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  // Use the same image loading service as Properties tab
  const { loadPropertyImage, propertyImages, isPropertyImageLoading } = useImageLoader();

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('ViewingRequestsTab received:', {
      viewingRequestsCount: viewingRequests.length,
      loading,
      error,
      viewingRequestsDetailed: viewingRequests.map(req => ({
        id: req.id,
        property_id: req.property_id,
        properties: req.properties,
        hasPropertyData: !!req.properties,
        propertyImages: req.properties?.images,
        propertyOwnerId: req.properties?.owner_id
      }))
    });
  }, [viewingRequests, loading, error]);

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
          className: 'bg-orange-100 text-orange-800',
          text: 'Declined' 
        };
      case 'canceled': 
        return { 
          className: 'bg-gray-100 text-gray-800',
          text: 'Canceled' 
        };
      case 'completed': 
        return { 
          className: 'bg-gray-100 text-gray-800',
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

  // Enhanced data processing for user information based on actual DB structure
  const processedRequests = useMemo(() => {
    return viewingRequests.map(request => {
      return {
        ...request,
        // Use the data that's actually available in your DB
        user_name: request.user_id, // Since you don't have user names in the table
        user_email: 'Not available', // Not in your DB structure
        user_phone: request.user_phone || 'Not provided',
        property_title: request.properties?.title || request.property_title || 'Property'
      };
    });
  }, [viewingRequests]);

  // Simplified loading logic
  const isLoading = loading;

  if (isLoading && viewingRequests.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Property Viewing Requests</h2>
          
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            disabled={isLoading}
          >
            <svg className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-orange"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Property Viewing Requests</h2>
        <div className="bg-orange-50 text-orange-700 p-4 rounded-md mb-4">
          <p>Error: {error}</p>
        </div>
        <button 
          onClick={onRefresh}
          className="text-custom-orange hover:text-orange-700 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  // Filter out canceled requests as per requirement
  const activeRequests = processedRequests.filter(request => request.status !== 'canceled');

  return (
    <div className="max-w-6xl mx-auto text-gray-600">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Property Viewing Requests</h2>
          <p className="text-sm text-gray-500 mt-1">
            {activeRequests.length} active request{activeRequests.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <button
          onClick={onRefresh}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50"
          disabled={isLoading}
        >
          <svg className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {activeRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No viewing requests</h3>
          <p className="mt-1 text-sm text-gray-500">You don't have any property viewing requests at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeRequests.map((request) => {
            return (
              <ViewingRequestCard
                key={request.id}
                request={request}
                onStatusUpdate={handleStatusUpdate}
                actionInProgress={actionInProgress}
                mounted={mounted}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Separate component for each viewing request card (similar to PropertyCard)
function ViewingRequestCard({ request, onStatusUpdate, actionInProgress, mounted }) {
  const { loadPropertyImage, propertyImages, isPropertyImageLoading } = useImageLoader();
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef(null);

  // Get the property image URL and loading state
  const propertyImage = propertyImages[request.property_id];
  const isImageLoading = isPropertyImageLoading(request.property_id);

  // Reset image error when property changes
  useEffect(() => {
    setImageError(false);
  }, [request.property_id]);

  // Load property image with intersection observer for performance (EXACT SAME AS PROPERTYCARD)
  useEffect(() => {
    if (!mounted || !cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            request.property_id &&
            request.properties?.images?.length > 0 &&
            !propertyImages[request.property_id] &&
            !isImageLoading
          ) {
            loadPropertyImage(
              request.property_id, 
              request.properties.owner_id, 
              request.properties.images[0]
            );
          }
        });
      },
      {
        rootMargin: "200px",
        threshold: 0.1,
      }
    );

    observer.observe(cardRef.current);

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [
    mounted,
    request.property_id,
    request.properties?.images,
    request.properties?.owner_id,
    loadPropertyImage,
    propertyImages,
    isImageLoading,
  ]);

  const statusBadge = getStatusBadge(request.status);

  return (
    <div
      ref={cardRef}
      className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-300"
    >
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Property Image Section - EXACT SAME LOGIC AS PROPERTYCARD */}
          <div className="md:w-1/3 h-64 md:h-auto bg-gray-100 relative">
            {isImageLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-custom-orange"></div>
              </div>
            ) : propertyImage && !imageError ? (
              <div className="relative w-full h-full min-h-[16rem]">
                <Image
                  src={propertyImage}
                  alt={request.property_title || "Property"}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                  onError={() => setImageError(true)}
                  priority={false}
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                <div className="text-center">
                  <svg
                    className="h-16 w-16 text-gray-400 mx-auto mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1"
                      d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1"
                      d="M9 22V12h6v10"
                    />
                  </svg>
                  <p className="text-gray-500 text-sm">
                    {request.properties?.images?.length ? "Image not available" : "No image"}
                  </p>
                </div>
              </div>
            )}

            {/* Property type overlay if available */}
            {request.properties?.property_type && (
              <div className="absolute top-2 left-2">
                <span className="bg-custom-orange text-white px-2 py-1 rounded text-xs font-medium">
                  {request.properties.property_type.charAt(0).toUpperCase() + request.properties.property_type.slice(1)}
                </span>
              </div>
            )}
          </div>
          
          {/* Request Details */}
          <div className="md:w-2/3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {request.property_title}
                </h3>
                <p className="text-gray-600">
                  Request from {request.user_name}
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
                  <p className="font-medium">{request.user_email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{request.user_phone}</p>
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
                    onClick={() => onStatusUpdate(request.id, 'approved')}
                    disabled={actionInProgress === request.id}
                    className="px-4 py-2 border border-green-500 rounded-md text-sm font-medium text-white bg-green-500 hover:bg-green-600 disabled:opacity-50"
                  >
                    {actionInProgress === request.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button 
                    onClick={() => onStatusUpdate(request.id, 'declined')}
                    disabled={actionInProgress === request.id}
                    className="px-4 py-2 border border-red-500 rounded-md text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
                  >
                    {actionInProgress === request.id ? 'Processing...' : 'Decline'}
                  </button>
                </>
              )}
              
              {request.status === "approved" && (
                <button 
                  onClick={() => onStatusUpdate(request.id, 'completed')}
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
}

// Helper function for status badges (moved outside component for reuse)
function getStatusBadge(status) {
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
        className: 'bg-orange-100 text-orange-800',
        text: 'Declined' 
      };
    case 'canceled': 
      return { 
        className: 'bg-gray-100 text-gray-800',
        text: 'Canceled' 
      };
    case 'completed': 
      return { 
        className: 'bg-gray-100 text-gray-800',
        text: 'Completed' 
      };
    default: 
      return { 
        className: 'bg-gray-100 text-gray-800',
        text: status.charAt(0).toUpperCase() + status.slice(1)
      };
  }
}