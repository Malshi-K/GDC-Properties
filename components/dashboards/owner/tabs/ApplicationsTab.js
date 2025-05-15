"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";

export default function ApplicationsTab({
  applications = [],
  loading = false,
  error = null,
  onStatusUpdate,
  onRefresh,
}) {
  const [actionInProgress, setActionInProgress] = useState(null);
  const [propertyImages, setPropertyImages] = useState({});
  const [imageLoading, setImageLoading] = useState(false); // Start as false until we know we need to load

  // Get unique property IDs from applications
  const propertyIds = useMemo(() => {
    const ids = new Set();
    applications.forEach((application) => {
      if (application.property_id) {
        ids.add(application.property_id);
      }
    });
    return Array.from(ids);
  }, [applications]);

  // Fetch property images in bulk - only if necessary
  useEffect(() => {
    // Skip if the parent is still loading data
    if (loading) return;
    
    // Skip if we have no properties to fetch
    if (propertyIds.length === 0) {
      return;
    }

    // Check which property IDs don't have images yet
    const missingPropertyIds = propertyIds.filter(id => !propertyImages[id]);
    
    // If all properties already have images, do nothing
    if (missingPropertyIds.length === 0) {
      return;
    }
    
    const fetchPropertyImages = async () => {
      try {
        setImageLoading(true);
        
        // Only fetch the missing property images
        const { data: propertiesData, error: propertiesError } = await supabase
          .from('properties')
          .select('id, images, owner_id')
          .in('id', missingPropertyIds);
          
        if (propertiesError) {
          console.error('Error fetching properties data:', propertiesError);
          setImageLoading(false);
          return;
        }
        
        // Process all properties in parallel
        const newPropertyImages = { ...propertyImages };
        const imagePromises = propertiesData.map(async (property) => {
          if (!property.images || property.images.length === 0) {
            // Store a placeholder for properties without images to avoid refetching
            newPropertyImages[property.id] = null;
            return;
          }
          
          try {
            // Get the first image from the property
            const firstImage = property.images[0];
            
            // Normalize the path
            const normalizedPath = firstImage.includes("/")
              ? firstImage
              : `${property.owner_id}/${firstImage}`;
              
            // Get signed URL for the image - with short expiry to avoid caching issues
            const { data: urlData, error: urlError } = await supabase.storage
              .from("property-images")
              .createSignedUrl(normalizedPath, 60 * 60); // 1 hour expiry
              
            if (urlError) {
              console.error(`Error getting signed URL for property ${property.id}:`, urlError);
              newPropertyImages[property.id] = null; // Store null to prevent refetching
              return;
            }
            
            // Store the URL
            newPropertyImages[property.id] = urlData.signedUrl;
          } catch (error) {
            console.error(`Error processing image for property ${property.id}:`, error);
            newPropertyImages[property.id] = null; // Store null to prevent refetching
          }
        });
        
        // Wait for all image promises to complete
        await Promise.allSettled(imagePromises);
        
        // Update state with all images at once
        setPropertyImages(newPropertyImages);
      } catch (error) {
        console.error('Error in bulk image loading:', error);
      } finally {
        setImageLoading(false);
      }
    };
    
    fetchPropertyImages();
  }, [propertyIds, propertyImages, loading]);

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

  // Handle application status update
  const handleStatusUpdate = async (applicationId, newStatus) => {
    try {
      setActionInProgress(applicationId);
      await onStatusUpdate(applicationId, newStatus);
      toast.success(`Application ${newStatus} successfully`);
    } catch (error) {
      console.error(`Error ${newStatus} application:`, error);
      toast.error(`Failed to ${newStatus} application`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle requesting more information
  const handleRequestMoreInfo = (applicationId) => {
    // This would open a modal to request more information
    toast.info("Feature coming soon: Request More Information");
  };

  // Simplified loading logic - only loading if parent data is loading or we're fetching images
  const isLoading = loading || imageLoading;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Rental Applications
          </h2>

          {/* Show refresh button even during loading for better UX */}
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            disabled={isLoading}
          >
            <svg
              className="h-4 w-4 mr-1"
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
        </div>
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Rental Applications
        </h2>
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          <p>Error: {error}</p>
        </div>
        <button
          onClick={onRefresh}
          className="text-custom-red hover:text-red-700 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  // Filter out withdrawn applications if needed
  const filteredApplications = applications.filter(
    (app) => app.status !== "withdrawn"
  );

  return (
    <div className="max-w-6xl mx-auto text-gray-600">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Rental Applications
        </h2>

        <button
          onClick={onRefresh}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        >
          <svg
            className="h-4 w-4 mr-1"
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
      </div>

      {filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No applications
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have any rental applications at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => {
            const statusBadge = getStatusBadge(application.status);
            return (
              <div
                key={application.id}
                className="bg-white rounded-lg shadow overflow-hidden border border-gray-200"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Property Image */}
                    <div className="w-full md:w-1/3 lg:w-1/4 h-52 md:h-auto">
                      {propertyImages[application.property_id] ? (
                        <div className="relative w-full h-52 md:h-40 lg:h-48 rounded-lg overflow-hidden">
                          <Image
                            src={propertyImages[application.property_id]}
                            alt={application.property_title || "Property Image"}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              e.target.src = "/placeholder-image.jpg";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-52 md:h-40 lg:h-48 flex items-center justify-center bg-gray-100 rounded-lg text-gray-400">
                          <svg
                            className="h-16 w-16"
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
                        </div>
                      )}
                    </div>

                    {/* Application Details */}
                    <div className="w-full md:w-2/3 lg:w-3/4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            <Link
                              href={`/properties/${application.property_id}`}
                              className="hover:text-custom-red"
                            >
                              {application.property_title || "Property"}
                            </Link>
                          </h3>
                          <p className="text-gray-600">
                            Application from{" "}
                            {application.user_name || application.user_id}
                          </p>
                        </div>
                        <div className="mt-2 sm:mt-0">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}
                          >
                            {statusBadge.text}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            Employment Status
                          </p>
                          <p className="font-medium text-gray-900">
                            {application.employment_status || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Annual Income</p>
                          <p className="font-medium text-gray-900">
                            {application.income
                              ? `$${parseInt(
                                  application.income
                                ).toLocaleString()}`
                              : "Not specified"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Credit Score</p>
                          <p className="font-medium text-gray-900">
                            {application.credit_score || "Not provided"}
                          </p>
                        </div>
                      </div>

                      {application.message && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-500">Message</p>
                          <p className="mt-1 bg-gray-50 p-3 rounded-md text-gray-700">
                            {application.message}
                          </p>
                        </div>
                      )}

                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Contact Information
                      </h4>

                      <div className="bg-gray-50 p-4 rounded-md mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium">
                              {application.user_email || "Not provided"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="font-medium">
                              {application.user_phone || "Not provided"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons based on current status */}
                      <div className="flex flex-wrap justify-end gap-2 mt-4">
                        {application.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                handleRequestMoreInfo(application.id)
                              }
                              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Request More Info
                            </button>
                            <button
                              onClick={() =>
                                handleStatusUpdate(application.id, "approved")
                              }
                              disabled={actionInProgress === application.id}
                              className="px-4 py-2 border border-green-500 rounded-md text-sm font-medium text-white bg-green-500 hover:bg-green-600 disabled:opacity-50"
                            >
                              {actionInProgress === application.id
                                ? "Processing..."
                                : "Approve"}
                            </button>
                            <button
                              onClick={() =>
                                handleStatusUpdate(application.id, "rejected")
                              }
                              disabled={actionInProgress === application.id}
                              className="px-4 py-2 border border-red-500 rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                            >
                              {actionInProgress === application.id
                                ? "Processing..."
                                : "Reject"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}