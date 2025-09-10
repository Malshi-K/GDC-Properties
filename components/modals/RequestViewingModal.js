"use client";

import { useState } from 'react';
import { useViewingRequest } from '@/hooks/useViewingRequest';
import { toast } from 'react-hot-toast';

export default function RequestViewingModal({ property, isOpen, onClose }) {
  const { createViewingRequest, loading, error } = useViewingRequest();
  const [formData, setFormData] = useState({
    proposedDate: '',
    message: ''
  });

  // Set minimum date as tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Get 30 days from now for max date
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateString = maxDate.toISOString().split('T')[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.proposedDate) {
      toast.error('Please select a proposed viewing date');
      return;
    }
    
    const result = await createViewingRequest({
      propertyId: property.id,
      proposedDate: formData.proposedDate + 'T12:00:00', // Default to noon if time not specified
      message: formData.message
    });
    
    if (result.success) {
      toast.success('Viewing request submitted successfully');
      onClose();
    } else {
      toast.error(result.error || 'Failed to submit viewing request');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Request a Viewing
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={loading}
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <h3 className="font-medium text-gray-900">{property.title}</h3>
          <p className="text-gray-600">{property.location}</p>
        </div>

        {error && (
          <div className="mb-4 bg-orange-50 border border-red-200 text-orange-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="proposedDate" className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Viewing Date*
            </label>
            <input
              type="date"
              id="proposedDate"
              name="proposedDate"
              value={formData.proposedDate}
              onChange={handleChange}
              min={minDate}
              max={maxDateString}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-orange focus:border-custom-orange"
            />
            <p className="text-xs text-gray-500 mt-1">
              Please select a date within the next 30 days
            </p>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message to Owner (Optional)
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows="3"
              placeholder="Let the owner know if you have any specific questions or preferred time of day for viewing"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-orange focus:border-custom-orange"
            ></textarea>
          </div>

          <div className="pt-4">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-orange hover:bg-orange-700 disabled:opacity-50 flex items-center"
              >
                {loading && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                Request Viewing
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}