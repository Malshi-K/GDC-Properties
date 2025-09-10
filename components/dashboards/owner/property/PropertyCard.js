"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/data/mockData";
import Image from "next/image";
import { useImageLoader } from "@/lib/services/imageLoaderService";

export default function PropertyCard({
  property,
  viewingRequests = [],
  applications = [],
  onEdit,
  onDelete,
}) {
  const router = useRouter();
  const { loadPropertyImage, propertyImages, isPropertyImageLoading } = useImageLoader();
  const [imageError, setImageError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef(null);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Early return if property is invalid
  if (!property || !property.id) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden p-6 text-center text-gray-500">
        <p>Invalid property data</p>
      </div>
    );
  }

  // Get the property image URL and loading state
  const propertyImage = propertyImages[property.id];
  const isImageLoading = isPropertyImageLoading(property.id);

  // Reset image error when property changes
  useEffect(() => {
    setImageError(false);
  }, [property.id]);

  // Load property image with intersection observer for performance
  useEffect(() => {
    if (!mounted || !cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            property.id &&
            property.images?.length > 0 &&
            !propertyImages[property.id] &&
            !isImageLoading
          ) {
            loadPropertyImage(property.id, property.owner_id, property.images[0]);
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
    property.id,
    property.images,
    property.owner_id,
    loadPropertyImage,
    propertyImages,
    isImageLoading,
  ]);

  // Calculate pending counts safely
  const pendingViewings = Array.isArray(viewingRequests) 
    ? viewingRequests.filter(request => request?.status === "pending").length 
    : 0;

  const pendingApplications = Array.isArray(applications) 
    ? applications.filter(application => application?.status === "pending").length 
    : 0;

  // Navigation and action handlers
  const navigateToPropertyDetails = () => {
    if (property.id) {
      router.push(`/property/${property.id}`);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (typeof onEdit === "function" && property.id) {
      onEdit(property.id);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (typeof onDelete === "function" && property.id) {
      onDelete(property.id);
    }
  };

  // Format date safely
  const formatAvailableDate = (dateString) => {
    if (!dateString) return "Available Now";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  // Format price safely
  const getFormattedPrice = () => {
    if (!property.price) return "Price not specified";
    try {
      return typeof formatPrice === "function" 
        ? formatPrice(property.price)
        : `$${property.price.toLocaleString()}`;
    } catch (e) {
      return `$${property.price}`;
    }
  };

  return (
    <div
      ref={cardRef}
      className="bg-white shadow rounded-lg overflow-hidden text-gray-600 hover:shadow-lg transition-shadow duration-300"
    >
      <div className="md:flex">
        {/* Property Image Section */}
        <div className="md:w-1/3 h-64 md:h-auto bg-gray-100 relative">
          {isImageLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-custom-orange"></div>
            </div>
          ) : propertyImage && !imageError ? (
            <div className="relative w-full h-full min-h-[16rem]">
              <Image
                src={propertyImage}
                alt={property.title || "Property"}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                onError={() => setImageError(true)}
                onClick={navigateToPropertyDetails}
                priority={false}
                loading="lazy"
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
              />
            </div>
          ) : (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-gray-200 cursor-pointer hover:bg-gray-300 transition-colors"
              onClick={navigateToPropertyDetails}
            >
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
                  {property.images?.length ? "Image not available" : "No image"}
                </p>
              </div>
            </div>
          )}

          {/* Image overlay with property type if available */}
          {property.property_type && (
            <div className="absolute top-2 left-2">
              <span className="bg-custom-orange text-white px-2 py-1 rounded text-xs font-medium">
                {property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)}
              </span>
            </div>
          )}
        </div>

        {/* Property Details Section */}
        <div className="md:w-2/3 p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 
                className="text-xl font-bold text-gray-900 cursor-pointer hover:text-custom-orange transition-colors"
                onClick={navigateToPropertyDetails}
              >
                {property.title || "Untitled Property"}
              </h3>
              <p className="text-gray-600 mb-1 flex items-center">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {property.location || "Location not specified"}
              </p>
              <p className="text-custom-orange font-bold text-lg">
                {getFormattedPrice()}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex space-x-2 ml-4">
              <button
                onClick={handleEdit}
                className="p-2 text-gray-600 hover:text-custom-orange hover:bg-orange-50 rounded transition-colors duration-300"
                title="Edit property"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors duration-300"
                title="Delete property"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

          {/* Property Description */}
          {property.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {property.description}
            </p>
          )}

          {/* Property Specifications Grid */}
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
                  property.square_feet?.toLocaleString() ||
                  "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Available From</p>
              <p className="font-medium">
                {formatAvailableDate(
                  property.available_from || property.available_date
                )}
              </p>
            </div>
          </div>

          {/* Status and Actions */}
          <div className="border-t border-gray-100 mt-4 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Viewing Requests and Applications Status */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center">
                  <span className="text-gray-500 text-sm mr-2">Viewing Requests</span>
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-sm font-medium">
                    {Array.isArray(viewingRequests) ? viewingRequests.length : 0}
                  </span>
                  {pendingViewings > 0 && (
                    <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                      {pendingViewings} pending
                    </span>
                  )}
                </div>
                
                <div className="flex items-center">
                  <span className="text-gray-500 text-sm mr-2">Applications</span>
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-sm font-medium">
                    {Array.isArray(applications) ? applications.length : 0}
                  </span>
                  {pendingApplications > 0 && (
                    <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                      {pendingApplications} pending
                    </span>
                  )}
                </div>
              </div>

              {/* Property Status */}
              <div className="flex items-center gap-2">
                {property.status && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    property.status === 'available' 
                      ? 'bg-green-100 text-green-800'
                      : property.status === 'occupied'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                  </span>
                )}
                
                <button
                  onClick={navigateToPropertyDetails}
                  className="text-custom-orange hover:text-orange-700 font-medium border border-custom-orange rounded-full px-4 py-2 transition-colors duration-300 hover:bg-orange-50"
                >
                  View Details
                </button>
              </div>
            </div>

            {/* Quick Actions for pending items */}
            {(pendingViewings > 0 || pendingApplications > 0) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600 mb-2">Quick Actions:</p>
                <div className="flex gap-2">
                  {pendingViewings > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToPropertyDetails();
                      }}
                      className="text-xs bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full hover:bg-yellow-100 transition-colors"
                    >
                      Review {pendingViewings} viewing request{pendingViewings > 1 ? 's' : ''}
                    </button>
                  )}
                  {pendingApplications > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToPropertyDetails();
                      }}
                      className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full hover:bg-green-100 transition-colors"
                    >
                      Review {pendingApplications} application{pendingApplications > 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}