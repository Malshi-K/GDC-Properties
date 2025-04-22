"use client"
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import propertiesData from '@/data/properties.json';

export default function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Initialize form data with search parameters
  const [formData, setFormData] = useState({
    location: searchParams.get('location') || '',
    propertyType: searchParams.get('propertyType') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    bedrooms: searchParams.get('bedrooms') || '',
    bathrooms: searchParams.get('bathrooms') || ''
  });

  useEffect(() => {
    const location = searchParams.get('location');
    const propertyType = searchParams.get('propertyType');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const bedrooms = searchParams.get('bedrooms');
    const bathrooms = searchParams.get('bathrooms');
    
    // Update form data when URL parameters change
    setFormData({
      location: location || '',
      propertyType: propertyType || '',
      minPrice: minPrice || '',
      maxPrice: maxPrice || '',
      bedrooms: bedrooms || '',
      bathrooms: bathrooms || ''
    });
    
    // Filter properties based on query parameters
    const filtered = propertiesData.properties.filter(property => {
      // Filter by location if specified
      if (location && property.location !== location) return false;
      
      // Filter by property type if specified and not "all"
      if (propertyType && propertyType !== 'all' && property.propertyType !== propertyType) return false;
      
      // Filter by min price if specified
      if (minPrice && property.price < parseInt(minPrice)) return false;
      
      // Filter by max price if specified
      if (maxPrice && property.price > parseInt(maxPrice)) return false;
      
      // Filter by minimum number of bedrooms if specified
      if (bedrooms && property.bedrooms < parseInt(bedrooms)) return false;
      
      // Filter by minimum number of bathrooms if specified
      if (bathrooms && property.bathrooms < parseInt(bathrooms)) return false;
      
      return true;
    });
    
    setFilteredProperties(filtered);
    setLoading(false);
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
                  <option value="malibu">Malibu Beach</option>
                  <option value="beverly">Beverly Hills</option>
                  <option value="hollywood">Hollywood Hills</option>
                  <option value="venice">Venice Beach</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select 
                  id="propertyType"
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none"
                >
                  <option value="">Any type</option>
                  <option value="all">All types</option>
                  <option value="apartments">Apartments</option>
                  <option value="houses">Houses</option>
                  <option value="townhouses">Town houses</option>
                  <option value="units">Units</option>
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
            Found {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} matching your criteria
          </p>
          <Link href="/" className="text-custom-red hover:text-red-700 font-medium mt-2 inline-block">
            Back to Home
          </Link>
        </div>

        {filteredProperties.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No properties found</h2>
            <p className="text-gray-600 mb-6">Try adjusting your search filters to see more results.</p>
            <Link href="/" className="bg-custom-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-300">
              Return Home
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProperties.map(property => (
              <div key={property.id} className="bg-white rounded-lg overflow-hidden shadow-lg transition-transform duration-300 hover:transform hover:scale-105">
                <div 
                  className="bg-gray-300 h-48 relative cursor-pointer" 
                  onClick={() => router.push(`/property/${property.id}`)}
                >
                  {/* In a real app, you'd use real images */}
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    <span>Property Image</span>
                  </div>
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