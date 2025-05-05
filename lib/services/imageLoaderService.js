"use client";

// /lib/services/imageLoaderService.js
import { createContext, useContext, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Create a context for image loading 
const ImageLoadingContext = createContext({
  propertyImages: {},
  profileImages: {},
  loadPropertyImage: async () => "",
  loadProfileImage: async () => "",
  isPropertyImageLoading: false,
  isProfileImageLoading: false,
});

// Provider component to manage image loading state
export function ImageLoadingProvider({ children }) {
  const [propertyImages, setPropertyImages] = useState({});
  const [profileImages, setProfileImages] = useState({});
  const [loadingPropertyIds, setLoadingPropertyIds] = useState({});
  const [loadingProfileIds, setLoadingProfileIds] = useState({});
  
  // Load a property image
  const loadPropertyImage = async (propertyId, ownerId, imagePath) => {
    // Skip if already loading or already loaded
    if (loadingPropertyIds[propertyId] || propertyImages[propertyId]) {
      return propertyImages[propertyId] || "";
    }
    
    // Skip if missing required data
    if (!propertyId || !ownerId || !imagePath) {
      return "";
    }
    
    // Mark as loading
    setLoadingPropertyIds(prev => ({
      ...prev,
      [propertyId]: true
    }));
    
    try {
      // Normalize the path
      const normalizedPath = imagePath.includes("/") 
        ? imagePath 
        : `${ownerId}/${imagePath}`;
      
      // Try to get a signed URL
      const { data, error } = await supabase.storage
        .from("property-images")
        .createSignedUrl(normalizedPath, 3600); // 1 hour expiry
      
      if (error) {
        throw error;
      }
      
      // Store image URL in state
      const imageUrl = data.signedUrl;
      setPropertyImages(prev => ({
        ...prev,
        [propertyId]: imageUrl
      }));
      
      return imageUrl;
    } catch (error) {
      console.error(`Error loading property image for ${propertyId}:`, error);
      return "";
    } finally {
      // Clear loading state
      setLoadingPropertyIds(prev => {
        const newState = { ...prev };
        delete newState[propertyId];
        return newState;
      });
    }
  };
  
  // Load a profile image
  const loadProfileImage = async (userId, imagePath) => {
    // Skip if already loading or already loaded
    if (loadingProfileIds[userId] || profileImages[userId]) {
      return profileImages[userId] || "";
    }
    
    // Skip if missing required data
    if (!userId) {
      return "";
    }
    
    // Mark as loading
    setLoadingProfileIds(prev => ({
      ...prev,
      [userId]: true
    }));
    
    try {
      // If path is provided, try loading directly
      if (imagePath) {
        // Try to get a signed URL
        const { data, error } = await supabase.storage
          .from("profile-images")
          .createSignedUrl(imagePath, 3600); // 1 hour expiry
        
        if (!error && data?.signedUrl) {
          // Store image URL in state
          setProfileImages(prev => ({
            ...prev,
            [userId]: data.signedUrl
          }));
          
          return data.signedUrl;
        }
      }
      
      // If direct loading failed, try listing files
      const { data: files, error } = await supabase.storage
        .from("profile-images")
        .list(userId);
      
      if (error || !files || files.length === 0) {
        throw new Error("No profile images found");
      }
      
      // Find the most recent file
      const sortedFiles = [...files].sort((a, b) => {
        if (!a.created_at || !b.created_at) return 0;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      const latestFile = sortedFiles[0];
      const filePath = `${userId}/${latestFile.name}`;
      
      // Get a signed URL
      const { data, error: urlError } = await supabase.storage
        .from("profile-images")
        .createSignedUrl(filePath, 3600);
      
      if (urlError) {
        throw urlError;
      }
      
      // Store image URL in state
      const imageUrl = data.signedUrl;
      setProfileImages(prev => ({
        ...prev,
        [userId]: imageUrl
      }));
      
      return imageUrl;
    } catch (error) {
      console.error(`Error loading profile image for ${userId}:`, error);
      return "";
    } finally {
      // Clear loading state
      setLoadingProfileIds(prev => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });
    }
  };
  
  // Check if property image is loading
  const isPropertyImageLoading = (propertyId) => {
    return Boolean(loadingPropertyIds[propertyId]);
  };
  
  // Check if profile image is loading
  const isProfileImageLoading = (userId) => {
    return Boolean(loadingProfileIds[userId]);
  };
  
  // Provide context value
  const contextValue = {
    propertyImages,
    profileImages,
    loadPropertyImage,
    loadProfileImage,
    isPropertyImageLoading,
    isProfileImageLoading,
  };
  
  return (
    <ImageLoadingContext.Provider value={contextValue}>
      {children}
    </ImageLoadingContext.Provider>
  );
}

// Custom hook to use the image loading context
export function useImageLoader() {
  return useContext(ImageLoadingContext);
}