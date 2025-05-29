// /contexts/GlobalDataContext.js
"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchSupabaseData, generateCacheKey } from '@/lib/utils/dataFetchingUtils';

const CACHE_PREFIX = 'global_data_';
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes

const GlobalDataContext = createContext({
  data: {},
  loading: {},
  fetchData: async () => {},
  updateData: () => {},
  invalidateCache: () => {},
  clearCache: () => {},
});

export function GlobalDataProvider({ children }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState({});

  // Load cache from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const cachedData = {};
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        
        if (key?.startsWith(CACHE_PREFIX)) {
          try {
            const cached = JSON.parse(sessionStorage.getItem(key));
            
            // Skip expired entries
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
      }
      
      if (Object.keys(cachedData).length > 0) {
        setData(cachedData);
        console.log(`Loaded ${Object.keys(cachedData).length} cached entries`);
      }
    } catch (error) {
      console.error("Error loading cache:", error);
    }
  }, []);

  // Function to update data directly
  const updateData = useCallback((key, newData) => {
    setData(prev => ({ ...prev, [key]: newData }));
    
    // Also update cache
    if (typeof window !== 'undefined') {
      try {
        const cacheData = {
          data: newData,
          expiry: Date.now() + DEFAULT_TTL,
          timestamp: Date.now()
        };
        sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheData));
      } catch (error) {
        console.warn("Failed to cache updated data:", error);
      }
    }
  }, []);

  const fetchData = useCallback(async (params, options = {}) => {
    const { 
      useCache = true, 
      ttl = DEFAULT_TTL,
      onSuccess = () => {},
      onError = () => {}
    } = options;

    // Handle special cached keys
    if (params._cached_key) {
      return data[params._cached_key] || null;
    }

    const cacheKey = generateCacheKey(params);

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
      const result = await fetchSupabaseData(params);

      // Update data state
      setData(prev => ({ ...prev, [cacheKey]: result }));

      // Cache in sessionStorage
      if (typeof window !== 'undefined') {
        try {
          const cacheData = {
            data: result,
            expiry: Date.now() + ttl,
            timestamp: Date.now()
          };
          sessionStorage.setItem(`${CACHE_PREFIX}${cacheKey}`, JSON.stringify(cacheData));
        } catch (storageError) {
          console.warn("Failed to cache data:", storageError);
        }
      }

      onSuccess(result);
      return result;
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
  }, [data, loading]);

  // Attach helper methods to fetchData
  fetchData.updateData = updateData;

  const invalidateCache = useCallback((pattern) => {
    // Update memory cache
    setData(prev => {
      const newData = { ...prev };
      
      Object.keys(newData).forEach(key => {
        if (typeof pattern === 'string' && key.includes(pattern)) {
          delete newData[key];
        } else if (pattern instanceof RegExp && pattern.test(key)) {
          delete newData[key];
        }
      });
      
      return newData;
    });

    // Update sessionStorage
    if (typeof window !== 'undefined') {
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          
          if (key?.startsWith(CACHE_PREFIX)) {
            const cacheKey = key.replace(CACHE_PREFIX, '');
            
            if ((typeof pattern === 'string' && cacheKey.includes(pattern)) ||
                (pattern instanceof RegExp && pattern.test(cacheKey))) {
              sessionStorage.removeItem(key);
            }
          }
        }
      } catch (error) {
        console.error("Error invalidating cache:", error);
      }
    }

    console.log(`Invalidated cache for pattern: ${pattern}`);
  }, []);

  const clearCache = useCallback(() => {
    setData({});
    
    if (typeof window !== 'undefined') {
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key?.startsWith(CACHE_PREFIX)) {
            sessionStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error("Error clearing cache:", error);
      }
    }

    console.log("Cleared all cache");
  }, []);

  const value = {
    data,
    loading,
    fetchData,
    updateData,
    invalidateCache,
    clearCache
  };

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
}

export function useGlobalData() {
  return useContext(GlobalDataContext);
}