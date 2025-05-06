"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import ScheduleViewingModal from "@/components/property/ScheduleViewingModal";
import PropertyApplicationModal from "@/components/property/PropertyApplicationModal";
import { toast } from "react-hot-toast";

export default function PropertyDetails() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = params;

  const [property, setProperty] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Property details cache
  const CACHE_KEY = `property_${id}`;
  const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

  // Memoize the formatPrice function for better performance
  const formatPrice = useCallback((price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  }, []);

  // Memoize the formatDate function
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "Available Now";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  // Fetch property details with optimized strategy
  useEffect(() => {
    if (!id) return;

    async function fetchPropertyDetails() {
      try {
        setLoading(true);

        // Check local storage cache first
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          try {
            const {
              property: cachedProperty,
              imageUrls: cachedUrls,
              timestamp,
            } = JSON.parse(cachedData);
            if (Date.now() - timestamp < CACHE_EXPIRY) {
              setProperty(cachedProperty);
              setImageUrls(cachedUrls);
              setLoading(false);

              // Still refresh data in the background for next visit
              refreshPropertyData(cachedProperty);
              return;
            }
          } catch (error) {
            console.error("Error parsing cached property data:", error);
          }
        }

        // Fetch property details
        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        if (!data) {
          setError("Property not found");
          setLoading(false);
          return;
        }

        // Set property data immediately so we can show it
        setProperty(data);

        // Fetch images in the background
        fetchPropertyImages(data);
      } catch (err) {
        console.error("Error fetching property details:", err);
        setError(err.message || "Failed to load property details");
        setLoading(false);
      }
    }

    fetchPropertyDetails();
  }, [id]);

  // Refreshes property data in the background, doesn't block UI
  const refreshPropertyData = async (existingProperty) => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setProperty(data);
        fetchPropertyImages(data, true); // true = background refresh
      }
    } catch (err) {
      console.error("Error refreshing property data:", err);
      // Don't update the UI with errors during background refresh
    }
  };

  // Optimized function to fetch property images in batches
  const fetchPropertyImages = async (
    propertyData,
    isBackgroundRefresh = false
  ) => {
    if (!propertyData?.images || propertyData.images.length === 0) {
      if (!isBackgroundRefresh) setLoading(false);
      return;
    }

    try {
      // Create batch requests (process images in groups of 3)
      const batchSize = 3;
      const promises = [];

      for (let i = 0; i < propertyData.images.length; i += batchSize) {
        const batch = propertyData.images.slice(i, i + batchSize);

        for (const imagePath of batch) {
          // Normalize the path
          const normalizedPath = imagePath.includes("/")
            ? imagePath
            : `${propertyData.owner_id}/${imagePath}`;

          // Add to promises array
          promises.push(
            supabase.storage
              .from("property-images")
              .createSignedUrl(normalizedPath, 60 * 60) // 1 hour expiry
              .then(({ data, error }) => {
                if (error) {
                  console.error("Error getting signed URL:", error);
                  return null;
                }
                return data.signedUrl;
              })
              .catch((error) => {
                console.error("Error getting signed URL:", error);
                return null;
              })
          );
        }

        // Wait for current batch to complete before starting next batch
        // This prevents too many concurrent requests
        const batchResults = await Promise.all(promises);
        const validUrls = batchResults.filter((url) => url !== null);

        // Update state with new batch of URLs
        // This gives a progressive loading effect
        setImageUrls((prev) => [...prev, ...validUrls]);
      }

      // Cache the final property and image URLs
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          property: propertyData,
          imageUrls: imageUrls,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      if (!isBackgroundRefresh) setLoading(false);
    }
  };

  // Fetch user role
  useEffect(() => {
    async function getUserRole() {
      if (!user) {
        setUserRole(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        setUserRole(data.role);
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    }

    getUserRole();
  }, [user]);

  const handleImageClick = (index) => {
    setActiveImage(index);
  };

  const openViewingModal = () => {
    if (!user) {
      // Redirect to login if not logged in
      router.push("/login?redirect=" + encodeURIComponent(`/property/${id}`));
      return;
    }

    setShowViewingModal(true);
  };

  const openApplicationModal = () => {
    if (!user) {
      // Redirect to login if not logged in
      router.push("/login?redirect=" + encodeURIComponent(`/property/${id}`));
      return;
    }

    setShowApplicationModal(true);
  };

  const handleViewingSuccess = () => {
    toast.success(
      "Viewing request submitted successfully! The owner will respond to your request soon."
    );
  };

  const handleApplicationSuccess = () => {
    toast.success(
      "Application submitted successfully! The owner will review your application soon."
    );
  };

  // Check if the action buttons should be shown (only for non-owner users)
  const shouldShowActionButtons = userRole !== "owner";

  // Placeholder for property images during skeleton loading
  const PropertyImagesSkeleton = () => (
    <div className="property-image-container">
      {/* Main image skeleton */}
      <div className="main-image-skeleton bg-gray-200 h-96 animate-pulse rounded-lg"></div>

      {/* Thumbnail gallery skeleton */}
      <div className="thumbnails-skeleton flex mt-2 space-x-2">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="h-24 w-24 rounded-md bg-gray-300 animate-pulse"
          ></div>
        ))}
      </div>
    </div>
  );

  // Property details skeleton
  const PropertyDetailsSkeleton = () => (
    <div className="min-h-screen bg-gray-100 py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Back button */}
          <div className="p-6 flex items-center">
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Property headline skeleton */}
          <div className="px-6 pb-6 pt-2">
            <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-6 w-1/2 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-6 w-2/3 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Property images skeleton */}
          <PropertyImagesSkeleton />

          <div className="px-6 pb-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content skeleton */}
            <div className="lg:col-span-2 space-y-8">
              {/* Price and status */}
              <div className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>

              {/* Description */}
              <div>
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-3"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                </div>
              </div>

              {/* Property details */}
              <div>
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-3"></div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4">
                  {[...Array(5)].map((_, index) => (
                    <div key={index}>
                      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-1"></div>
                      <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar skeleton */}
            <div className="space-y-6">
              <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
    <div className="min-h-screen bg-gray-100 py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Property headline */}
          <div className="p-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {property.title}
            </h1>
            <p className="text-gray-700 text-lg mb-2">{property.location}</p>
            <div className="flex items-center text-gray-700">
              <span className="mr-4">{property.bedrooms} Bedrooms</span>
              <span className="mr-4">{property.bathrooms} Bathrooms</span>
              <span>{property.square_footage} sq ft</span>
            </div>
          </div>

          {/* Property images */}
          <div className="px-6 pb-8">
            {property.images && property.images.length > 0 ? (
              <div className="space-y-4">
                {/* Main image */}
                <div className="relative h-80 sm:h-96 w-full rounded-lg overflow-hidden bg-gray-200">
                  {imageUrls[activeImage] ? (
                    <Image
                      src={imageUrls[activeImage]}
                      alt={`${property.title} - Image ${activeImage + 1}`}
                      fill
                      className="object-cover"
                      loading="eager"
                      priority={activeImage === 0}
                      sizes="(max-width: 768px) 100vw, 90vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="w-12 h-12 border-4 border-gray-300 border-t-custom-red rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {/* Thumbnail gallery */}
                {imageUrls.length > 1 && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                    {imageUrls.map((imageUrl, index) => (
                      <div
                        key={index}
                        className={`relative h-20 rounded-md overflow-hidden cursor-pointer border-2 ${
                          activeImage === index
                            ? "border-custom-red"
                            : "border-transparent"
                        }`}
                        onClick={() => handleImageClick(index)}
                      >
                        <Image
                          src={imageUrl}
                          alt={`${property.title} - Thumbnail ${index + 1}`}
                          fill
                          className="object-cover"
                          loading="lazy"
                          sizes="(max-width: 768px) 25vw, 10vw"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-200 h-80 sm:h-96 rounded-lg flex items-center justify-center text-gray-500">
                No Images Available
              </div>
            )}
          </div>

          <div className="px-6 pb-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Price and status */}
              <div className="flex flex-wrap justify-between items-center bg-gray-50 rounded-lg p-6">
                <div>
                  <span className="text-3xl font-bold text-custom-red">
                    {formatPrice(property.price)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 mr-2">
                      Status:
                    </span>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        property.status === "available"
                          ? "bg-green-100 text-green-800"
                          : property.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {property.status === "available"
                        ? "Available"
                        : property.status === "pending"
                        ? "Pending"
                        : property.status === "rented"
                        ? "Rented"
                        : property.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 mr-2">
                      Available From:
                    </span>
                    <span className="text-gray-600">
                      {formatDate(property.available_from)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  Property Description
                </h2>
                <div className="prose max-w-none text-gray-700">
                  <p>{property.description}</p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  Property Address
                </h2>
                <div className="prose max-w-none text-gray-700">
                  <p>{property.address}</p>
                </div>
              </div>

              {/* Property details */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  Property Details
                </h2>                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4">
                  <div>
                    <span className="block text-sm text-gray-500">
                      Property Type
                    </span>
                    <span className="block font-medium text-gray-900 capitalize">
                      {property.property_type || "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-500">
                      Bedrooms
                    </span>
                    <span className="block font-medium text-gray-900">
                      {property.bedrooms}
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-500">
                      Bathrooms
                    </span>
                    <span className="block font-medium text-gray-900">
                      {property.bathrooms}
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-500">
                      Square Footage
                    </span>
                    <span className="block font-medium text-gray-900">
                      {property.square_footage} sq ft
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-500">
                      Year Built
                    </span>
                    <span className="block font-medium text-gray-900">
                      {property.year_built || "Not specified"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Property features */}
              {property.features && property.features.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-3">
                    Property Features
                  </h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
                    {property.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center text-gray-700"
                      >
                        <svg
                          className="w-5 h-5 text-custom-red mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Nearby amenities */}
              {property.nearby_amenities &&
                property.nearby_amenities.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">
                      Nearby Amenities
                    </h2>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
                      {property.nearby_amenities.map((amenity, index) => (
                        <li
                          key={index}
                          className="flex items-center text-gray-700"
                        >
                          <svg
                            className="w-5 h-5 text-custom-red mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {amenity}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Amenities
                  </h2>
                  <ul className="space-y-3">
                    {property.amenities.map((amenity, index) => (
                      <li
                        key={index}
                        className="flex items-center text-gray-700"
                      >
                        <svg
                          className="w-5 h-5 text-custom-red mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contact section - Only show for non-owner users */}
              {shouldShowActionButtons && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Interested in this property?
                  </h2>
                  <p className="text-gray-700 mb-4">
                    Contact us to schedule a viewing or apply for this property.
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={openViewingModal}
                      className="w-full bg-custom-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors duration-300"
                      disabled={property.status !== "available"}
                    >
                      Schedule a Viewing
                    </button>
                    <button
                      onClick={openApplicationModal}
                      className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-4 border border-gray-300 rounded-md transition-colors duration-300"
                    >
                      Apply For Property
                    </button>
                  </div>

                  {property.status !== "available" && (
                    <p className="text-sm text-yellow-600 mt-2">
                      Note: This property is currently {property.status}. You
                      can still apply, but viewings may be limited.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Viewing Request Modal */}
      <ScheduleViewingModal
        property={property}
        isOpen={showViewingModal}
        onClose={() => setShowViewingModal(false)}
        onSuccess={handleViewingSuccess}
      />

      {/* Property Application Modal */}
      <PropertyApplicationModal
        property={property}
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        onSuccess={handleApplicationSuccess}
      />
    </div>
  );
}
