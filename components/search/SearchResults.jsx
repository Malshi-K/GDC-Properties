"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import debounce from 'lodash/debounce';

export default function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [propertyImages, setPropertyImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [favorites, setFavorites] = useState({});
  const [savingFavorite, setSavingFavorite] = useState(null);
  const [queryCache, setQueryCache] = useState({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const propertiesPerPage = 9; // Show 9 properties per page

  // Initialize form data with search parameters
  const [formData, setFormData] = useState({
    location: "",
    property_type: "",
    minPrice: "",
    maxPrice: "",
    bedrooms: "",
    bathrooms: "",
  });

  // Update form data when searchParams are available
  useEffect(() => {
    if (searchParams) {
      // Reset to page 1 when search params change
      setCurrentPage(1);
      
      setFormData({
        location: searchParams.get("location") || "",
        property_type: searchParams.get("property_type") || "",
        minPrice: searchParams.get("minPrice") || "",
        maxPrice: searchParams.get("maxPrice") || "",
        bedrooms: searchParams.get("bedrooms") || "",
        bathrooms: searchParams.get("bathrooms") || "",
      });
    }
  }, [searchParams]);

  // Create a cache key from the current search params and page
  const cacheKey = useMemo(() => {
    if (!searchParams) return '';
    const queryString = new URLSearchParams(searchParams).toString();
    return `${queryString}_page${currentPage}`;
  }, [searchParams, currentPage]);

  // Load initial data on component mount
  useEffect(() => {
    // Prefetch locations only once
    if (locations.length === 0) {
      fetchLocations();
    }
    
    // Fetch user favorites if user is logged in
    if (user) {
      fetchUserFavorites();
    }
  }, [user]);

  // Fetch properties when search params or page changes
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);

      try {
        // Check cache before fetching properties
        if (queryCache[cacheKey]) {
          console.log('Using cached results');
          setProperties(queryCache[cacheKey].properties);
          setTotalCount(queryCache[cacheKey].totalCount);
          setPropertyImages(queryCache[cacheKey].images || {});
          setLoading(false);
          return;
        }
        
        // Fetch properties and images
        await fetchProperties();
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [searchParams, currentPage, cacheKey]);

  // Function to fetch user favorites
  const fetchUserFavorites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("property_id")
        .eq("user_id", user.id);

      if (error) throw error;

      // Convert the array to an object for easier lookup
      const favoritesObj = {};
      data.forEach((fav) => {
        favoritesObj[fav.property_id] = true;
      });

      setFavorites(favoritesObj);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  // Function to fetch locations
  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("location")
        .is("location", "not.null");

      if (error) throw error;

      const uniqueLocations = [...new Set(data.map((item) => item.location))];
      setLocations(uniqueLocations);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  // Function to fetch properties with pagination
  const fetchProperties = async () => {
    if (!searchParams) return;

    try {
      // Start building the query
      let query = supabase.from("properties").select("*", { count: "exact" });

      // Add filters based on search params
      const location = searchParams.get("location");
      if (location) {
        query = query.eq("location", location);
      }

      const property_type = searchParams.get("property_type");
      if (property_type && property_type !== "all") {
        query = query.eq("property_type", property_type);
      }

      const minPrice = searchParams.get("minPrice");
      if (minPrice) {
        query = query.gte("price", parseInt(minPrice));
      }

      const maxPrice = searchParams.get("maxPrice");
      if (maxPrice) {
        query = query.lte("price", parseInt(maxPrice));
      }

      const bedrooms = searchParams.get("bedrooms");
      if (bedrooms) {
        query = query.gte("bedrooms", parseInt(bedrooms));
      }

      const bathrooms = searchParams.get("bathrooms");
      if (bathrooms) {
        query = query.gte("bathrooms", parseFloat(bathrooms));
      }

      // Add pagination
      const from = (currentPage - 1) * propertiesPerPage;
      const to = from + propertiesPerPage - 1;
      
      // Execute the query with pagination
      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProperties(data || []);
      setTotalCount(count || 0);

      // Fetch images for the current page
      const imageUrls = await fetchPropertyImages(data || []);
      
      // Update cache
      setQueryCache(prev => ({
        ...prev,
        [cacheKey]: {
          properties: data || [],
          totalCount: count || 0,
          images: imageUrls
        }
      }));
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  // Improved function to fetch property images in batches
  const fetchPropertyImages = async (propertiesData) => {
    if (!propertiesData.length) return {};

    try {
      // Create batch requests (10 images per batch)
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < propertiesData.length; i += batchSize) {
        const batch = propertiesData.slice(i, i + batchSize);
        
        // Process each batch in parallel
        batches.push(
          Promise.all(
            batch
              .filter((property) => property.images && property.images.length > 0)
              .map(async (property) => {
                const imagePath = property.images[0];
                const normalizedPath = imagePath.includes("/")
                  ? imagePath
                  : `${property.owner_id}/${imagePath}`;
                  
                try {
                  const { data, error } = await supabase.storage
                    .from("property-images")
                    .createSignedUrl(normalizedPath, 60 * 60);
                    
                  return [property.id, error ? null : data.signedUrl];
                } catch (error) {
                  console.error("Error fetching image:", error);
                  return [property.id, null];
                }
              })
          )
        );
      }
      
      // Process all batches
      const batchResults = await Promise.all(batches);
      const allResults = batchResults.flat();
      
      // Convert results to an object
      const imageUrls = {};
      allResults.forEach(([propertyId, url]) => {
        if (url) imageUrls[propertyId] = url;
      });
      
      setPropertyImages(imageUrls);
      return imageUrls;
    } catch (error) {
      console.error("Error fetching property images:", error);
      return {};
    }
  };

  // Toggle a property as favorite
  const toggleFavorite = async (propertyId) => {
    if (!user) {
      router.push(
        "/login?redirect=" +
          encodeURIComponent(
            `/search?${new URLSearchParams(searchParams).toString()}`
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
        // Remove from favorites
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", propertyId);

        if (error) throw error;

        // Update state
        setFavorites((prev) => {
          const newFavorites = { ...prev };
          delete newFavorites[propertyId];
          return newFavorites;
        });

        toast.success("Property removed from favorites");
      } else {
        // Add to favorites - single object, not array
        const { error } = await supabase.from("favorites").insert({
          user_id: user.id,
          property_id: propertyId,
        });

        if (error) throw error;

        // Update state
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

  // Debounced handle change for form fields
  const debouncedHandleChange = useCallback(
    debounce((name, value) => {
      setFormData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    }, 300),
    []
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    debouncedHandleChange(name, value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Filter out empty values
    const queryParams = Object.entries(formData)
      .filter(([_, value]) => value !== "")
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const propertyTypes = [
    { value: "apartment", label: "Apartment" },
    { value: "house", label: "House" },
    { value: "condo", label: "Condo" },
    { value: "townhouse", label: "Townhouse" },
    { value: "villa", label: "Villa" },
  ];

  // Pagination component
  const Pagination = () => {
    const totalPages = Math.ceil(totalCount / propertiesPerPage);
    
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center mt-8 space-x-2">
        <button 
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 rounded-md bg-gray-200 disabled:opacity-50 hover:bg-gray-300 transition-colors"
        >
          Previous
        </button>
        
        <span className="px-4 py-2 bg-white rounded-md shadow">
          Page {currentPage} of {totalPages}
        </span>
        
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 rounded-md bg-gray-200 disabled:opacity-50 hover:bg-gray-300 transition-colors"
        >
          Next
        </button>
      </div>
    );
  };

  // Skeleton loader for property cards
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

  if (loading && !queryCache[cacheKey]) {
    // Show skeleton loaders instead of full page spinner
    return (
      <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Search filters (always show them) */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
              Refine Your Search
            </h2>
            {/* Skeleton form */}
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
          </div>
          
          {/* Property grid skeletons */}
          <div className="text-center mb-6">
            <p className="text-gray-600">Loading properties...</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array(6).fill(0).map((_, index) => (
              <PropertySkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Search filters */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
            Refine Your Search
          </h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Location dropdown */}
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
                  defaultValue={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none"
                >
                  <option value="">Any location</option>
                  {locations.map((location) => (
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
                  defaultValue={formData.property_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red text-gray-700 bg-white appearance-none"
                >
                  <option value="">Any type</option>
                  {propertyTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bedrooms and bathrooms */}
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
                    defaultValue={formData.bedrooms}
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
                    defaultValue={formData.bathrooms}
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

            {/* Price range and search button */}
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
                    defaultValue={formData.minPrice}
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
                    defaultValue={formData.maxPrice}
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
              {/* Search button */}
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
          <p className="text-gray-600">
            Found {totalCount}{" "}
            {totalCount === 1 ? "property" : "properties"} matching your
            criteria
          </p>          
        </div>

        {/* No results message */}
        {properties.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No properties found
            </h2>
            <p className="text-gray-600 mb-6">
              Try adjusting your search filters to see more results.
            </p>
          </div>
        ) : (
          <>
            {/* Property grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property) => (
                <div
                  key={property.id}
                  className="bg-white rounded-lg overflow-hidden shadow-lg transition-transform duration-200 hover:transform hover:scale-105"
                >
                  <div className="relative">
                    {/* Favorite Heart Button */}
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
                      {/* Heart SVG icon */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill={favorites[property.id] ? "#dc2626" : "none"}
                        stroke={
                          favorites[property.id] ? "#dc2626" : "currentColor"
                        }
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`${
                          savingFavorite === property.id ? "animate-pulse" : ""
                        }`}
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </button>

                    {/* Property Image */}
                    <div
                      className="h-48 bg-gray-200 relative cursor-pointer"
                      onClick={() => router.push(`/property/${property.id}`)}
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
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                          <span>No Image Available</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3
                      className="text-xl font-bold text-gray-800 mb-2 cursor-pointer hover:text-custom-red transition-colors"
                      onClick={() => router.push(`/property/${property.id}`)}
                    >
                      {property.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {property.description}
                    </p>
                    <div className="flex justify-between mb-4">
                      <span className="text-custom-red font-bold text-lg">
                        {formatPrice(property.price)}
                      </span>
                      <div className="text-gray-700">
                        <span className="mr-2">{property.bedrooms} beds</span>•
                        <span className="ml-2">{property.bathrooms} baths</span>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/property/${property.id}`)}
                      className="w-full bg-custom-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination component */}
            <Pagination />
          </>
        )}
      </div>
    </div>
  );
}