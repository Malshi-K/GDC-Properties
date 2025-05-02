"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

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

  // Fetch user's favorites, locations, and properties in parallel
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      
      try {
        // Create an array of promises for parallel fetching
        const promises = [
          fetchLocations(),
          fetchProperties(),
        ];
        
        // If user is logged in, also fetch favorites
        if (user) {
          promises.push(fetchUserFavorites());
        }
        
        // Wait for all promises to resolve
        await Promise.all(promises);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, [searchParams, user]);

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

  // Function to fetch properties
  const fetchProperties = async () => {
    if (!searchParams) return;

    try {
      // Start building the query
      let query = supabase.from("properties").select("*");

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

      // Execute the query
      const { data, error } = await query;

      if (error) throw error;

      setProperties(data || []);

      // Fetch images in parallel using Promise.all
      await fetchPropertyImages(data || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  // Function to fetch property images
  const fetchPropertyImages = async (propertiesData) => {
    if (!propertiesData.length) return;
    
    try {
      // Create an array of promises for parallel image fetching
      const imagePromises = propertiesData
        .filter(property => property.images && property.images.length > 0)
        .map(async (property) => {
          const imagePath = property.images[0];
          
          // Normalize the path
          const normalizedPath = imagePath.includes("/")
            ? imagePath
            : `${property.owner_id}/${imagePath}`;

          try {
            const { data, error } = await supabase.storage
              .from("property-images")
              .createSignedUrl(normalizedPath, 60 * 60); // 1 hour expiry

            if (error) {
              console.error(
                "Error getting signed URL for property " + property.id + ":",
                error
              );
              return [property.id, null];
            }
            
            return [property.id, data.signedUrl];
          } catch (error) {
            console.error("Error fetching image:", error);
            return [property.id, null];
          }
        });

      // Wait for all image fetches to complete
      const results = await Promise.all(imagePromises);
      
      // Convert results to an object
      const imageUrls = {};
      results.forEach(([propertyId, url]) => {
        if (url) imageUrls[propertyId] = url;
      });
      
      setPropertyImages(imageUrls);
    } catch (error) {
      console.error("Error fetching property images:", error);
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
        const { error } = await supabase
          .from("favorites")
          .insert({
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
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
        {/* Search filters */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-bold text-center text-gray-800 mb-4">
            Refine Your Search
          </h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Location dropdown */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  id="location"
                  name="location"
                  value={formData.location}
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
                <label htmlFor="property_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type
                </label>
                <select
                  id="property_type"
                  name="property_type"
                  value={formData.property_type}
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
                  <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-1">
                    Bedrooms
                  </label>
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
                
                {/* Bathrooms dropdown */}
                <div>
                  <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700 mb-1">
                    Bathrooms
                  </label>
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

            {/* Price range and search button */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="grid grid-cols-2 gap-2">
                {/* Min price dropdown */}
                <div>
                  <label htmlFor="minPrice" className="block text-sm font-medium text-gray-700 mb-1">
                    Min Price
                  </label>
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
                
                {/* Max price dropdown */}
                <div>
                  <label htmlFor="maxPrice" className="block text-sm font-medium text-gray-700 mb-1">
                    Max Price
                  </label>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Search Results
          </h1>
          <p className="text-gray-600">
            Found {properties.length}{" "}
            {properties.length === 1 ? "property" : "properties"} matching your
            criteria
          </p>
          <Link
            href="/"
            className="text-custom-red hover:text-red-700 font-medium mt-2 inline-block"
          >
            Back to Home
          </Link>
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
            <Link
              href="/"
              className="bg-custom-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-300"
            >
              Return Home
            </Link>
          </div>
        ) : (
          /* Property grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-lg overflow-hidden shadow-lg"
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
                    className="text-xl font-bold text-gray-800 mb-2 cursor-pointer hover:text-custom-red"
                    onClick={() => router.push(`/property/${property.id}`)}
                  >
                    {property.title}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">{property.description}</p>
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
        )}
      </div>
    </div>
  );
}