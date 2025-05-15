"use client";

import { useState, useEffect } from "react";
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
  // Use only a single loading state from parent component
  // This eliminates the need for a separate localLoading state
  const [processedProperties, setProcessedProperties] = useState([]);
  const [processingError, setProcessingError] = useState(null);
  
  // Process properties data safely with try/catch
  // This is more efficient and won't cause unnecessary re-processing
  useEffect(() => {
    let isMounted = true; // Flag to avoid state updates after unmount
    
    const processData = () => {
      try {
        // No need to set loading state here since it's managed by parent
        
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
          }
          return;
        }
        
        // Process and combine data safely - only if data has changed
        if (isMounted) {
          // Process and combine data safely
          const processed = properties.map(property => {
            if (!property) return null;
            
            try {
              // Filter related data for this property with null checks
              const propertyId = property.id;
              
              // If the property already has these arrays, no need to reprocess
              if (Array.isArray(property.viewingRequests) && 
                  Array.isArray(property.applications)) {
                return property;
              }
              
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
          setProcessedProperties(processed);
          setProcessingError(null);
        }
      } catch (err) {
        console.error("Error in properties processing:", err);
        if (isMounted) {
          setProcessingError(err.message);
        }
      }
    };
    
    // Only process if we have properties data and we're not in a loading state
    // This prevents processing during loading states
    if (!loading && properties.length > 0) {
      processData();
    } else if (!loading && (!properties || properties.length === 0)) {
      // Make sure we clear properties if there are none
      setProcessedProperties([]);
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [properties, viewingRequests, applications, loading]);
  
  // REMOVED: Force end loading state timeout since loading is managed by parent

  // Render content based on loading state
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Properties</h2>
        <button
          onClick={onAddNew}
          className="bg-custom-red hover:bg-red-700 text-white font-medium py-2 px-3 sm:px-4 rounded-md transition-colors duration-300 flex items-center text-sm sm:text-base whitespace-nowrap"
          disabled={loading}
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

      {loading ? (
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