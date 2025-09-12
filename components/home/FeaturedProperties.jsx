"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, MapPinned } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useImageLoader } from "@/lib/services/imageLoaderService";

const BATCH_SIZE = 8;

const FeaturedProperties = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleItems, setVisibleItems] = useState(3);
  const scrollRef = useRef(null);
  const router = useRouter();
  const [bedIconError, setBedIconError] = useState(false);

  // Use image loader service
  const { propertyImages, loadPropertyImage, preloadPropertiesImages } =
    useImageLoader();

  // Properties state
  const [properties, setProperties] = useState([]);
  const [error, setError] = useState(null);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Direct Supabase loading function - bypass GlobalDataContext completely
  const loadProperties = async (forceRefresh = false) => {
    // Prevent concurrent loads and unnecessary reloads
    if (loadingProperties || (hasLoaded && !forceRefresh)) {
      return;
    }
    
    setLoadingProperties(true);
    setError(null);
    
    try {
      console.log("Loading featured properties directly from Supabase...");

      // Direct Supabase query - no context dependencies
      const { data, error: supabaseError } = await supabase
        .from('properties')
        .select('id, title, description, price, location, address, bedrooms, bathrooms, square_footage, owner_id, images, created_at, available_from, status')
        .order('created_at', { ascending: false })
        .limit(BATCH_SIZE);

      if (supabaseError) {
        throw supabaseError;
      }

      console.log("Featured properties loaded successfully:", {
        count: data?.length || 0,
        firstProperty: data?.[0]?.title
      });

      setProperties(data || []);
      setHasLoaded(true);

      // Preload images after successful load
      if (data && data.length > 0) {
        setTimeout(() => {
          preloadPropertiesImages(data);
        }, 100);
      }

    } catch (err) {
      console.error("Error loading featured properties:", err);
      setError(err.message || "Failed to load properties");
      setProperties([]);
      setHasLoaded(true);
    } finally {
      setLoadingProperties(false);
    }
  };

  // Single useEffect for initial load
  useEffect(() => {
    loadProperties();
  }, []); // No dependencies - load once and that's it

  // Responsive item calculation
  const getVisibleItemCount = () => {
    if (typeof window === "undefined") return 3;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  };

  // Update visible items on resize
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setVisibleItems(getVisibleItemCount());
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Scroll navigation
  const scrollNext = () => {
    if (scrollRef.current) {
      setCurrentIndex((prev) => {
        const newIndex = Math.min(prev + 1, properties.length - visibleItems);
        scrollRef.current.scrollTo({
          left: newIndex * (scrollRef.current.offsetWidth / visibleItems),
          behavior: "smooth",
        });
        return newIndex;
      });
    }
  };

  const scrollPrev = () => {
    if (scrollRef.current) {
      setCurrentIndex((prev) => {
        const newIndex = Math.max(prev - 1, 0);
        scrollRef.current.scrollTo({
          left: newIndex * (scrollRef.current.offsetWidth / visibleItems),
          behavior: "smooth",
        });
        return newIndex;
      });
    }
  };

  // Memoized price formatter
  const formatPrice = useMemo(() => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

    return (price) => formatter.format(price);
  }, []);

  // Handle property click
  const handlePropertyClick = (propertyId) => {
    router.push(`/property/${propertyId}`);
  };

  // PropertyCard component
  const PropertyCard = ({ property }) => {
    const [imageError, setImageError] = useState(false);
    const imageUrl = propertyImages[property.id] || "";

    // Load image if not already loaded
    useEffect(() => {
      if (property.images && property.images.length > 0 && !imageUrl) {
        loadPropertyImage(property.id, property.owner_id, property.images[0]);
      }
    }, [property.id, property.owner_id, property.images, imageUrl]);

    return (
      <div
        key={property.id}
        className="min-w-[calc(33.333%-16px)] sm:min-w-[calc(50%-12px)] md:min-w-[calc(33.333%-16px)] flex-shrink-0 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl"
        onClick={() => handlePropertyClick(property.id)}
      >
        {/* Image Section */}
        <div className="relative h-64 w-full">
          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={property.title || "Property image"}
              fill
              loading="lazy"
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-500 text-center p-4">
              <span className="text-sm">
                {imageError
                  ? "Image failed to load"
                  : property.images?.length
                  ? "Loading image..."
                  : "No image available"}
              </span>
            </div>
          )}

          {/* Status Badge */}
          {property.status && (
            <div className="absolute top-4 left-4 bg-custom-blue text-white px-3 py-1 rounded-full text-xs font-medium capitalize">
              {property.status}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-3">
          {/* Location and Price - Responsive Two Column Layout */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            {/* Location - Left Column */}
            <div className="flex items-center text-gray-600 text-md font-bold">
              <MapPinned size={14} className="mr-1" />
              <span className="truncate">
                {property.location || "Location unavailable"}
              </span>
            </div>

            {/* Price - Right Column */}
            <div className="text-gray-600 py-1 text-sm font-bold self-start sm:self-auto flex-shrink-0">
              {formatPrice(property.price || 0)}/pw
            </div>
          </div>

          {/* Property Details */}
          <div className="mb-3">
            <div className="flex items-center gap-4 text-gray-500 text-sm">
              <span className="font-bold">{property.location || "N/A"}</span>
              <span>|</span>
              <span>
                {property.available_from
                  ? `Available ${new Date(
                      property.available_from
                    ).toLocaleDateString()}`
                  : "Available now"}
              </span>
            </div>
          </div>

          {/* Description */}
          <h3 className="text-md text-gray-600 mb-2 line-clamp-2">
            {property.title || "Luxury, space, and convenience all in one"}
          </h3>

          {/* Divider line */}
          <hr className="border-gray-300 mb-2" />

          {/* Property Features */}
          <div className="flex items-center space-x-6 text-gray-700">
            <div className="flex items-center space-x-2">
              <div className="w-[20px] h-[20px] flex-shrink-0">
                <img
                  src="/images/icons/9.png"
                  alt="Bedrooms"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    setBedIconError(true);
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "block";
                  }}
                />
              </div>
              <span className="text-sm font-medium">
                {property.bedrooms || 0}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-[20px] h-[20px] flex-shrink-0">
                <img
                  src="/images/icons/10.png"
                  alt="Bathrooms"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    setBedIconError(true);
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "block";
                  }}
                />
              </div>
              <span className="text-sm font-medium">
                {property.bathrooms || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading skeleton
  const PropertySkeleton = () => (
    <div className="min-w-[calc(33.333%-16px)] sm:min-w-[calc(50%-12px)] md:min-w-[calc(33.333%-16px)] flex-shrink-0 bg-white rounded-2xl overflow-hidden animate-pulse shadow-lg">
      <div className="h-64 w-full bg-gray-300"></div>
      <div className="p-6">
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-300 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-300 rounded w-full mb-4"></div>
        <div className="flex space-x-6">
          <div className="h-4 bg-gray-300 rounded w-12"></div>
          <div className="h-4 bg-gray-300 rounded w-12"></div>
        </div>
      </div>
    </div>
  );

  // Error display
  const ErrorDisplay = () => (
    <div className="w-full py-10 text-center">
      <p className="text-orange-500 mb-4">{error}</p>
      <button
        onClick={() => {
          setHasLoaded(false);
          loadProperties(true);
        }}
        className="px-4 py-2 bg-custom-orange text-white rounded hover:bg-orange-700 transition-colors"
        disabled={loadingProperties}
      >
        {loadingProperties ? 'Loading...' : 'Try Again'}
      </button>
    </div>
  );

  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="w-full max-w-7xl container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900">
              Featured Properties
            </h2>
            <p className="text-gray-600">Explore our latest properties</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={scrollPrev}
              className="rounded-full border border-gray-300 p-3 hover:bg-gray-100 hover:border-gray-400 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentIndex === 0 || loadingProperties}
              aria-label="Previous properties"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              onClick={scrollNext}
              className="rounded-full border border-gray-300 p-3 hover:bg-gray-100 hover:border-gray-400 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                currentIndex >= properties.length - visibleItems || loadingProperties
              }
              aria-label="Next properties"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {error ? (
          <ErrorDisplay />
        ) : loadingProperties && properties.length === 0 ? (
          <div className="flex space-x-6 overflow-x-hidden">
            {[...Array(3)].map((_, index) => (
              <PropertySkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        ) : properties.length === 0 && hasLoaded ? (
          <div className="text-center py-10">
            <p className="text-gray-600">
              No properties available at the moment.
            </p>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex space-x-6 overflow-x-hidden scroll-smooth"
          >
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProperties;