import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for managing property viewing requests
 */
export function useViewingRequest() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Create a new viewing request
   * @param {Object} requestData - The request data
   * @param {string} requestData.propertyId - The property ID
   * @param {Date} requestData.proposedDate - Proposed viewing date
   * @param {string} requestData.message - Message to the owner
   */
  const createViewingRequest = async (requestData) => {
    if (!user) {
      setError("You must be logged in to request a viewing");
      return { success: false, error: "Authentication required" };
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('viewing_requests')
        .insert([{
          property_id: requestData.propertyId,
          user_id: user.id,
          proposed_date: new Date(requestData.proposedDate).toISOString(),
          message: requestData.message,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      return { success: true, data };
    } catch (err) {
      console.error('Error creating viewing request:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get all viewing requests for the current user
   */
  const getUserViewingRequests = async () => {
    if (!user) {
      setError("You must be logged in to view your requests");
      return { data: [], error: "Authentication required" };
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('viewing_requests')
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
      console.error('Error fetching viewing requests:', err);
      setError(err.message);
      return { data: [], error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel a viewing request
   * @param {string} requestId - The request ID to cancel
   */
  const cancelViewingRequest = async (requestId) => {
    if (!user) {
      setError("You must be logged in to cancel a request");
      return { success: false, error: "Authentication required" };
    }

    setLoading(true);
    setError(null);

    try {
      // Only allow cancellation if the request is still pending
      const { error } = await supabase
        .from('viewing_requests')
        .delete()
        .eq('id', requestId)
        .eq('user_id', user.id) // Security check
        .eq('status', 'pending'); // Only allow cancelling pending requests

      if (error) throw error;

      return { success: true };
    } catch (err) {
      console.error('Error cancelling viewing request:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    createViewingRequest,
    getUserViewingRequests,
    cancelViewingRequest,
    loading,
    error
  };
}