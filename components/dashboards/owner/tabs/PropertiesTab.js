"use client";

import { useState } from "react";
import PropertyCard from "../property/PropertyCard";
import PropertyDetails from "../property/PropertyDetails";
import { mockViewingRequests, mockRentalApplications } from "@/data/mockData";

export default function PropertiesTab({ 
  properties, 
  loading, 
  onEdit, 
  onDelete, 
  onAddNew, 
  onViewAllRequests, 
  onViewAllApplications 
}) {
  const [showPropertyDetails, setShowPropertyDetails] = useState(null);

  const getPropertyViewingRequests = (propertyId) => {
    return mockViewingRequests.filter(
      (request) => request.propertyId === propertyId
    );
  };

  const getPropertyApplications = (propertyId) => {
    return mockRentalApplications.filter(
      (application) => application.propertyId === propertyId
    );
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          My Properties
        </h2>
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

      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">
            You haven't added any properties yet.
          </p>
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
            const viewingRequests = getPropertyViewingRequests(property.id);
            const applications = getPropertyApplications(property.id);
            
            return (
              <div key={property.id}>
                <PropertyCard
                  property={property}
                  viewingRequests={viewingRequests}
                  applications={applications}
                  onEdit={() => onEdit(property.id)}
                  onDelete={() => onDelete(property.id)}
                  onShowDetails={() => setShowPropertyDetails(property.id)}
                  showDetails={showPropertyDetails === property.id}
                />
                
                {showPropertyDetails === property.id && (
                  <PropertyDetails
                    property={property}
                    viewingRequests={viewingRequests}
                    applications={applications}
                    onHideDetails={() => setShowPropertyDetails(null)}
                    onViewAllRequests={onViewAllRequests}
                    onViewAllApplications={onViewAllApplications}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}