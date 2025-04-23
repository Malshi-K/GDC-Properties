"use client"
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";
import Image from 'next/image';
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [propertyImages, setPropertyImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  
  // Initialize form data with search parameters
  const [formData, setFormData] = useState({
    location: searchParams.get('location') || '',
    property_type: searchParams.get('property_type') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    bedrooms: searchParams.get('bedrooms') || '',
    bathrooms: searchParams.get('bathrooms') || ''
  });

  // Fetch unique locations for the filter dropdown
  useEffect(() => {
    async function fetchLocations() {
      const { data, error } = await supabase
        .from('properties')
        .select('location')
        .is('location', 'not.null');
      
      if (error) {
        console.error('Error fetching locations:', error);
        return;
      }

      const uniqueLocations = [...new Set(data.map(item => item.location))];
      setLocations(uniqueLocations);
    }

    fetchLocations();
  }, []);

  // Fetch filtered properties
  useEffect(() => {
    async function fetchProperties() {
      setLoading(true);
      
      try {
        // Start building the query
        let query = supabase
          .from('properties')
          .select('*');
        
        // Add filters based on search params
        const location = searchParams.get('location');
        if (location) {
          query = query.eq('location', location);
        }
        
        const property_type = searchParams.get('property_type');
        if (property_type && property_type !== 'all') {
          query = query.eq('property_type', property_type);
        }
        
        const minPrice = searchParams.get('minPrice');
        if (minPrice) {
          query = query.gte('price', parseInt(minPrice));
        }
        
        const maxPrice = searchParams.get('maxPrice');
        if (maxPrice) {
          query = query.lte('price', parseInt(maxPrice));
        }
        
        const bedrooms = searchParams.get('bedrooms');
        if (bedrooms) {
          query = query.gte('bedrooms', parseInt(bedrooms));
        }
        
        const bathrooms = searchParams.get('bathrooms');
        if (bathrooms) {
          query = query.gte('bathrooms', parseFloat(bathrooms));
        }
        
        // Execute the query
        const { data, error } = await query;
        
        if (error) throw error;
        
        setProperties(data || []);

        // Get signed URLs for the first image of each property
        const imageUrls = {};
        
        for (const property of data || []) {
          if (property.images && property.images.length > 0) {
            const imagePath = property.images[0];
            
            // Normalize the path
            const normalizedPath = imagePath.includes("/")
              ? imagePath
              : `${property.owner_id}/${imagePath}`;
              
            try {
              const { data: urlData, error: urlError } = await supabaseClient.storage
                .from("property-images")
                .createSignedUrl(normalizedPath, 60 * 60); // 1 hour expiry
              
              if (urlError) {
                console.error("Error getting signed URL for property " + property.id + ":", urlError);
              } else {
                imageUrls[property.id] = urlData.signedUrl;
              }
            } catch (urlError) {
              console.error("Error getting signed URL:", urlError);
            }
          }
        }
        
        setPropertyImages(imageUrls);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProperties();
    
    // Update form data when URL parameters change
    setFormData({
      location: searchParams.get('location') || '',
      property_type: searchParams.get('property_type') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      bedrooms: searchParams.get('bedrooms') || '',
      bathrooms: searchParams.get('bathrooms') || ''
    });
    
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Filter out empty values
    const queryParams = Object.entries(formData)
      .filter(([_, value]) => value !== '')
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
    
    // Create the query string
    const queryString = new URLSearchParams(queryParams).toString();
    
    // Navigate to updated search results
    router.push(`/search?${queryString}`);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  const propertyTypes = [
    { value: "apartment", label: "Apartment" },
    { value: "house", label: "House" },
    { value: "condo", label: "Condo" },
    { value: "townhouse", label: "Townhouse" },
    { value: "villa", label: "Villa" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading properties...</h2>
          <div className="w-12 h-12 border-4 border-gray-300 border-t-custom-red rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-40 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Search filters at the top */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-bold text-center text-gray-800 mb-4">Refine Your Search</h2>
          
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select 
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none"
                >
                  <option value="">Any location</option>
                  {locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="property_type" className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select 
                  id="property_type"
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none"
                >
                  <option value="">Any type</option>
                  {propertyTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                  <select 
                    id="bedrooms"
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none"
                  >
                    <option value="">Any</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                    <option value="5">5+</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                  <select 
                    id="bathrooms"
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none"
                  >
                    <option value="">Any</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="minPrice" className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                  <select 
                    id="minPrice"
                    name="minPrice"
                    value={formData.minPrice}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none"
                  >
                    <option value="">No min</option>
                    <option value="100000">$100,000</option>
                    <option value="300000">$300,000</option>
                    <option value="500000">$500,000</option>
                    <option value="1000000">$1,000,000</option>
                    <option value="2000000">$2,000,000</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="maxPrice" className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                  <select 
                    id="maxPrice"
                    name="maxPrice"
                    value={formData.maxPrice}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none"
                  >
                    <option value="">No max</option>
                    <option value="500000">$500,000</option>
                    <option value="1000000">$1,000,000</option>
                    <option value="2000000">$2,000,000</option>
                    <option value="5000000">$5,000,000</option>
                    <option value="10000000">$10,000,000+</option>
                  </select>
                </div>
              </div>
              
              <div></div> {/* Empty div for spacing */}
              
              <div className="flex items-end">
                <button 
                  type="submit" 
                  className="w-full bg-custom-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300"
                >
                  Update Search
                </button>
              </div>
            </div>
          </form>
        </div>
        
        {/* Search results section */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Search Results</h1>
          <p className="text-gray-600">
            Found {properties.length} {properties.length === 1 ? 'property' : 'properties'} matching your criteria
          </p>
          <Link href="/" className="text-custom-red hover:text-red-700 font-medium mt-2 inline-block">
            Back to Home
          </Link>
        </div>

        {properties.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No properties found</h2>
            <p className="text-gray-600 mb-6">Try adjusting your search filters to see more results.</p>
            <Link href="/" className="bg-custom-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-300">
              Return Home
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.map(property => (
              <div key={property.id} className="bg-white rounded-lg overflow-hidden shadow-lg transition-transform duration-300 hover:transform hover:scale-105">
                <div 
                  className="bg-gray-200 h-48 relative cursor-pointer" 
                  onClick={() => router.push(`/property/${property.id}`)}
                >
                  {propertyImages[property.id] ? (
                    <Image 
                      src={propertyImages[property.id]}
                      alt={property.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                      <span>No Image Available</span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 
                    className="text-xl font-bold text-gray-800 mb-2 cursor-pointer hover:text-custom-red" 
                    onClick={() => router.push(`/property/${property.id}`)}
                  >
                    {property.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{property.description}</p>
                  <div className="flex justify-between mb-4">
                    <span className="text-custom-red font-bold text-lg">{formatPrice(property.price)}</span>
                    <div className="text-gray-700">
                      <span className="mr-2">{property.bedrooms} beds</span>•
                      <span className="ml-2">{property.bathrooms} baths</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => router.push(`/property/${property.id}`)} 
                    className="w-full bg-custom-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}