// lib/services/profileService.js

import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Service for handling profile operations
 */
export const profileService = {
  /**
   * Get a user's profile by user ID
   * @param {string} userId - The user's ID
   * @param {string} role - The user's role ('user' or 'owner')
   * @returns {Promise<{data, error}>} - The profile data or error
   */
  async getProfile(userId, role = "user") {
    // Get profile from the profiles table
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    return { data, error };
  },

  /**
   * Update a user's profile
   * @param {string} userId - The user's ID
   * @param {Object} profileData - The profile data to update
   * @param {string} role - The user's role ('user' or 'owner')
   * @returns {Promise<{data, error}>} - The updated profile or error
   */
  async updateProfile(userId, profileData, role = "user") {
    // Ensure the profile exists first (upsert)
    const { data: existingProfile, error: fetchError } = await this.getProfile(userId, role);
    
    // If there's an error and it's not a "not found" error, return it
    if (fetchError && !fetchError.message.includes("not found")) {
      return { data: null, error: fetchError };
    }
    
    // Update the profile
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        role, // Ensure the role is set/maintained
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    return { data, error };
  },

  /**
   * Update a user's profile photo
   * @param {string} userId - The user's ID
   * @param {File} file - The image file to upload
   * @returns {Promise<{data, error}>} - The URL of the uploaded photo or error
   */
  async updateProfilePhoto(userId, file) {
    // Create a unique file path
    const filePath = `${userId}/${Date.now()}_profile`;
    
    // Upload the file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true
      });

    if (uploadError) {
      return { data: null, error: uploadError };
    }

    // Get a public URL for the file
    const { data: urlData } = await supabase.storage
      .from("profile-images")
      .getPublicUrl(filePath);

    // Update the profile with the new image URL
    const { data, error } = await supabase
      .from("profiles")
      .update({
        profile_image: filePath,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single();

    return {
      data: {
        ...data,
        profile_image_url: urlData.publicUrl
      },
      error
    };
  }
};