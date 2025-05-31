"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useImageLoader } from "@/lib/services/imageLoaderService";

export default function ApplicationsTab({
  applications = [],
  loading = false,
  error = null,
  onStatusUpdate,
  onRefresh,
}) {
  const [actionInProgress, setActionInProgress] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  // Use the same image loading service as Properties tab
  const { loadPropertyImage, propertyImages, isPropertyImageLoading } = useImageLoader();

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('ApplicationsTab received:', {
      applicationsCount: applications.length,
      loading,
      error,
      applicationsDetailed: applications.map(app => ({
        id: app.id,
        property_id: app.property_id,
        properties: app.properties,
        hasPropertyData: !!app.properties,
        propertyImages: app.properties?.images,
        propertyOwnerId: app.properties?.owner_id
      }))
    });
  }, [applications, loading, error]);

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

  // Enhanced data processing for user information based on actual DB structure
  const processedApplications = useMemo(() => {
    return applications.map(application => {
      return {
        ...application,
        // Use the data that's actually available in your DB
        user_name: application.user_id, // Since you don't have user names in the table
        user_email: 'Not available', // Not in your DB structure
        user_phone: application.user_phone || 'Not provided',
        property_title: application.properties?.title || application.property_title || 'Property'
      };
    });
  }, [applications]);

  // Simplified loading logic
  const isLoading = loading;

  if (isLoading && applications.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Rental Applications</h2>
          
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            disabled={isLoading}
          >
            <svg className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoading ? 'Loading...' : 'Refresh'}
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Rental Applications</h2>
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
  const filteredApplications = processedApplications.filter(
    (app) => app.status !== "withdrawn"
  );

  return (
    <div className="max-w-6xl mx-auto text-gray-600">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rental Applications</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredApplications.length} active application{filteredApplications.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <button
          onClick={onRefresh}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50"
          disabled={isLoading}
        >
          <svg className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isLoading ? 'Loading...' : 'Refresh'}
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">No applications</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have any rental applications at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => {
            return (
              <ApplicationCard
                key={application.id}
                application={application}
                onStatusUpdate={handleStatusUpdate}
                onRequestMoreInfo={handleRequestMoreInfo}
                actionInProgress={actionInProgress}
                mounted={mounted}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Separate component for each application card (similar to PropertyCard and ViewingRequestCard)
function ApplicationCard({ application, onStatusUpdate, onRequestMoreInfo, actionInProgress, mounted }) {
  const { loadPropertyImage, propertyImages, isPropertyImageLoading } = useImageLoader();
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef(null);

  // Get the property image URL and loading state
  const propertyImage = propertyImages[application.property_id];
  const isImageLoading = isPropertyImageLoading(application.property_id);

  // Reset image error when property changes
  useEffect(() => {
    setImageError(false);
  }, [application.property_id]);

  // Load property image with intersection observer for performance (EXACT SAME AS PROPERTYCARD)
  useEffect(() => {
    if (!mounted || !cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            application.property_id &&
            application.properties?.images?.length > 0 &&
            !propertyImages[application.property_id] &&
            !isImageLoading
          ) {
            loadPropertyImage(
              application.property_id, 
              application.properties.owner_id, 
              application.properties.images[0]
            );
          }
        });
      },
      {
        rootMargin: "200px",
        threshold: 0.1,
      }
    );

    observer.observe(cardRef.current);

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [
    mounted,
    application.property_id,
    application.properties?.images,
    application.properties?.owner_id,
    loadPropertyImage,
    propertyImages,
    isImageLoading,
  ]);

  const statusBadge = getStatusBadge(application.status);

  return (
    <div
      ref={cardRef}
      className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-300"
    >
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Property Image Section - EXACT SAME LOGIC AS PROPERTYCARD */}
          <div className="md:w-1/3 h-64 md:h-auto bg-gray-100 relative">
            {isImageLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-custom-red"></div>
              </div>
            ) : propertyImage && !imageError ? (
              <div className="relative w-full h-full min-h-[16rem]">
                <Image
                  src={propertyImage}
                  alt={application.property_title || "Property"}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                  onError={() => setImageError(true)}
                  priority={false}
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                <div className="text-center">
                  <svg
                    className="h-16 w-16 text-gray-400 mx-auto mb-2"
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
                  <p className="text-gray-500 text-sm">
                    {application.properties?.images?.length ? "Image not available" : "No image"}
                  </p>
                </div>
              </div>
            )}

            {/* Property type overlay if available */}
            {application.properties?.property_type && (
              <div className="absolute top-2 left-2">
                <span className="bg-custom-red text-white px-2 py-1 rounded text-xs font-medium">
                  {application.properties.property_type.charAt(0).toUpperCase() + application.properties.property_type.slice(1)}
                </span>
              </div>
            )}
          </div>

          {/* Application Details */}
          <div className="md:w-2/3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  <Link
                    href={`/properties/${application.property_id}`}
                    className="hover:text-custom-red"
                  >
                    {application.property_title}
                  </Link>
                </h3>
                <p className="text-gray-600">
                  Application from {application.user_name}
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
                <p className="text-sm text-gray-500">Employment Status</p>
                <p className="font-medium text-gray-900">
                  {application.employment_status || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Annual Income</p>
                <p className="font-medium text-gray-900">
                  {application.income
                    ? `$${parseInt(application.income).toLocaleString()}`
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

            <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h4>

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
                    onClick={() => onRequestMoreInfo(application.id)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Request More Info
                  </button>
                  <button
                    onClick={() => onStatusUpdate(application.id, "approved")}
                    disabled={actionInProgress === application.id}
                    className="px-4 py-2 border border-green-500 rounded-md text-sm font-medium text-white bg-green-500 hover:bg-green-600 disabled:opacity-50"
                  >
                    {actionInProgress === application.id ? "Processing..." : "Approve"}
                  </button>
                  <button
                    onClick={() => onStatusUpdate(application.id, "rejected")}
                    disabled={actionInProgress === application.id}
                    className="px-4 py-2 border border-red-500 rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                  >
                    {actionInProgress === application.id ? "Processing..." : "Reject"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function for status badges (moved outside component for reuse)
function getStatusBadge(status) {
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
}