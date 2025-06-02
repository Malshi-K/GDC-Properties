"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useImageLoader } from "@/lib/services/imageLoaderService";
import ScheduleViewingModal from "@/components/property/ScheduleViewingModal";
import PropertyApplicationModal from "@/components/property/PropertyApplicationModal";
import { toast } from "react-hot-toast";

export default function PropertyDetails() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = params;
  
  // Image loader context
  const { propertyImages, loadPropertyImage } = useImageLoader();

  const [property, setProperty] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Memoize formatters
  const formatPrice = useCallback((price) => {
    if (!price) return "Price not available";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "Available Now";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  // Direct Supabase fetch for property details
  const fetchPropertyDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      console.log("Fetching property with ID:", id);

      // Direct Supabase query
      const { data: propertyData, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      console.log("Supabase response:", { propertyData, fetchError });

      if (fetchError) {
        console.error("Supabase error:", fetchError);
        throw fetchError;
      }

      if (!propertyData) {
        setError("Property not found");
        return;
      }

      console.log("Property data loaded:", propertyData);
      setProperty(propertyData);
      
      // Load images
      if (propertyData.images && propertyData.images.length > 0) {
        console.log("Loading images:", propertyData.images);
        loadPropertyImages(propertyData);
      } else {
        console.log("No images found for property");
      }

    } catch (err) {
      console.error("Error fetching property details:", err);
      setError(err.message || "Failed to load property details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load property images
  const loadPropertyImages = useCallback(async (propertyData) => {
    if (!propertyData?.images || propertyData.images.length === 0) return;

    try {
      console.log("Loading images for property:", propertyData.id);
      console.log("Images array:", propertyData.images);
      
      // Load main image with consistent key
      const mainImageUrl = await loadPropertyImage(
        propertyData.id, // Same key as FeaturedProperties
        propertyData.owner_id,
        propertyData.images[0]
      );

      console.log("Main image URL:", mainImageUrl);

      if (mainImageUrl) {
        setImageUrls([mainImageUrl]);
      }

      // Load additional images if available
      if (propertyData.images.length > 1) {
        const additionalImagePromises = propertyData.images.slice(1).map(async (imagePath, index) => {
          const imageUrl = await loadPropertyImage(
            `${propertyData.id}_${index + 1}`,
            propertyData.owner_id,
            imagePath
          );
          return imageUrl;
        });

        const additionalUrls = await Promise.all(additionalImagePromises);
        const validAdditionalUrls = additionalUrls.filter(url => url && url !== "");
        
        if (validAdditionalUrls.length > 0) {
          setImageUrls(prev => [...prev, ...validAdditionalUrls]);
        }
      }

    } catch (error) {
      console.error("Error loading property images:", error);
    }
  }, [loadPropertyImage]);

  // Fetch user role
  const fetchUserRole = useCallback(async () => {
    if (!user) {
      setUserRole(null);
      return;
    }

    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        return;
      }

      setUserRole(profileData?.role || null);
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole(null);
    }
  }, [user]);

  // Effects
  useEffect(() => {
    console.log("Component mounted, ID:", id);
    fetchPropertyDetails();
  }, [fetchPropertyDetails]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  // Get main image URL with fallback logic
  const mainImageUrl = useMemo(() => {
    // First check if we have cached image from FeaturedProperties
    const cachedImageUrl = propertyImages[property?.id];
    if (cachedImageUrl) {
      console.log("Using cached image from FeaturedProperties:", cachedImageUrl);
      return cachedImageUrl;
    }
    
    // Fallback to loaded imageUrls
    const fallbackUrl = imageUrls[activeImage];
    if (fallbackUrl) {
      console.log("Using fallback image URL:", fallbackUrl);
      return fallbackUrl;
    }
    
    console.log("No image URL available");
    return null;
  }, [propertyImages, property?.id, imageUrls, activeImage]);

  // Navigation handlers
  const handleImageClick = useCallback((index) => {
    setActiveImage(index);
  }, []);

  const handlePreviousImage = useCallback(() => {
    setActiveImage(prev => 
      prev === 0 ? Math.max(0, imageUrls.length - 1) : prev - 1
    );
  }, [imageUrls.length]);

  const handleNextImage = useCallback(() => {
    setActiveImage(prev => 
      prev >= imageUrls.length - 1 ? 0 : prev + 1
    );
  }, [imageUrls.length]);

  // Modal handlers
  const openViewingModal = useCallback(() => {
    if (!user) {
      router.push("/login?redirect=" + encodeURIComponent(`/property/${id}`));
      return;
    }
    setShowViewingModal(true);
  }, [user, router, id]);

  const openApplicationModal = useCallback(() => {
    if (!user) {
      router.push("/login?redirect=" + encodeURIComponent(`/property/${id}`));
      return;
    }
    setShowApplicationModal(true);
  }, [user, router, id]);

  const handleViewingSuccess = useCallback(() => {
    toast.success("Viewing request submitted successfully! The owner will respond to your request soon.");
  }, []);

  const handleApplicationSuccess = useCallback(() => {
    toast.success("Application submitted successfully! The owner will review your application soon.");
  }, []);

  // Check if action buttons should be shown
  const shouldShowActionButtons = useMemo(() => {
    return userRole !== "owner";
  }, [userRole]);

  // Amenity icon component
  const AmenityIcon = ({ amenity }) => {
    const getAmenityIcon = (amenityType) => {
      const amenityLower = amenityType.toLowerCase();
      const iconClass = "w-5 h-5 text-red-500 mr-2";
      
      if (amenityLower.includes("air conditioning") || amenityLower.includes("cooling")) {
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      }
      
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    };

    return (
      <div className="flex items-center">
        {getAmenityIcon(amenity)}
        <span className="text-gray-700">{amenity}</span>
      </div>
    );
  };

  // Loading skeleton
  const PropertyDetailsSkeleton = () => (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 flex items-center">
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="px-6 pb-6 pt-2">
            <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-6 w-1/2 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-6 w-2/3 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="property-image-container">
            <div className="main-image-skeleton bg-gray-200 h-96 animate-pulse rounded-lg"></div>
            <div className="thumbnails-skeleton flex mt-2 space-x-2">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="h-24 w-24 rounded-md bg-gray-300 animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Debug information
  console.log("Render state:", {
    loading,
    error,
    property: property ? "loaded" : "null",
    imageUrls: imageUrls.length,
    mainImageUrl: mainImageUrl ? "available" : "null",
    id
  });

  // Show skeleton while loading
  if (loading && !property) {
    return <PropertyDetailsSkeleton />;
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "The property could not be found."}
          </p>
          <Link
            href="/search"
            className="bg-custom-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-300"
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-40 px-4 sm:px-6 lg:px-8 text-gray-600">
      <div className="max-w-6xl mx-auto">
        {/* Debug Info - Remove in production */}
        {/* <div className="mb-4 p-4 bg-yellow-100 rounded-md text-sm">
          <strong>Debug Info:</strong>
          <div>Property ID: {property.id}</div>
          <div>Title: {property.title || "No title"}</div>
          <div>Price: {property.price || "No price"}</div>
          <div>Images: {property.images ? property.images.length : 0}</div>
          <div>Main Image URL: {mainImageUrl ? "Available" : "Not available"}</div>
        </div> */}

        {/* Property header */}
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {property.title || "Property Details"}
              </h1>
              <p className="text-gray-600 mt-1">
                {property.location || property.address || "Location not specified"}
              </p>
            </div>
            <div className="flex space-x-2">
              <button className="flex items-center px-3 py-1 border border-gray-300 rounded-md">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
              <button className="flex items-center px-3 py-1 border border-gray-300 rounded-md">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Main image section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-3">
            <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden">
              {mainImageUrl ? (
                <Image
                  src={mainImageUrl}
                  alt={`${property.title || 'Property'} - Image ${activeImage + 1}`}
                  fill
                  className="object-cover"
                  priority={activeImage === 0}
                  sizes="(max-width: 768px) 100vw, 75vw"
                  onError={(e) => {
                    console.error("Image failed to load:", e);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-200 text-gray-500">
                  <div className="text-center">
                    <div className="w-10 h-10 border-4 border-gray-300 border-t-custom-red rounded-full animate-spin mx-auto mb-2"></div>
                    <span>Loading image...</span>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              {imageUrls.length > 1 && (
                <>
                  <button 
                    onClick={handlePreviousImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white rounded-full p-1 shadow-md z-10"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button 
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white rounded-full p-1 shadow-md z-10"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Thumbnail gallery */}
          <div className="md:col-span-1">
            <div className="grid grid-cols-2 gap-2">
              {imageUrls.slice(0, 4).map((imageUrl, index) => (
                <div
                  key={index}
                  className={`relative aspect-square rounded-md overflow-hidden cursor-pointer ${
                    activeImage === index ? "ring-2 ring-custom-red" : ""
                  }`}
                  onClick={() => handleImageClick(index)}
                >
                  <Image
                    src={imageUrl}
                    alt={`${property.title || 'Property'} - Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    loading="lazy"
                    sizes="(max-width: 768px) 50vw, 15vw"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8">
            {/* Status tag */}
            <div className="mb-2">
              <span className="inline-block bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-md">
                {property.status || "For sale"}
              </span>
            </div>

            {/* Price and availability */}
            <div className="mb-4">
              <h2 className="text-3xl font-bold text-gray-900">
                {formatPrice(property.price)}
              </h2>
              <p className="text-gray-600">
                Available from: {formatDate(property.available_from)}
              </p>
            </div>

            {/* Property details */}
            <div className="flex items-center mb-6">
              <div className="flex items-center mr-6">
                <svg className="w-5 h-5 text-gray-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span className="text-gray-700">{property.bedrooms || 0} Bed</span>
              </div>
              <div className="flex items-center mr-6">
                <svg className="w-5 h-5 text-gray-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 4a1 1 0 011-1h1a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM8 4a1 1 0 011-1h1a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM15 3a1 1 0 00-1 1v12a1 1 0 001 1h1a1 1 0 001-1V4a1 1 0 00-1-1h-1z" />
                </svg>
                <span className="text-gray-700">{property.bathrooms || 0} Bath</span>
              </div>
              {property.square_footage && (
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">{property.square_footage} sq ft</span>
                </div>
              )}
            </div>

            {/* Overview */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Overview</h3>
              <div className="text-gray-700">
                <p>{property.description || "No description available"}</p>
              </div>
            </div>

            {/* Highlights */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Highlights</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-5">
                <div className="flex items-start">
                  <div className="mr-3">
                    <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Type</div>
                    <div className="text-gray-700">{property.property_type || "Not specified"}</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mr-3">
                    <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Building Year</div>
                    <div className="text-gray-700">{property.year_built || "Not specified"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nearby Amenities */}
            {property.nearby_amenities && property.nearby_amenities.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Nearby Amenities</h3>
                <div className="space-y-2">
                  {property.nearby_amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center">
                      <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="md:col-span-4">
            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-md p-4 mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Amenities</h3>
                <div className="space-y-2">
                  {property.amenities.map((amenity, index) => (
                    <AmenityIcon key={index} amenity={amenity} />
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {shouldShowActionButtons && (
              <div className="bg-white border border-gray-200 rounded-md p-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Request a tour</h3>
                <p className="text-gray-600 text-sm mb-4">Get a tour of the house as per your time.</p>

                <button
                  onClick={openViewingModal}
                  className="w-full bg-custom-red hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300 mb-3"
                  disabled={property.status !== "available"}
                >
                  Schedule a Tour
                </button>

                <button
                  onClick={openApplicationModal}
                  className="w-full bg-white hover:bg-gray-100 text-gray-800 font-medium py-2 px-4 border border-gray-300 rounded-md transition-colors duration-300"
                >
                  Request Info
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ScheduleViewingModal
        property={property}
        isOpen={showViewingModal}
        onClose={() => setShowViewingModal(false)}
        onSuccess={handleViewingSuccess}
      />

      <PropertyApplicationModal
        property={property}
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        onSuccess={handleApplicationSuccess}
      />
    </div>
  );
}