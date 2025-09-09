"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useGlobalData } from "@/contexts/GlobalDataContext";
import { useImageLoader } from "@/lib/services/imageLoaderService";
import { propertySearchService, PROPERTY_TYPES, CACHE_TTL } from "@/lib/utils/searchUtils";
import LoadingFallback from "../LoadingFallback";

export default function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const { fetchData } = useGlobalData();
  const { propertyImages, loadPropertyImage, preloadPropertiesImages } = useImageLoader();
  
  // Main state
  const [properties, setProperties] = useState([]);
  const [favorites, setFavorites] = useState({});
  const [savingFavorite, setSavingFavorite] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const propertiesPerPage = 9;

  // Form options state - all dynamic from database
  const [formOptions, setFormOptions] = useState({
    locations: [],
    priceRanges: { minPrices: [], maxPrices: [] },
    bedroomOptions: [],
    bathroomOptions: [],
    stats: null
  });

  const [isLoadingFormOptions, setIsLoadingFormOptions] = useState(true);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingFallback />;
  }

  // FIXED: Derive form data directly from searchParams - single source of truth
  const formData = useMemo(() => {
    return propertySearchService.searchParamsToFormData(searchParams);
  }, [searchParams]);

  // FIXED: Separate form state for immediate UI updates (before submission)
  const [localFormData, setLocalFormData] = useState(formData);

  // Update local form data when URL changes
  useEffect(() => {
    setLocalFormData(formData);
    setCurrentPage(1); // Reset page when search changes
  }, [formData]);

  // Load properties function - now uses formData directly from URL
  const loadProperties = useCallback(async () => {
    setLoadingProperties(true);
    
    try {
      console.log("🔍 Loading properties with form data:", formData);

      // Build direct Supabase query
      let query = supabase.from('properties').select('*', { count: 'exact' });

      // Apply filters step by step with logging
      let appliedFilters = [];

      if (formData.location && formData.location.trim() !== '') {
        query = query.eq('location', formData.location);
        appliedFilters.push(`location = '${formData.location}'`);
        console.log(`✅ Applied location filter: ${formData.location}`);
      }

      if (formData.property_type && formData.property_type.trim() !== '') {
        query = query.eq('property_type', formData.property_type);
        appliedFilters.push(`property_type = '${formData.property_type}'`);
        console.log(`✅ Applied property_type filter: ${formData.property_type}`);
      }

      if (formData.minPrice && formData.minPrice.trim() !== '') {
        const minPriceNum = parseInt(formData.minPrice);
        if (!isNaN(minPriceNum)) {
          query = query.gte('price', minPriceNum);
          appliedFilters.push(`price >= ${minPriceNum}`);
          console.log(`✅ Applied minPrice filter: ${minPriceNum}`);
        }
      }

      if (formData.maxPrice && formData.maxPrice.trim() !== '') {
        const maxPriceNum = parseInt(formData.maxPrice);
        if (!isNaN(maxPriceNum)) {
          query = query.lte('price', maxPriceNum);
          appliedFilters.push(`price <= ${maxPriceNum}`);
          console.log(`✅ Applied maxPrice filter: ${maxPriceNum}`);
        }
      }

      if (formData.bedrooms && formData.bedrooms.trim() !== '') {
        const bedroomsNum = parseInt(formData.bedrooms);
        if (!isNaN(bedroomsNum)) {
          query = query.gte('bedrooms', bedroomsNum);
          appliedFilters.push(`bedrooms >= ${bedroomsNum}`);
          console.log(`✅ Applied bedrooms filter: ${bedroomsNum}`);
        }
      }

      if (formData.bathrooms && formData.bathrooms.trim() !== '') {
        const bathroomsNum = parseFloat(formData.bathrooms);
        if (!isNaN(bathroomsNum)) {
          query = query.gte('bathrooms', bathroomsNum);
          appliedFilters.push(`bathrooms >= ${bathroomsNum}`);
          console.log(`✅ Applied bathrooms filter: ${bathroomsNum}`);
        }
      }

      console.log(`🎯 Total applied filters: ${appliedFilters.length}`);
      console.log(`📋 Applied filters: ${appliedFilters.join(', ')}`);

      // Apply ordering and pagination
      query = query.order('created_at', { ascending: false });
      
      const from = (currentPage - 1) * propertiesPerPage;
      const to = from + propertiesPerPage - 1;
      query = query.range(from, to);

      console.log(`📄 Pagination: page ${currentPage}, range ${from}-${to}`);
      console.log("🚀 Executing Supabase query...");

      // Execute the query
      const { data, error, count } = await query;

      if (error) {
        console.error("❌ Supabase query error:", error);
        throw error;
      }

      console.log("✅ Query results:", {
        totalCount: count,
        returnedResults: data?.length,
        firstResult: data?.[0] ? {
          id: data[0].id,
          title: data[0].title,
          location: data[0].location,
          price: data[0].price,
          bedrooms: data[0].bedrooms,
          bathrooms: data[0].bathrooms
        } : null
      });

      // Set the results
      setProperties(data || []);
      setTotalCount(count || 0);

      // Preload images
      if (data && data.length > 0) {
        setTimeout(() => {
          preloadPropertiesImages(data);
        }, 100);
      }

      // Show success message if filters were applied
      if (appliedFilters.length > 0) {
        console.log(`🎉 Search completed: Found ${count} properties with filters: ${appliedFilters.join(', ')}`);
      }

    } catch (error) {
      console.error("❌ Error loading properties:", error);
      toast.error(`Failed to load properties: ${error.message}`);
      setProperties([]);
      setTotalCount(0);
    } finally {
      setLoadingProperties(false);
    }
  }, [formData, currentPage, propertiesPerPage, preloadPropertiesImages]);

  // Load form options using GlobalDataContext - Dynamic from database
  const loadFormOptions = useCallback(async () => {
    try {
      setIsLoadingFormOptions(true);
      console.log("📋 Loading dynamic form options from database...");

      // Load all form options in parallel - same data as home page
      const [locationsData, priceData, bedroomsData, bathroomsData] = await Promise.all([
        // Get all unique locations
        fetchData({
          table: 'properties',
          select: 'location',
          filters: [{ column: 'location', operator: 'not.is', value: null }]
        }, { useCache: true, ttl: CACHE_TTL.FORM_OPTIONS }),

        // Get all prices to calculate dynamic ranges
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

      console.log("✅ Raw form data fetched:", {
        locations: locationsData?.length,
        prices: priceData?.length,
        bedrooms: bedroomsData?.length,
        bathrooms: bathroomsData?.length
      });

      // Process form options using shared utilities
      const processedOptions = propertySearchService.processFormOptionsFromRawData({
        locationsData,
        pricesData: priceData,
        bedroomsData,
        bathroomsData
      });

      console.log("✅ Processed search form options:", processedOptions);

      setFormOptions(processedOptions);

    } catch (error) {
      console.error("❌ Error loading form options:", error);
      // Set fallback options
      setFormOptions({
        locations: [],
        priceRanges: propertySearchService.getFallbackPriceRanges(),
        bedroomOptions: propertySearchService.getFallbackBedrooms(),
        bathroomOptions: propertySearchService.getFallbackBathrooms(),
        stats: null
      });
    } finally {
      setIsLoadingFormOptions(false);
    }
  }, [fetchData]);

  // Load form options on mount
  useEffect(() => {
    loadFormOptions();
  }, [loadFormOptions]);

  // Load properties when form data or page changes
  useEffect(() => {
    console.log("🔄 Form data or page changed, loading properties...");
    loadProperties();
  }, [loadProperties]);

  // Load user favorites
  useEffect(() => {
    if (user) {
      fetchUserFavorites();
    }
  }, [user]);

  // Function to fetch user favorites
  const fetchUserFavorites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("property_id")
        .eq("user_id", user.id);

      if (error) throw error;

      const favoritesObj = {};
      data.forEach((fav) => {
        favoritesObj[fav.property_id] = true;
      });

      setFavorites(favoritesObj);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  // Toggle favorite function
  const toggleFavorite = async (propertyId) => {
    if (!user) {
      router.push(
        "/login?redirect=" +
          encodeURIComponent(
            `/search?${propertySearchService.formDataToSearchParams(formData)}`
          )
      );
      return;
    }

    if (!propertyId) {
      toast.error("Failed to update favorite: Invalid property ID");
      return;
    }

    setSavingFavorite(propertyId);

    try {
      if (favorites[propertyId]) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", propertyId);

        if (error) throw error;

        setFavorites((prev) => {
          const newFavorites = { ...prev };
          delete newFavorites[propertyId];
          return newFavorites;
        });

        toast.success("Property removed from favorites");
      } else {
        const { error } = await supabase.from("favorites").insert({
          user_id: user.id,
          property_id: propertyId,
        });

        if (error) throw error;

        setFavorites((prev) => ({
          ...prev,
          [propertyId]: true,
        }));

        toast.success("Property saved to favorites");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error(
        `Failed to update favorites: ${error.message || "Unknown error"}`
      );
    } finally {
      setSavingFavorite(null);
    }
  };

  // FIXED: Handle form changes - update local state immediately
  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  // FIXED: Handle form submission - navigate with new params
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form data
    const validation = propertySearchService.validateFormData(localFormData);
    if (!validation.isValid) {
      toast.error(validation.errors.join(', '));
      return;
    }
    
    // Convert form data to query string and navigate
    const queryString = propertySearchService.formDataToSearchParams(localFormData);
    console.log("🚀 Navigating with query string:", queryString);
    
    // FIXED: Use replace to avoid adding to history, and ensure URL change triggers re-render
    router.replace(`/search?${queryString}`);
  };

  // Pagination component
  const Pagination = () => {
    const totalPages = Math.ceil(totalCount / propertiesPerPage);

    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center mt-8 space-x-2">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1 || loadingProperties}
          className="px-4 py-2 rounded-md bg-gray-200 disabled:opacity-50 hover:bg-gray-300 transition-colors"
        >
          Previous
        </button>

        <span className="px-4 py-2 bg-white rounded-md shadow">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages || loadingProperties}
          className="px-4 py-2 rounded-md bg-gray-200 disabled:opacity-50 hover:bg-gray-300 transition-colors"
        >
          Next
        </button>
      </div>
    );
  };

  // Skeleton components
  const PropertySkeleton = () => (
    <div className="bg-white rounded-lg overflow-hidden shadow-lg animate-pulse">
      <div className="h-48 bg-gray-300"></div>
      <div className="p-4">
        <div className="h-6 bg-gray-300 rounded mb-2"></div>
        <div className="h-4 bg-gray-300 rounded mb-2 w-3/4"></div>
        <div className="h-4 bg-gray-300 rounded mb-4 w-1/2"></div>
        <div className="flex justify-between mb-4">
          <div className="h-6 bg-gray-300 rounded w-1/3"></div>
          <div className="h-6 bg-gray-300 rounded w-1/3"></div>
        </div>
        <div className="h-10 bg-gray-300 rounded"></div>
      </div>
    </div>
  );

  const FormSkeleton = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        <div className="h-16 bg-gray-300 rounded"></div>
        <div className="h-16 bg-gray-300 rounded"></div>
        <div className="h-16 bg-gray-300 rounded"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 animate-pulse">
        <div className="h-16 bg-gray-300 rounded"></div>
        <div></div>
        <div className="h-10 bg-gray-300 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Search filters - Refine Your Search */}
        <div className="bg-white p-6 rounded-2xl shadow-md mb-8">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
            Refine Your Search
          </h2>

          {isLoadingFormOptions ? (
            <FormSkeleton />
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Location dropdown - Dynamic from database */}
                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Location
                  </label>
                  <select
                    id="location"
                    name="location"
                    value={localFormData.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none"
                  >
                    <option value="">Any location</option>
                    {formOptions.locations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Property type dropdown */}
                <div>
                  <label
                    htmlFor="property_type"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Property Type
                  </label>
                  <select
                    id="property_type"
                    name="property_type"
                    value={localFormData.property_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none"
                  >
                    <option value="">Any type</option>
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bedrooms and bathrooms - Dynamic from database */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Bedrooms dropdown */}
                  <div>
                    <label
                      htmlFor="bedrooms"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Bedrooms
                    </label>
                    <select
                      id="bedrooms"
                      name="bedrooms"
                      value={localFormData.bedrooms}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none"
                    >
                      <option value="">Any</option>
                      {formOptions.bedroomOptions.map((value) => (
                        <option key={`bed-${value}`} value={value}>
                          {value}+ {value === 1 ? "Bedroom" : "Bedrooms"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bathrooms dropdown */}
                  <div>
                    <label
                      htmlFor="bathrooms"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Bathrooms
                    </label>
                    <select
                      id="bathrooms"
                      name="bathrooms"
                      value={localFormData.bathrooms}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none"
                    >
                      <option value="">Any</option>
                      {formOptions.bathroomOptions.map((value) => (
                        <option key={`bath-${value}`} value={value}>
                          {propertySearchService.formatBathrooms(value)}+{" "}
                          {value === 1 ? "Bathroom" : "Bathrooms"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Price range and search button - Dynamic from database */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* Min price dropdown */}
                  <div>
                    <label
                      htmlFor="minPrice"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Min Price
                    </label>
                    <select
                      id="minPrice"
                      name="minPrice"
                      value={localFormData.minPrice}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none"
                    >
                      <option value="">No min</option>
                      {formOptions.priceRanges.minPrices.map((price) => (
                        <option key={`min-${price}`} value={price}>
                          {propertySearchService.formatPrice(price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Max price dropdown */}
                  <div>
                    <label
                      htmlFor="maxPrice"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Max Price
                    </label>
                    <select
                      id="maxPrice"
                      name="maxPrice"
                      value={localFormData.maxPrice}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none"
                    >
                      <option value="">No max</option>
                      {formOptions.priceRanges.maxPrices.map((price) => (
                        <option key={`max-${price}`} value={price}>
                          {propertySearchService.formatPrice(price)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div></div>
                {/* Search button */}
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-custom-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full transition-colors duration-300 disabled:opacity-50"
                    disabled={loadingProperties}
                  >
                    {loadingProperties ? 'Searching...' : 'Update Search'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Search results section */}
        <div className="text-center mb-6">
          <p className="text-gray-600">
            {loadingProperties ? (
              "Searching properties..."
            ) : (
              <>
                Found {totalCount}{" "}
                {totalCount === 1 ? "property" : "properties"} matching your
                criteria
              </>
            )}
          </p>
        </div>

        {loadingProperties ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: propertiesPerPage }).map((_, index) => (
              <PropertySkeleton key={index} />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No properties found
            </h2>
            <p className="text-gray-600 mb-6">
              Try adjusting your search filters to see more results.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 text-xs text-gray-500">
                <p>Debug: Check console for query details</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property) => (
                <div
                  key={property.id}
                  className="bg-white rounded-lg overflow-hidden shadow-lg transition-transform duration-200 hover:transform hover:scale-105"
                >
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(property.id);
                      }}
                      disabled={savingFavorite === property.id}
                      className="absolute top-2 right-2 z-10 p-2 bg-white bg-opacity-80 rounded-full shadow-md hover:bg-opacity-100 transition-all duration-200"
                      aria-label={
                        favorites[property.id]
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill={favorites[property.id] ? "#dc2626" : "none"}
                        stroke={
                          favorites[property.id]
                            ? "#dc2626"
                            : "currentColor"
                        }
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`${
                          savingFavorite === property.id
                            ? "animate-pulse"
                            : ""
                        }`}
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </button>

                    <div
                      className="h-48 bg-gray-200 relative cursor-pointer"
                      onClick={() =>
                        router.push(`/property/${property.id}`)
                      }
                    >
                      {propertyImages[property.id] ? (
                        <Image
                          src={propertyImages[property.id]}
                          alt={property.title}
                          fill
                          className="object-cover"
                          loading="lazy"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          placeholder="blur"
                          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
                          onError={() => {
                            if (property.images && property.images.length > 0) {
                              loadPropertyImage(property.id, property.owner_id, property.images[0]);
                            }
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                          <span>
                            {property.images?.length 
                              ? "Loading image..." 
                              : "No Image Available"
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3
                      className="text-xl font-bold text-gray-800 mb-2 cursor-pointer hover:text-custom-red transition-colors"
                      onClick={() =>
                        router.push(`/property/${property.id}`)
                      }
                    >
                      {property.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {property.description}
                    </p>
                    <div className="flex justify-between mb-4">
                      <span className="text-custom-red font-bold text-lg">
                        {propertySearchService.formatPrice(property.price)}
                      </span>
                      <div className="text-gray-700">
                        <span className="mr-2">
                          {property.bedrooms} beds
                        </span>
                        •
                        <span className="ml-2">
                          {property.bathrooms} baths
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        router.push(`/property/${property.id}`)
                      }
                      className="w-full bg-custom-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full transition-colors duration-300"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Pagination />
          </>
        )}
      </div>
    </div>
  );
}