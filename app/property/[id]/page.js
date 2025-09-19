"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useGlobalData } from "@/contexts/GlobalDataContext";
import { useImageLoader } from "@/lib/services/imageLoaderService";
import ScheduleViewingModal from "@/components/property/ScheduleViewingModal";
import PropertyApplicationModal from "@/components/property/PropertyApplicationModal";
import { toast } from "react-hot-toast";

export default function PropertyDetails() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = params;

  // Global data context
  const { fetchData, loading: globalLoading } = useGlobalData();

  // Image loader context
  const { loadPropertyImage } = useImageLoader();

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

  // Fetch property details using global context
  const fetchPropertyDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      console.log("Fetching property with ID:", id);

      // Use global context to fetch property data
      const propertyData = await fetchData({
        table: "properties",
        select: "*",
        filters: { id },
        single: true,
        _cached_key: `property_${id}`, // Custom cache key for single property
      });

      // Handle case where fetchData returns an array instead of single object
      const singleProperty = Array.isArray(propertyData)
        ? propertyData[0]
        : propertyData;

      console.log("Property data from global context:", propertyData);
      console.log("Single property:", singleProperty);

      if (!singleProperty) {
        setError("Property not found");
        return;
      }

      console.log("Property data loaded:", singleProperty);
      setProperty(singleProperty);

      // Load images
      if (singleProperty.images && singleProperty.images.length > 0) {
        console.log("Loading images:", singleProperty.images);
        loadPropertyImages(singleProperty);
      } else {
        console.log("No images found for property");
        setImageUrls([]);
      }
    } catch (err) {
      console.error("Error fetching property details:", err);
      setError(err.message || "Failed to load property details");
    } finally {
      setLoading(false);
    }
  }, [id, fetchData]);

  // Fetch user role using global context
  const fetchUserRole = useCallback(async () => {
    if (!user) {
      setUserRole(null);
      return;
    }

    try {
      const profileData = await fetchData({
        table: "profiles",
        select: "role",
        filters: { id: user.id },
        single: true,
        _cached_key: `user_role_${user.id}`,
      });

      setUserRole(profileData?.role || null);
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole(null);
    }
  }, [user, fetchData]);

  // Load property images - FIXED VERSION
  const loadPropertyImages = useCallback(
    async (propertyData) => {
      if (!propertyData?.images || propertyData.images.length === 0) {
        setImageUrls([]);
        return;
      }

      try {
        console.log("Loading images for property:", propertyData.id);
        console.log("Images array:", propertyData.images);

        // Reset imageUrls first
        setImageUrls([]);

        // Load all images sequentially to maintain order
        const imagePromises =
          propertyData?.images.map(async (imagePath, index) => {
            const imageUrl = await loadPropertyImage(
              `${propertyData.id}_image_${index}`, // More unique key for each image
              propertyData.owner_id,
              imagePath
            );
            return { url: imageUrl, originalPath: imagePath };
          }) || [];

        const imageResults = await Promise.all(imagePromises);

        // Filter out any failed/empty URLs, remove duplicates by URL
        const validImageUrls = imageResults
          .filter((result) => result.url && result.url !== "")
          .map((result) => result.url);

        // Remove duplicates using Set
        const uniqueImageUrls = [...new Set(validImageUrls)];

        console.log("Loaded image URLs:", uniqueImageUrls);
        console.log("Original images count:", propertyData.images.length);
        console.log("Final unique URLs count:", uniqueImageUrls.length);

        setImageUrls(uniqueImageUrls);
      } catch (error) {
        console.error("Error loading property images:", error);
        setImageUrls([]);
      }
    },
    [loadPropertyImage]
  );

  // Effects
  useEffect(() => {
    console.log("Component mounted, ID:", id);
    fetchPropertyDetails();
  }, [fetchPropertyDetails]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  // Get all available image URLs with fallback logic - FIXED VERSION
  const allImageUrls = useMemo(() => {
    // Only use imageUrls (loaded from database), don't mix with cached images
    // This prevents duplication issues
    const uniqueUrls = [
      ...new Set(imageUrls.filter((url) => url && url !== "")),
    ];

    console.log("All available image URLs:", uniqueUrls);
    console.log("imageUrls length:", imageUrls.length);
    console.log("Final unique URLs length:", uniqueUrls.length);

    return uniqueUrls;
  }, [imageUrls]);

  // Get main image URL
  const mainImageUrl = useMemo(() => {
    // First check if we have a valid image from allImageUrls
    const currentImageUrl = allImageUrls[activeImage];
    if (currentImageUrl) {
      console.log("Using main image URL:", currentImageUrl);
      return currentImageUrl;
    }

    // Fallback to first available image
    const fallbackUrl = allImageUrls[0];
    if (fallbackUrl) {
      console.log("Using fallback image URL:", fallbackUrl);
      return fallbackUrl;
    }

    console.log("No image URL available");
    return null;
  }, [allImageUrls, activeImage]);

  // Modal handlers
  const openViewingModal = useCallback(() => {
    setShowViewingModal(true);
  }, []);

  const openApplicationModal = useCallback(() => {
    setShowApplicationModal(true);
  }, []);

  const handleViewingSuccess = useCallback(() => {
    toast.success(
      "Viewing request submitted successfully! The owner will respond to your request soon."
    );
  }, []);

  const handleApplicationSuccess = useCallback(() => {
    toast.success(
      "Application submitted successfully! The owner will review your application soon."
    );
  }, []);

  // Check if action buttons should be shown - UPDATED LOGIC
  const shouldShowActionButtons = useMemo(() => {
    // Don't show for owners
    if (userRole === "owner") return false;

    // Only show for available properties
    if (property?.status !== "available") return false;

    return true;
  }, [userRole, property?.status]);

  // Get status-specific configuration
  const statusConfig = useMemo(() => {
    const status = property?.status?.toLowerCase() || "available";

    switch (status) {
      case "available":
        return {
          showActions: true,
          badgeClass: "bg-custom-blue",
          message: null,
        };
      case "rented":
        return {
          showActions: false,
          badgeClass: "bg-custom-orange",
          message:
            "This property is currently rented and not available for new applications.",
        };
      default:
        return {
          showActions: false,
          badgeClass: "bg-gray-500",
          message: "This property is not currently available.",
        };
    }
  }, [property?.status]);

  // Check loading state - combine local and global loading
  const isLoading = loading || globalLoading[`property_${id}`];

  const AmenityIcon = ({ amenity }) => {
    const [iconError, setIconError] = useState(false);

    const getAmenityImagePath = (amenityType) => {
      const amenityLower = amenityType.toLowerCase();

      // Map amenities to their corresponding image files
      if (
        amenityLower.includes("air conditioning") ||
        amenityLower.includes("cooling") ||
        amenityLower.includes("ac")
      ) {
        return "/images/icons/amenities/1.png";
      }
      if (amenityLower.includes("parking") || amenityLower.includes("garage")) {
        return "/images/icons/amenities/2.png";
      }
      if (
        amenityLower.includes("furnished") ||
        amenityLower.includes("furniture")
      ) {
        return "/images/icons/amenities/3.png";
      }
      if (amenityLower.includes("heating") || amenityLower.includes("heat")) {
        return "/images/icons/amenities/4.png";
      }
      if (
        amenityLower.includes("washer") ||
        amenityLower.includes("dryer") ||
        amenityLower.includes("laundry")
      ) {
        return "/images/icons/amenities/5.png";
      }
      if (
        amenityLower.includes("dishwasher") ||
        amenityLower.includes("dish washer")
      ) {
        return "/images/icons/amenities/6.png";
      }

      if (amenityLower.includes("gym") || amenityLower.includes("fitness")) {
        return "/images/icons/amenities/7.png";
      }
      if (amenityLower.includes("pool") || amenityLower.includes("swimming")) {
        return "/images/icons/amenities/8.png";
      }
      if (
        amenityLower.includes("pet friendly") ||
        amenityLower.includes("pet") ||
        amenityLower.includes("pets allowed")
      ) {
        return "/images/icons/amenities/9.png";
      }
      if (
        amenityLower.includes("balcony") ||
        amenityLower.includes("terrace")
      ) {
        return "/images/icons/amenities/10.png";
      }
      if (amenityLower.includes("elevator") || amenityLower.includes("lift")) {
        return "/images/icons/amenities/11.png";
      }
      if (
        amenityLower.includes("security system") ||
        amenityLower.includes("security") ||
        amenityLower.includes("safe")
      ) {
        return "/images/icons/amenities/12.png";
      }
      if (amenityLower.includes("wifi") || amenityLower.includes("internet")) {
        return "/images/icons/amenities/13.png";
      }
    };

    const imagePath = getAmenityImagePath(amenity);

    return (
      <div className="flex items-center">
        <div className="w-5 h-5 mr-2 flex-shrink-0">
          {!iconError && imagePath ? (
            <img
              src={imagePath}
              alt={`${amenity} icon`}
              className="w-full h-full object-contain"
              onError={(e) => {
                console.log(
                  `Failed to load amenity icon: ${imagePath} for ${amenity}`
                );
                setIconError(true);
                e.target.style.display = "none";
              }}
            />
          ) : (
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
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
              {[...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className="h-24 w-24 rounded-md bg-gray-300 animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Debug information
  console.log("Render state:", {
    loading: isLoading,
    error,
    property: property ? "loaded" : "null",
    propertyStatus: property?.status,
    shouldShowActionButtons,
    statusConfig,
    totalImages: allImageUrls.length,
    mainImageUrl: mainImageUrl ? "available" : "null",
    activeImageIndex: activeImage,
    id,
    globalLoading: globalLoading[`property_${id}`],
  });

  // Show skeleton while loading
  if (isLoading && !property) {
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
            className="bg-custom-orange hover:bg-custom-yellow text-white font-bold py-2 px-6 rounded-md transition-colors duration-300"
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-40 px-4 sm:px-6 lg:px-20 text-gray-600">
      <div className="mx-auto">
        {/* Main image section - Grid Layout */}
        <div className="mb-6">
          {allImageUrls.length > 0 ? (
            <div className="grid gap-2">
              {/* Layout for 1 image */}
              {allImageUrls.length === 1 && (
                <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden">
                  <Image
                    src={allImageUrls[0]}
                    alt={`${property.title || "Property"} - Image 1`}
                    fill
                    className="object-cover"
                    priority
                    sizes="100vw"
                  />
                </div>
              )}

              {/* Layout for 2 images */}
              {allImageUrls.length === 2 && (
                <div className="grid grid-cols-2 gap-2">
                  {allImageUrls?.map((imageUrl, index) => (
                    <div
                      key={index}
                      className="relative aspect-[4/3] rounded-lg overflow-hidden"
                    >
                      <Image
                        src={imageUrl}
                        alt={`${property.title || "Property"} - Image ${
                          index + 1
                        }`}
                        fill
                        className="object-cover"
                        priority={index === 0}
                        sizes="50vw"
                      />
                    </div>
                  )) || <div>No images available</div>}
                </div>
              )}

              {/* Layout for 3 images */}
              {allImageUrls.length === 3 && (
                <div className="grid grid-cols-2 gap-2">
                  {/* First image takes full left column */}
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                    <Image
                      src={allImageUrls[0]}
                      alt={`${property.title || "Property"} - Image 1`}
                      fill
                      className="object-cover"
                      priority
                      sizes="50vw"
                    />
                  </div>
                  {/* Right column with 2 images stacked */}
                  <div className="grid grid-rows-2 gap-2">
                    {allImageUrls.slice(1, 3).map((imageUrl, index) => (
                      <div
                        key={index + 1}
                        className="relative aspect-[4/3] rounded-lg overflow-hidden"
                      >
                        <Image
                          src={imageUrl}
                          alt={`${property.title || "Property"} - Image ${
                            index + 2
                          }`}
                          fill
                          className="object-cover"
                          sizes="25vw"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Layout for 4 images */}
              {allImageUrls.length === 4 && (
                <div className="grid grid-cols-2 gap-2">
                  {/* First image takes larger space */}
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                    <Image
                      src={allImageUrls[0]}
                      alt={`${property.title || "Property"} - Image 1`}
                      fill
                      className="object-cover"
                      priority
                      sizes="50vw"
                    />
                  </div>
                  {/* Right column with 3 images */}
                  <div className="grid grid-rows-3 gap-2">
                    {allImageUrls.slice(1, 4).map((imageUrl, index) => (
                      <div
                        key={index + 1}
                        className="relative aspect-[4/3] rounded-lg overflow-hidden"
                      >
                        <Image
                          src={imageUrl}
                          alt={`${property.title || "Property"} - Image ${
                            index + 2
                          }`}
                          fill
                          className="object-cover"
                          sizes="25vw"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Layout for 5+ images */}
              {allImageUrls.length >= 5 && (
                <div className="grid grid-cols-4 gap-2">
                  {/* First image takes 2 columns */}
                  <div className="col-span-2 relative aspect-[4/3] rounded-lg overflow-hidden">
                    <Image
                      src={allImageUrls[0]}
                      alt={`${property.title || "Property"} - Image 1`}
                      fill
                      className="object-cover"
                      priority
                      sizes="50vw"
                    />
                  </div>

                  {/* Second image takes 1 column */}
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                    <Image
                      src={allImageUrls[1]}
                      alt={`${property.title || "Property"} - Image 2`}
                      fill
                      className="object-cover"
                      sizes="25vw"
                    />
                  </div>

                  {/* Third image takes 1 column */}
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                    <Image
                      src={allImageUrls[2]}
                      alt={`${property.title || "Property"} - Image 3`}
                      fill
                      className="object-cover"
                      sizes="25vw"
                    />
                  </div>

                  {/* Fourth image */}
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                    <Image
                      src={allImageUrls[3]}
                      alt={`${property.title || "Property"} - Image 4`}
                      fill
                      className="object-cover"
                      sizes="25vw"
                    />
                  </div>

                  {/* Fifth image with overlay if more images exist */}
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                    <Image
                      src={allImageUrls[4]}
                      alt={`${property.title || "Property"} - Image 5`}
                      fill
                      className="object-cover"
                      sizes="25vw"
                    />
                    {/* Show +X more overlay if there are more than 5 images */}
                    {allImageUrls.length > 5 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-white text-lg font-bold">
                            +{allImageUrls.length - 5}
                          </div>
                          <div className="text-white text-sm">more photos</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* No images fallback */
            <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p>No images available</p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile responsive: Horizontal scroll for mobile */}
        <div className="md:hidden">
          {allImageUrls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
              {allImageUrls.map((imageUrl, index) => (
                <div
                  key={`mobile-${index}`}
                  className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden"
                >
                  <Image
                    src={imageUrl}
                    alt={`Mobile view ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8">
            {/* Status tag */}
            <div className="mb-2">
              <span
                className={`inline-block ${statusConfig.badgeClass} text-white text-xs font-semibold px-3 py-1 rounded-full capitalize`}
              >
                {property.status || "Available"}
              </span>
            </div>

            {/* Property header - Updated Layout */}
            <div className="mb-6">
              <div className="flex justify-between items-start mb-4">
                {/* Left side - Property info */}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {property.title || "Property Details"}
                  </h1>
                  <div className="flex items-center gap-4 text-gray-600 mb-3">
                    <span>
                      {property.location ||
                        property.address ||
                        "Location not specified"}
                    </span>
                    <span>|</span>
                    <span>
                      {property.status === "rented"
                        ? "Currently Occupied"
                        : `Available ${formatDate(property.available_from)}`}
                    </span>
                  </div>
                </div>

                {/* Right side - Price */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-custom-orange">
                    {formatPrice(property.price)}/year
                  </div>
                </div>
              </div>

              {/* Status-specific message */}
              {statusConfig.message && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-amber-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-amber-700">
                        {statusConfig.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Divider line */}
              <hr className="border-gray-200" />
            </div>

            {/* Property details */}
            <div className="flex items-center mb-6">
              <div className="flex items-center mr-6">
                <div className="w-[20px] h-[20px] flex-shrink-0">
                  <img
                    src="/images/icons/9.png"
                    alt="Bedrooms"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
                <span className="text-gray-700 ml-2">
                  {property.bedrooms || 0}
                </span>
              </div>
              <div className="flex items-center mr-6">
                <div className="w-[20px] h-[20px] flex-shrink-0">
                  <img
                    src="/images/icons/10.png"
                    alt="Bathrooms"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
                <span className="text-gray-700 ml-2">
                  {property.bathrooms || 0}
                </span>
              </div>
              {property.square_footage && (
                <div className="flex items-center">
                  <div className="w-[20px] h-[20px] flex-shrink-0">
                    <img
                      src="/images/icons/11.png"
                      alt="Square footage"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                  <span className="text-gray-700 ml-2">
                    {property.square_footage} sq ft
                  </span>
                </div>
              )}
            </div>

            {/* Overview */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Overview
              </h3>
              <div className="text-gray-700">
                <p>{property.description || "No description available"}</p>
              </div>
            </div>

            {/* Highlights */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Highlights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-5">
                <div className="flex items-start">
                  <div className="mr-3">
                    <svg
                      className="w-6 h-6 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Type</div>
                    <div className="text-gray-700">
                      {property.property_type || "Not specified"}
                    </div>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mr-3">
                    <svg
                      className="w-6 h-6 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Building Year</div>
                    <div className="text-gray-700">
                      {property.year_built || "Not specified"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nearby Amenities */}
            {property.nearby_amenities &&
              property.nearby_amenities.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">
                    Nearby Amenities
                  </h3>
                  <div className="space-y-2">
                    {property.nearby_amenities.map((amenity, index) => (
                      <div key={index} className="flex items-center">
                        <svg
                          className="w-5 h-5 text-gray-500 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
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
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Amenities
                </h3>
                <div className="space-y-2">
                  {property.amenities.map((amenity, index) => (
                    <AmenityIcon key={index} amenity={amenity} />
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons - Only show for available properties and non-owners */}
            {shouldShowActionButtons && (
              <div className="bg-white border border-gray-200 rounded-md p-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Request a tour
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Get a tour of the house as per your time.
                </p>

                <button
                  onClick={openViewingModal}
                  className="w-full bg-custom-orange hover:bg-custom-yellow text-white font-medium py-2 px-4 rounded-full transition-colors duration-300 mb-3"
                >
                  Book Viewing
                </button>

                <button
                  onClick={openApplicationModal}
                  className="w-full bg-white hover:bg-gray-100 text-gray-800 font-medium py-2 px-4 border border-gray-300 rounded-full transition-colors duration-300"
                >
                  Apply for the property
                </button>
              </div>
            )}

            {/* Alternative message for non-available properties */}
            {!shouldShowActionButtons &&
              userRole !== "owner" &&
              statusConfig.message && (
                <div className="bg-white border border-gray-200 rounded-md p-4">
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">
                    Property Status
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-700">
                          {statusConfig.message}
                        </p>
                      </div>
                    </div>
                  </div>
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
