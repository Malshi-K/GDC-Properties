"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PropertySearchForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    location: '',
    propertyType: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: ''
  });

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

  return (
    <div className="w-full lg:w-4/12 mt-8 lg:mt-0">
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-lg max-w-md mx-auto lg:mx-0">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-1">Find Your Dream Home</h2>
        <p className="text-center text-gray-600 text-sm mb-4 sm:mb-6">Filter properties to match your needs</p>
        
        <form className="space-y-3 sm:space-y-4" onSubmit={handleSubmit}>
          <div>
            <select 
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
            >
              <option value="" disabled>Location</option>
              <option value="malibu">Malibu Beach</option>
              <option value="beverly">Beverly Hills</option>
              <option value="hollywood">Hollywood Hills</option>
              <option value="venice">Venice Beach</option>
            </select>
          </div>
          
          <div>
            <select 
              name="propertyType"
              value={formData.propertyType}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
            >
              <option value="" disabled>Units</option>
              <option value="all">All types</option>
              <option value="apartments">Apartments</option>
              <option value="houses">Houses</option>
              <option value="townhouses">Town houses</option>
              <option value="units">Units</option>
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
                <option value="" disabled>Min Price</option>
                <option value="100000">$100,000</option>
                <option value="300000">$300,000</option>
                <option value="500000">$500,000</option>
                <option value="1000000">$1,000,000</option>
                <option value="2000000">$2,000,000</option>
              </select>
            </div>
            <div>
              <select 
                name="maxPrice"
                value={formData.maxPrice}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
              >
                <option value="" disabled>Max Price</option>
                <option value="500000">$500,000</option>
                <option value="1000000">$1,000,000</option>
                <option value="2000000">$2,000,000</option>
                <option value="5000000">$5,000,000</option>
                <option value="10000000">$10,000,000+</option>
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
                <option value="" disabled>Bedrooms</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>
            </div>
            <div>
              <select 
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
              >
                <option value="" disabled>Bathrooms</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-custom-red hover:bg-red-700 text-white font-bold py-2 sm:py-3 px-4 rounded-md transition-colors duration-300 text-sm sm:text-base"
          >
            Search Properties
          </button>
        </form>
      </div>
    </div>
  );
}