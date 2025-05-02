"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase"; // Import from shared config

const FeaturedProperties = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [properties, setProperties] = useState([]);
  const [propertyImages, setPropertyImages] = useState({});
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const router = useRouter();
  
  // Cache state
  const [cachedProperties, setCachedProperties] = useState(null);
  const cacheExpiry = 10 * 60 * 1000; // 10 minutes cache
  
  // Fetch properties using a more optimized approach
  useEffect(() => {
    const fetchProperties = async () => {
      // Check for cached properties first
      const cached = localStorage.getItem('featuredProperties');
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          
          // Check if cache is still valid
          if (timestamp && Date.now() - timestamp < cacheExpiry) {
            setProperties(data);
            setCachedProperties(data);
            setLoading(false);
            
            // Prefetch images in the background to improve UX
            fetchPropertyImages(data);
            return;
          }
        } catch (error) {
          console.error('Error parsing cached properties:', error);
          // Continue with fetching fresh data
        }
      }
      
      try {
        setLoading(true);
        
        // Use a batch size for pagination if needed in the future
        const BATCH_SIZE = 8;
        
        // Query properties table
        const { data, error } = await supabase
          .from('properties')
          .select('id, title, price, location, bedrooms, bathrooms, square_footage, owner_id, images, created_at')
          .order('created_at', { ascending: false })
          .limit(BATCH_SIZE);
        
        if (error) {
          console.error('Error fetching properties:', error);
          return;
        }
        
        // Set properties immediately so UI can render
        setProperties(data || []);
        
        // Cache the properties
        localStorage.setItem('featuredProperties', JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        setCachedProperties(data);
        
        // Then fetch images separately
        fetchPropertyImages(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperties();
  }, []);

  // Optimized image fetching with batching
  const fetchPropertyImages = async (propertiesData) => {
    if (!propertiesData?.length) return;
    
    try {
      // Create batch requests (fetch images in groups of 4)
      const batchSize = 4;
      const batches = [];
      
      for (let i = 0; i < propertiesData.length; i += batchSize) {
        const batch = propertiesData.slice(i, i + batchSize);
        
        // Process each batch in parallel
        batches.push(
          Promise.all(
            batch
              .filter((property) => property.images && property.images.length > 0)
              .map(async (property) => {
                const imagePath = property.images[0];
                const normalizedPath = imagePath.includes('/')
                  ? imagePath
                  : `${property.owner_id}/${imagePath}`;
                  
                try {
                  const { data: signedUrlData, error: signedUrlError } = await supabase
                    .storage
                    .from('property-images')
                    .createSignedUrl(normalizedPath, 60 * 60); // 1 hour expiry
                    
                  return [property.id, signedUrlError ? null : signedUrlData.signedUrl];
                } catch (error) {
                  console.error('Error fetching image:', error);
                  return [property.id, null];
                }
              })
          )
        );
      }
      
      // Process all batches
      const results = await Promise.all(batches);
      const allResults = results.flat();
      
      // Convert results to an object
      const imageUrls = {};
      allResults.forEach(([propertyId, url]) => {
        if (url) imageUrls[propertyId] = url;
      });
      
      setPropertyImages(imageUrls);
    } catch (error) {
      console.error('Error fetching property images:', error);
    }
  };

  // Scroll to the next set of items
  const scrollNext = () => {
    if (scrollRef.current) {
      setCurrentIndex(prev => {
        const visibleItems = getVisibleItemCount();
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
        const visibleItems = getVisibleItemCount();
        const newIndex = Math.max(prev - 1, 0);
        scrollRef.current.scrollTo({
          left: newIndex * (scrollRef.current.offsetWidth / visibleItems),
          behavior: 'smooth'
        });
        return newIndex;
      });
    }
  };
  
  // Memoize the visible items calculation to avoid unnecessary recalculations
  const getVisibleItemCount = useMemo(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        if (window.innerWidth < 640) return 1;
        if (window.innerWidth < 1024) return 2;
        return 3;
      };
      
      // Add resize listener
      window.addEventListener('resize', handleResize);
      
      // Return the function and cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        if (window.innerWidth < 640) return 1;
        if (window.innerWidth < 1024) return 2;
        return 3;
      };
    }
    return () => 3; // Default to 3 on server
  }, []);
  
  const visibleItems = typeof getVisibleItemCount === 'function' ? getVisibleItemCount() : 3;

  // Format price using Intl API for better performance
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Handle property click to navigate to details page
  const handlePropertyClick = (propertyId) => {
    router.push(`/property/${propertyId}`);
  };

  // PropertyCard component for better code organization
  const PropertyCard = ({ property }) => (
    <div 
      key={property.id} 
      className="min-w-[calc(33.333%-16px)] sm:min-w-[calc(50%-12px)] md:min-w-[calc(33.333%-16px)] flex-shrink-0 bg-custom-red rounded-lg overflow-hidden cursor-pointer"
      onClick={() => handlePropertyClick(property.id)}
    >
      <div className="relative h-60 w-full">
        {propertyImages[property.id] ? (
          <Image 
            src={propertyImages[property.id]} 
            alt={property.title}
            fill
            loading="lazy"
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
            <span>No Image Available</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold truncate">{property.title}</h3>
          <p className="text-right font-bold whitespace-nowrap">
            {formatPrice(property.price)}
          </p>
        </div>
        <p className="text-sm text-gray-200 mt-1 truncate">{property.location}</p>
        <div className="flex space-x-4 mt-2 text-sm">
          <span>{property.bedrooms} Beds</span>
          <span>{property.bathrooms} Baths</span>
          {property.square_footage && (
            <span>{property.square_footage} sq ft</span>
          )}
        </div>
      </div>
    </div>
  );

  // PropertySkeleton for loading state
  const PropertySkeleton = () => (
    <div className="min-w-[calc(33.333%-16px)] sm:min-w-[calc(50%-12px)] md:min-w-[calc(33.333%-16px)] flex-shrink-0 bg-gray-700 rounded-lg overflow-hidden animate-pulse">
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

        {loading && !cachedProperties ? (
          // Show skeletons while loading
          <div 
            className="flex space-x-6 overflow-x-hidden"
          >
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