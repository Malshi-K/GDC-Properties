"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PropertyDetailActions from '@/components/modals/PropertyDetailAction';
// import { formatPrice } from '@/lib/utils';

export default function PropertyDetail() {
  const params = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('properties')
          .select(`
            *,
            profiles:owner_id (full_name, email, phone)
          `)
          .eq('id', params.id)
          .single();
          
        if (error) throw error;
        setProperty(data);
      } catch (err) {
        console.error('Error fetching property:', err);
        setError('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };
    
    if (params.id) {
      fetchProperty();
    }
  }, [params.id]);
  
  const nextImage = () => {
    if (property?.images?.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === property.images.length - 1 ? 0 : prev + 1
      );
    }
  };
  
  const prevImage = () => {
    if (property?.images?.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? property.images.length - 1 : prev - 1
      );
    }
  };
  
  const selectImage = (index) => {
    setCurrentImageIndex(index);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded m-4">
        {error}
      </div>
    );
  }
  
  if (!property) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded m-4">
        Property not found
      </div>
    );
  }
  
  // Format property images
  const propertyImages = property.images && property.images.length > 0
    ? property.images.map(path => 
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${path}`
      )
    : [];
    
  // If no images, add a placeholder
  if (propertyImages.length === 0) {
    propertyImages.push('/images/property-placeholder.jpg');
  }
  
  const currentImage = propertyImages[currentImageIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Property Images Section */}
        <div className="relative">
          <div className="aspect-w-16 aspect-h-9 lg:aspect-h-6">
            <img 
              src={currentImage} 
              alt={property.title}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Image Navigation Arrows */}
          {propertyImages.length > 1 && (
            <>
              <button 
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition"
                aria-label="Previous image"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition"
                aria-label="Next image"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          
          {/* Thumbnail Navigation */}
          {propertyImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
              {propertyImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => selectImage(index)}
                  className={`w-3 h-3 rounded-full transition ${
                    currentImageIndex === index 
                      ? 'bg-white' 
                      : 'bg-white bg-opacity-50 hover:bg-opacity-70'
                  }`}
                  aria-label={`View image ${index + 1}`}
                ></button>
              ))}
            </div>
          )}
        </div>
        
        {/* Thumbnail Row */}
        {propertyImages.length > 1 && (
          <div className="px-6 py-3 border-b border-gray-200 overflow-x-auto whitespace-nowrap">
            <div className="flex space-x-2">
              {propertyImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => selectImage(index)}
                  className={`flex-shrink-0 w-20 h-14 rounded-md overflow-hidden ${
                    currentImageIndex === index 
                      ? 'ring-2 ring-custom-red' 
                      : 'hover:opacity-80'
                  }`}
                >
                  <img 
                    src={img} 
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="p-6">
          <div className="md:flex md:justify-between md:items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {property.title}
              </h1>
              <p className="text-gray-600 mb-2">{property.location}</p>
              {/* <p className="text-2xl font-bold text-custom-red">
                {formatPrice(property.price)}/month
              </p> */}
            </div>
            
            {/* Property status badge */}
            <div className="mt-2 md:mt-0">
              {property.status === 'available' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Available
                </span>
              )}
              {property.status === 'pending' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  Pending
                </span>
              )}
              {property.status === 'rented' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  Rented
                </span>
              )}
            </div>
          </div>
          
          {/* Property actions (Request Viewing / Apply) */}
          {property.status === 'available' && (
            <PropertyDetailActions property={property} />
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 mb-6">
            <div>
              <span className="block text-gray-600 text-sm">Bedrooms</span>
              <span className="font-medium">{property.bedrooms}</span>
            </div>
            <div>
              <span className="block text-gray-600 text-sm">Bathrooms</span>
              <span className="font-medium">{property.bathrooms}</span>
            </div>
            <div>
              <span className="block text-gray-600 text-sm">Square Feet</span>
              <span className="font-medium">{property.square_footage?.toLocaleString() || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-gray-600 text-sm">Property Type</span>
              <span className="font-medium capitalize">{property.property_type}</span>
            </div>
          </div>

          {/* Description */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
            <div className="prose max-w-none text-gray-700">
              <p>{property.description}</p>
            </div>
          </div>
          
          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {property.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center text-gray-700">
                    <svg className="h-5 w-5 text-custom-red mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {amenity}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Owner/Contact Information */}
          <div className="mt-8 bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div>
              <p className="text-gray-700">
                <span className="font-medium">Owner:</span> {property.profiles?.full_name || 'Property Owner'}
              </p>
              <p className="text-gray-700 mt-1">
                <span className="font-medium">Email:</span> {property.profiles?.email || 'Contact through platform'}
              </p>
              {property.profiles?.phone && (
                <p className="text-gray-700 mt-1">
                  <span className="font-medium">Phone:</span> {property.profiles.phone}
                </p>
              )}
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Available from: {property.available_from 
                ? new Date(property.available_from).toLocaleDateString() 
                : 'Available Now'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}