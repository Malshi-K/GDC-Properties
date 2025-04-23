"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

const PropertyApplicationModal = ({ property, isOpen, onClose, onSuccess }) => {
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    employmentStatus: '',
    income: '',
    creditScore: '',
    message: '',
    phone: profile?.phone || ''
  });

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!user) {
      setError("You must be logged in to apply for a property");
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('Submitting property application:', {
        property_id: property.id,
        user_id: user.id,
        message: formData.message,
        employment_status: formData.employmentStatus,
        income: parseFloat(formData.income),
        credit_score: formData.creditScore,
        status: 'pending',
        owner_id: property.owner_id
      });

      // Add application to database
      const { data, error } = await supabase
        .from('rental_applications')
        .insert({
          property_id: property.id,
          user_id: user.id,
          message: formData.message,
          employment_status: formData.employmentStatus,
          income: parseFloat(formData.income),
          credit_score: formData.creditScore,
          status: 'pending',
          owner_id: property.owner_id
        })
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Property application created:', data);

      // Call success callback with the created application
      if (onSuccess && data) {
        onSuccess(data[0]);
      }
      
      toast.success('Your application has been submitted successfully!');
      
      // Close the modal
      onClose();
      
    } catch (err) {
      console.error('Error submitting application:', err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-90vh overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Apply for Property</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800">{property.title}</h3>
            <p className="text-gray-600">{property.location}</p>
            <p className="text-custom-red font-bold mt-1">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0
              }).format(property.price)}
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          {!user ? (
            <div className="text-center py-4">
              <p className="mb-4">You need to be logged in to apply for a property.</p>
              <a 
                href="/login" 
                className="bg-custom-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 inline-block"
              >
                Log In / Sign Up
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="employmentStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Status*
                </label>
                <select
                  id="employmentStatus"
                  name="employmentStatus"
                  required
                  value={formData.employmentStatus}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
                >
                  <option value="">Select an option</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Self-employed">Self-employed</option>
                  <option value="Unemployed">Unemployed</option>
                  <option value="Retired">Retired</option>
                  <option value="Student">Student</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="income" className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Income (USD)*
                </label>
                <input
                  id="income"
                  name="income"
                  type="number"
                  required
                  value={formData.income}
                  onChange={handleChange}
                  placeholder="e.g. 60000"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="creditScore" className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Score*
                </label>
                <input
                  id="creditScore"
                  name="creditScore"
                  type="text"
                  required
                  value={formData.creditScore}
                  onChange={handleChange}
                  placeholder="e.g. 720"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number*
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="3"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Why are you interested in this property? Include any details that may help your application."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
                ></textarea>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-red hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-red"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyApplicationModal;