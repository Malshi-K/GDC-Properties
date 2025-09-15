// Fixed AdminPropertiesTab with correct viewing requests and rental applications counts
"use client";
import { useState, useEffect } from "react";
import { useGlobalData } from "@/contexts/GlobalDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// Simple image component with fallback (unchanged)
function PropertyImage({
  property,
  className = "h-12 w-12 rounded-lg object-cover",
}) {
  const [imageUrl, setImageUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      setImageError(false);

      if (
        !property?.images ||
        !Array.isArray(property.images) ||
        property.images.length === 0
      ) {
        setIsLoading(false);
        setImageError(true);
        return;
      }

      const firstImage = property.images[0];

      if (
        firstImage.startsWith("http://") ||
        firstImage.startsWith("https://")
      ) {
        setImageUrl(firstImage);
        setIsLoading(false);
        return;
      }

      if (property.owner_id && firstImage) {
        try {
          const imagePath = firstImage.includes("/")
            ? firstImage
            : `${property.owner_id}/${firstImage}`;

          const { data: signedData, error: signedError } =
            await supabase.storage
              .from("property-images")
              .createSignedUrl(imagePath, 3600);

          if (!signedError && signedData?.signedUrl) {
            setImageUrl(signedData.signedUrl);
            setIsLoading(false);
            return;
          }

          const { data: publicData } = supabase.storage
            .from("property-images")
            .getPublicUrl(imagePath);

          if (publicData?.publicUrl) {
            setImageUrl(publicData.publicUrl);
            setIsLoading(false);
            return;
          }

          throw new Error("No valid image URL found");
        } catch (error) {
          console.error(
            `Failed to load image for property ${property.id}:`,
            error
          );
          setImageError(true);
          setIsLoading(false);
        }
      } else {
        setImageError(true);
        setIsLoading(false);
      }
    };

    loadImage();
  }, [property]);

  if (isLoading) {
    return (
      <div
        className={`${className} bg-gray-200 flex items-center justify-center animate-pulse`}
      >
        <svg
          className="h-4 w-4 text-gray-400 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );
  }

  if (imageError || !imageUrl) {
    return (
      <div
        className={`${className} bg-gray-200 flex items-center justify-center`}
      >
        <svg
          className="h-6 w-6 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={property.title || "Property image"}
      className={className}
      onError={() => setImageError(true)}
      onLoad={() => setIsLoading(false)}
    />
  );
}

export default function AdminPropertiesTab({ onRefresh }) {
  const { user } = useAuth();
  const { fetchData, updateData, invalidateCache } = useGlobalData();
  const [properties, setProperties] = useState([]);
  const [owners, setOwners] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  // New state for tracking counts
  const [viewingRequestsCount, setViewingRequestsCount] = useState(0);
  const [rentalApplicationsCount, setRentalApplicationsCount] = useState(0);
  const [countsLoading, setCountsLoading] = useState(false);

  useEffect(() => {
    fetchProperties();
    fetchCounts(); // Fetch the additional counts
  }, []);

  // Function to fetch viewing requests and rental applications counts
  const fetchCounts = async () => {
    setCountsLoading(true);
    try {
      console.log("=== FETCHING COUNTS ===");

      // Fetch viewing requests count
      const viewingRequestsData = await fetchData(
        {
          table: "viewing_requests",
          select: "id",
        },
        { useCache: false }
      );

      // Fetch rental applications count
      const rentalApplicationsData = await fetchData(
        {
          table: "rental_applications",
          select: "id",
        },
        { useCache: false }
      );

      const viewingCount = Array.isArray(viewingRequestsData)
        ? viewingRequestsData.length
        : 0;
      const rentalCount = Array.isArray(rentalApplicationsData)
        ? rentalApplicationsData.length
        : 0;

      console.log(
        `✅ Viewing requests: ${viewingCount}, Rental applications: ${rentalCount}`
      );

      setViewingRequestsCount(viewingCount);
      setRentalApplicationsCount(rentalCount);
    } catch (error) {
      console.error("Error fetching counts:", error);
      // Set counts to 0 on error rather than breaking the UI
      setViewingRequestsCount(0);
      setRentalApplicationsCount(0);
    } finally {
      setCountsLoading(false);
    }
  };

  // Existing fetchProperties function (unchanged)
  const fetchProperties = async () => {
    setIsLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      console.log("=== FETCHING PROPERTIES (SIMPLIFIED) ===");

      // Step 1: Try to get cached properties first
      let cachedProperties = null;
      try {
        cachedProperties = await fetchData(
          { _cached_key: "admin_all_properties" },
          { useCache: true }
        );

        if (
          cachedProperties &&
          Array.isArray(cachedProperties) &&
          cachedProperties.length > 0
        ) {
          console.log(
            `✅ Using cached properties: ${cachedProperties.length} properties`
          );
          setProperties(cachedProperties);

          const cachedOwners = await fetchData(
            { _cached_key: "admin_landlords" },
            { useCache: true }
          );
          if (cachedOwners) {
            setOwners(cachedOwners);
          }

          setIsLoading(false);
          return;
        }
      } catch (cacheError) {
        console.log("🔍 No cache found, proceeding with fresh fetch");
      }

      // Step 2: Test basic database connectivity
      console.log("Testing database connectivity...");
      const connectionTest = await fetchData(
        {
          table: "properties",
          select: "id",
          limit: 1,
        },
        { useCache: false }
      );

      console.log("✅ Database connectivity confirmed");

      // Step 3: Fetch properties
      console.log("Fetching properties...");
      const propertiesData = await fetchData(
        {
          table: "properties",
          select: "*",
          orderBy: { column: "created_at", ascending: false },
        },
        {
          useCache: false,
          onError: (error) => {
            console.error("Properties fetch failed:", error);
          },
        }
      );

      if (!propertiesData || propertiesData.length === 0) {
        console.log("No properties found in database");
        setProperties([]);
        setOwners({});
        setError(null);
        setDebugInfo({
          message: "Database is accessible but contains no properties",
          propertiesCount: 0,
          hasOwnerData: false,
        });
        setIsLoading(false);
        return;
      }

      console.log(`✅ Found ${propertiesData.length} properties`);

      // Step 4: Fetch owner information
      const uniqueOwnerIds = [
        ...new Set(propertiesData.map((p) => p.owner_id).filter(Boolean)),
      ];
      const ownersMap = {};

      console.log("Unique owner IDs found:", uniqueOwnerIds);

      if (uniqueOwnerIds.length > 0) {
        console.log(
          `Fetching owner data for ${uniqueOwnerIds.length} unique owners...`
        );

        try {
          const { data: ownersData, error: ownersError } = await supabase
            .from("profiles")
            .select("id, full_name, email, phone, role")
            .in("id", uniqueOwnerIds);

          console.log("Direct Supabase owners query result:", {
            ownersData,
            ownersError,
          });

          if (ownersError) {
            console.warn("Failed to fetch owners data:", ownersError.message);
          } else if (ownersData && Array.isArray(ownersData)) {
            ownersData.forEach((owner) => {
              ownersMap[owner.id] = owner;
              console.log(
                `Mapped owner: ${owner.id} -> ${owner.full_name || "No name"}`
              );
            });
            console.log(`✅ Loaded owner data for ${ownersData.length} owners`);
            console.log("Final owners map:", ownersMap);
          } else {
            console.warn("Owners data is not an array or is null:", ownersData);
          }
        } catch (ownerError) {
          console.warn("Error fetching owners:", ownerError.message);
        }
      } else {
        console.log("No owner IDs found in properties data");
      }

      // Step 5: Set the data
      setProperties(propertiesData);
      setOwners(ownersMap);
      setError(null);
      setDebugInfo({
        message: `Successfully loaded ${propertiesData.length} properties`,
        propertiesCount: propertiesData.length,
        hasOwnerData: Object.keys(ownersMap).length > 0,
        ownersCount: Object.keys(ownersMap).length,
        sampleProperty: propertiesData[0],
      });

      // Step 6: Cache the successful results
      updateData("admin_all_properties", propertiesData);
      if (Object.keys(ownersMap).length > 0) {
        updateData("admin_landlords", ownersMap);
      }

      console.log(
        `✅ Successfully loaded ${propertiesData.length} properties with ${
          Object.keys(ownersMap).length
        } owners`
      );
    } catch (error) {
      console.error("💥 Error in fetchProperties:", error);
      setError(`Failed to fetch properties: ${error.message}`);
      setProperties([]);
      setOwners({});
      setDebugInfo({
        error: error.message,
        timestamp: new Date().toISOString(),
        suggestion: "Check database permissions and RLS policies.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Clear cache and refresh
  const handleRefresh = async () => {
    invalidateCache("admin_all_properties");
    invalidateCache("admin_landlords");
    invalidateCache("properties");
    invalidateCache("viewing_requests");
    invalidateCache("rental_applications");

    if (onRefresh && typeof onRefresh === "function") {
      onRefresh();
    }

    await Promise.all([fetchProperties(), fetchCounts()]);
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case "available":
        return "bg-green-100 text-green-800 border border-green-200";
      case "rented":
        return "bg-orange-100 text-orange-800 border border-red-200";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "pending":
        return "bg-gray-100 text-gray-800 border border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const formatPrice = (price) => {
    if (!price) return "Price not set";
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Filter and sort properties
  const filteredAndSortedProperties = properties
    .filter((property) => {
      const owner = owners[property.owner_id];
      const matchesSearch =
        property.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "all" || property.status === filterStatus;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price_low":
          return (a.price || 0) - (b.price || 0);
        case "price_high":
          return (b.price || 0) - (a.price || 0);
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        case "location":
          return (a.location || "").localeCompare(b.location || "");
        case "created_at":
        default:
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });

  // Updated property stats - keeping the original property status counts
  const propertyStats = {
    total: properties.length,
    available: properties.filter((p) => p.status === "available").length,
    rented: properties.filter((p) => p.status === "rented").length,
    maintenance: properties.filter((p) => p.status === "maintenance").length,
    pending: properties.filter((p) => p.status === "pending").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Properties</h1>
          <p className="text-gray-600">
            Overview of all properties in the system
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading || countsLoading}
            className="bg-custom-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || countsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
                {debugInfo?.suggestion && (
                  <p className="mt-1 text-sm text-red-600">
                    Suggestion: {debugInfo.suggestion}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Updated Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-custom-blue rounded-lg">
              <img
                src="/images/icons/tabs/2.png"
                alt="Total Users"
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">
                Total Properties
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {propertyStats.total}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-custom-blue rounded-lg">
              <img
                src="/images/icons/tabs/2.png"
                alt="Total Users"
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Available</p>
              <p className="text-2xl font-bold text-gray-900">
                {propertyStats.available}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-custom-blue rounded-lg">
              <img
                src="/images/icons/tabs/4.png"
                alt="Total Users"
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">
                Viewing Requests
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {countsLoading ? "..." : viewingRequestsCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-custom-blue rounded-lg">
              <img
                src="/images/icons/tabs/5.png"
                alt="Total Users"
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">
                Rental Applications
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {countsLoading ? "..." : rentalApplicationsCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-custom-blue rounded-lg">
              <img
                src="/images/icons/tabs/6.png"
                alt="Total Users"
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Rented</p>
              <p className="text-2xl font-bold text-gray-900">
                {propertyStats.rented}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Properties
            </label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by title, location, or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-black pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-orange"
              />
            </div>
          </div>

          <div className="lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="maintenance">Maintenance</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="created_at">Newest First</option>
              <option value="title">Property Title</option>
              <option value="location">Location</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-blue"></div>
          <span className="ml-2 text-gray-600">Loading properties...</span>
        </div>
      ) : filteredAndSortedProperties.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No properties found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== "all"
              ? "Try adjusting your search or filter criteria."
              : "No properties have been added to the system yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedProperties.map((property) => {
                  const owner = owners[property.owner_id];
                  return (
                    <tr key={property.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <PropertyImage
                            property={property}
                            className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {property.title || "Untitled Property"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {property.property_type || "Unknown Type"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {owner?.full_name || "Unknown Owner"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {owner?.email || "No email"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {property.location || "Location not specified"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatPrice(property.price)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                            property.status
                          )}`}
                        >
                          {property.status || "Unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {property.created_at
                          ? new Date(property.created_at).toLocaleDateString()
                          : "Unknown"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
