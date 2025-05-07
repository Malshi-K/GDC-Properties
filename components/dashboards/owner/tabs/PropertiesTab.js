"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/data/mockData";
import { createClient } from "@supabase/supabase-js";
import PropertyCard from "../property/PropertyCard";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PropertiesTab({
  properties,
  loading,
  error,
  viewingRequests = [],
  applications = [],
  onEdit,
  onDelete,
  onAddNew,
  onRefresh,
}) {
  // Local state to manage component-level loading
  const [localLoading, setLocalLoading] = useState(true);
  const [processedProperties, setProcessedProperties] = useState([]);
  const [processingError, setProcessingError] = useState(null);
  
  // Process properties data safely with try/catch
  useEffect(() => {
    let isMounted = true; // Flag to avoid state updates after unmount
    
    const processData = () => {
      try {
        // Set initial loading state
        setLocalLoading(true);
        
        // Validate inputs to avoid TypeError
        if (!Array.isArray(properties)) {
          console.error("Properties is not an array:", properties);
          setProcessedProperties([]);
          if (isMounted) setProcessingError("Invalid properties data");
          return;
        }
        
        // If properties array is empty, just set empty result
        if (properties.length === 0) {
          if (isMounted) {
            setProcessedProperties([]);
            setLocalLoading(false);
          }
          return;
        }
        
        // Process and combine data safely
        const processed = properties.map(property => {
          if (!property) return null;
          
          try {
            // Filter related data for this property with null checks
            const propertyId = property.id;
            
            // Safely filter viewing requests - handle null values
            const propertyViewingRequests = Array.isArray(viewingRequests) 
              ? viewingRequests.filter(request => request && request.property_id === propertyId)
              : [];
            
            // Safely filter applications - handle null values
            const propertyApplications = Array.isArray(applications)
              ? applications.filter(application => application && application.property_id === propertyId)
              : [];
            
            // Return property with its related data
            return {
              ...property,
              viewingRequests: propertyViewingRequests,
              applications: propertyApplications
            };
          } catch (err) {
            console.error("Error processing property:", property, err);
            // Return property without related data on error
            return property;
          }
        }).filter(Boolean); // Remove any null values
        
        // Update state with processed data
        if (isMounted) {
          setProcessedProperties(processed);
          setProcessingError(null);
          setLocalLoading(false);
        }
      } catch (err) {
        console.error("Error in properties processing:", err);
        if (isMounted) {
          setProcessingError(err.message);
          setLocalLoading(false);
        }
      }
    };
    
    // Process data on properties change
    processData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [properties, viewingRequests, applications]);
  
  // Force end loading state after a timeout (failsafe)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localLoading) {
        console.log("Forcing end of loading state after timeout");
        setLocalLoading(false);
      }
    }, 5000); // 5 second maximum loading time
    
    return () => clearTimeout(timer);
  }, [localLoading]);
  
  // Determine if we should still be in loading state
  const isLoading = loading === true || localLoading;
  
  // Render content based on loading state
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Properties</h2>
        <button
          onClick={onAddNew}
          className="bg-custom-red hover:bg-red-700 text-white font-medium py-2 px-3 sm:px-4 rounded-md transition-colors duration-300 flex items-center text-sm sm:text-base whitespace-nowrap"
          disabled={isLoading}
        >
          <svg
            className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span>Add New Property</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-8 sm:my-12">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-t-2 border-b-2 border-custom-red"></div>
        </div>
      ) : error || processingError ? (
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 text-center">
          <p className="text-red-500 text-sm sm:text-base">Error: {error || processingError}</p>
          <button
            onClick={onRefresh}
            className="inline-block mt-3 sm:mt-4 text-custom-red hover:text-red-700 text-sm sm:text-base"
          >
            Try Again
          </button>
        </div>
      ) : processedProperties.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 text-center">
          <p className="text-gray-500 text-sm sm:text-base">You haven't added any properties yet.</p>
          <button
            onClick={onAddNew}
            className="inline-block mt-3 sm:mt-4 text-custom-red hover:text-red-700 text-sm sm:text-base"
          >
            Add Your First Property
          </button>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {processedProperties.map((property) => (
            <PropertyCard
              key={property?.id || `property-${Math.random()}`}
              property={property}
              viewingRequests={property?.viewingRequests || []}
              applications={property?.applications || []}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}