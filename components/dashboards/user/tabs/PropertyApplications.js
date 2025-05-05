// components/dashboards/user/PropertyApplications.js
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice, formatDate } from "@/utils/formatters";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { toast } from "react-hot-toast";

// Initialize Supabase client for storage
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PropertyApplications = ({
  applications = [],
  setApplications,
  loading = false,
}) => {
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [propertyImages, setPropertyImages] = useState({});
  const [expandedApplication, setExpandedApplication] = useState(null);

  // Fetch property images for all applications
  useEffect(() => {
    const fetchPropertyImages = async () => {
      const newPropertyImages = { ...propertyImages };
      
      for (const application of applications) {
        if (!application.property_id || newPropertyImages[application.property_id]) continue;
        
        try {
          // First, get the property data to access the images array
          const { data: propertyData, error: propertyError } = await supabase
            .from('properties')
            .select('images, owner_id')
            .eq('id', application.property_id)
            .single();
            
          if (propertyError || !propertyData || !propertyData.images || propertyData.images.length === 0) {
            console.error('Error fetching property images or no images available:', propertyError);
            continue;
          }
          
          // Get the first image from the property
          const firstImage = propertyData.images[0];
          
          // Normalize the path
          const normalizedPath = firstImage.includes("/")
            ? firstImage
            : `${propertyData.owner_id}/${firstImage}`;
            
          // Get signed URL for the image
          const { data: urlData, error: urlError } = await supabaseClient.storage
            .from("property-images")
            .createSignedUrl(normalizedPath, 60 * 60); // 1 hour expiry
            
          if (urlError) {
            console.error("Error getting signed URL:", urlError);
            continue;
          }
          
          newPropertyImages[application.property_id] = urlData.signedUrl;
        } catch (error) {
          console.error('Error fetching property image:', error);
        }
      }
      
      setPropertyImages(newPropertyImages);
    };
    
    if (applications.length > 0) {
      fetchPropertyImages();
    }
  }, [applications]);

  // Get the appropriate status badge based on the status
  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return {
          className: "bg-green-100 text-green-800",
          text: "Approved"
        };
      case "pending":
        return {
          className: "bg-yellow-100 text-yellow-800",
          text: "Pending"
        };
      case "rejected":
        return {
          className: "bg-red-100 text-red-800",
          text: "Rejected"
        };
      case "withdrawn":
        return {
          className: "bg-gray-100 text-gray-800",
          text: "Withdrawn"
        };
      default:
        return {
          className: "bg-gray-100 text-gray-800",
          text: status.charAt(0).toUpperCase() + status.slice(1)
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

      // Update the local state
      setApplications(
        applications.map((application) =>
          application.id === applicationId
            ? { ...application, status: "withdrawn" }
            : application
        )
      );

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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          My Property Applications
        </h2>
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto text-gray-600">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        My Property Applications
      </h2>

      {!applications || applications.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No applications</h3>
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
          {applications.map((application) => {
            const statusBadge = getStatusBadge(application.status);
            const isExpanded = expandedApplication === application.id;
            
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
                        {propertyImages[application.property_id] ? (
                          <div className="relative h-full w-full">
                            <Image 
                              src={propertyImages[application.property_id]}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full w-full">
                            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{application.property_title || 'Property Application'}</h3>
                        <p className="text-sm text-gray-500">
                          Applied on {formatDate ? formatDate(application.created_at) : new Date(application.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                        {statusBadge.text}
                      </span>
                      <svg 
                        className={`h-5 w-5 text-gray-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
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
                          {propertyImages[application.property_id] ? (
                            <div className="relative w-full h-48 md:h-64">
                              <Image 
                                src={propertyImages[application.property_id]}
                                alt={application.property_title || 'Property Image'}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-48 md:h-64 flex items-center justify-center bg-gray-200 text-gray-400">
                              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                                  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                                  d="M9 22V12h6v10" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {/* Application Details */}
                        <div className="w-full md:w-2/3">
                          <div className="mb-4">
                            <h3 className="text-xl font-semibold text-gray-900 mb-1">
                              <Link href={`/properties/${application.property_id}`} className="hover:text-custom-red">
                                {application.property_title}
                              </Link>
                            </h3>
                            <p className="text-gray-600 mb-2">
                              {application.property_location}
                            </p>
                            <p className="text-custom-red font-bold">
                              {typeof formatPrice === 'function' 
                                ? formatPrice(application.property_price) 
                                : `$${application.property_price?.toLocaleString() || 'Price not available'}`}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Employment Status</p>
                              <p className="font-medium">{application.employment_status}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Annual Income</p>
                              <p className="font-medium">${parseInt(application.income).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Credit Score</p>
                              <p className="font-medium">{application.credit_score}</p>
                            </div>
                          </div>
                          
                          {application.message && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-500">Your Message</p>
                              <p className="mt-1 p-3 bg-gray-50 rounded-md">{application.message}</p>
                            </div>
                          )}
                          
                          <div className="border-t border-gray-100 pt-4 mt-4">
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-500">Application Timeline</p>
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center">
                                  <div className="w-8 flex-shrink-0 text-gray-400">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Applied on {formatDate ? formatDate(application.created_at) : new Date(application.created_at).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                {application.updated_at && application.updated_at !== application.created_at && (
                                  <div className="flex items-center">
                                    <div className="w-8 flex-shrink-0 text-gray-400">
                                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Last updated on {formatDate ? formatDate(application.updated_at) : new Date(application.updated_at).toLocaleDateString()}</p>
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
                                  onClick={(e) => handleEditApplication(application.id, e)}
                                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  Edit Application
                                </button>
                                <button
                                  onClick={(e) => handleWithdraw(application.id, e)}
                                  disabled={withdrawingId === application.id}
                                  className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                                >
                                  {withdrawingId === application.id ? "Withdrawing..." : "Withdraw"}
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