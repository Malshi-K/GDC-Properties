"use client";
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useImageLoader } from '@/lib/services/imageLoaderService'; // NEW: Import useImageLoader

/**
 * Saved properties component for user dashboard
 */
const SavedProperties = ({ 
  favorites = [], 
  loadingFavorites = false, 
  onRemoveFavorite, 
  onRefresh // Add onRefresh prop for triggering data refresh
}) => {
  const [view, setView] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('default');
  const [removingId, setRemovingId] = useState(null); // Track which favorite is being removed
  const { propertyImages, loadPropertyImage, isPropertyImageLoading, preloadPropertiesImages } = useImageLoader(); // NEW: Use imageLoader

  // Enhanced favorites data - process the favorites to handle nested property data
  const enhancedFavorites = useMemo(() => {
    if (!Array.isArray(favorites)) return [];
    
    return favorites.map(favorite => {
      // Handle both direct property data and nested property object
      const property = favorite.properties || favorite;
      
      return {
        id: favorite.id, // This is the favorite ID for removal
        propertyId: favorite.property_id || property.id, // This is the property ID for navigation
        title: property.title || 'Unknown Property',
        location: property.location || 'Location not specified',
        price: property.price || 0,
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        square_feet: property.square_feet,
        images: property.images || [],
        owner_id: property.owner_id,
        created_at: favorite.created_at || property.created_at
      };
    });
  }, [favorites]);

  // NEW: Enhanced properties data for image loading - extract properties from favorites
  const propertiesForImageLoading = useMemo(() => {
    if (!Array.isArray(enhancedFavorites)) return [];
    
    return enhancedFavorites
      .filter(favorite => favorite.propertyId && favorite.images && favorite.images.length > 0)
      .map(favorite => ({
        id: favorite.propertyId,
        owner_id: favorite.owner_id,
        images: favorite.images,
        title: favorite.title
      }))
      .filter(property => property.owner_id && property.images && property.images.length > 0);
  }, [enhancedFavorites]);

  // NEW: Load property images using the imageLoader service
  useEffect(() => {
    if (!loadingFavorites && propertiesForImageLoading.length > 0) {
      console.log('🖼️ Loading images for favorite properties:', propertiesForImageLoading.map(p => p.id));
      
      // Load individual images for properties that need them
      propertiesForImageLoading.forEach(property => {
        if (!propertyImages[property.id] && !isPropertyImageLoading(property.id)) {
          loadPropertyImage(property.id, property.owner_id, property.images[0]);
        }
      });
      
      // Optional: Preload remaining images in batches for better UX
      const unloadedProperties = propertiesForImageLoading.filter(
        property => !propertyImages[property.id] && !isPropertyImageLoading(property.id)
      );
      
      if (unloadedProperties.length > 0) {
        // Small delay to avoid overwhelming the system
        setTimeout(() => {
          preloadPropertiesImages(unloadedProperties);
        }, 100);
      }
    }
  }, [
    loadingFavorites,
    propertiesForImageLoading,
    propertyImages,
    isPropertyImageLoading,
    loadPropertyImage,
    preloadPropertiesImages
  ]);

  // NEW: Check if any images are still loading
  const someImagesLoading = useMemo(() => {
    return propertiesForImageLoading.some(property => isPropertyImageLoading(property.id));
  }, [propertiesForImageLoading, isPropertyImageLoading]);

  // Handle sort changes
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  // Toggle view between grid and list
  const toggleView = (newView) => {
    setView(newView);
  };

  // Enhanced remove favorite handler
  const handleRemoveFavorite = async (favoriteId) => {
    if (!onRemoveFavorite) return;
    
    try {
      setRemovingId(favoriteId);
      await onRemoveFavorite(favoriteId);
      
      // Call onRefresh if provided to refresh data from global context
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
    } finally {
      setRemovingId(null);
    }
  };

  // Get sorted properties - memoized to prevent recalculation on re-render
  const sortedProperties = useMemo(() => {
    if (!enhancedFavorites || !Array.isArray(enhancedFavorites)) return [];
    
    const propertiesCopy = [...enhancedFavorites];
    
    switch (sortBy) {
      case 'price-low-high':
        return propertiesCopy.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price-high-low':
        return propertiesCopy.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'bedrooms':
        return propertiesCopy.sort((a, b) => (b.bedrooms || 0) - (a.bedrooms || 0));
      case 'bathrooms':
        return propertiesCopy.sort((a, b) => (b.bathrooms || 0) - (a.bathrooms || 0));
      case 'newest':
        return propertiesCopy.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      default:
        return propertiesCopy;
    }
  }, [enhancedFavorites, sortBy]);

  // NEW: Updated loading state - combines parent loading and image loading
  const isLoading = loadingFavorites || someImagesLoading;

  // Loading state
  if (isLoading && (!enhancedFavorites || enhancedFavorites.length === 0)) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Saved Properties</h2>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loadingFavorites}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-red disabled:opacity-50"
            >
              <svg
                className={`-ml-0.5 mr-2 h-4 w-4 ${loadingFavorites ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Saved Properties</h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loadingFavorites}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-red disabled:opacity-50"
          >
            <svg
              className={`-ml-0.5 mr-2 h-4 w-4 ${loadingFavorites ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        )}
      </div>
      
      {!enhancedFavorites || enhancedFavorites.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
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
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
            <p className="text-gray-500">You have {enhancedFavorites.length} saved {enhancedFavorites.length === 1 ? 'property' : 'properties'}</p>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              {/* Sort dropdown */}
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="rounded-md text-custom-gray border-gray-300 shadow-sm focus:border-custom-red focus:ring-custom-red text-sm"
              >
                <option value="default">Sort by: Default</option>
                <option value="price-low-high">Price: Low to High</option>
                <option value="price-high-low">Price: High to Low</option>
                <option value="bedrooms">Most Bedrooms</option>
                <option value="bathrooms">Most Bathrooms</option>
                <option value="newest">Newest First</option>
              </select>
              
              {/* View toggle */}
              <div className="flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleView('grid')}
                  className={`relative inline-flex items-center px-3 py-2 rounded-l-md border ${
                    view === 'grid'
                      ? 'bg-custom-red text-white border-custom-red'
                      : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                  } text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-custom-red focus:border-custom-red`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="sr-only">Grid view</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleView('list')}
                  className={`relative -ml-px inline-flex items-center px-3 py-2 rounded-r-md border ${
                    view === 'list'
                      ? 'bg-custom-red text-white border-custom-red'
                      : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                  } text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-custom-red focus:border-custom-red`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span className="sr-only">List view</span>
                </button>
              </div>
            </div>
          </div>
          
          {view === 'grid' ? (
            // Grid View
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProperties.map(property => {
                // NEW: Get property image and loading state from imageLoader
                const propertyImage = propertyImages[property.propertyId];
                const imageLoading = isPropertyImageLoading(property.propertyId);
                
                return (
                  <div key={property.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden transition-shadow hover:shadow-md">
                    <div className="relative">
                      {/* Property Image */}
                      <div className="h-48 bg-gray-200 relative">
                        {/* NEW: Enhanced image handling with loading state */}
                        {imageLoading ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-custom-red"></div>
                          </div>
                        ) : propertyImage ? (
                          <div className="relative w-full h-full">
                            <Image 
                              src={propertyImage}
                              alt={property.title || "Property"}
                              fill
                              className="object-cover"
                              loading="lazy"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              priority={false}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                            <div className="text-center">
                              <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                                  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                                  d="M9 22V12h6v10" />
                              </svg>
                              <p className="text-sm">No image</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveFavorite(property.id)}
                          disabled={removingId === property.id}
                          className="absolute top-2 right-2 p-2 bg-white bg-opacity-80 rounded-full shadow-md hover:bg-opacity-100 transition-colors duration-200 disabled:opacity-50"
                          aria-label="Remove from saved properties"
                        >
                          {removingId === property.id ? (
                            <div className="w-4 h-4 border-2 border-custom-red border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4 text-custom-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <Link 
                        href={`/properties/${property.propertyId}`}
                        className="block"
                      >
                        <h3 className="text-lg font-semibold text-custom-red hover:text-red-700 transition-colors mb-1 line-clamp-1">{property.title}</h3>
                      </Link>
                      
                      <p className="text-gray-600 text-sm mb-2 line-clamp-1">{property.location}</p>
                      
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
                          <span>{property.bedrooms} bd</span> • <span>{property.bathrooms} ba</span>
                        </div>
                      </div>
                      
                      <Link 
                        href={`/properties/${property.propertyId}`}
                        className="block w-full text-center bg-custom-red hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // List View
            <div className="space-y-4">
              {sortedProperties.map(property => {
                // NEW: Get property image and loading state from imageLoader
                const propertyImage = propertyImages[property.propertyId];
                const imageLoading = isPropertyImageLoading(property.propertyId);
                
                return (
                  <div key={property.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden transition-shadow hover:shadow-md">
                    <div className="flex flex-col sm:flex-row">
                      {/* Property Image */}
                      <div className="sm:w-1/3 lg:w-1/4 h-48 sm:h-auto bg-gray-200 relative">
                        {/* NEW: Enhanced image handling with loading state */}
                        {imageLoading ? (
                          <div className="w-full h-48 sm:h-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-custom-red"></div>
                          </div>
                        ) : propertyImage ? (
                          <div className="relative w-full h-full">
                            <Image 
                              src={propertyImage}
                              alt={property.title || "Property"}
                              fill
                              className="object-cover"
                              loading="lazy"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                              priority={false}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                            <div className="text-center">
                              <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                                  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                                  d="M9 22V12h6v10" />
                              </svg>
                              <p className="text-sm">No image</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Remove Button - mobile */}
                        <button
                          onClick={() => handleRemoveFavorite(property.id)}
                          disabled={removingId === property.id}
                          className="absolute top-2 right-2 p-2 bg-white bg-opacity-80 rounded-full shadow-md hover:bg-opacity-100 transition-colors duration-200 sm:hidden disabled:opacity-50"
                          aria-label="Remove from saved properties"
                        >
                          {removingId === property.id ? (
                            <div className="w-4 h-4 border-2 border-custom-red border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4 text-custom-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                      
                      <div className="p-4 sm:w-2/3 lg:w-3/4 flex flex-col">
                        <div className="flex justify-between">
                          <div>
                            <Link 
                              href={`/properties/${property.propertyId}`}
                              className="block"
                            >
                              <h3 className="text-lg font-semibold text-custom-red hover:text-red-700 transition-colors mb-1">{property.title}</h3>
                            </Link>
                            
                            <p className="text-gray-600 text-sm mb-2">{property.location}</p>
                          </div>
                          
                          {/* Remove Button - visible on large screens */}
                          <button
                            onClick={() => handleRemoveFavorite(property.id)}
                            disabled={removingId === property.id}
                            className="hidden sm:block p-2 h-10 text-custom-red hover:text-red-700 transition-colors disabled:opacity-50"
                            aria-label="Remove from saved properties"
                          >
                            {removingId === property.id ? (
                              <div className="w-5 h-5 border-2 border-custom-red border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                          <div className="flex items-center">
                            <svg className="h-5 w-5 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span className="text-gray-600 text-sm">{property.bedrooms} bedrooms</span>
                          </div>
                          <div className="flex items-center">
                            <svg className="h-5 w-5 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-gray-600 text-sm">{property.bathrooms} bathrooms</span>
                          </div>
                          {property.square_feet && (
                            <div className="flex items-center">
                              <svg className="h-5 w-5 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                              </svg>
                              <span className="text-gray-600 text-sm">{property.square_feet.toLocaleString()} sq ft</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-auto pt-4 flex justify-between items-center">
                          <span className="text-custom-red font-bold text-lg">
                            {property.price 
                              ? new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                  maximumFractionDigits: 0
                                }).format(property.price)
                              : "Price not available"
                            }
                          </span>
                          
                          <Link 
                            href={`/properties/${property.propertyId}`}
                            className="inline-flex items-center justify-center bg-custom-red hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedProperties;