import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for managing rental applications
 */
export function useRentalApplication() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Create a new rental application
   * @param {Object} applicationData - The application data
   * @param {string} applicationData.propertyId - The property ID
   * @param {string} applicationData.message - Message to the owner
   * @param {string} applicationData.employmentStatus - Employment status
   * @param {number} applicationData.income - Annual income
   * @param {string} applicationData.creditScore - Credit score rating
   */
  const createRentalApplication = async (applicationData) => {
    if (!user) {
      setError("You must be logged in to submit an application");
      return { success: false, error: "Authentication required" };
    }

    setLoading(true);
    setError(null);

    try {
      // Check if user already has a pending application for this property
      const { data: existingApplications, error: checkError } = await supabase
        .from('rental_applications')
        .select('id')
        .eq('property_id', applicationData.propertyId)
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (checkError) throw checkError;

      if (existingApplications && existingApplications.length > 0) {
        throw new Error('You already have a pending application for this property');
      }

      // Create new application
      const { data, error } = await supabase
        .from('rental_applications')
        .insert([{
          property_id: applicationData.propertyId,
          user_id: user.id,
          message: applicationData.message,
          employment_status: applicationData.employmentStatus,
          income: parseFloat(applicationData.income),
          credit_score: applicationData.creditScore,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      return { success: true, data };
    } catch (err) {
      console.error('Error creating rental application:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get all rental applications for the current user
   */
  const getUserRentalApplications = async () => {
    if (!user) {
      setError("You must be logged in to view your applications");
      return { data: [], error: "Authentication required" };
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('rental_applications')
        .select(`
          *,
          properties:property_id (
            id,
            title,
            location,
            price,
            bedrooms,
            bathrooms,
            images
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (err) {
      console.error('Error fetching rental applications:', err);
      setError(err.message);
      return { data: [], error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Withdraw a rental application
   * @param {string} applicationId - The application ID to withdraw
   */
  const withdrawRentalApplication = async (applicationId) => {
    if (!user) {
      setError("You must be logged in to withdraw an application");
      return { success: false, error: "Authentication required" };
    }

    setLoading(true);
    setError(null);

    try {
      // Only allow withdrawal if the application is still pending
      const { error } = await supabase
        .from('rental_applications')
        .delete()
        .eq('id', applicationId)
        .eq('user_id', user.id) // Security check
        .eq('status', 'pending'); // Only allow withdrawing pending applications

      if (error) throw error;

      return { success: true };
    } catch (err) {
      console.error('Error withdrawing rental application:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    createRentalApplication,
    getUserRentalApplications,
    withdrawRentalApplication,
    loading,
    error
  };
}