"use client";

import { useState } from 'react';
import { useRentalApplication } from '@/hooks/useRentalApplication';
import { toast } from 'react-hot-toast';

export default function RentalApplicationModal({ property, isOpen, onClose }) {
  const { createRentalApplication, loading, error } = useRentalApplication();
  const [formData, setFormData] = useState({
    message: '',
    employmentStatus: 'employed',
    income: '',
    creditScore: 'good'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.income) {
      toast.error('Please enter your annual income');
      return;
    }
    
    const result = await createRentalApplication({
      propertyId: property.id,
      message: formData.message,
      employmentStatus: formData.employmentStatus,
      income: formData.income,
      creditScore: formData.creditScore
    });
    
    if (result.success) {
      toast.success('Rental application submitted successfully');
      onClose();
    } else {
      toast.error(result.error || 'Failed to submit rental application');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Apply to Rent
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
          <p className="text-custom-red font-semibold">
            ${parseInt(property.price).toLocaleString()}/month
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="employmentStatus" className="block text-sm font-medium text-gray-700 mb-1">
              Employment Status*
            </label>
            <select
              id="employmentStatus"
              name="employmentStatus"
              value={formData.employmentStatus}
              onChange={handleChange}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
            >
              <option value="employed">Employed</option>
              <option value="self-employed">Self-Employed</option>
              <option value="unemployed">Unemployed</option>
              <option value="retired">Retired</option>
              <option value="student">Student</option>
            </select>
          </div>

          <div>
            <label htmlFor="income" className="block text-sm font-medium text-gray-700 mb-1">
              Annual Income (USD)*
            </label>
            <input
              type="number"
              id="income"
              name="income"
              value={formData.income}
              onChange={handleChange}
              required
              min="0"
              placeholder="60000"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
            />
          </div>

          <div>
            <label htmlFor="creditScore" className="block text-sm font-medium text-gray-700 mb-1">
              Credit Score Range*
            </label>
            <select
              id="creditScore"
              name="creditScore"
              value={formData.creditScore}
              onChange={handleChange}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
            >
              <option value="excellent">Excellent (750+)</option>
              <option value="good">Good (700-749)</option>
              <option value="fair">Fair (650-699)</option>
              <option value="poor">Poor (Below 650)</option>
              <option value="no-score">No Credit Score</option>
            </select>
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
              placeholder="Include any additional information you'd like the property owner to know about your application"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
            ></textarea>
          </div>

          <div className="bg-gray-50 p-4 rounded-md mt-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-700">Note:</span> By submitting this application, you agree to a potential background check and credit check if your application is approved for further review.
            </p>
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
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-red hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {loading && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                Submit Application
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}