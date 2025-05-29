"use client";

// /lib/services/imageLoaderService.js
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Cache constants
const CACHE_PREFIX = 'gdc_img_';
const CACHE_EXPIRY = 2 * 60 * 60 * 1000; // 2 hours

// Create a context for image loading 
const ImageLoadingContext = createContext({
  propertyImages: {},
  profileImages: {},
  loadPropertyImage: async () => "",
  loadProfileImage: async () => "",
  isPropertyImageLoading: false,
  isProfileImageLoading: false,
  clearImageCache: () => {},
  preloadPropertiesImages: async () => {},
});

// Provider component to manage image loading state
export function ImageLoadingProvider({ children }) {
  const { user, profile } = useAuth();
  const [propertyImages, setPropertyImages] = useState({});
  const [profileImages, setProfileImages] = useState({});
  const [loadingPropertyIds, setLoadingPropertyIds] = useState({});
  const [loadingProfileIds, setLoadingProfileIds] = useState({});
  
  // FIXED: Remove aggressive tab visibility handling
  // The previous version was clearing caches too aggressively
  
  // Load cached images from localStorage on mount only
  useEffect(() => {
    const loadCachedImages = () => {
      if (typeof window === 'undefined') return;
      
      try {
        const cachedPropertyImages = {};
        const cachedProfileImages = {};
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          
          if (key?.startsWith(`${CACHE_PREFIX}property_`)) {
            try {
              const data = JSON.parse(localStorage.getItem(key));
              
              // Only remove truly expired entries (not just old ones)
              if (data.expiry < Date.now()) {
                localStorage.removeItem(key);
                continue;
              }
              
              const propertyId = key.replace(`${CACHE_PREFIX}property_`, '');
              cachedPropertyImages[propertyId] = data.url;
            } catch (e) {
              localStorage.removeItem(key);
            }
          }
          
          if (key?.startsWith(`${CACHE_PREFIX}profile_`)) {
            try {
              const data = JSON.parse(localStorage.getItem(key));
              
              if (data.expiry < Date.now()) {
                localStorage.removeItem(key);
                continue;
              }
              
              const userId = key.replace(`${CACHE_PREFIX}profile_`, '');
              cachedProfileImages[userId] = data.url;
            } catch (e) {
              localStorage.removeItem(key);
            }
          }
        }
        
        if (Object.keys(cachedPropertyImages).length > 0) {
          setPropertyImages(cachedPropertyImages);
        }
        
        if (Object.keys(cachedProfileImages).length > 0) {
          setProfileImages(cachedProfileImages);
        }
        
        console.log(`Loaded ${Object.keys(cachedPropertyImages).length} property images and ${Object.keys(cachedProfileImages).length} profile images from cache`);
      } catch (error) {
        console.error("Error loading cached images:", error);
      }
    };
    
    loadCachedImages();
  }, []);
  
  // Store image in localStorage cache
  const cacheImage = useCallback((type, id, url) => {
    if (typeof window === 'undefined') return;
    
    try {
      const key = `${CACHE_PREFIX}${type}_${id}`;
      const data = {
        url,
        expiry: Date.now() + CACHE_EXPIRY,
        timestamp: Date.now()
      };
      
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error caching ${type} image:`, error);
    }
  }, []);
  
  // Load a property image
  const loadPropertyImage = useCallback(async (propertyId, ownerId, imagePath) => {
    // Return cached image if available
    if (propertyImages[propertyId]) {
      return propertyImages[propertyId];
    }
    
    // Skip if already loading or missing required data
    if (loadingPropertyIds[propertyId] || !propertyId) {
      return "";
    }
    
    // Mark as loading
    setLoadingPropertyIds(prev => ({
      ...prev,
      [propertyId]: true
    }));
    
    try {
      if (!ownerId || !imagePath) {
        return "";
      }
      
      // Normalize the path
      const normalizedPath = imagePath.includes("/") ? imagePath : `${ownerId}/${imagePath}`;
      
      // Try signed URL first
      try {
        const { data, error } = await supabase.storage
          .from("property-images")
          .createSignedUrl(normalizedPath, 3600);
        
        if (!error && data?.signedUrl) {
          const imageUrl = data.signedUrl;
          
          setPropertyImages(prev => ({
            ...prev,
            [propertyId]: imageUrl
          }));
          
          cacheImage('property', propertyId, imageUrl);
          return imageUrl;
        }
      } catch (signedUrlError) {
        console.warn(`Signed URL failed for property ${propertyId}, trying public URL.`);
      }
      
      // Fallback to public URL
      try {
        const { data } = supabase.storage
          .from("property-images")
          .getPublicUrl(normalizedPath);
        
        if (data?.publicUrl) {
          const imageUrl = `${data.publicUrl}?t=${Date.now()}`;
          
          setPropertyImages(prev => ({
            ...prev,
            [propertyId]: imageUrl
          }));
          
          cacheImage('property', propertyId, imageUrl);
          return imageUrl;
        }
      } catch (publicUrlError) {
        console.error(`Public URL failed for property ${propertyId}.`);
      }
      
      return "";
    } catch (error) {
      console.error(`Error loading property image for ${propertyId}:`, error);
      return "";
    } finally {
      setLoadingPropertyIds(prev => {
        const newState = { ...prev };
        delete newState[propertyId];
        return newState;
      });
    }
  }, [propertyImages, loadingPropertyIds, cacheImage]);
  
  // Load a profile image
  const loadProfileImage = useCallback(async (userId, imagePath = null) => {
    if (profileImages[userId]) {
      return profileImages[userId];
    }
    
    if (loadingProfileIds[userId] || !userId) {
      return "";
    }
    
    setLoadingProfileIds(prev => ({
      ...prev,
      [userId]: true
    }));
    
    try {
      // Try with provided path first
      if (imagePath) {
        try {
          const { data, error } = await supabase.storage
            .from("profile-images")
            .createSignedUrl(imagePath, 3600);
          
          if (!error && data?.signedUrl) {
            const imageUrl = data.signedUrl;
            
            setProfileImages(prev => ({
              ...prev,
              [userId]: imageUrl
            }));
            
            cacheImage('profile', userId, imageUrl);
            return imageUrl;
          }
        } catch (pathError) {
          console.warn(`Failed to load profile image with provided path for ${userId}.`);
        }
      }
      
      // Try listing files in user's folder
      try {
        const { data: files, error } = await supabase.storage
          .from("profile-images")
          .list(userId);
        
        if (!error && files && files.length > 0) {
          const sortedFiles = [...files].sort((a, b) => {
            if (!a.created_at || !b.created_at) return 0;
            return new Date(b.created_at) - new Date(a.created_at);
          });
          
          const latestFile = sortedFiles[0];
          const filePath = `${userId}/${latestFile.name}`;
          
          const { data, error: urlError } = await supabase.storage
            .from("profile-images")
            .createSignedUrl(filePath, 3600);
          
          if (!urlError && data?.signedUrl) {
            const imageUrl = data.signedUrl;
            
            setProfileImages(prev => ({
              ...prev,
              [userId]: imageUrl
            }));
            
            cacheImage('profile', userId, imageUrl);
            return imageUrl;
          }
        }
      } catch (listError) {
        console.warn(`Failed to list profile images for ${userId}.`);
      }
      
      return "";
    } catch (error) {
      console.error(`Error loading profile image for ${userId}:`, error);
      return "";
    } finally {
      setLoadingProfileIds(prev => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });
    }
  }, [profileImages, loadingProfileIds, cacheImage]);
  
  // Load current user's profile image
  useEffect(() => {
    if (user?.id && profile?.profile_image && !profileImages[user.id]) {
      loadProfileImage(user.id, profile.profile_image);
    }
  }, [user, profile, loadProfileImage, profileImages]);
  
  // Preload images for multiple properties
  const preloadPropertiesImages = useCallback(async (properties) => {
    if (!Array.isArray(properties) || properties.length === 0) return;
    
    const propertiesToLoad = properties.filter(property => 
      property.id && 
      property.owner_id && 
      property.images && 
      property.images.length > 0 && 
      !propertyImages[property.id] &&
      !loadingPropertyIds[property.id] // Don't load if already loading
    );
    
    if (propertiesToLoad.length === 0) return;
    
    // Load images in smaller batches to avoid overwhelming
    const batchSize = 3; // Reduced from 5
    for (let i = 0; i < propertiesToLoad.length; i += batchSize) {
      const batch = propertiesToLoad.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(property => 
          loadPropertyImage(property.id, property.owner_id, property.images[0])
        )
      );
      
      // Longer delay between batches
      if (i + batchSize < propertiesToLoad.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }, [propertyImages, loadingPropertyIds, loadPropertyImage]);
  
  // Check loading states
  const isPropertyImageLoading = useCallback((propertyId) => {
    return Boolean(loadingPropertyIds[propertyId]);
  }, [loadingPropertyIds]);
  
  const isProfileImageLoading = useCallback((userId) => {
    return Boolean(loadingProfileIds[userId]);
  }, [loadingProfileIds]);
  
  // Clear image cache
  const clearImageCache = useCallback(() => {
    setPropertyImages({});
    setProfileImages({});
    
    if (typeof window !== 'undefined') {
      try {
        // Only clear image cache, not all localStorage
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key?.startsWith(CACHE_PREFIX)) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error("Error clearing image cache:", error);
      }
    }
  }, []);
  
  // Provide context value
  const contextValue = {
    propertyImages,
    profileImages,
    loadPropertyImage,
    loadProfileImage,
    isPropertyImageLoading,
    isProfileImageLoading,
    clearImageCache,
    preloadPropertiesImages,
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

// Specialized hook for property images
export function usePropertyImage(propertyId, ownerId, imagePath) {
  const { loadPropertyImage, propertyImages, isPropertyImageLoading } = useImageLoader();
  
  useEffect(() => {
    if (propertyId && ownerId && imagePath && !propertyImages[propertyId]) {
      loadPropertyImage(propertyId, ownerId, imagePath);
    }
  }, [propertyId, ownerId, imagePath, loadPropertyImage, propertyImages]);
  
  return {
    imageUrl: propertyImages[propertyId] || "",
    isLoading: isPropertyImageLoading(propertyId),
  };
}

// Specialized hook for profile images
export function useProfileImage(userId, imagePath) {
  const { loadProfileImage, profileImages, isProfileImageLoading } = useImageLoader();
  
  useEffect(() => {
    if (userId && !profileImages[userId]) {
      loadProfileImage(userId, imagePath);
    }
  }, [userId, imagePath, loadProfileImage, profileImages]);
  
  return {
    imageUrl: profileImages[userId] || "",
    isLoading: isProfileImageLoading(userId),
  };
}

// Helper hook for current user's profile image
export function useCurrentUserProfileImage() {
  const { user, profile } = useAuth();
  const { imageUrl, isLoading } = useProfileImage(
    user?.id, 
    profile?.profile_image
  );
  
  return { imageUrl, isLoading };
}