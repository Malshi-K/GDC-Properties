import { supabase } from "@/lib/supabase";

/**
 * Service for property management operations with Supabase
 */
export const propertyService = {
  /**
   * Fetch properties owned by the current user
   */
  async getOwnerProperties() {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching owner properties:', error);
      return { data: null, error };
    }
  },

  /**
   * Fetch a single property by ID
   */
  async getPropertyById(propertyId) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error(`Error fetching property with ID ${propertyId}:`, error);
      return { data: null, error };
    }
  },

  /**
   * Create a new property
   */
  async createProperty(propertyData) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .insert([{
          ...propertyData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating property:', error);
      return { data: null, error };
    }
  },

  /**
   * Update an existing property
   */
  async updateProperty(propertyId, propertyData) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .update({
          ...propertyData,
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId)
        .select()
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error(`Error updating property with ID ${propertyId}:`, error);
      return { data: null, error };
    }
  },

  /**
   * Delete a property
   */
  async deleteProperty(propertyId) {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);
        
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error(`Error deleting property with ID ${propertyId}:`, error);
      return { error };
    }
  },

  /**
   * Get all viewing requests for a specific property
   */
  async getPropertyViewingRequests(propertyId) {
    try {
      const { data, error } = await supabase
        .from('viewing_requests')
        .select(`
          *,
          profiles:user_id (full_name, email, phone)
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error(`Error fetching viewing requests for property ${propertyId}:`, error);
      return { data: null, error };
    }
  },

  /**
   * Get all viewing requests for all properties owned by the current user
   */
  async getAllViewingRequests() {
    try {
      const { data, error } = await supabase
        .from('viewing_requests')
        .select(`
          *,
          profiles:user_id (full_name, email, phone),
          properties:property_id (title)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching all viewing requests:', error);
      return { data: null, error };
    }
  },

  /**
   * Update the status of a viewing request
   */
  async updateViewingRequestStatus(requestId, status) {
    try {
      const { data, error } = await supabase
        .from('viewing_requests')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error(`Error updating viewing request ${requestId}:`, error);
      return { data: null, error };
    }
  },

  /**
   * Get all rental applications for a specific property
   */
  async getPropertyApplications(propertyId) {
    try {
      const { data, error } = await supabase
        .from('rental_applications')
        .select(`
          *,
          profiles:user_id (full_name, email, phone)
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error(`Error fetching applications for property ${propertyId}:`, error);
      return { data: null, error };
    }
  },

  /**
   * Get all rental applications for all properties owned by the current user
   */
  async getAllApplications() {
    try {
      const { data, error } = await supabase
        .from('rental_applications')
        .select(`
          *,
          profiles:user_id (full_name, email, phone),
          properties:property_id (title)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching all applications:', error);
      return { data: null, error };
    }
  },

  /**
   * Update the status of a rental application
   */
  async updateApplicationStatus(applicationId, status) {
    try {
      const { data, error } = await supabase
        .from('rental_applications')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .select()
        .single();
        
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error(`Error updating application ${applicationId}:`, error);
      return { data: null, error };
    }
  }
};