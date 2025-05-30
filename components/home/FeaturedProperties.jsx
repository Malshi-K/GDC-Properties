"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useImageLoader } from '@/lib/services/imageLoaderService';

const BATCH_SIZE = 8;

const FeaturedProperties = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleItems, setVisibleItems] = useState(3);
  const scrollRef = useRef(null);
  const router = useRouter();
  
  // Use GlobalDataContext for data fetching
  const { fetchData, loading } = useGlobalData();
  const { propertyImages, loadPropertyImage, preloadPropertiesImages } = useImageLoader();
  
  // Properties state
  const [properties, setProperties] = useState([]);
  const [error, setError] = useState(null);
  
  // Fetch properties using GlobalDataContext
  const loadProperties = async (forceRefresh = false) => {
    try {
      setError(null);
      
      const fetchParams = {
        table: 'properties',
        select: 'id, title, price, location, bedrooms, bathrooms, square_footage, owner_id, images, created_at',
        orderBy: { column: 'created_at', ascending: false },
        pagination: { page: 1, pageSize: BATCH_SIZE }
      };
      
      const data = await fetchData(fetchParams, {
        useCache: !forceRefresh,
        ttl: 60 * 60 * 1000, // 1 hour
      });
      
      if (Array.isArray(data)) {
        setProperties(data);
        
        // Preload images for all properties
        setTimeout(() => {
          preloadPropertiesImages(data);
        }, 100);
      } else {
        setProperties([]);
      }
    } catch (err) {
      console.error('Error loading properties:', err);
      setError(err.message || 'Failed to load properties');
    }
  };

  // Initial load
  useEffect(() => {
    loadProperties();
  }, []);

  // Responsive item calculation
  const getVisibleItemCount = () => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  };
  
  // Update visible items on resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setVisibleItems(getVisibleItemCount());
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Scroll navigation
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

  // Handle property click
  const handlePropertyClick = (propertyId) => {
    router.push(`/property/${propertyId}`);
  };

  // PropertyCard component
  const PropertyCard = ({ property }) => {
    const [imageError, setImageError] = useState(false);
    const imageUrl = propertyImages[property.id] || '';
    
    // Load image if not already loaded
    useEffect(() => {
      if (property.images && property.images.length > 0 && !imageUrl) {
        loadPropertyImage(property.id, property.owner_id, property.images[0]);
      }
    }, [property.id, property.owner_id, property.images, imageUrl]);
    
    return (
      <div 
        key={property.id} 
        className="min-w-[calc(33.333%-16px)] sm:min-w-[calc(50%-12px)] md:min-w-[calc(33.333%-16px)] flex-shrink-0 bg-custom-red rounded-lg overflow-hidden cursor-pointer shadow-lg transition-transform duration-300"
        onClick={() => handlePropertyClick(property.id)}
      >
        <div className="relative h-60 w-full">
          {imageUrl && !imageError ? (
            <Image 
              src={imageUrl} 
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

  // Loading skeleton
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

  // Error display
  const ErrorDisplay = () => (
    <div className="w-full py-10 text-center">
      <p className="text-red-500 mb-4">{error}</p>
      <button
        onClick={() => loadProperties(true)}
        className="px-4 py-2 bg-custom-red text-white rounded hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );

  // Get loading state from the cache key
  const cacheKey = JSON.stringify({
    table: 'properties',
    select: 'id, title, price, location, bedrooms, bathrooms, square_footage, owner_id, images, created_at',
    orderBy: { column: 'created_at', ascending: false },
    pagination: { page: 1, pageSize: BATCH_SIZE }
  });
  
  const isLoading = loading[cacheKey] || false;

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
              disabled={currentIndex === 0 || isLoading}
              aria-label="Previous properties"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={scrollNext} 
              className="rounded-full border border-white p-4 hover:bg-white hover:text-black transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentIndex >= properties.length - visibleItems || isLoading}
              aria-label="Next properties"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {error ? (
          <ErrorDisplay />
        ) : isLoading && properties.length === 0 ? (
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