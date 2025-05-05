"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from "@/lib/supabase"; // Use your app's supabase instance
import Image from 'next/image';

/**
 * Saved properties component for user dashboard
 */
const SavedProperties = ({ favorites, loadingFavorites, onRemoveFavorite }) => {
  const [propertyImages, setPropertyImages] = useState({});
  const [loadingImages, setLoadingImages] = useState(true);

  // Fetch property images in parallel
  useEffect(() => {
    async function fetchPropertyImages() {
      // Check if favorites exists and has items
      if (!favorites || !Array.isArray(favorites) || favorites.length === 0) {
        setLoadingImages(false);
        return;
      }
      
      setLoadingImages(true);
      
      try {
        // Create array of promises for parallel fetching
        const imagePromises = favorites
          .filter(property => property.images && Array.isArray(property.images) && property.images.length > 0)
          .map(async (property) => {
            const imagePath = property.images[0];
            
            // Normalize the path
            const normalizedPath = imagePath.includes("/")
              ? imagePath
              : `${property.owner_id || property.propertyId}/${imagePath}`;
              
            try {
              const { data, error } = await supabase.storage
                .from("property-images")
                .createSignedUrl(normalizedPath, 60 * 60); // 1 hour expiry
              
              if (error) {
                console.error("Error getting signed URL for property " + property.id + ":", error);
                return [property.id, null];
              }
              
              return [property.id, data.signedUrl];
            } catch (error) {
              console.error("Error fetching image for property " + property.id + ":", error);
              return [property.id, null];
            }
          });
        
        // Wait for all promises to resolve
        const results = await Promise.all(imagePromises);
        
        // Convert results to an object
        const images = {};
        results.forEach(([propertyId, url]) => {
          if (url) images[propertyId] = url;
        });
        
        setPropertyImages(images);
      } catch (error) {
        console.error("Error in fetchPropertyImages:", error);
      } finally {
        setLoadingImages(false);
      }
    }
    
    fetchPropertyImages();
  }, [favorites]);

  // Handle the case where favorites is undefined or not an array
  if (!favorites || !Array.isArray(favorites)) {
    if (loadingFavorites) {
      return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Saved Properties</h2>
            <div className="flex justify-center my-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Saved Properties</h2>
          <div className="text-center py-10">
            <div className="mb-4">
              <svg 
                className="mx-auto h-12 w-12 text-gray-400" 
                fill="none" 
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">You haven't saved any properties yet</h3>
            <p className="text-gray-500 mb-6">Save properties to view them later and compare your options</p>
            <Link href="/search" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-custom-red hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-red">
              Browse Properties
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-custom-red mb-6">Saved Properties</h2>
        
        {loadingFavorites || loadingImages ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-10">
            <div className="mb-4">
              <svg 
                className="mx-auto h-12 w-12 text-gray-400" 
                fill="none" 
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">You haven't saved any properties yet</h3>
            <p className="text-gray-500 mb-6">Save properties to view them later and compare your options</p>
            <Link href="/search" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-custom-red hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-red">
              Browse Properties
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-gray-500 mb-6">You have {favorites.length} saved {favorites.length === 1 ? 'property' : 'properties'}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map(property => (
                <div key={property.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="relative">
                    {/* Property Image */}
                    <div className="h-48 bg-gray-200 relative">
                      {propertyImages[property.id] ? (
                        <div className="relative w-full h-full">
                          <Image 
                            src={propertyImages[property.id]}
                            alt={property.title || "Property"}
                            fill
                            className="object-cover"
                            loading="lazy"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                          <span>No Image</span>
                        </div>
                      )}
                      
                      {/* Remove Button */}
                      <button
                        onClick={() => onRemoveFavorite(property.id)}
                        className="absolute top-2 right-2 p-2 bg-white bg-opacity-80 rounded-full shadow-md hover:bg-opacity-100 transition-colors duration-200"
                        aria-label="Remove from saved properties"
                      >
                        <svg className="w-4 h-4 text-custom-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <Link 
                      href={`/property/${property.propertyId}`}
                      className="block"
                    >
                      <h3 className="text-lg font-semibold text-custom-red hover:text-red-700 transition-colors mb-1">{property.title || "Property"}</h3>
                    </Link>
                    
                    <p className="text-gray-600 text-sm mb-2">{property.location || "Location not specified"}</p>
                    
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-custom-red font-bold">
                        {property.price 
                          ? new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              maximumFractionDigits: 0
                            }).format(property.price)
                          : "Price not available"
                        }
                      </span>
                      <div className="text-gray-600 text-sm">
                        <span>{property.bedrooms || 0} beds</span> • <span>{property.bathrooms || 0} baths</span>
                      </div>
                    </div>
                    
                    <Link 
                      href={`/property/${property.propertyId}`}
                      className="block w-full text-center bg-custom-red hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedProperties;