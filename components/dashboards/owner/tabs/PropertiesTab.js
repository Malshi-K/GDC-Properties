"use client";

import { useEffect } from "react";
import PropertyCard from "../property/PropertyCard";

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
  // Debug logs to inspect the incoming data
  useEffect(() => {
    console.log("PropertiesTab - Properties:", properties);
    console.log("PropertiesTab - Viewing Requests:", viewingRequests);
    console.log("PropertiesTab - Applications:", applications);
  }, [properties, viewingRequests, applications]);

  // Filter viewing requests for each property
  const getPropertyViewingRequests = (propertyId) => {
    const filteredRequests = viewingRequests.filter(
      (request) => request.property_id === propertyId
    );
    console.log(
      `Viewing requests for property ${propertyId}:`,
      filteredRequests
    );
    return filteredRequests;
  };

  // Filter applications for each property
  const getPropertyApplications = (propertyId) => {
    const filteredApplications = applications.filter(
      (application) => application.property_id === propertyId
    );
    console.log(
      `Applications for property ${propertyId}:`,
      filteredApplications
    );
    return filteredApplications;
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Properties</h2>
        <button
          onClick={onAddNew}
          className="bg-custom-red hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300 flex items-center"
        >
          <svg
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add New Property
        </button>
      </div>

      {loading || loading.viewings || loading.applications ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
        </div>
      ) : error ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-red-500">Error: {error}</p>
          <button
            onClick={onRefresh}
            className="inline-block mt-4 text-custom-red hover:text-red-700"
          >
            Try Again
          </button>
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">You haven't added any properties yet.</p>
          <button
            onClick={onAddNew}
            className="inline-block mt-4 text-custom-red hover:text-red-700"
          >
            Add Your First Property
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {properties.map((property) => {
            const propertyViewingRequests = getPropertyViewingRequests(
              property.id
            );
            const propertyApplications = getPropertyApplications(property.id);

            console.log(`Rendering PropertyCard for ${property.id}:`, {
              property,
              viewingRequests: propertyViewingRequests,
              applications: propertyApplications,
            });

            return (
              <PropertyCard
                key={property.id}
                property={property}
                viewingRequests={propertyViewingRequests}
                applications={propertyApplications}
                onEdit={() => onEdit(property.id)}
                onDelete={() => onDelete(property.id)}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
