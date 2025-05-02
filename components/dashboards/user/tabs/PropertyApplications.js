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

  // Get the appropriate status color based on the status
  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "withdrawn":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Handle application withdrawal
  const handleWithdraw = async (applicationId) => {
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
  const handleEditApplication = (applicationId) => {
    // This would navigate to an edit page or open a modal
    // For now we'll just show a toast
    toast.info("Feature coming soon: Edit Application");
  };

  if (loading) {
    return (
      <div className="flex justify-center my-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        My Property Applications
      </h2>

      {!applications || applications.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">
            You haven't applied for any properties yet.
          </p>
          <Link
            href="/search"
            className="inline-block mt-4 text-custom-red hover:text-red-700"
          >
            Browse Properties
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {applications.map((application) => (
            <div
              key={application.id}
              className="bg-white shadow rounded-lg overflow-hidden"
            >
              <div className="md:flex">
                <div className="md:flex-shrink-0 h-48 md:h-auto md:w-48 bg-gray-100 relative">
                  {propertyImages[application.property_id] ? (
                    <div className="w-full h-full relative">
                      <Image
                        src={propertyImages[application.property_id]}
                        alt={application.property_title || "Property Image"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                      <span>No Image</span>
                    </div>
                  )}
                </div>

                <div className="p-6 w-full">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-semibold text-custom-red mb-1">
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
                      <p className="text-custom-red font-bold mb-4">
                        {formatPrice(application.property_price)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        application.status
                      )}`}
                    >
                      {application.status.charAt(0).toUpperCase() +
                        application.status.slice(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
                    <div>
                      <p className="text-custom-yellow text-md font-medium">
                        Employment Status
                      </p>
                      <p className="text-gray-600">
                        {application.employment_status}
                      </p>
                    </div>
                    <div>
                      <p className="text-custom-yellow text-md font-medium">
                        Annual Income
                      </p>
                      <p className="text-gray-600">
                        ${parseInt(application.income).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-custom-yellow text-md font-medium">
                        Credit Score
                      </p>
                      <p className="text-gray-600">
                        {application.credit_score}
                      </p>
                    </div>
                  </div>

                  {application.message && (
                    <div className="mt-2">
                      <p className="text-custom-yellow text-md font-medium">
                        Your Message
                      </p>
                      <p className="text-gray-600 mt-1">
                        {application.message}
                      </p>
                    </div>
                  )}

                  <div className="border-t border-gray-200 mt-4 pt-4">
                    <div>
                      <p className="text-custom-yellow text-md font-medium">
                        Applied On
                      </p>
                      <p className="text-gray-600">
                        {formatDate(application.created_at)}
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3 mt-4">
                      {application.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              handleEditApplication(application.id)
                            }
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Edit Application
                          </button>
                          <button
                            onClick={() => handleWithdraw(application.id)}
                            disabled={withdrawingId === application.id}
                            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
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
          ))}
        </div>
      )}
    </>
  );
};

export default PropertyApplications;