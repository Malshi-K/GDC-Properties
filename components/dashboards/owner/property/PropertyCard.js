"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/data/mockData";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PropertyCard({ property, viewingRequests = [], applications = [], onEdit, onDelete }) {
  const router = useRouter();
  const [propertyImage, setPropertyImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImageUrl = async () => {
      if (property.images && property.images.length > 0) {
        setLoading(true);
        const imagePath = property.images[0];

        // Normalize the path
        const normalizedPath = imagePath.includes("/")
          ? imagePath
          : `${property.owner_id}/${imagePath}`;

        try {
          const { data, error } = await supabase.storage
            .from("property-images")
            .createSignedUrl(normalizedPath, 60 * 60); // 1 hour expiry

          if (error) {
            console.error("Error getting signed URL:", error);
          } else {
            setPropertyImage(data.signedUrl);
          }
        } catch (error) {
          console.error("Error:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchImageUrl();
  }, [property.images, property.owner_id]);

  const pendingViewings = viewingRequests.filter(
    (request) => request.status === "pending"
  ).length;

  const pendingApplications = applications.filter(
    (application) => application.status === "pending"
  ).length;

  const navigateToPropertyDetails = () => {
    router.push(`/property/${property.id}`);
  };

  const handleEdit = () => {
    if (typeof onEdit === 'function') {
      onEdit(property.id);
    }
  };

  const handleDelete = () => {
    if (typeof onDelete === 'function') {
      onDelete(property.id);
    }
  };

  // Format date for display
  const formatAvailableDate = (dateString) => {
    if (!dateString) return "Available Now";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden text-gray-600">
      <div className="md:flex">
        {/* Property Image Section */}
        <div className="md:w-1/3 h-64 md:h-auto bg-gray-100 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-custom-red"></div>
            </div>
          ) : propertyImage ? (
            <img
              src={propertyImage}
              alt={property.title || "Property"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <svg className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                  d="M9 22V12h6v10" />
              </svg>
            </div>
          )}
        </div>
        
        {/* Property Details Section */}
        <div className="md:w-2/3 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{property.title || "Untitled Property"}</h3>
              <p className="text-gray-600 mb-1">{property.location || "Location not specified"}</p>
              <p className="text-custom-red font-bold text-lg">
                {typeof formatPrice === 'function' ? formatPrice(property.price) : 
                  `$${property.price?.toLocaleString() || "Price not specified"}`}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleEdit}
                className="p-2 text-gray-600 hover:text-custom-red transition-colors duration-300"
                title="Edit property"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-gray-600 hover:text-custom-red transition-colors duration-300"
                title="Delete property"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Property Specifications */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
            <div>
              <p className="text-sm text-gray-500">Bedrooms</p>
              <p className="font-medium">{property.bedrooms || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Bathrooms</p>
              <p className="font-medium">{property.bathrooms || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Square Feet</p>
              <p className="font-medium">
                {property.square_footage?.toLocaleString() || 
                 property.square_feet?.toLocaleString() || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Available From</p>
              <p className="font-medium">
                {formatAvailableDate(property.available_from || property.available_date)}
              </p>
            </div>
          </div>
          
          {/* Actions and Status */}
          <div className="border-t border-gray-100 mt-4 pt-4">
            <div className="flex flex-wrap items-center justify-between">
              <div className="flex space-x-6 mb-2 md:mb-0">
                <div>
                  <span className="text-gray-500">Viewing Requests</span>
                  <div className="flex items-center">
                    <span className="ml-2 px-2 py-1 bg-gray-100 rounded-full text-sm font-medium">
                      {viewingRequests.length}
                    </span>
                    {pendingViewings > 0 && (
                      <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        {pendingViewings} pending
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Applications</span>
                  <div className="flex items-center">
                    <span className="ml-2 px-2 py-1 bg-gray-100 rounded-full text-sm font-medium">
                      {applications.length}
                    </span>
                    {pendingApplications > 0 && (
                      <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        {pendingApplications} pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <button
                onClick={navigateToPropertyDetails}
                className="text-custom-red hover:text-red-700 font-medium border border-custom-red rounded-md px-4 py-2 transition-colors duration-300 hover:bg-red-50"
              >
                View Property Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}