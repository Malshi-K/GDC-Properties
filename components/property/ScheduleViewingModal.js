"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

const ScheduleViewingModal = ({ property, isOpen, onClose, onSuccess }) => {
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    proposedDate: '',
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
      setError("You must be logged in to schedule a viewing");
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('Submitting viewing request:', {
        property_id: property.id,
        user_id: user.id,
        proposed_date: formData.proposedDate,
        message: formData.message,
        status: 'pending',
        user_phone: formData.phone,
        owner_id: property.owner_id
      });

      // Add viewing request to database
      const { data, error } = await supabase
        .from('viewing_requests')
        .insert({
          property_id: property.id,
          user_id: user.id,
          proposed_date: formData.proposedDate,
          message: formData.message,
          status: 'pending',
          user_phone: formData.phone,
          owner_id: property.owner_id
        })
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Viewing request created:', data);

      // Call success callback with the created viewing request
      if (onSuccess && data) {
        onSuccess(data[0]);
      }
      
      toast.success('Viewing request submitted successfully!');
      
      // Close the modal
      onClose();
      
    } catch (err) {
      console.error('Error scheduling viewing:', err);
      setError(err.message || 'Failed to schedule viewing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 text-gray-400">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-90vh overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Schedule a Viewing</h2>
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
          </div>
          
          {error && (
            <div className="bg-orange-50 text-orange-700 p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          {!user ? (
            <div className="text-center py-4">
              <p className="mb-4">You need to be logged in to schedule a viewing.</p>
              <a 
                href="/login" 
                className="bg-custom-orange hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 inline-block"
              >
                Log In / Sign Up
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="proposedDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Date & Time*
                </label>
                <input
                  id="proposedDate"
                  name="proposedDate"
                  type="datetime-local"
                  required
                  value={formData.proposedDate}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-orange focus:border-custom-orange"
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
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-orange focus:border-custom-orange"
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
                  placeholder="Any questions or specific details about your visit"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-orange focus:border-custom-orange"
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
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-orange hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-orange"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Schedule Viewing'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleViewingModal;