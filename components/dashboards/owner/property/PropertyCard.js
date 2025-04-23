"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/data/mockData";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PropertyCard({
  property,
  viewingRequests,
  applications,
  onEdit,
  onDelete,
  onShowDetails,
}) {
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

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="md:flex">
        <div className="md:flex-shrink-0 h-48 md:h-auto md:w-48 bg-gray-300 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <span>Loading...</span>
            </div>
          ) : propertyImage ? (
            <img
              src={propertyImage}
              alt={property.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error("Image failed to load:", propertyImage);
                e.target.onerror = null;
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <span>No Image</span>
            </div>
          )}
        </div>

        <div className="p-6 w-full">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {property.title}
              </h3>
              <p className="text-gray-600 mb-2">{property.location}</p>
              <p className="text-custom-red font-bold mb-4">
                {formatPrice(property.price)}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onEdit(property.id)}
                className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
                title="Edit Property"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={() => onDelete(property.id)}
                className="inline-flex items-center p-2 border border-red-300 rounded-md text-sm text-red-700 bg-white hover:bg-red-50"
                title="Delete Property"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <span className="block text-gray-600 text-sm">Bedrooms</span>
              <span className="font-medium">{property.bedrooms}</span>
            </div>
            <div>
              <span className="block text-gray-600 text-sm">Bathrooms</span>
              <span className="font-medium">{property.bathrooms}</span>
            </div>
            <div>
              <span className="block text-gray-600 text-sm">Square Feet</span>
              <span className="font-medium">
                {property.square_footage?.toLocaleString() || "N/A"}
              </span>
            </div>
            <div>
              <span className="block text-gray-600 text-sm">
                Available From
              </span>
              <span className="font-medium">
                {property.available_from
                  ? new Date(property.available_from).toLocaleDateString()
                  : "Available Now"}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-4 pt-4">
            <div className="flex flex-wrap justify-between">
              <div className="mb-2 md:mb-0">
                <div className="flex items-center">
                  <div className="mr-6">
                    <span className="block text-gray-600 text-sm">
                      Viewing Requests
                    </span>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">
                        {viewingRequests.length}
                      </span>
                      {pendingViewings > 0 && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                          {pendingViewings} pending
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="block text-gray-600 text-sm">
                      Applications
                    </span>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">
                        {applications.length}
                      </span>
                      {pendingApplications > 0 && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                          {pendingApplications} pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => onShowDetails(property.id)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  View Details
                </button>
                <Link
                  href={`/properties/${property.id}`}
                  className="inline-flex items-center px-4 py-2 border border-custom-red rounded-md text-sm font-medium text-custom-red bg-white hover:bg-red-50"
                >
                  Preview Listing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
