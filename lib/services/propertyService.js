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
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
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
      // Using correct join syntax - join profiles separately
      const { data, error } = await supabase
        .from('viewing_requests')
        .select(`
          *,
          properties:property_id (
            id, 
            title, 
            location
          )
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // If we need profile information, fetch it separately
      if (data && data.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(data.map(request => request.user_id))];
        
        // Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', userIds);
          
        if (profilesError) console.error('Error fetching profiles:', profilesError);
        
        // Create a lookup map for profiles
        const profilesMap = profilesData ? 
          profilesData.reduce((map, profile) => {
            map[profile.id] = profile;
            return map;
          }, {}) : {};
          
        // Combine data with profiles
        const enrichedData = data.map(request => ({
          ...request,
          user_profile: profilesMap[request.user_id] || null
        }));
        
        return { data: enrichedData, error: null };
      }
      
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
      const { data: { user } } = await supabase.auth.getUser();
      
      // First fetch viewing requests
      const { data, error } = await supabase
        .from('viewing_requests')
        .select(`
          *,
          properties:property_id (
            id, 
            title, 
            location,
            price,
            images
          )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // If we need profile information, fetch it separately
      if (data && data.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(data.map(request => request.user_id))];
        
        // Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', userIds);
          
        if (profilesError) console.error('Error fetching profiles:', profilesError);
        
        // Create a lookup map for profiles
        const profilesMap = profilesData ? 
          profilesData.reduce((map, profile) => {
            map[profile.id] = profile;
            return map;
          }, {}) : {};
          
        // Combine data with profiles and format for frontend
        const formattedData = data.map(request => {
          const userProfile = profilesMap[request.user_id] || {};
          const firstImage = request.properties?.images && request.properties.images.length > 0 
            ? request.properties.images[0] 
            : null;
            
          return {
            id: request.id,
            property_id: request.property_id,
            user_id: request.user_id,
            owner_id: request.owner_id,
            proposed_date: request.proposed_date,
            message: request.message,
            status: request.status,
            user_phone: request.user_phone || userProfile.phone,
            created_at: request.created_at,
            updated_at: request.updated_at,
            property_title: request.properties?.title || 'Property',
            property_location: request.properties?.location || '',
            property_price: request.properties?.price || 0,
            property_image: firstImage || '',
            user_name: userProfile.full_name || 'User',
            user_email: userProfile.email || ''
          };
        });
        
        return { data: formattedData, error: null };
      }
      
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
      // Using correct join syntax
      const { data, error } = await supabase
        .from('rental_applications')
        .select(`
          *,
          properties:property_id (
            id, 
            title, 
            location
          )
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // If we need profile information, fetch it separately
      if (data && data.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(data.map(application => application.user_id))];
        
        // Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', userIds);
          
        if (profilesError) console.error('Error fetching profiles:', profilesError);
        
        // Create a lookup map for profiles
        const profilesMap = profilesData ? 
          profilesData.reduce((map, profile) => {
            map[profile.id] = profile;
            return map;
          }, {}) : {};
          
        // Combine data with profiles
        const enrichedData = data.map(application => ({
          ...application,
          user_profile: profilesMap[application.user_id] || null
        }));
        
        return { data: enrichedData, error: null };
      }
      
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
      const { data: { user } } = await supabase.auth.getUser();
      
      // First fetch applications
      const { data, error } = await supabase
        .from('rental_applications')
        .select(`
          *,
          properties:property_id (
            id, 
            title, 
            location,
            price,
            images
          )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // If we need profile information, fetch it separately
      if (data && data.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(data.map(application => application.user_id))];
        
        // Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', userIds);
          
        if (profilesError) console.error('Error fetching profiles:', profilesError);
        
        // Create a lookup map for profiles
        const profilesMap = profilesData ? 
          profilesData.reduce((map, profile) => {
            map[profile.id] = profile;
            return map;
          }, {}) : {};
          
        // Combine data with profiles and format for frontend
        const formattedData = data.map(application => {
          const userProfile = profilesMap[application.user_id] || {};
          const firstImage = application.properties?.images && application.properties.images.length > 0 
            ? application.properties.images[0] 
            : null;
            
          return {
            id: application.id,
            property_id: application.property_id,
            user_id: application.user_id,
            owner_id: application.owner_id,
            message: application.message,
            status: application.status,
            created_at: application.created_at,
            updated_at: application.updated_at,
            property_title: application.properties?.title || 'Property',
            property_location: application.properties?.location || '',
            property_price: application.properties?.price || 0,
            property_image: firstImage || '',
            user_name: userProfile.full_name || 'User',
            user_email: userProfile.email || '',
            user_phone: userProfile.phone || ''
          };
        });
        
        return { data: formattedData, error: null };
      }
      
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