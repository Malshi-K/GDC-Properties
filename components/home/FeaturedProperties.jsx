"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";
import { useGlobalData } from '@/contexts/GlobalDataContext'; // Import the global data context
import { useImageLoader } from '@/lib/services/imageLoaderService'; // Import the image loader service

const CACHE_KEY = 'featured_properties';
const BATCH_SIZE = 8;

const FeaturedProperties = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const router = useRouter();
  const isInitialMount = useRef(true);
  const fetchAbortController = useRef(null);
  
  // Get global context functions
  const { 
    getFromCache, 
    addToCache, 
    startLoading, 
    stopLoading 
  } = useGlobalData();
  
  // Get image loader functions
  const { 
    propertyImages,
    preloadPropertiesImages 
  } = useImageLoader();

  // Function to fetch properties with proper error handling and cancellation
  const fetchProperties = async (forceRefresh = false) => {
    // Cancel any in-progress fetches
    if (fetchAbortController.current) {
      fetchAbortController.current.abort();
    }
    
    // Create a new abort controller for this fetch
    fetchAbortController.current = new AbortController();
    const signal = fetchAbortController.current.signal;
    
    try {
      // Start loading states
      setLoading(true);
      startLoading();
      
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedData = getFromCache(CACHE_KEY);
        if (cachedData) {
          setProperties(cachedData);
          setLoading(false);
          
          // Preload property images in the background
          if (Array.isArray(cachedData) && cachedData.length > 0) {
            preloadPropertiesImages(cachedData);
          }
          
          return;
        }
      }
      
      // Fetch new data with timeout
      const timeoutId = setTimeout(() => {
        if (fetchAbortController.current) {
          fetchAbortController.current.abort('Timeout');
        }
      }, 15000); // 15 second timeout
      
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, price, location, bedrooms, bathrooms, square_footage, owner_id, images, created_at')
        .order('created_at', { ascending: false })
        .limit(BATCH_SIZE);
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Check if fetch was aborted
      if (signal.aborted) {
        return;
      }
      
      if (error) {
        console.error('Error fetching properties:', error);
        setError(error.message || 'Failed to load properties');
        return;
      }
      
      // Update state with fetched data
      if (Array.isArray(data)) {
        setProperties(data);
        
        // Cache the data using the global context
        addToCache(CACHE_KEY, data, {
          // Cache for 1 hour
          expiry: 60 * 60 * 1000,
          persist: true
        });
        
        // Preload property images
        preloadPropertiesImages(data);
      } else {
        setProperties([]);
      }
      
      setError(null);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted:', err.message);
      } else {
        console.error('Error fetching properties:', err);
        setError(err.message || 'An unexpected error occurred');
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        stopLoading();
      }
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchProperties();
    
    // Cleanup function
    return () => {
      if (fetchAbortController.current) {
        fetchAbortController.current.abort();
      }
    };
  }, []);

  // Add visibility change handler to refresh stale data
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isInitialMount.current) {
        // Only refresh if the data is stale (over 10 minutes old)
        const cachedData = getFromCache(CACHE_KEY);
        const cachedTimestamp = cachedData?._timestamp;
        
        if (!cachedTimestamp || (Date.now() - cachedTimestamp > 10 * 60 * 1000)) {
          fetchProperties();
        }
      }
    };
    
    // Mark initial mount complete after first render
    isInitialMount.current = false;
    
    // Add event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Responsive item calculation
  const getVisibleItemCount = () => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  };
  
  // Keep track of visible items count
  const [visibleItems, setVisibleItems] = useState(3); // Default to 3
  
  // Update visible items on resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setVisibleItems(getVisibleItemCount());
    };
    
    // Set initial count
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Scroll to the next set of items
  const scrollNext = () => {
    if (scrollRef.current) {
      setCurrentIndex(prev => {
        const newIndex = Math.min(prev + 1, properties.length - visibleItems);
        scrollRef.current.scrollTo({
          left: newIndex * (scrollRef.current.offsetWidth / visibleItems),
          behavior: 'smooth'
        });
        return newIndex;
      });
    }
  };

  // Scroll to the previous set of items
  const scrollPrev = () => {
    if (scrollRef.current) {
      setCurrentIndex(prev => {
        const newIndex = Math.max(prev - 1, 0);
        scrollRef.current.scrollTo({
          left: newIndex * (scrollRef.current.offsetWidth / visibleItems),
          behavior: 'smooth'
        });
        return newIndex;
      });
    }
  };

  // Memoized price formatter
  const formatPrice = useMemo(() => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
    
    return (price) => formatter.format(price);
  }, []);

  // Handle property click to navigate to details page
  const handlePropertyClick = (propertyId) => {
    router.push(`/property/${propertyId}`);
  };

  // PropertyCard component with error handling for images
  const PropertyCard = ({ property }) => {
    const [imageError, setImageError] = useState(false);
    
    return (
      <div 
        key={property.id} 
        className="min-w-[calc(33.333%-16px)] sm:min-w-[calc(50%-12px)] md:min-w-[calc(33.333%-16px)] flex-shrink-0 bg-custom-red rounded-lg overflow-hidden cursor-pointer shadow-lg transition-transform duration-300 hover:transform hover:scale-[1.02]"
        onClick={() => handlePropertyClick(property.id)}
      >
        <div className="relative h-60 w-full">
          {propertyImages[property.id] && !imageError ? (
            <Image 
              src={propertyImages[property.id]} 
              alt={property.title || 'Property image'}
              fill
              loading="lazy"
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-700 text-white text-center p-4">
              <span>
                {imageError 
                  ? "Image failed to load" 
                  : property.images?.length 
                    ? "Loading image..." 
                    : "No image available"
                }
              </span>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold truncate">
              {property.title || 'Untitled Property'}
            </h3>
            <p className="text-right font-bold whitespace-nowrap">
              {formatPrice(property.price || 0)}
            </p>
          </div>
          <p className="text-sm text-gray-200 mt-1 truncate">
            {property.location || 'Location unavailable'}
          </p>
          <div className="flex space-x-4 mt-2 text-sm">
            <span>{property.bedrooms || 0} Beds</span>
            <span>{property.bathrooms || 0} Baths</span>
            {property.square_footage && (
              <span>{property.square_footage} sq ft</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // PropertySkeleton for loading state
  const PropertySkeleton = () => (
    <div className="min-w-[calc(33.333%-16px)] sm:min-w-[calc(50%-12px)] md:min-w-[calc(33.333%-16px)] flex-shrink-0 bg-gray-700 rounded-lg overflow-hidden animate-pulse shadow-lg">
      <div className="h-60 w-full bg-gray-600"></div>
      <div className="p-4">
        <div className="h-6 bg-gray-600 rounded mb-2"></div>
        <div className="h-4 bg-gray-600 rounded w-2/3 mb-4"></div>
        <div className="flex space-x-4">
          <div className="h-4 bg-gray-600 rounded w-16"></div>
          <div className="h-4 bg-gray-600 rounded w-16"></div>
          <div className="h-4 bg-gray-600 rounded w-16"></div>
        </div>
      </div>
    </div>
  );

  // Error state display
  const ErrorDisplay = () => (
    <div className="w-full py-10 text-center">
      <p className="text-red-500 mb-4">{error}</p>
      <button
        onClick={() => fetchProperties(true)}
        className="px-4 py-2 bg-custom-red text-white rounded hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );

  return (
    <section className="py-16 md:py-24 bg-custom-gray text-white">
      <div className="w-full max-w-7xl container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Featured Properties</h2>
            <p className="text-gray-300">Explore our latest properties</p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={scrollPrev} 
              className="rounded-full border border-white p-4 hover:bg-white hover:text-black transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentIndex === 0 || loading}
              aria-label="Previous properties"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={scrollNext} 
              className="rounded-full border border-white p-4 hover:bg-white hover:text-black transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentIndex >= properties.length - visibleItems || loading}
              aria-label="Next properties"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {error ? (
          <ErrorDisplay />
        ) : loading && properties.length === 0 ? (
          // Show skeletons only when loading and no cached data
          <div className="flex space-x-6 overflow-x-hidden">
            {[...Array(3)].map((_, index) => (
              <PropertySkeleton key={index} />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-10">
            <p>No properties available at the moment.</p>
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