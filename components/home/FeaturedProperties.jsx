// FeaturedProperties.js - SIMPLIFIED VERSION to show all properties
"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, MapPinned } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useImageLoader } from "@/lib/services/imageLoaderService";

const FeaturedProperties = ({ showOnlyAvailable = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleItems, setVisibleItems] = useState(3);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const scrollRef = useRef(null);
  const router = useRouter();
  const [bedIconError, setBedIconError] = useState(false);

  const { propertyImages, loadPropertyImage, preloadPropertiesImages } = useImageLoader();

  const [allProperties, setAllProperties] = useState([]);
  const [error, setError] = useState(null);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const filteredProperties = useMemo(() => {
    if (selectedFilter === 'all') {
      return allProperties;
    }
    return allProperties.filter(property => property.status === selectedFilter);
  }, [allProperties, selectedFilter]);

  const statusConfig = {
    available: {
      label: 'Available',
      className: 'bg-green-100 text-green-800',
      badgeClass: 'bg-custom-blue',
      showActions: true
    },
    rented: {
      label: 'Rented',
      className: 'bg-red-100 text-red-800',
      badgeClass: 'bg-custom-orange',
      showActions: true
    },
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800',
      badgeClass: 'bg-yellow-500',
      showActions: false
    },
    maintenance: {
      label: 'Maintenance',
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      badgeClass: 'bg-gray-500',
      showActions: false
    }
  };

  // SIMPLIFIED: Direct Supabase query without any complex utilities
  const loadProperties = async (forceRefresh = false) => {
    if (loadingProperties || (hasLoaded && !forceRefresh)) {
      return;
    }
    
    setLoadingProperties(true);
    setError(null);
    
    try {
      console.log("🔄 Loading ALL properties from Supabase...");

      // Test with service role key to bypass RLS
      console.log("🔑 Current auth user:", await supabase.auth.getUser());
      
      // Simple, direct query - NO FILTERS
      const { data: rawData, error: supabaseError } = await supabase
        .from('properties')
        .select(`
          id, 
          title, 
          description, 
          price, 
          location, 
          address, 
          bedrooms, 
          bathrooms, 
          square_footage, 
          owner_id, 
          images, 
          created_at, 
          available_from, 
          status
        `)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        console.error("❌ Supabase error:", supabaseError);
        throw supabaseError;
      }

      console.log("📊 Raw data from database:", rawData);
      console.log("📊 Total properties found:", rawData?.length || 0);

      // Log each property and its status
      if (rawData && rawData.length > 0) {
        rawData.forEach((prop, index) => {
          console.log(`Property ${index + 1}:`, {
            id: prop.id,
            title: prop.title,
            status: prop.status,
            location: prop.location
          });
        });
      }

      // Ensure every property has a status
      const normalizedData = (rawData || []).map(property => ({
        ...property,
        status: property.status || 'available' // Default to available if null
      }));

      console.log("✅ Normalized data:", normalizedData.length, "properties");

      // Count properties by status
      const statusCounts = normalizedData.reduce((acc, prop) => {
        acc[prop.status] = (acc[prop.status] || 0) + 1;
        return acc;
      }, {});

      console.log("📈 Status breakdown:", statusCounts);

      setAllProperties(normalizedData);
      setHasLoaded(true);

      // Preload images
      if (normalizedData.length > 0) {
        setTimeout(() => {
          preloadPropertiesImages(normalizedData);
        }, 100);
      }

    } catch (err) {
      console.error("❌ Error loading properties:", err);
      setError(err.message || "Failed to load properties");
      setAllProperties([]);
      setHasLoaded(true);
    } finally {
      setLoadingProperties(false);
    }
  };

  // Auto-refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("👁️ Tab visible - refreshing properties");
        loadProperties(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Initial load
  useEffect(() => {
    loadProperties();
  }, []);

  // Reset currentIndex when filter changes
  useEffect(() => {
    setCurrentIndex(0);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [selectedFilter]);

  // Responsive calculations
  const getVisibleItemCount = () => {
    if (typeof window === "undefined") return 3;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setVisibleItems(getVisibleItemCount());
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Navigation functions
  const scrollNext = () => {
    if (scrollRef.current) {
      setCurrentIndex((prev) => {
        const newIndex = Math.min(prev + 1, filteredProperties.length - visibleItems);
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

  const formatPrice = useMemo(() => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
    return (price) => formatter.format(price);
  }, []);

  const handlePropertyClick = (property) => {
    router.push(`/property/${property.id}`);
  };

  // Filter buttons
  const FilterButtons = () => {
    const statusCounts = useMemo(() => {
      return allProperties.reduce((acc, prop) => {
        const status = prop.status || 'available';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
    }, [allProperties]);

    const filterOptions = [
      { key: 'all', label: 'All Properties', count: allProperties.length },
      { key: 'available', label: 'Available', count: statusCounts.available || 0 },
      { key: 'rented', label: 'Rented', count: statusCounts.rented || 0 },
    ];

    if (statusCounts.pending > 0) {
      filterOptions.push({ key: 'pending', label: 'Pending', count: statusCounts.pending });
    }
    if (statusCounts.maintenance > 0) {
      filterOptions.push({ key: 'maintenance', label: 'Maintenance', count: statusCounts.maintenance });
    }

    return (
      <div className="flex flex-wrap gap-2 mb-6">
        {filterOptions.map((option) => (
          <button
            key={option.key}
            onClick={() => setSelectedFilter(option.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
              selectedFilter === option.key
                ? 'bg-custom-orange text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {option.label} ({option.count})
          </button>
        ))}
      </div>
    );
  };

  // Property Card component
  const PropertyCard = ({ property }) => {
    const [imageError, setImageError] = useState(false);
    const imageUrl = propertyImages[property.id] || "";
    const status = property.status || 'available';
    const statusInfo = statusConfig[status] || statusConfig.available;

    useEffect(() => {
      if (property.images && property.images.length > 0 && !imageUrl) {
        loadPropertyImage(property.id, property.owner_id, property.images[0]);
      }
    }, [property.id, property.owner_id, property.images, imageUrl]);

    return (
      <div
        key={property.id}
        className={`min-w-[calc(33.333%-16px)] sm:min-w-[calc(50%-12px)] md:min-w-[calc(33.333%-16px)] flex-shrink-0 overflow-hidden transition-all duration-300 rounded-lg border-2 ${
          statusInfo.showActions 
            ? 'cursor-pointer hover:shadow-xl' 
            : 'cursor-default border-gray-200'
        } ${statusInfo.className}`}
        onClick={() => statusInfo.showActions && handlePropertyClick(property)}
      >
        {/* Image Section */}
        <div className="relative h-64 w-full">
          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={property.title || "Property image"}
              fill
              loading="lazy"
              className={`object-cover ${status === 'rented' ? 'opacity-85' : ''}`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-500 text-center p-4">
              <span className="text-sm">
                {imageError ? "Image failed to load" : property.images?.length ? "Loading image..." : "No image available"}
              </span>
            </div>
          )}

          {/* Status Badge */}
          <div className={`absolute top-4 left-4 ${statusInfo.badgeClass} text-white px-3 py-1 rounded-full text-xs font-medium capitalize shadow-md`}>
            {statusInfo.label}
          </div>          

          {/* Overlay for non-available properties (excluding rented) */}
          {!statusInfo.showActions && status !== 'rented' && (
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <div className="bg-white bg-opacity-90 px-4 py-2 rounded-lg">
                <span className="text-gray-800 font-medium text-sm">
                  {status === 'pending' ? 'Application Pending' : 'Not Available'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-3 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex items-center text-gray-600 text-md font-bold">
              <MapPinned size={14} className="mr-1" />
              <span className="truncate">{property.location || "Location unavailable"}</span>
            </div>
            <div className={`text-sm font-bold self-start sm:self-auto flex-shrink-0 ${
              statusInfo.showActions ? 'text-gray-600' : 'text-gray-400'
            }`}>
              {formatPrice(property.price || 0)}/pw
            </div>
          </div>

          <div className="mb-3">
            <div className={`flex items-center gap-4 text-sm ${
              statusInfo.showActions ? 'text-gray-500' : 'text-gray-400'
            }`}>
              <span className="font-bold">{property.location || "N/A"}</span>
              <span>|</span>
              <span>
                {status === 'rented' 
                  ? 'Currently occupied' 
                  : property.available_from
                    ? `Available ${new Date(property.available_from).toLocaleDateString()}`
                    : 'Available now'
                }
              </span>
            </div>
          </div>

          <h3 className={`text-md mb-2 line-clamp-2 ${
            statusInfo.showActions ? 'text-gray-600' : 'text-gray-400'
          }`}>
            {property.title || "Luxury, space, and convenience all in one"}
          </h3>

          <hr className="border-gray-300 mb-2" />

          <div className={`flex items-center space-x-6 ${
            statusInfo.showActions ? 'text-gray-700' : 'text-gray-400'
          }`}>
            <div className="flex items-center space-x-2">
              <div className="w-[20px] h-[20px] flex-shrink-0">
                <img
                  src="/images/icons/9.png"
                  alt="Bedrooms"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    setBedIconError(true);
                    e.target.style.display = "none";
                  }}
                />
              </div>
              <span className="text-sm font-medium">{property.bedrooms || 0}</span>
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
                  }}
                />
              </div>
              <span className="text-sm font-medium">{property.bathrooms || 0}</span>
            </div>
          </div>

          {!statusInfo.showActions && status !== 'rented' && (
            <div className="mt-3 text-center">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {status === 'pending' ? 'Application under review' : 'Not available for rent'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="w-full max-w-7xl container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900">Featured Properties</h2>
            <p className="text-gray-600">
              Explore our latest properties • Showing {filteredProperties.length} of {allProperties.length} properties
            </p>            
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => loadProperties(true)}
              className="rounded-full border border-gray-300 p-3 hover:bg-gray-100 hover:border-gray-400 transition-colors duration-300"
              title="Refresh Properties"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={scrollPrev}
              className="rounded-full border border-gray-300 p-3 hover:bg-gray-100 hover:border-gray-400 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentIndex === 0 || loadingProperties}
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              onClick={scrollNext}
              className="rounded-full border border-gray-300 p-3 hover:bg-gray-100 hover:border-gray-400 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentIndex >= filteredProperties.length - visibleItems || loadingProperties}
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {hasLoaded && allProperties.length > 0 && <FilterButtons />}

        {error ? (
          <div className="w-full py-10 text-center">
            <p className="text-orange-500 mb-4">{error}</p>
            <button
              onClick={() => loadProperties(true)}
              className="px-4 py-2 bg-custom-orange text-white rounded hover:bg-orange-700 transition-colors"
              disabled={loadingProperties}
            >
              {loadingProperties ? 'Loading...' : 'Try Again'}
            </button>
          </div>
        ) : loadingProperties && allProperties.length === 0 ? (
          <div className="flex space-x-6 overflow-x-hidden">
            {[...Array(3)].map((_, index) => (
              <div key={`skeleton-${index}`} className="min-w-[calc(33.333%-16px)] flex-shrink-0 bg-white rounded-2xl overflow-hidden animate-pulse shadow-lg">
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
            ))}
          </div>
        ) : filteredProperties.length === 0 && hasLoaded ? (
          <div className="text-center py-10">
            <p className="text-gray-600">
              {selectedFilter === 'all' 
                ? "No properties available at the moment."
                : `No ${selectedFilter} properties found.`
              }
            </p>
          </div>
        ) : (
          <div ref={scrollRef} className="flex space-x-6 overflow-x-hidden scroll-smooth">
            {filteredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProperties;