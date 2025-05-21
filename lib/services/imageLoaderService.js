"use client";

// /lib/services/imageLoaderService.js
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState(Date.now());
  const isFirstVisibilityChange = useRef(true);
  
  // Load cached images from localStorage on mount
  useEffect(() => {
    const loadCachedImages = () => {
      if (typeof window === 'undefined') return; // Skip on server
      
      try {
        // Load cached property images
        const cachedPropertyImages = {};
        const cachedProfileImages = {};
        
        // Scan localStorage for cached images
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          
          // Process property images
          if (key.startsWith(`${CACHE_PREFIX}property_`)) {
            try {
              const data = JSON.parse(localStorage.getItem(key));
              
              // Skip expired cache entries
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
          
          // Process profile images
          if (key.startsWith(`${CACHE_PREFIX}profile_`)) {
            try {
              const data = JSON.parse(localStorage.getItem(key));
              
              // Skip expired cache entries
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
        
        // Update state with cached images
        if (Object.keys(cachedPropertyImages).length > 0) {
          setPropertyImages(prev => ({
            ...prev,
            ...cachedPropertyImages
          }));
        }
        
        if (Object.keys(cachedProfileImages).length > 0) {
          setProfileImages(prev => ({
            ...prev,
            ...cachedProfileImages
          }));
        }
      } catch (error) {
        console.error("Error loading cached images:", error);
      }
    };
    
    loadCachedImages();
  }, []);
  
  // FIXED: Add tab visibility change handler with much more conservative approach 
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Skip the first visibility change after mount
        // This prevents unnecessary operations during initial navigation
        if (isFirstVisibilityChange.current) {
          isFirstVisibilityChange.current = false;
          return;
        }
        
        // Just update the timestamp, DON'T clear any caches yet
        setLastRefreshTimestamp(Date.now());
        
        // Only consider actual cleanup after a very long absence (8+ hours)
        const longAbsenceThreshold = 8 * 60 * 60 * 1000; // 8 hours
        const timeElapsed = Date.now() - lastRefreshTimestamp;
        
        if (timeElapsed > longAbsenceThreshold) {
          console.log('Tab visible after very long absence, checking for old images');
          
          // DEFER any cleanup to avoid UI disruption when switching tabs
          setTimeout(() => {
            // Only clean very old images (3+ days old)
            if (typeof window !== 'undefined') {
              try {
                let cleanupCount = 0;
                const veryOldThreshold = Date.now() - (3 * 24 * 60 * 60 * 1000); // 3 days
                
                for (let i = 0; i < localStorage.length && cleanupCount < 5; i++) {
                  const key = localStorage.key(i);
                  
                  if (key && key.startsWith(CACHE_PREFIX)) {
                    try {
                      const data = JSON.parse(localStorage.getItem(key));
                      
                      // Only cleanup extremely old entries
                      if (data.timestamp && data.timestamp < veryOldThreshold) {
                        localStorage.removeItem(key);
                        cleanupCount++;
                      }
                    } catch (e) {
                      // Skip invalid entries
                    }
                  }
                }
                
                if (cleanupCount > 0) {
                  console.log(`Cleaned up ${cleanupCount} very old image entries`);
                }
              } catch (error) {
                console.error("Error in deferred image cleanup:", error);
              }
            }
          }, 5000); // Defer cleanup for 5 seconds after tab becomes visible
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lastRefreshTimestamp]);
  
  // Store image in localStorage cache
  const cacheImage = useCallback((type, id, url) => {
    if (typeof window === 'undefined') return; // Skip on server
    
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
      // Skip if missing required data for fetching
      if (!ownerId || !imagePath) {
        return "";
      }
      
      // Normalize the path with multiple fallbacks
      let normalizedPath;
      
      if (imagePath.includes("/")) {
        normalizedPath = imagePath;
      } else if (ownerId) {
        normalizedPath = `${ownerId}/${imagePath}`;
      } else {
        normalizedPath = `properties/${propertyId}/${imagePath}`;
      }
      
      // First try: Get a signed URL
      try {
        const { data, error } = await supabase.storage
          .from("property-images")
          .createSignedUrl(normalizedPath, 3600); // 1 hour expiry
        
        if (!error && data?.signedUrl) {
          // Store image URL in state and cache
          setPropertyImages(prev => ({
            ...prev,
            [propertyId]: data.signedUrl
          }));
          
          cacheImage('property', propertyId, data.signedUrl);
          return data.signedUrl;
        }
      } catch (signedUrlError) {
        console.warn(`Signed URL failed for property ${propertyId}, trying public URL.`);
      }
      
      // Second try: Fall back to public URL
      try {
        const { data } = supabase.storage
          .from("property-images")
          .getPublicUrl(normalizedPath);
        
        if (data?.publicUrl) {
          // Add cache buster to avoid browser caching
          const urlWithCacheBuster = `${data.publicUrl}?t=${Date.now()}`;
          
          // Store image URL in state and cache
          setPropertyImages(prev => ({
            ...prev,
            [propertyId]: urlWithCacheBuster
          }));
          
          cacheImage('property', propertyId, urlWithCacheBuster);
          return urlWithCacheBuster;
        }
      } catch (publicUrlError) {
        console.error(`Public URL failed for property ${propertyId}.`);
      }
      
      return "";
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
  }, [propertyImages, loadingPropertyIds, cacheImage]);
  
  // Load a profile image with enhanced cache management and fallbacks
  const loadProfileImage = useCallback(async (userId, imagePath = null) => {
    // Return cached image if available
    if (profileImages[userId]) {
      return profileImages[userId];
    }
    
    // Skip if already loading or missing required data
    if (loadingProfileIds[userId] || !userId) {
      return "";
    }
    
    // Mark as loading
    setLoadingProfileIds(prev => ({
      ...prev,
      [userId]: true
    }));
    
    try {
      // First approach: Try using provided path if available
      if (imagePath) {
        try {
          // Try to get a signed URL
          const { data, error } = await supabase.storage
            .from("profile-images")
            .createSignedUrl(imagePath, 3600); // 1 hour expiry
          
          if (!error && data?.signedUrl) {
            // Store image URL in state and cache
            setProfileImages(prev => ({
              ...prev,
              [userId]: data.signedUrl
            }));
            
            cacheImage('profile', userId, data.signedUrl);
            return data.signedUrl;
          }
        } catch (pathError) {
          console.warn(`Failed to load profile image with provided path for ${userId}, trying alternatives.`);
        }
      }
      
      // Second approach: Try listing files in the user's folder
      try {
        const { data: files, error } = await supabase.storage
          .from("profile-images")
          .list(userId);
        
        if (!error && files && files.length > 0) {
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
          
          if (!urlError && data?.signedUrl) {
            // Store image URL in state and cache
            setProfileImages(prev => ({
              ...prev,
              [userId]: data.signedUrl
            }));
            
            cacheImage('profile', userId, data.signedUrl);
            return data.signedUrl;
          }
        }
      } catch (listError) {
        console.warn(`Failed to list profile images for ${userId}, trying public URL fallback.`);
      }
      
      // Third approach: Try with public URL and most common image names
      try {
        const commonFileNames = ['avatar.jpg', 'profile.jpg', 'profile.png', 'avatar.png'];
        
        for (const fileName of commonFileNames) {
          const testPath = `${userId}/${fileName}`;
          
          const { data } = supabase.storage
            .from("profile-images")
            .getPublicUrl(testPath);
          
          if (data?.publicUrl) {
            // Add cache buster
            const urlWithCacheBuster = `${data.publicUrl}?t=${Date.now()}`;
            
            // Verify image actually exists with a fetch HEAD request
            try {
              const response = await fetch(urlWithCacheBuster, { method: 'HEAD' });
              if (response.ok) {
                // Store image URL in state and cache
                setProfileImages(prev => ({
                  ...prev,
                  [userId]: urlWithCacheBuster
                }));
                
                cacheImage('profile', userId, urlWithCacheBuster);
                return urlWithCacheBuster;
              }
            } catch (fetchError) {
              console.warn(`Fetch verification failed for ${testPath}`);
            }
          }
        }
      } catch (publicUrlError) {
        console.error(`Public URL approach failed for user ${userId}.`);
      }
      
      return "";
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
  }, [profileImages, loadingProfileIds, cacheImage]);
  
  // Load current user's profile image if available
  useEffect(() => {
    if (user?.id && profile?.profile_image && !profileImages[user.id]) {
      loadProfileImage(user.id, profile.profile_image);
    }
  }, [user, profile, loadProfileImage, profileImages]);
  
  // Preload images for multiple properties
  const preloadPropertiesImages = useCallback(async (properties) => {
    if (!Array.isArray(properties) || properties.length === 0) return;
    
    // Filter to properties that have images but aren't loaded yet
    const propertiesToLoad = properties.filter(property => 
      property.id && 
      property.owner_id && 
      property.images && 
      property.images.length > 0 && 
      !propertyImages[property.id]
    );
    
    if (propertiesToLoad.length === 0) return;
    
    // Load images in batches of 5 to avoid overwhelming the network
    const batchSize = 5;
    for (let i = 0; i < propertiesToLoad.length; i += batchSize) {
      const batch = propertiesToLoad.slice(i, i + batchSize);
      
      // Load images in parallel
      await Promise.all(
        batch.map(property => 
          loadPropertyImage(property.id, property.owner_id, property.images[0])
        )
      );
      
      // Small delay between batches
      if (i + batchSize < propertiesToLoad.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }, [propertyImages, loadPropertyImage]);
  
  // Check if property image is loading
  const isPropertyImageLoading = useCallback((propertyId) => {
    return Boolean(loadingPropertyIds[propertyId]);
  }, [loadingPropertyIds]);
  
  // Check if profile image is loading
  const isProfileImageLoading = useCallback((userId) => {
    return Boolean(loadingProfileIds[userId]);
  }, [loadingProfileIds]);
  
  // Clear image cache (useful for logout or testing)
  const clearImageCache = useCallback(() => {
    // Clear in-memory cache
    setPropertyImages({});
    setProfileImages({});
    
    // Clear localStorage cache
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
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

// Specialized custom hook for property images
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

// Specialized custom hook for profile images
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

// Helper hook for the current user's profile image
export function useCurrentUserProfileImage() {
  const { user, profile } = useAuth();
  const { imageUrl, isLoading } = useProfileImage(
    user?.id, 
    profile?.profile_image
  );
  
  return { imageUrl, isLoading };
}