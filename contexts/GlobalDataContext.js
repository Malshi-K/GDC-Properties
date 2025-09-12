// /contexts/GlobalDataContext.js
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  fetchSupabaseData,
  generateCacheKey,
} from "@/lib/utils/dataFetchingUtils";
import { supabase } from "@/lib/supabase";

const CACHE_PREFIX = "global_data_";
const PROFILE_IMAGE_PREFIX = "profile_img_";
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes
const PROFILE_IMAGE_TTL = 30 * 60 * 1000; // 30 minutes for profile images

const GlobalDataContext = createContext({});

export function GlobalDataProvider({ children }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState({});
  const [profileImages, setProfileImages] = useState({});
  const [profileImageLoading, setProfileImageLoading] = useState({});
  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false); // Combined ready state

  // Add mounted check for SSR
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load cache asynchronously but don't block the context
  useEffect(() => {
    if (!isMounted) return;
    
    let isCanceled = false;
    
    const loadCache = async () => {
      try {
        const cachedData = {};
        const cachedProfileImages = {};
        
        // Load cache in background
        for (let i = 0; i < sessionStorage.length; i++) {
          if (isCanceled) break;
          
          const key = sessionStorage.key(i);
          
          if (key?.startsWith(CACHE_PREFIX)) {
            try {
              const cached = JSON.parse(sessionStorage.getItem(key));
              
              if (cached.expiry < Date.now()) {
                sessionStorage.removeItem(key);
                continue;
              }
              
              const cacheKey = key.replace(CACHE_PREFIX, '');
              cachedData[cacheKey] = cached.data;
            } catch (e) {
              sessionStorage.removeItem(key);
            }
          }
          
          if (key?.startsWith(PROFILE_IMAGE_PREFIX)) {
            try {
              const cached = JSON.parse(sessionStorage.getItem(key));
              
              if (cached.expiry < Date.now()) {
                sessionStorage.removeItem(key);
                continue;
              }
              
              const userId = key.replace(PROFILE_IMAGE_PREFIX, '');
              cachedProfileImages[userId] = cached.url;
            } catch (e) {
              sessionStorage.removeItem(key);
            }
          }
        }
        
        if (!isCanceled) {
          if (Object.keys(cachedData).length > 0) {
            setData(cachedData);
            console.log(`Loaded ${Object.keys(cachedData).length} cached entries`);
          }
          
          if (Object.keys(cachedProfileImages).length > 0) {
            setProfileImages(cachedProfileImages);
            console.log(`Loaded ${Object.keys(cachedProfileImages).length} cached profile images`);
          }
        }
      } catch (error) {
        console.error("Error loading cache:", error);
      } finally {
        if (!isCanceled) {
          setIsReady(true);
        }
      }
    };

    // Set ready immediately for first-time users, load cache in background
    const timer = setTimeout(() => {
      if (!isCanceled) {
        setIsReady(true);
      }
    }, 100);

    loadCache();

    return () => {
      isCanceled = true;
      clearTimeout(timer);
    };
  }, [isMounted]);

  const fetchData = useCallback(async (params, options = {}) => {
    // Only require mounting, don't wait for cache loading
    if (!isMounted) {
      console.log(`Not mounted yet`);
      return null;
    }

    const { 
      useCache = true, 
      ttl = DEFAULT_TTL,
      onSuccess = () => {},
      onError = () => {}
    } = options;

    // Handle special cached keys
    if (params._cached_key) {
      const cachedResult = data[params._cached_key];
      if (cachedResult) {
        console.log(`Cache HIT for cached key: ${params._cached_key}`);
        onSuccess(cachedResult);
        return cachedResult;
      } else {
        console.log(`Cache MISS for cached key: ${params._cached_key}`);
      }
    }

    const cacheKey = params._cached_key || generateCacheKey(params);

    // Return cached data if available and not forcing refresh
    if (useCache && data[cacheKey]) {
      console.log(`Cache HIT: ${cacheKey}`);
      onSuccess(data[cacheKey]);
      return data[cacheKey];
    }

    // Skip if already loading
    if (loading[cacheKey]) {
      console.log(`Already loading: ${cacheKey}`);
      return null;
    }

    // Set loading state
    setLoading(prev => ({ ...prev, [cacheKey]: true }));

    try {
      console.log(`Cache MISS: ${cacheKey} - Fetching from Supabase`);
      console.log("Fetch params:", params);
      
      const result = await fetchSupabaseData(params);
      
      console.log("Raw result from fetchSupabaseData:", result);
      
      // Handle single parameter properly
      let processedResult = result;
      if (params.single && Array.isArray(result)) {
        processedResult = result.length > 0 ? result[0] : null;
        console.log("Processed single result:", processedResult);
      }

      // Update data state
      setData(prev => ({ ...prev, [cacheKey]: processedResult }));

      // Cache in sessionStorage (non-blocking)
      if (typeof window !== 'undefined') {
        try {
          const cacheData = {
            data: processedResult,
            expiry: Date.now() + ttl,
            timestamp: Date.now()
          };
          sessionStorage.setItem(`${CACHE_PREFIX}${cacheKey}`, JSON.stringify(cacheData));
        } catch (storageError) {
          console.warn("Failed to cache data:", storageError);
        }
      }

      onSuccess(processedResult);
      return processedResult;
    } catch (error) {
      console.error(`Error fetching ${cacheKey}:`, error);
      onError(error);
      throw error;
    } finally {
      // Clear loading state
      setLoading(prev => {
        const newLoading = { ...prev };
        delete newLoading[cacheKey];
        return newLoading;
      });
    }
  }, [data, loading, isMounted]); // Remove cacheLoaded dependency

  const updateData = useCallback((key, newData) => {
    if (!isMounted) return;

    setData(prev => ({ ...prev, [key]: newData }));

    // Also update cache (non-blocking)
    if (typeof window !== "undefined") {
      try {
        const cacheData = {
          data: newData,
          expiry: Date.now() + DEFAULT_TTL,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheData));
      } catch (error) {
        console.warn("Failed to cache updated data:", error);
      }
    }
  }, [isMounted]);

  const invalidateCache = useCallback((pattern) => {
    if (!isMounted) return;

    // Update memory cache
    setData(prev => {
      const newData = { ...prev };

      Object.keys(newData).forEach(key => {
        if (typeof pattern === "string" && key.includes(pattern)) {
          delete newData[key];
        } else if (pattern instanceof RegExp && pattern.test(key)) {
          delete newData[key];
        }
      });

      return newData;
    });

    // Update sessionStorage (non-blocking)
    if (typeof window !== "undefined") {
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);

          if (key?.startsWith(CACHE_PREFIX)) {
            const cacheKey = key.replace(CACHE_PREFIX, "");

            if (
              (typeof pattern === "string" && cacheKey.includes(pattern)) ||
              (pattern instanceof RegExp && pattern.test(cacheKey))
            ) {
              sessionStorage.removeItem(key);
            }
          }
        }
      } catch (error) {
        console.error("Error invalidating cache:", error);
      }
    }

    console.log(`Invalidated cache for pattern: ${pattern}`);
  }, [isMounted]);

  const clearCache = useCallback(() => {
    if (!isMounted) return;

    setData({});
    setProfileImages({});

    if (typeof window !== "undefined") {
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key?.startsWith(CACHE_PREFIX) || key?.startsWith(PROFILE_IMAGE_PREFIX)) {
            sessionStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error("Error clearing cache:", error);
      }
    }

    console.log("Cleared all cache");
  }, [isMounted]);  

  // Profile image loading function
  const loadProfileImage = useCallback(
    async (userId, imagePath = null) => {
      if (!userId || !isMounted) return null;

      // Return cached image if available
      if (profileImages[userId]) {
        console.log(`Profile image cache HIT: ${userId}`);
        return profileImages[userId];
      }

      // Skip if already loading
      if (profileImageLoading[userId]) {
        console.log(`Profile image already loading: ${userId}`);
        return null;
      }

      setProfileImageLoading((prev) => ({ ...prev, [userId]: true }));

      try {
        console.log(
          `Profile image cache MISS: ${userId} - Loading from storage`
        );
        let imageUrl = null;

        // Try with provided path first
        if (imagePath) {
          try {
            const { data, error } = await supabase.storage
              .from("profile-images")
              .createSignedUrl(imagePath, 3600);

            if (!error && data?.signedUrl) {
              imageUrl = data.signedUrl;
            }
          } catch (pathError) {
            console.warn(
              `Failed to load profile image with provided path for ${userId}`
            );
          }
        }

        // If no image URL yet, try listing files in user's folder
        if (!imageUrl) {
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
                imageUrl = data.signedUrl;
              }
            }
          } catch (listError) {
            console.warn(`Failed to list profile images for ${userId}`);
          }
        }

        if (imageUrl) {
          // Update state
          setProfileImages((prev) => ({ ...prev, [userId]: imageUrl }));

          // Cache in sessionStorage
          if (typeof window !== "undefined") {
            try {
              const cacheData = {
                url: imageUrl,
                expiry: Date.now() + PROFILE_IMAGE_TTL,
                timestamp: Date.now(),
              };
              sessionStorage.setItem(
                `${PROFILE_IMAGE_PREFIX}${userId}`,
                JSON.stringify(cacheData)
              );
            } catch (storageError) {
              console.warn("Failed to cache profile image:", storageError);
            }
          }

          console.log(`✅ Profile image loaded for ${userId}`);
          return imageUrl;
        }

        console.log(`❌ No profile image found for ${userId}`);
        return null;
      } catch (error) {
        console.error(`Error loading profile image for ${userId}:`, error);
        return null;
      } finally {
        setProfileImageLoading((prev) => {
          const newLoading = { ...prev };
          delete newLoading[userId];
          return newLoading;
        });
      }
    },
    [profileImages, profileImageLoading, isMounted]
  );

  // Get profile image URL
  const getProfileImageUrl = useCallback(
    (userId) => {
      if (!isMounted) return null;
      return profileImages[userId] || null;
    },
    [profileImages, isMounted]
  );

  // Check if profile image is loading
  const isProfileImageLoading = useCallback(
    (userId) => {
      if (!isMounted) return false;
      return Boolean(profileImageLoading[userId]);
    },
    [profileImageLoading, isMounted]
  );

  // Invalidate profile image cache
  const invalidateProfileImageCache = useCallback(
    (userId) => {
      if (!isMounted || !userId) return;

      setProfileImages((prev) => {
        const newImages = { ...prev };
        delete newImages[userId];
        return newImages;
      });

      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(`${PROFILE_IMAGE_PREFIX}${userId}`);
        } catch (error) {
          console.error("Error invalidating profile image cache:", error);
        }
      }

      console.log(`Invalidated profile image cache for user: ${userId}`);
    },
    [isMounted]
  );

  // Remove favorite helper
  const removeFavorite = async (favoriteId) => {
    if (!isMounted) return { success: false, error: new Error("Not mounted") };

    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;

      // Invalidate any cached favorites so fresh fetch happens
      invalidateCache("favorites");

      return { success: true, error: null };
    } catch (err) {
      console.error("Error removing favorite:", err.message);
      return { success: false, error: err };
    }
  };

  if (!isMounted) {
    return (
      <GlobalDataContext.Provider value={{
        data: {},
        loading: {},
        profileImages: {},
        fetchData: async () => null,
        updateData: () => {},
        invalidateCache: () => {},
        clearCache: () => {},
        loadProfileImage: async () => null,
        getProfileImageUrl: () => null,
        isProfileImageLoading: () => false,
      }}>
        {children}
      </GlobalDataContext.Provider>
    );
  }

  const value = {
    data,
    loading,
    profileImages,
    fetchData,
    updateData,
    invalidateCache,
    clearCache,
    isReady,
    loadProfileImage,
    getProfileImageUrl,
    isProfileImageLoading,
    invalidateProfileImageCache,
    removeFavorite,
  };

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
}

export function useGlobalData() {
  const context = useContext(GlobalDataContext);
  if (!context) {
    // Return safe defaults during SSR
    return {
      data: {},
      loading: {},
      profileImages: {},
      fetchData: async () => null,
      updateData: () => {},
      invalidateCache: () => {},
      clearCache: () => {},
      isReady: false,
      loadProfileImage: async () => null,
      getProfileImageUrl: () => null,
      isProfileImageLoading: () => false,
      invalidateProfileImageCache: () => {},
      removeFavorite: async () => ({
        success: false,
        error: new Error("Context not available"),
      }),
    };
  }
  return context;
}
