"use client";
import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { formatPrice } from "@/data/mockData"; // If you have this utility

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const FeaturedProperties = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  // Fetch properties from database
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        
        // Query your properties table - adjust this query based on your schema
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(8); // Limit to 8 featured properties
        
        if (error) {
          console.error('Error fetching properties:', error);
          return;
        }
        
        // Fetch signed URLs for property images
        const propertiesWithImages = await Promise.all(
          data.map(async (property) => {
            let imageUrl = null;
            
            if (property.images && property.images.length > 0) {
              const imagePath = property.images[0];
              const normalizedPath = imagePath.includes('/') 
                ? imagePath 
                : `${property.owner_id}/${imagePath}`;
                
              const { data: signedUrlData, error: signedUrlError } = await supabase
                .storage
                .from('property-images')
                .createSignedUrl(normalizedPath, 60 * 60); // 1 hour expiry
                
              if (!signedUrlError) {
                imageUrl = signedUrlData.signedUrl;
              }
            }
            
            return {
              ...property,
              imageUrl
            };
          })
        );
        
        setProperties(propertiesWithImages);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperties();
  }, []);

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
  
  // Determine how many items to show based on screen size
  const getVisibleItemCount = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) return 1;
      if (window.innerWidth < 1024) return 2;
      return 3;
    }
    return 3; // Default to 3 on server
  };
  
  const visibleItems = getVisibleItemCount();

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
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={scrollNext} 
              className="rounded-full border border-white p-4 hover:bg-white hover:text-black transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentIndex >= properties.length - visibleItems || loading}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-60">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
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
              <div 
                key={property.id} 
                className="min-w-[calc(33.333%-16px)] sm:min-w-[calc(50%-12px)] md:min-w-[calc(33.333%-16px)] flex-shrink-0 bg-custom-red rounded-lg overflow-hidden"
              >
                <div className="relative h-60 w-full">
                  {property.imageUrl ? (
                    <Image 
                      src={property.imageUrl} 
                      alt={property.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                      <span>No Image Available</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold">{property.title}</h3>
                    <p className="text-right font-bold">
                      {formatPrice ? formatPrice(property.price) : `$${property.price}`}
                    </p>
                  </div>
                  <p className="text-sm text-gray-200 mt-1">{property.location}</p>
                  <div className="flex space-x-4 mt-2 text-sm">
                    <span>{property.bedrooms} Beds</span>
                    <span>{property.bathrooms} Baths</span>
                    {property.square_footage && (
                      <span>{property.square_footage} sq ft</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProperties;