"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";

/**
 * Service for property search operations with Supabase
 */
export const propertySearchService = {
  /**
   * Fetch unique locations from properties
   */
  async getUniqueLocations() {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('location')
        .not('location', 'is', null); // Using 'not is null' instead of 'is.not.null'
        
      if (error) throw error;
      
      // Filter out any empty locations and create unique set
      const uniqueLocations = [...new Set(
        data
          .map(item => item.location)
          .filter(location => location && location.trim() !== '')
      )];
      
      return { data: uniqueLocations, error: null };
    } catch (error) {
      console.error('Error fetching locations:', error);
      return { data: [], error };
    }
  },

  /**
   * Fetch min and max property prices
   */
  async getPriceRanges() {
    try {
      // First check if there are properties with prices
      const { data, error } = await supabase
        .from('properties')
        .select('price')
        .not('price', 'is', null)
        .order('price', { ascending: true });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { 
          data: {
            minPrices: [100000, 300000, 500000, 1000000, 2000000],
            maxPrices: [500000, 1000000, 2000000, 5000000, 10000000]
          }, 
          error: null 
        };
      }
      
      // Filter out any invalid prices and convert to numbers
      const validPrices = data
        .map(item => Number(item.price))
        .filter(price => !isNaN(price) && price > 0);
      
      if (validPrices.length === 0) {
        return { 
          data: {
            minPrices: [100000, 300000, 500000, 1000000, 2000000],
            maxPrices: [500000, 1000000, 2000000, 5000000, 10000000]
          }, 
          error: null 
        };
      }
      
      // Get min and max prices
      const minPrice = Math.min(...validPrices);
      const maxPrice = Math.max(...validPrices);
      
      // Generate price points
      const minPricePoints = this.generatePricePoints(minPrice, maxPrice * 0.8, 5);
      const maxPricePoints = this.generatePricePoints(
        minPrice * 1.2,
        maxPrice * 1.2,
        5
      );
      
      return { 
        data: {
          minPrices: minPricePoints,
          maxPrices: maxPricePoints
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Error fetching price ranges:', error);
      return { 
        data: {
          minPrices: [100000, 300000, 500000, 1000000, 2000000],
          maxPrices: [500000, 1000000, 2000000, 5000000, 10000000]
        }, 
        error 
      };
    }
  },
  
  /**
   * Fetch bedroom options from database
   */
  async getBedroomOptions() {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('bedrooms')
        .not('bedrooms', 'is', null);
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { 
          data: [1, 2, 3, 4, 5], 
          error: null 
        };
      }
      
      // Filter out any invalid values and convert to numbers
      const validBedrooms = data
        .map(item => Number(item.bedrooms))
        .filter(value => !isNaN(value) && value > 0);
      
      if (validBedrooms.length === 0) {
        return { 
          data: [1, 2, 3, 4, 5], 
          error: null 
        };
      }
      
      // Get unique sorted values
      const uniqueBedrooms = [...new Set(validBedrooms)].sort((a, b) => a - b);
      
      return { data: uniqueBedrooms, error: null };
    } catch (error) {
      console.error('Error fetching bedroom options:', error);
      return { data: [1, 2, 3, 4, 5], error };
    }
  },
  
  /**
   * Fetch bathroom options from database
   */
  async getBathroomOptions() {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('bathrooms')
        .not('bathrooms', 'is', null);
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { 
          data: [1, 1.5, 2, 2.5, 3, 4], 
          error: null 
        };
      }
      
      // Filter out any invalid values and convert to numbers
      const validBathrooms = data
        .map(item => Number(item.bathrooms))
        .filter(value => !isNaN(value) && value > 0);
      
      if (validBathrooms.length === 0) {
        return { 
          data: [1, 1.5, 2, 2.5, 3, 4], 
          error: null 
        };
      }
      
      // Get unique sorted values
      const uniqueBathrooms = [...new Set(validBathrooms)].sort((a, b) => a - b);
      
      return { data: uniqueBathrooms, error: null };
    } catch (error) {
      console.error('Error fetching bathroom options:', error);
      return { data: [1, 1.5, 2, 2.5, 3, 4], error };
    }
  },
  
  /**
   * Helper to generate price points
   */
  generatePricePoints(min, max, count) {
    min = Math.max(0, Number(min) || 0);
    max = Math.max(min + 1000, Number(max) || min + 1000000);
    
    const result = [];
    const range = max - min;
    const step = range / (count - 1);
    
    for (let i = 0; i < count; i++) {
      // Round to nearest 1000 and ensure no duplicates
      let price = Math.round((min + (step * i)) / 1000) * 1000;
      if (result.indexOf(price) === -1) {
        result.push(price);
      }
    }
    
    // Ensure the last value is the max
    if (result[result.length - 1] < max) {
      const roundedMax = Math.ceil(max / 1000) * 1000;
      if (result.indexOf(roundedMax) === -1) {
        result.push(roundedMax);
      }
    }
    
    return result.sort((a, b) => a - b);
  }
};

export default function PropertySearchForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    location: '',
    property_type: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: ''
  });
  const [locations, setLocations] = useState([]);
  const [priceRanges, setPriceRanges] = useState({
    minPrices: [],
    maxPrices: []
  });
  const [bedroomOptions, setBedroomOptions] = useState([]);
  const [bathroomOptions, setBathroomOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all form options when component mounts
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch locations
        const { data: locationsData, error: locationsError } = 
          await propertySearchService.getUniqueLocations();
        
        if (locationsError) {
          console.error("Error fetching locations:", locationsError);
          setError("Failed to load locations. Please try again later.");
        } else {
          setLocations(locationsData);
        }

        // Fetch price ranges
        const { data: priceData, error: priceError } = 
          await propertySearchService.getPriceRanges();
        
        if (priceError) {
          console.error("Error fetching price ranges:", priceError);
          if (!error) {
            setError("Failed to load price ranges. Please try again later.");
          }
        } else {
          setPriceRanges(priceData);
        }
        
        // Fetch bedroom options
        const { data: bedroomData, error: bedroomError } = 
          await propertySearchService.getBedroomOptions();
        
        if (bedroomError) {
          console.error("Error fetching bedroom options:", bedroomError);
          if (!error) {
            setError("Failed to load bedroom options. Please try again later.");
          }
        } else {
          setBedroomOptions(bedroomData);
        }
        
        // Fetch bathroom options
        const { data: bathroomData, error: bathroomError } = 
          await propertySearchService.getBathroomOptions();
        
        if (bathroomError) {
          console.error("Error fetching bathroom options:", bathroomError);
          if (!error) {
            setError("Failed to load bathroom options. Please try again later.");
          }
        } else {
          setBathroomOptions(bathroomData);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };
  
  // Format bathroom display with optional decimal
  const formatBathrooms = (value) => {
    // If it's a whole number, show as integer
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  };

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
    
    // Use router.push to navigate
    router.push(`/search?${queryString}`);
  };

  const propertyTypes = [
    { value: "apartment", label: "Apartment" },
    { value: "house", label: "House" },
    { value: "condo", label: "Condo" },
    { value: "townhouse", label: "Townhouse" },
    { value: "villa", label: "Villa" }
  ];

  return (
    <div className="w-full lg:w-4/12 mt-8 lg:mt-0">
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-lg max-w-md mx-auto lg:mx-0">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-1">Find Your Dream Home</h2>
        <p className="text-center text-gray-600 text-sm mb-4 sm:mb-6">Filter properties to match your needs</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <form className="space-y-3 sm:space-y-4" onSubmit={handleSubmit}>
          <div>
            <select 
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
            >
              <option value="">Select Location</option>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          
          <div>
            <select 
              name="property_type"
              value={formData.property_type}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
            >
              <option value="">All property types</option>
              {propertyTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <select 
                name="minPrice"
                value={formData.minPrice}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
              >
                <option value="">Min Price</option>
                {priceRanges.minPrices.map(price => (
                  <option key={`min-${price}`} value={price}>
                    {formatPrice(price)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select 
                name="maxPrice"
                value={formData.maxPrice}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
              >
                <option value="">Max Price</option>
                {priceRanges.maxPrices.map(price => (
                  <option key={`max-${price}`} value={price}>
                    {formatPrice(price)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <select 
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
              >
                <option value="">Bedrooms</option>
                {bedroomOptions.map(value => (
                  <option key={`bed-${value}`} value={value}>
                    {value} {value === 1 ? 'Bedroom' : 'Bedrooms'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select 
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
              >
                <option value="">Bathrooms</option>
                {bathroomOptions.map(value => (
                  <option key={`bath-${value}`} value={value}>
                    {formatBathrooms(value)} {value === 1 ? 'Bathroom' : 'Bathrooms'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-custom-red hover:bg-red-700 text-white font-bold py-2 sm:py-3 px-4 rounded-md transition-colors duration-300 text-sm sm:text-base"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Search Properties'}
          </button>
        </form>
      </div>
    </div>
  );
}