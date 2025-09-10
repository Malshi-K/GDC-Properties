"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";

// Initialize Supabase client
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PropertyDetails() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  const [property, setProperty] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    async function fetchPropertyDetails() {
      if (!id) return;

      try {
        setLoading(true);

        // Fetch property details
        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        if (!data) {
          setError("Property not found");
          return;
        }

        setProperty(data);

        // Fetch signed URLs for all property images
        if (data.images && data.images.length > 0) {
          const urls = [];

          for (const imagePath of data.images) {
            // Normalize the path
            const normalizedPath = imagePath.includes("/")
              ? imagePath
              : `${data.owner_id}/${imagePath}`;

            try {
              const { data: urlData, error: urlError } =
                await supabaseClient.storage
                  .from("property-images")
                  .createSignedUrl(normalizedPath, 60 * 60); // 1 hour expiry

              if (urlError) {
                console.error("Error getting signed URL:", urlError);
              } else {
                urls.push(urlData.signedUrl);
              }
            } catch (urlError) {
              console.error("Error getting signed URL:", urlError);
            }
          }

          setImageUrls(urls);
        }
      } catch (err) {
        console.error("Error fetching property details:", err);
        setError(err.message || "Failed to load property details");
      } finally {
        setLoading(false);
      }
    }

    fetchPropertyDetails();
  }, [id]);

  const handleImageClick = (index) => {
    setActiveImage(index);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Available Now";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">
            Loading property details...
          </h2>
          <div className="w-12 h-12 border-4 border-gray-300 border-t-custom-orange rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "The property could not be found."}
          </p>
          <Link
            href="/search"
            className="bg-custom-orange hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-300"
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Back button */}
          <div className="p-6 flex items-center">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-700 hover:text-custom-orange transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Search
            </button>
          </div>

          {/* Property headline */}
          <div className="px-6 pb-6 pt-2">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {property.title}
            </h1>
            <p className="text-gray-700 text-lg mb-2">{property.location}</p>
            <div className="flex items-center text-gray-700">
              <span className="mr-4">{property.bedrooms} Bedrooms</span>
              <span className="mr-4">{property.bathrooms} Bathrooms</span>
              <span>{property.square_footage} sq ft</span>
            </div>
          </div>

          {/* Property images */}
          <div className="px-6 pb-8">
            {property.images && property.images.length > 0 ? (
              <div className="space-y-4">
                {/* Main image */}
                <div className="relative h-80 sm:h-96 w-full rounded-lg overflow-hidden bg-gray-200">
                  {imageUrls[activeImage] ? (
                    <Image
                      src={imageUrls[activeImage]}
                      alt={`${property.title} - Image ${activeImage + 1}`}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No Image Available
                    </div>
                  )}
                </div>

                {/* Thumbnail gallery */}
                {imageUrls.length > 1 && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                    {imageUrls.map((imageUrl, index) => (
                      <div
                        key={index}
                        className={`relative h-20 rounded-md overflow-hidden cursor-pointer border-2 ${
                          activeImage === index
                            ? "border-custom-orange"
                            : "border-transparent"
                        }`}
                        onClick={() => handleImageClick(index)}
                      >
                        <Image
                          src={imageUrl}
                          alt={`${property.title} - Thumbnail ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-200 h-80 sm:h-96 rounded-lg flex items-center justify-center text-gray-500">
                No Images Available
              </div>
            )}
          </div>

          <div className="px-6 pb-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Price and status */}
              <div className="flex flex-wrap justify-between items-center bg-gray-50 rounded-lg p-6">
                <div>
                  <span className="text-3xl font-bold text-custom-orange">
                    {formatPrice(property.price)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 mr-2">
                      Status:
                    </span>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        property.status === "available"
                          ? "bg-green-100 text-green-800"
                          : property.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {property.status === "available"
                        ? "Available"
                        : property.status === "pending"
                        ? "Pending"
                        : property.status === "rented"
                        ? "Rented"
                        : property.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 mr-2">
                      Available From:
                    </span>
                    <span className="text-gray-600">
                      {formatDate(property.available_from)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  Property Description
                </h2>
                <div className="prose max-w-none text-gray-700">
                  <p>{property.description}</p>
                </div>
              </div>

              {/* Property details */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  Property Details
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4">
                  <div>
                    <span className="block text-sm text-gray-500">
                      Property Type
                    </span>
                    <span className="block font-medium text-gray-900 capitalize">
                      {property.property_type || "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-500">
                      Bedrooms
                    </span>
                    <span className="block font-medium text-gray-900">
                      {property.bedrooms}
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-500">
                      Bathrooms
                    </span>
                    <span className="block font-medium text-gray-900">
                      {property.bathrooms}
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-500">
                      Square Footage
                    </span>
                    <span className="block font-medium text-gray-900">
                      {property.square_footage} sq ft
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-500">
                      Year Built
                    </span>
                    <span className="block font-medium text-gray-900">
                      {property.year_built || "Not specified"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Nearby amenities */}
              {property.nearby_amenities &&
                property.nearby_amenities.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">
                      Nearby Amenities
                    </h2>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
                      {property.nearby_amenities.map((amenity, index) => (
                        <li
                          key={index}
                          className="flex items-center text-gray-700"
                        >
                          <svg
                            className="w-5 h-5 text-custom-orange mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {amenity}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Amenities
                  </h2>
                  <ul className="space-y-3">
                    {property.amenities.map((amenity, index) => (
                      <li
                        key={index}
                        className="flex items-center text-gray-700"
                      >
                        <svg
                          className="w-5 h-5 text-custom-orange mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contact section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Interested in this property?
                </h2>
                <p className="text-gray-700 mb-4">
                  Contact us to schedule a viewing or apply for this property.
                </p>

                <div className="space-y-3">
                  <button className="w-full bg-custom-orange hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-md transition-colors duration-300">
                    Schedule a Viewing
                  </button>
                  <button className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-4 border border-gray-300 rounded-md transition-colors duration-300">
                    Apply For Property
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
