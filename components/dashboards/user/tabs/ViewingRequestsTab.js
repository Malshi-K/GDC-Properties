// components/dashboards/user/ViewingRequestsTab.js
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { formatDate } from '@/utils/formatters';
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
const ViewingRequestsTab = ({ viewingRequests = [], setViewingRequests, isOwner = false }) => {
  const [cancelingId, setCancelingId] = useState(null);
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

  // Handle cancellation of a viewing request
  const handleCancelRequest = async (requestId) => {
    try {
      setCancelingId(requestId);
      
      const { error } = await supabase
        .from('viewing_requests')
        .update({ status: 'canceled' })
        .eq('id', requestId);
        
      if (error) throw error;
      
      // Update the local state
      setViewingRequests(
        viewingRequests.map(request => 
          request.id === requestId 
            ? { ...request, status: 'canceled' } 
            : request
        )
      );
      
      toast.success('Viewing request cancelled successfully');
    } catch (error) {
      console.error('Error cancelling viewing request:', error);
      toast.error('Failed to cancel viewing request');
    } finally {
      setCancelingId(null);
    }
  };
  
  // Handle owner actions on viewing requests (approve/decline)
  const handleOwnerAction = async (requestId, newStatus) => {
    try {
      setCancelingId(requestId);
      
      const { error } = await supabase
        .from('viewing_requests')
        .update({ status: newStatus })
        .eq('id', requestId);
        
      if (error) throw error;
      
      // Update the local state
      setViewingRequests(
        viewingRequests.map(request => 
          request.id === requestId 
            ? { ...request, status: newStatus } 
            : request
        )
      );
      
      const message = newStatus === 'approved' 
        ? 'Viewing request approved successfully'
        : 'Viewing request declined';
        
      toast.success(message);
    } catch (error) {
      console.error(`Error ${newStatus} viewing request:`, error);
      toast.error(`Failed to ${newStatus} viewing request`);
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

  console.log('Rendering ViewingRequestsTab with:', viewingRequests); // Debug log

  return (
    <>
      <h2 className="text-2xl font-bold text-custom-gray mb-6">
        {isOwner ? 'Property Viewing Requests' : 'My Viewing Requests'}
      </h2>
      
      {!viewingRequests || viewingRequests.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">
            {isOwner 
              ? "You haven't received any viewing requests yet." 
              : "You haven't requested any property viewings yet."}
          </p>
          {!isOwner && (
            <Link href="/search" className="inline-block mt-4 text-custom-red hover:text-red-700">
              Browse Properties
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {viewingRequests.map(request => (
            <div key={request.id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-6">
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
                        <h3 className="text-2xl font-semibold text-custom-red mb-1">
                          <Link href={`/properties/${request.property_id}`} className="hover:text-custom-gray">
                            {request.property_title || 'Property Viewing'}
                          </Link>
                        </h3>
                        <p className="text-gray-600 mb-2">
                          {isOwner 
                            ? `Request from ${request.user_name || 'User'}`
                            : request.property_location || 'Location not specified'
                          }
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-custom-yellow text-md font-medium">Proposed Viewing Date</p>
                        <p className="text-gray-600">{formatDate(request.proposed_date)}</p>
                      </div>
                      <div>
                        <p className="text-custom-yellow text-md font-medium">Request Made On</p>
                        <p className='text-gray-600'>{formatDate(request.created_at)}</p>
                      </div>
                    </div>
                    
                    {request.message && (
                      <div className="mb-4">
                        <p className="text-custom-yellow text-md font-medium">Message</p>
                        <p className="text-gray-600">{request.message}</p>
                      </div>
                    )}
                    
                    {isOwner && (
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
                    )}
                    
                    {/* Action buttons */}
                    <div className="flex justify-end space-x-3 mt-4">
                      {/* For users viewing their own requests */}
                      {!isOwner && request.status === 'pending' && (
                        <button 
                          onClick={() => handleCancelRequest(request.id)}
                          disabled={cancelingId === request.id}
                          className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                        >
                          {cancelingId === request.id ? 'Cancelling...' : 'Cancel Request'}
                        </button>
                      )}
                      
                      {/* For owners responding to requests */}
                      {isOwner && request.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleSuggestNewTime(request.id)}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Suggest New Time
                          </button>
                          <button 
                            onClick={() => handleOwnerAction(request.id, 'approved')}
                            disabled={cancelingId === request.id}
                            className="inline-flex items-center px-4 py-2 border border-green-500 rounded-md text-sm font-medium text-white bg-green-500 hover:bg-green-600"
                          >
                            {cancelingId === request.id ? 'Processing...' : 'Approve'}
                          </button>
                          <button 
                            onClick={() => handleOwnerAction(request.id, 'declined')}
                            disabled={cancelingId === request.id}
                            className="inline-flex items-center px-4 py-2 border border-red-500 rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-600"
                          >
                            {cancelingId === request.id ? 'Processing...' : 'Decline'}
                          </button>
                        </>
                      )}
                      
                      {/* For approved requests */}
                      {request.status === 'approved' && (
                        <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                          Add to Calendar
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
    </>
  );
};

export default ViewingRequestsTab;