// components/dashboards/user/PropertyApplications.js
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice, formatDate } from "@/lib/utils/formatters";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import { useImageLoader } from "@/lib/services/imageLoaderService"; // NEW: Import useImageLoader

const PropertyApplications = ({
  applications = [],
  setApplications,
  loading = false,
  onRefresh, // Add onRefresh prop for triggering data refresh
}) => {
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [expandedApplication, setExpandedApplication] = useState(null);
  const { propertyImages, loadPropertyImage, isPropertyImageLoading, preloadPropertiesImages } = useImageLoader(); // NEW: Use imageLoader

  // Enhanced applications data - add property info from joined data
  const enhancedApplications = useMemo(() => {
    if (!Array.isArray(applications)) return [];
    
    return applications.map(application => ({
      ...application,
      // Handle both direct property data and nested property object
      property_title: application.properties?.title || application.property_title || 'Unknown Property',
      property_location: application.properties?.location || application.property_location || 'Unknown Location',
      property_price: application.properties?.price || application.property_price || 0,
      property_images: application.properties?.images || application.property_images || []
    }));
  }, [applications]);

  // NEW: Enhanced properties data for image loading - extract properties from applications
  const propertiesForImageLoading = useMemo(() => {
    if (!Array.isArray(enhancedApplications)) return [];
    
    return enhancedApplications
      .filter(application => application.property_id && (application.properties || application.property_images))
      .map(application => ({
        id: application.property_id,
        owner_id: application.properties?.owner_id || application.property_owner_id,
        images: application.properties?.images || application.property_images || [],
        title: application.property_title
      }))
      .filter(property => property.owner_id && property.images && property.images.length > 0);
  }, [enhancedApplications]);

  // NEW: Load property images using the imageLoader service
  useEffect(() => {
    if (!loading && propertiesForImageLoading.length > 0) {
      console.log('🖼️ Loading images for application properties:', propertiesForImageLoading.map(p => p.id));
      
      // Load individual images for properties that need them
      propertiesForImageLoading.forEach(property => {
        if (!propertyImages[property.id] && !isPropertyImageLoading(property.id)) {
          loadPropertyImage(property.id, property.owner_id, property.images[0]);
        }
      });
      
      // Optional: Preload remaining images in batches for better UX
      const unloadedProperties = propertiesForImageLoading.filter(
        property => !propertyImages[property.id] && !isPropertyImageLoading(property.id)
      );
      
      if (unloadedProperties.length > 0) {
        // Small delay to avoid overwhelming the system
        setTimeout(() => {
          preloadPropertiesImages(unloadedProperties);
        }, 100);
      }
    }
  }, [
    loading,
    propertiesForImageLoading,
    propertyImages,
    isPropertyImageLoading,
    loadPropertyImage,
    preloadPropertiesImages
  ]);

  // NEW: Check if any images are still loading
  const someImagesLoading = useMemo(() => {
    return propertiesForImageLoading.some(property => isPropertyImageLoading(property.id));
  }, [propertiesForImageLoading, isPropertyImageLoading]);

  // Get the appropriate status badge based on the status
  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return {
          className: "bg-green-100 text-green-800",
          text: "Approved",
        };
      case "pending":
        return {
          className: "bg-yellow-100 text-yellow-800",
          text: "Pending",
        };
      case "rejected":
        return {
          className: "bg-red-100 text-red-800",
          text: "Rejected",
        };
      case "withdrawn":
        return {
          className: "bg-gray-100 text-gray-800",
          text: "Withdrawn",
        };
      default:
        return {
          className: "bg-gray-100 text-gray-800",
          text: status.charAt(0).toUpperCase() + status.slice(1),
        };
    }
  };

  // Toggle expanded view for an application
  const toggleExpand = (applicationId) => {
    if (expandedApplication === applicationId) {
      setExpandedApplication(null);
    } else {
      setExpandedApplication(applicationId);
    }
  };

  // Handle application withdrawal
  const handleWithdraw = async (applicationId, e) => {
    if (e) e.stopPropagation();

    try {
      setWithdrawingId(applicationId);

      const { error } = await supabase
        .from("rental_applications")
        .update({ status: "withdrawn", updated_at: new Date().toISOString() })
        .eq("id", applicationId);

      if (error) throw error;

      // Update the local state if setApplications is provided
      if (setApplications) {
        setApplications(
          applications.map((application) =>
            application.id === applicationId
              ? { ...application, status: "withdrawn" }
              : application
          )
        );
      }

      // Call onRefresh if provided to refresh data from global context
      if (onRefresh) {
        onRefresh();
      }

      toast.success("Application withdrawn successfully");
    } catch (error) {
      console.error("Error withdrawing application:", error);
      toast.error("Failed to withdraw application");
    } finally {
      setWithdrawingId(null);
    }
  };

  // Handle editing an application
  const handleEditApplication = (applicationId, e) => {
    if (e) e.stopPropagation();

    // This would navigate to an edit page or open a modal
    // For now we'll just show a toast
    toast.info("Feature coming soon: Edit Application");
  };

  // NEW: Updated loading state - combines parent loading and image loading
  const isLoading = loading || someImagesLoading;

  if (isLoading && (!enhancedApplications || enhancedApplications.length === 0)) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            My Property Applications
          </h2>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-red disabled:opacity-50"
            >
              <svg
                className={`-ml-0.5 mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          )}
        </div>
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto text-gray-600">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          My Property Applications
        </h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-red disabled:opacity-50"
          >
            <svg
              className={`-ml-0.5 mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        )}
      </div>

      {!enhancedApplications || enhancedApplications.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <svg
                className="h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No applications
            </h3>
            <p className="text-gray-500 mb-4">
              You haven't applied for any properties yet.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-red hover:bg-red-700"
            >
              Browse Properties
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {enhancedApplications.map((application) => {
            const statusBadge = getStatusBadge(application.status);
            const isExpanded = expandedApplication === application.id;
            
            // NEW: Get property image and loading state from imageLoader
            const propertyImage = propertyImages[application.property_id];
            const imageLoading = isPropertyImageLoading(application.property_id);

            return (
              <div
                key={application.id}
                className="bg-white shadow rounded-lg overflow-hidden border border-gray-200"
              >
                {/* Compact View - Always visible */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                  onClick={() => toggleExpand(application.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                      <div className="h-12 w-12 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                        {/* NEW: Enhanced image handling with loading state */}
                        {imageLoading ? (
                          <div className="flex items-center justify-center h-full w-full">
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-custom-red"></div>
                          </div>
                        ) : propertyImage ? (
                          <div className="relative h-full w-full">
                            <Image
                              src={propertyImage}
                              alt={application.property_title || "Property"}
                              fill
                              className="object-cover"
                              sizes="48px"
                              priority={false}
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full w-full">
                            <svg
                              className="h-6 w-6 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {application.property_title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Applied on{" "}
                          {formatDate
                            ? formatDate(application.created_at)
                            : new Date(
                                application.created_at
                              ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}
                      >
                        {statusBadge.text}
                      </span>
                      <svg
                        className={`h-5 w-5 text-gray-400 transform transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : "rotate-0"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <div className="p-4">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Property Image - Larger in expanded view */}
                        <div className="w-full md:w-1/3 h-48 md:h-auto rounded-lg overflow-hidden bg-gray-100">
                          {/* NEW: Enhanced large image handling with loading state */}
                          {imageLoading ? (
                            <div className="w-full h-48 md:h-64 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
                            </div>
                          ) : propertyImage ? (
                            <div className="relative w-full h-48 md:h-64">
                              <Image
                                src={propertyImage}
                                alt={application.property_title || "Property Image"}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 33vw"
                                priority={false}
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-48 md:h-64 flex items-center justify-center bg-gray-200 text-gray-400">
                              <div className="text-center">
                                <svg
                                  className="h-12 w-12 mx-auto mb-2"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1"
                                    d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1"
                                    d="M9 22V12h6v10"
                                  />
                                </svg>
                                <p className="text-sm">No image available</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Application Details */}
                        <div className="w-full md:w-2/3">
                          <div className="mb-4">
                            <h3 className="text-xl font-semibold text-gray-900 mb-1">
                              <Link
                                href={`/properties/${application.property_id}`}
                                className="hover:text-custom-red"
                              >
                                {application.property_title}
                              </Link>
                            </h3>
                            <p className="text-gray-600 mb-2">
                              {application.property_location}
                            </p>
                            <p className="text-custom-red font-bold">
                              {typeof formatPrice === "function"
                                ? formatPrice(application.property_price)
                                : `$${
                                    application.property_price?.toLocaleString() ||
                                    "Price not available"
                                  }`}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500">
                                Employment Status
                              </p>
                              <p className="font-medium">
                                {application.employment_status}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">
                                Annual Income
                              </p>
                              <p className="font-medium">
                                ${parseInt(application.income).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">
                                Credit Score
                              </p>
                              <p className="font-medium">
                                {application.credit_score}
                              </p>
                            </div>
                          </div>

                          {application.message && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-500">
                                Your Message
                              </p>
                              <p className="mt-1 p-3 bg-gray-50 rounded-md">
                                {application.message}
                              </p>
                            </div>
                          )}

                          <div className="border-t border-gray-100 pt-4 mt-4">
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-500">
                                Application Timeline
                              </p>
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center">
                                  <div className="w-8 flex-shrink-0 text-gray-400">
                                    <svg
                                      className="h-5 w-5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">
                                      Applied on{" "}
                                      {formatDate
                                        ? formatDate(application.created_at)
                                        : new Date(
                                            application.created_at
                                          ).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                {application.updated_at &&
                                  application.updated_at !==
                                    application.created_at && (
                                    <div className="flex items-center">
                                      <div className="w-8 flex-shrink-0 text-gray-400">
                                        <svg
                                          className="h-5 w-5"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                          />
                                        </svg>
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-600">
                                          Last updated on{" "}
                                          {formatDate
                                            ? formatDate(application.updated_at)
                                            : new Date(
                                                application.updated_at
                                              ).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap justify-end gap-2 mt-4">
                            <Link
                              href={`/properties/${application.property_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="px-4 py-2 border border-custom-red text-custom-red rounded-md text-sm font-medium bg-white hover:bg-red-50"
                            >
                              View Property
                            </Link>

                            {application.status === "pending" && (
                              <>
                                <button
                                  onClick={(e) =>
                                    handleEditApplication(application.id, e)
                                  }
                                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  Edit Application
                                </button>
                                <button
                                  onClick={(e) =>
                                    handleWithdraw(application.id, e)
                                  }
                                  disabled={withdrawingId === application.id}
                                  className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                                >
                                  {withdrawingId === application.id
                                    ? "Withdrawing..."
                                    : "Withdraw"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PropertyApplications;