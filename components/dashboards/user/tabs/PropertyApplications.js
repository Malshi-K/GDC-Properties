// components/dashboards/user/tabs/PropertyApplications.js
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatPrice, formatDate } from "@/lib/utils/formatters";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import { useImageLoader } from "@/lib/services/imageLoaderService";

const EnhancedSuccessMessage = ({ type, application, onProceedToPayment }) => {
  const messageConfigs = {
    approved: {
      title: "Application Approved!",
      subtitle: "Congratulations! Your application has been approved.",
      description:
        "Complete the payment process to secure your rental and get your keys.",
      icon: (
        <div className="relative">
          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-custom-orange rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">!</span>
          </div>
        </div>
      ),
      bgGradient: "from-green-50 via-emerald-50 to-green-50",
      borderColor: "border-green-200",
      buttonBg:
        "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800",
      accentColor: "text-green-800",
    },
    payment_pending: {
      title: "Payment in Progress",
      subtitle: "Your payment is being processed securely.",
      description:
        "We'll notify you once the transaction is completed. This usually takes a few minutes.",
      icon: (
        <div className="relative">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <svg
              className="w-6 h-6 text-white animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          </div>
          <div className="absolute -top-1 -right-1">
            <div className="w-4 h-4 bg-custom-orange rounded-full animate-ping"></div>
            <div className="absolute top-0 w-4 h-4 bg-custom-orange rounded-full"></div>
          </div>
        </div>
      ),
      bgGradient: "from-blue-50 via-sky-50 to-blue-50",
      borderColor: "border-blue-200",
      accentColor: "text-blue-800",
    },
    completed: {
      title: "Welcome Home!",
      subtitle: "Payment completed successfully.",
      description:
        "Your rental application is complete. The property owner will contact you with move-in details.",
      icon: (
        <div className="relative">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
            <svg
              className="w-6 h-6 text-white"
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
          <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
            🎉
          </div>
        </div>
      ),
      bgGradient: "from-emerald-50 via-green-50 to-emerald-50",
      borderColor: "border-emerald-200",
      accentColor: "text-emerald-800",
    },
  };

  const config = messageConfigs[type];
  if (!config) return null;

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-r ${config.bgGradient} border-l-4 ${config.borderColor} shadow-lg rounded-lg`}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, currentColor 2px, transparent 2px), radial-gradient(circle at 80% 50%, currentColor 2px, transparent 2px)`,
            backgroundSize: "40px 40px",
          }}
        ></div>
      </div>

      <div className="relative p-6">
        <div className="flex items-start space-x-4">
          {/* Enhanced Icon */}
          <div className="flex-shrink-0">{config.icon}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className={`text-lg font-bold ${config.accentColor}`}>
                {config.title}
              </h3>
              {type === "completed" && (
                <div className="flex space-x-1">
                  <span className="animate-bounce delay-0">✨</span>
                  <span className="animate-bounce delay-100">🏠</span>
                  <span className="animate-bounce delay-200">🔑</span>
                </div>
              )}
            </div>

            <p className={`text-sm font-medium ${config.accentColor} mb-2`}>
              {config.subtitle}
            </p>

            <p className="text-sm text-gray-700 leading-relaxed">
              {config.description}
            </p>

            {/* Action Button for Approved Applications */}
            {type === "approved" && (
              <div className="mt-4 flex items-center space-x-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onProceedToPayment(application.id);
                  }}
                  className={`${config.buttonBg} text-white px-6 py-3 rounded-lg font-semibold text-sm shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
                >
                  <span className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span>Proceed to Payment</span>
                  </span>
                </button>

                <div className="text-xs text-gray-600 bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full">
                  Secure checkout with SSL encryption
                </div>
              </div>
            )}

            {/* Progress indicator for payment pending */}
            {type === "payment_pending" && (
              <div className="mt-4">
                <div className="flex items-center space-x-2 text-xs text-gray-600 mb-2">
                  <span>Processing payment</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce delay-100"></div>
                    <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-custom-orange h-2 rounded-full animate-pulse"
                    style={{ width: "65%" }}
                  ></div>
                </div>
              </div>
            )}

            {/* Completion celebration */}
            {type === "completed" && (
              <div className="mt-4 p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-emerald-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-emerald-800">
                      Rental Agreement Active
                    </span>
                  </div>
                  <div className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                    Payment Verified ✓
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/20 to-transparent rounded-bl-full"></div>
    </div>
  );
};

const PropertyApplications = ({
  applications = [],
  setApplications,
  loading = false,
  onRefresh,
}) => {
  const router = useRouter();
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [expandedApplication, setExpandedApplication] = useState(null);
  const {
    propertyImages,
    loadPropertyImage,
    isPropertyImageLoading,
    preloadPropertiesImages,
  } = useImageLoader();

  // Enhanced applications data - add property info from joined data
  const enhancedApplications = useMemo(() => {
    if (!Array.isArray(applications)) return [];

    return applications.map((application) => ({
      ...application,
      property_title:
        application.properties?.title ||
        application.property_title ||
        "Unknown Property",
      property_location:
        application.properties?.location ||
        application.property_location ||
        "Unknown Location",
      property_price:
        application.properties?.price || application.property_price || 0,
      property_images:
        application.properties?.images || application.property_images || [],
    }));
  }, [applications]);

  // Properties data for image loading
  const propertiesForImageLoading = useMemo(() => {
    if (!Array.isArray(enhancedApplications)) return [];

    return enhancedApplications
      .filter(
        (application) =>
          application.property_id &&
          (application.properties || application.property_images)
      )
      .map((application) => ({
        id: application.property_id,
        owner_id:
          application.properties?.owner_id || application.property_owner_id,
        images:
          application.properties?.images || application.property_images || [],
        title: application.property_title,
      }))
      .filter(
        (property) =>
          property.owner_id && property.images && property.images.length > 0
      );
  }, [enhancedApplications]);

  // Load property images
  useEffect(() => {
    if (!loading && propertiesForImageLoading.length > 0) {
      propertiesForImageLoading.forEach((property) => {
        if (
          !propertyImages[property.id] &&
          !isPropertyImageLoading(property.id)
        ) {
          loadPropertyImage(property.id, property.owner_id, property.images[0]);
        }
      });
    }
  }, [
    loading,
    propertiesForImageLoading,
    propertyImages,
    isPropertyImageLoading,
    loadPropertyImage,
  ]);

  // Enhanced status badge that includes payment status
  const getStatusBadge = (status, paymentStatus) => {
    // Handle payment-specific statuses
    if (status === "payment_pending") {
      return {
        className: "bg-gray-100 text-gray-800",
        text: "Payment Pending",
      };
    }

    if (status === "completed") {
      return {
        className: "bg-green-100 text-green-800",
        text: "Completed",
      };
    }

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
          className: "bg-orange-100 text-orange-800",
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

  // Handle payment navigation
  const handleProceedToPayment = (applicationId) => {
    router.push(`/payment/${applicationId}`);
  };

  // Toggle expanded view
  const toggleExpand = (applicationId) => {
    setExpandedApplication(
      expandedApplication === applicationId ? null : applicationId
    );
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

      if (setApplications) {
        setApplications(
          applications.map((application) =>
            application.id === applicationId
              ? { ...application, status: "withdrawn" }
              : application
          )
        );
      }

      if (onRefresh) onRefresh();
      toast.success("Application withdrawn successfully");
    } catch (error) {
      console.error("Error withdrawing application:", error);
      toast.error("Failed to withdraw application");
    } finally {
      setWithdrawingId(null);
    }
  };

  const someImagesLoading = useMemo(() => {
    return propertiesForImageLoading.some((property) =>
      isPropertyImageLoading(property.id)
    );
  }, [propertiesForImageLoading, isPropertyImageLoading]);

  const isLoading = loading || someImagesLoading;

  if (
    isLoading &&
    (!enhancedApplications || enhancedApplications.length === 0)
  ) {
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
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-orange disabled:opacity-50"
            >
              <svg
                className={`-ml-0.5 mr-2 h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-orange"></div>
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
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-orange disabled:opacity-50"
          >
            <svg
              className={`-ml-0.5 mr-2 h-4 w-4 ${
                loading ? "animate-spin" : ""
              }`}
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
            <svg
              className="h-12 w-12 text-gray-400 mb-4"
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
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No applications
            </h3>
            <p className="text-gray-500 mb-4">
              You haven't applied for any properties yet.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-orange hover:bg-orange-700"
            >
              Browse Properties
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {enhancedApplications.map((application) => {
            const statusBadge = getStatusBadge(
              application.status,
              application.payment_status
            );
            const isExpanded = expandedApplication === application.id;
            const propertyImage = propertyImages[application.property_id];
            const imageLoading = isPropertyImageLoading(
              application.property_id
            );

            return (
              <div
                key={application.id}
                className="bg-white shadow rounded-lg overflow-hidden border border-gray-200"
              >
                {/* Payment Success/Pending/Approved Banners */}
                {application.status === "approved" &&
                  application.payment_status !== "completed" && (
                    <EnhancedSuccessMessage
                      type="approved"
                      application={application}
                      onProceedToPayment={handleProceedToPayment}
                    />
                  )}

                {application.status === "payment_pending" && (
                  <EnhancedSuccessMessage
                    type="payment_pending"
                    application={application}
                  />
                )}

                {application.status === "completed" &&
                  application.payment_status === "completed" && (
                    <EnhancedSuccessMessage
                      type="completed"
                      application={application}
                    />
                  )}

                {/* Compact View */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                  onClick={() => toggleExpand(application.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                      <div className="h-12 w-12 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                        {imageLoading ? (
                          <div className="flex items-center justify-center h-full w-full">
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-custom-orange"></div>
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

                      {/* Payment button for approved applications */}
                      {application.status === "approved" &&
                        application.payment_status !== "completed" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProceedToPayment(application.id);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                          >
                            Pay Now
                          </button>
                        )}

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
                        {/* Property Image */}
                        <div className="w-full md:w-1/3 h-48 md:h-auto rounded-lg overflow-hidden bg-gray-100">
                          {imageLoading ? (
                            <div className="w-full h-48 md:h-64 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-orange"></div>
                            </div>
                          ) : propertyImage ? (
                            <div className="relative w-full h-48 md:h-64">
                              <Image
                                src={propertyImage}
                                alt={
                                  application.property_title || "Property Image"
                                }
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
                                className="hover:text-custom-orange"
                              >
                                {application.property_title}
                              </Link>
                            </h3>
                            <p className="text-gray-600 mb-2">
                              {application.property_location}
                            </p>
                            <p className="text-custom-orange font-bold">
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

                          {/* Payment Status Section */}
                          {application.payment_status &&
                            application.payment_status !== "not_required" && (
                              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">
                                      Payment Status
                                    </p>
                                    <p className="font-medium">
                                      {application.payment_status ===
                                      "completed"
                                        ? "Payment Completed"
                                        : application.payment_status ===
                                          "pending"
                                        ? "Payment Pending"
                                        : application.payment_status
                                            .charAt(0)
                                            .toUpperCase() +
                                          application.payment_status.slice(1)}
                                    </p>
                                  </div>
                                  {application.payment_status ===
                                    "completed" && (
                                    <div className="text-green-600">
                                      <svg
                                        className="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Action buttons */}
                          <div className="flex flex-wrap justify-end gap-2 mt-4">
                            <Link
                              href={`/properties/${application.property_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="px-4 py-2 border border-custom-orange text-custom-orange rounded-md text-sm font-medium bg-white hover:bg-orange-50"
                            >
                              View Property
                            </Link>

                            {/* Payment button for approved applications */}
                            {application.status === "approved" &&
                              application.payment_status !== "completed" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleProceedToPayment(application.id);
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                                >
                                  Pay Now
                                </button>
                              )}

                            {/* Show withdraw button only for pending applications */}
                            {application.status === "pending" && (
                              <button
                                onClick={(e) =>
                                  handleWithdraw(application.id, e)
                                }
                                disabled={withdrawingId === application.id}
                                className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50 disabled:opacity-50"
                              >
                                {withdrawingId === application.id
                                  ? "Withdrawing..."
                                  : "Withdraw"}
                              </button>
                            )}

                            {/* Show completion status for completed applications */}
                            {application.status === "completed" && (
                              <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                                ✓ Rental Complete
                              </div>
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
