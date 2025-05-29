"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { propertySearchService, PROPERTY_TYPES, CACHE_TTL } from '@/lib/utils/searchUtils';

export default function PropertySearchForm() {
  const router = useRouter();
  const { fetchData, loading } = useGlobalData();
  
  const [formData, setFormData] = useState({
    location: '',
    property_type: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: ''
  });

  // Form options state - all dynamic from database
  const [formOptions, setFormOptions] = useState({
    locations: [],
    priceRanges: { minPrices: [], maxPrices: [] },
    bedroomOptions: [],
    bathroomOptions: [],
    stats: null
  });

  const [error, setError] = useState(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  // Fetch form options on mount
  useEffect(() => {
    const fetchFormOptions = async () => {
      try {
        setError(null);
        setIsLoadingOptions(true);

        console.log("🔄 Fetching dynamic form options from database...");

        // Fetch all form options in parallel from database
        const [locationsData, pricesData, bedroomsData, bathroomsData] = await Promise.all([
          // Get all unique locations
          fetchData({
            table: 'properties',
            select: 'location',
            filters: [{ column: 'location', operator: 'not.is', value: null }]
          }, { useCache: true, ttl: CACHE_TTL.FORM_OPTIONS }),

          // Get all prices to calculate ranges
          fetchData({
            table: 'properties',
            select: 'price',
            filters: [{ column: 'price', operator: 'not.is', value: null }],
            orderBy: { column: 'price', ascending: true }
          }, { useCache: true, ttl: CACHE_TTL.FORM_OPTIONS }),

          // Get all bedroom counts
          fetchData({
            table: 'properties',
            select: 'bedrooms',
            filters: [{ column: 'bedrooms', operator: 'not.is', value: null }]
          }, { useCache: true, ttl: CACHE_TTL.FORM_OPTIONS }),

          // Get all bathroom counts
          fetchData({
            table: 'properties',
            select: 'bathrooms',
            filters: [{ column: 'bathrooms', operator: 'not.is', value: null }]
          }, { useCache: true, ttl: CACHE_TTL.FORM_OPTIONS })
        ]);

        console.log("✅ Raw data fetched:", {
          locations: locationsData?.length,
          prices: pricesData?.length,
          bedrooms: bedroomsData?.length,
          bathrooms: bathroomsData?.length
        });

        // Process the raw data using shared utilities
        const processedOptions = propertySearchService.processFormOptionsFromRawData({
          locationsData,
          pricesData,
          bedroomsData,
          bathroomsData
        });

        console.log("✅ Processed form options:", {
          locations: processedOptions.locations.length,
          minPrices: processedOptions.priceRanges.minPrices.length,
          maxPrices: processedOptions.priceRanges.maxPrices.length,
          bedrooms: processedOptions.bedroomOptions.length,
          bathrooms: processedOptions.bathroomOptions.length,
          stats: processedOptions.stats
        });

        setFormOptions(processedOptions);

      } catch (err) {
        console.error("❌ Error fetching form options:", err);
        setError("Failed to load search options. Please try again later.");
        
        // Set fallback options from utilities
        setFormOptions({
          locations: [],
          priceRanges: propertySearchService.getFallbackPriceRanges(),
          bedroomOptions: propertySearchService.getFallbackBedrooms(),
          bathroomOptions: propertySearchService.getFallbackBathrooms(),
          stats: null
        });
      } finally {
        setIsLoadingOptions(false);
      }
    };

    fetchFormOptions();
  }, [fetchData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form data
    const validation = propertySearchService.validateFormData(formData);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }
    
    // Convert form data to query string
    const queryString = propertySearchService.formDataToSearchParams(formData);
    
    // Navigate to search page with filters
    router.push(`/search?${queryString}`);
  };

  return (
    <div className="w-full lg:w-4/12 mt-8 lg:mt-0">
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-lg max-w-md mx-auto lg:mx-0">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-1">Find Your Dream Home</h2>
        <p className="text-center text-gray-600 text-sm mb-4 sm:mb-6">Filter properties to match your needs</p>
        
        {/* Display database stats if available
        {formOptions.stats && (
          <div className="mb-4 p-2 bg-gray-50 rounded text-xs text-gray-600">
            <div className="flex justify-between">
              <span>{formOptions.locations.length} locations</span>
              {formOptions.stats.priceRange && (
                <span>
                  {propertySearchService.formatPrice(formOptions.stats.priceRange.min)} - {propertySearchService.formatPrice(formOptions.stats.priceRange.max)}
                </span>
              )}
            </div>
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )} */}
        
        <form className="space-y-3 sm:space-y-4" onSubmit={handleSubmit}>
          {/* Location dropdown - Dynamic from database */}
          <div>
            <select 
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
              disabled={isLoadingOptions}
            >
              <option value="">
                {isLoadingOptions ? "Loading locations..." : "Select Location"}
              </option>
              {formOptions.locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          
          {/* Property type dropdown */}
          <div>
            <select 
              name="property_type"
              value={formData.property_type}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
            >
              <option value="">All property types</option>
              {PROPERTY_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          
          {/* Price range - Dynamic from database */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <select 
                name="minPrice"
                value={formData.minPrice}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
                disabled={isLoadingOptions}
              >
                <option value="">
                  {isLoadingOptions ? "Loading..." : "Min Price"}
                </option>
                {formOptions.priceRanges.minPrices.map(price => (
                  <option key={`min-${price}`} value={price}>
                    {propertySearchService.formatPrice(price)}
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
                disabled={isLoadingOptions}
              >
                <option value="">
                  {isLoadingOptions ? "Loading..." : "Max Price"}
                </option>
                {formOptions.priceRanges.maxPrices.map(price => (
                  <option key={`max-${price}`} value={price}>
                    {propertySearchService.formatPrice(price)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Bedrooms and bathrooms - Dynamic from database */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <select 
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none text-sm sm:text-base"
                disabled={isLoadingOptions}
              >
                <option value="">
                  {isLoadingOptions ? "Loading..." : "Bedrooms"}
                </option>
                {formOptions.bedroomOptions.map(value => (
                  <option key={`bed-${value}`} value={value}>
                    {value}+ {value === 1 ? 'Bedroom' : 'Bedrooms'}
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
                disabled={isLoadingOptions}
              >
                <option value="">
                  {isLoadingOptions ? "Loading..." : "Bathrooms"}
                </option>
                {formOptions.bathroomOptions.map(value => (
                  <option key={`bath-${value}`} value={value}>
                    {propertySearchService.formatBathrooms(value)}+ {value === 1 ? 'Bathroom' : 'Bathrooms'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-custom-red hover:bg-red-700 text-white font-bold py-2 sm:py-3 px-4 rounded-md transition-colors duration-300 text-sm sm:text-base disabled:opacity-50"
            disabled={isLoadingOptions}
          >
            {isLoadingOptions ? 'Loading Options...' : 'Search Properties'}
          </button>
        </form>

        {/* Debug info in development */}
        {/* {process.env.NODE_ENV === 'development' && formOptions.stats && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
            <details>
              <summary className="cursor-pointer font-medium">Debug Info</summary>
              <pre className="mt-2 whitespace-pre-wrap">
                {JSON.stringify(formOptions.stats, null, 2)}
              </pre>
            </details>
          </div>
        )} */}
      </div>
    </div>
  );
}