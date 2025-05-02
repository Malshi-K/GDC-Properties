"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/utils/formatters";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for storage
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ViewingRequestsTab({ 
  viewingRequests = [], 
  loading = false, 
  error = null, 
  onStatusUpdate,
  onRefresh 
}) {
  const [actionInProgress, setActionInProgress] = useState(null);
  const [propertyImages, setPropertyImages] = useState({});

  // Fetch property images for all requests
  useEffect(() => {
    const fetchPropertyImages = async () => {
      const newPropertyImages = { ...propertyImages };
      
      for (const request of viewingRequests) {
        if (!request.property_id || newPropertyImages[request.property_id]) continue;
        
        try {
          // First, get the property data to access the images array
          const { data: propertyData, error: propertyError } = await supabase
            .from('properties')
            .select('images, owner_id')
            .eq('id', request.property_id)
            .single();
            
          if (propertyError || !propertyData || !propertyData.images || propertyData.images.length === 0) {
            console.error('Error fetching property images or no images available:', propertyError);
            continue;
          }
          
          // Get the first image from the property
          const firstImage = propertyData.images[0];
          
          // Normalize the path
          const normalizedPath = firstImage.includes("/")
            ? firstImage
            : `${propertyData.owner_id}/${firstImage}`;
            
          // Get signed URL for the image
          const { data: urlData, error: urlError } = await supabaseClient.storage
            .from("property-images")
            .createSignedUrl(normalizedPath, 60 * 60); // 1 hour expiry
            
          if (urlError) {
            console.error("Error getting signed URL:", urlError);
            continue;
          }
          
          newPropertyImages[request.property_id] = urlData.signedUrl;
        } catch (error) {
          console.error('Error fetching property image:', error);
        }
      }
      
      setPropertyImages(newPropertyImages);
    };
    
    if (viewingRequests.length > 0) {
      fetchPropertyImages();
    }
  }, [viewingRequests]);

  // Get the appropriate status color based on the status
  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'canceled': return 'bg-gray-100 text-gray-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
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

  // Handle suggesting a new time
  const handleSuggestNewTime = (requestId) => {
    // This would open a modal to suggest a new time
    // For now we'll just show a toast
    toast.info('Feature coming soon: Suggest a new time');
  };

  // Handle marking a viewing as completed
  const handleMarkCompleted = async (requestId) => {
    await handleStatusUpdate(requestId, 'completed');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Viewing Requests</h2>
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Viewing Requests</h2>
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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Property Viewing Requests</h2>
        
        <button
          onClick={onRefresh}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-red"
        >
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      
      {activeRequests.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No property viewing requests at this time.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeRequests.map((request) => (
            <div key={request.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <div className="p-6 text-gray-900">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Property Image */}
                  <div className="w-full lg:w-1/4 h-48 lg:h-auto rounded-lg overflow-hidden bg-gray-100">
                    {propertyImages[request.property_id] ? (
                      <div className="relative w-full h-full">
                        <Image 
                          src={propertyImages[request.property_id]}
                          alt={request.property_title || 'Property Image'}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                        <span>No Image</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Request Details */}
                  <div className="w-full lg:w-3/4">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          <Link href={`/properties/${request.property_id}`} className="hover:text-custom-red">
                            {request.property_title || 'Property'}
                          </Link>
                        </h3>
                        <p className="text-gray-600 mb-2">
                          Request from {request.user_name || request.user_id}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}
                      >
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-gray-600 text-sm font-medium">Proposed Viewing Date</p>
                        <p className="font-semibold">{formatDate(request.proposed_date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm font-medium">Request Made On</p>
                        <p>{formatDate(request.created_at)}</p>
                      </div>
                    </div>
                    
                    {request.message && (
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-medium">Message</p>
                        <p className="text-gray-700 mt-1 bg-gray-50 p-3 rounded">{request.message}</p>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-600 text-sm">Email</p>
                          <p className="font-medium">{request.user_email || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-sm">Phone</p>
                          <p className="font-medium">{request.user_phone || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons based on current status */}
                    <div className="flex flex-wrap justify-end space-x-2 gap-y-2 mt-4">
                      {/* Pending request actions */}
                      {request.status === "pending" && (
                        <>
                          <button 
                            onClick={() => handleSuggestNewTime(request.id)}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Suggest New Time
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(request.id, 'approved')}
                            disabled={actionInProgress === request.id}
                            className="inline-flex items-center px-4 py-2 border border-green-500 rounded-md text-sm font-medium text-white bg-green-500 hover:bg-green-600 disabled:opacity-50"
                          >
                            {actionInProgress === request.id ? 'Processing...' : 'Approve'}
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(request.id, 'declined')}
                            disabled={actionInProgress === request.id}
                            className="inline-flex items-center px-4 py-2 border border-red-500 rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                          >
                            {actionInProgress === request.id ? 'Processing...' : 'Decline'}
                          </button>
                        </>
                      )}
                      
                      {/* Approved request actions */}
                      {request.status === "approved" && (
                        <button 
                          onClick={() => handleMarkCompleted(request.id)}
                          disabled={actionInProgress === request.id}
                          className="inline-flex items-center px-4 py-2 border border-blue-500 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
                        >
                          {actionInProgress === request.id ? 'Processing...' : 'Mark as Completed'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}