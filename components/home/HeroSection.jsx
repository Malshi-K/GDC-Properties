import React from 'react';

export default function HeroSection() {
  return (
    <div className="relative w-full max-w-7xl min-h-screen flex items-center py-24 md:py-32 lg:py-24 px-4 sm:px-6 mt-16 sm:mt-20 md:mt-24">
      {/* Content container */}
      <div className="container mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left side - Text content */}
        <div className="w-full lg:w-1/2 text-white z-10 text-center lg:text-left">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-2 sm:mb-4">
           Find Your Perfect Rental
          </h1>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8">Discover amazing propeties for your next stay</p>
          <button className="bg-custom-red hover:bg-red-700 text-white font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-md transition-colors duration-300">
            Get in Touch
          </button>
        </div>

        {/* Right side - Property Filter */}
        <div className="w-full lg:w-4/12 mt-8 lg:mt-0">
          <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-lg max-w-md mx-auto lg:mx-0">
            <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-1">Find Your Dream Home</h2>
            <p className="text-center text-gray-600 text-sm mb-4 sm:mb-6">Filter properties to match your needs</p>
            
            <form className="space-y-3 sm:space-y-4">
              <div>
                <select 
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
                >
                  <option value="" disabled selected>Location</option>
                  <option value="malibu">Malibu Beach</option>
                  <option value="beverly">Beverly Hills</option>
                  <option value="hollywood">Hollywood Hills</option>
                  <option value="venice">Venice Beach</option>
                </select>
              </div>
              
              <div>
                <select 
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
                >
                  <option value="" disabled selected>Units</option>
                  <option value="all">All types</option>
                  <option value="apartments">Apartments</option>
                  <option value="houses">Houses</option>
                  <option value="townhouses">Town houses</option>
                  <option value="townhouses">Units</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <select 
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
                  >
                    <option value="" disabled selected>Min Price</option>
                    <option value="100000">$100,000</option>
                    <option value="300000">$300,000</option>
                    <option value="500000">$500,000</option>
                    <option value="1000000">$1,000,000</option>
                    <option value="2000000">$2,000,000</option>
                  </select>
                </div>
                <div>
                  <select 
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
                  >
                    <option value="" disabled selected>Max Price</option>
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
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
                  >
                    <option value="" disabled selected>Bedrooms</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                    <option value="5">5+</option>
                  </select>
                </div>
                <div>
                  <select 
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
                  >
                    <option value="" disabled selected>Bathrooms</option>
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
      </div>
    </div>
  );
}