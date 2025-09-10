"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RequestViewingModal from '../modals/RequestViewingModal';
import RentalApplicationModal from '../modals/RentalApplicationModal';

export default function PropertyDetailActions({ property }) {
  const { user, profile } = useAuth();
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  
  // Don't show action buttons to property owners for their own properties
  const isOwner = user && property.owner_id === user.id;
  
  if (isOwner) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
        <p className="text-yellow-800 font-medium">
          This is your property listing
        </p>
        <p className="text-yellow-700 text-sm mt-1">
          You can manage this property from your dashboard
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Interested in this property?
      </h3>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowViewingModal(true)}
          className="bg-custom-orange hover:bg-orange-700 text-white font-medium py-2 px-4 rounded transition-colors duration-300 flex-1 flex justify-center items-center"
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Request Viewing
        </button>
        
        <button
          onClick={() => setShowApplicationModal(true)}
          className="border border-custom-orange text-custom-orange hover:bg-orange-50 font-medium py-2 px-4 rounded transition-colors duration-300 flex-1 flex justify-center items-center"
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Apply Now
        </button>
      </div>
      
      {!user && (
        <p className="text-sm text-gray-500 mt-3 text-center">
          You need to <a href="/login" className="text-custom-orange hover:underline">log in</a> to request a viewing or apply
        </p>
      )}
      
      {/* Modals */}
      {showViewingModal && (
        <RequestViewingModal
          property={property}
          isOpen={showViewingModal}
          onClose={() => setShowViewingModal(false)}
        />
      )}
      
      {showApplicationModal && (
        <RentalApplicationModal
          property={property}
          isOpen={showApplicationModal}
          onClose={() => setShowApplicationModal(false)}
        />
      )}
    </div>
  );
}