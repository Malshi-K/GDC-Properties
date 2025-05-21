"use client";

// /contexts/GlobalDataContext.js
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Constants - INCREASED CACHE TIMES
const CACHE_PREFIX = 'gdc_data_';
const DEFAULT_CACHE_EXPIRY = 2 * 60 * 60 * 1000; // 2 hours (increased from 30 minutes)

const GlobalDataContext = createContext({
  queryCache: {},
  addToCache: () => {},
  getFromCache: () => {},
  invalidateCache: () => {},
  clearCache: () => {},
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
  registerDataFetch: () => {},
  isFetched: () => false,
});

export function GlobalDataProvider({ children }) {
  const { user } = useAuth();
  const [queryCache, setQueryCache] = useState({});
  const [dataFetchRegistry, setDataFetchRegistry] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const loadingCountRef = useRef(0);
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState(Date.now());
  const isFirstVisibilityChange = useRef(true);

  // Load cache from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      // Scan localStorage for cached data
      const cachedData = {};
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (key?.startsWith(CACHE_PREFIX)) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            
            // Skip expired cache entries
            if (data.expiry < Date.now()) {
              localStorage.removeItem(key);
              continue;
            }
            
            const cacheKey = key.replace(CACHE_PREFIX, '');
            cachedData[cacheKey] = data.value;
          } catch (e) {
            localStorage.removeItem(key);
          }
        }
      }
      
      if (Object.keys(cachedData).length > 0) {
        setQueryCache(cachedData);
      }
    } catch (error) {
      console.error("Error loading cached data:", error);
    }
  }, []);
  
  // FIXED: Handle visibility change to refresh stale data with much more conservative approach
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Skip the first visibility change event after mounting
        // This prevents unnecessary refreshes right after navigation
        if (isFirstVisibilityChange.current) {
          isFirstVisibilityChange.current = false;
          return;
        }
        
        // Only consider cache refresh after a very long absence (2+ hours)
        const longAbsenceThreshold = 2 * 60 * 60 * 1000; // 2 hours 
        const timeElapsed = Date.now() - lastRefreshTimestamp;
        
        if (timeElapsed > longAbsenceThreshold) {
          // Update timestamp but DON'T clear any caches right away
          setLastRefreshTimestamp(Date.now());
          
          // Instead of clearing cache immediately, just log that the user returned
          console.log('Tab visible after long absence, marking timestamp');
          
          // We can still clear truly ancient cache items 
          // that are over 24 hours old, but no active data
          if (typeof window !== 'undefined') {
            try {
              // Find very old entries
              const veryOldEntries = [];
              const veryOldThreshold = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
              
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                
                if (key?.startsWith(CACHE_PREFIX)) {
                  try {
                    const data = JSON.parse(localStorage.getItem(key));
                    
                    if (data.timestamp && data.timestamp < veryOldThreshold) {
                      veryOldEntries.push(key);
                    }
                  } catch (e) {
                    // Skip invalid entries
                  }
                }
              }
              
              // Only remove a small batch (max 5) of very old entries
              // This prevents UI disruption when switching tabs
              if (veryOldEntries.length > 0) {
                veryOldEntries.slice(0, 5).forEach(key => {
                  try {
                    localStorage.removeItem(key);
                  } catch (e) {
                    // Ignore errors
                  }
                });
              }
            } catch (error) {
              console.error("Error in visibility change handler:", error);
            }
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lastRefreshTimestamp]);
  
  // Clear cache on user change
  useEffect(() => {
    if (user?.id) {
      // Keep user-specific data only
      if (typeof window !== 'undefined') {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key?.startsWith(CACHE_PREFIX) && !key.includes(`user_${user.id}`)) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          console.error("Error cleaning user-specific cache:", error);
        }
      }
    }
  }, [user?.id]);
  
  // Add data to cache
  const addToCache = useCallback((key, data, options = {}) => {
    const {
      expiry = DEFAULT_CACHE_EXPIRY,
      persist = true,
      userSpecific = false
    } = options;
    
    // Prepare cache key, optionally make it user-specific
    let cacheKey = key;
    if (userSpecific && user?.id) {
      cacheKey = `user_${user.id}_${key}`;
    }
    
    // Update in-memory cache
    setQueryCache(prev => ({
      ...prev,
      [cacheKey]: data
    }));
    
    // Persist to localStorage if requested
    if (persist && typeof window !== 'undefined') {
      try {
        const storageItem = {
          value: data,
          expiry: Date.now() + expiry,
          timestamp: Date.now()
        };
        
        localStorage.setItem(`${CACHE_PREFIX}${cacheKey}`, JSON.stringify(storageItem));
      } catch (error) {
        console.error(`Error caching data for key ${cacheKey}:`, error);
      }
    }
  }, [user?.id]);
  
  // Get data from cache
  const getFromCache = useCallback((key, userSpecific = false) => {
    // Check user-specific key first if requested
    if (userSpecific && user?.id) {
      const userKey = `user_${user.id}_${key}`;
      if (queryCache[userKey] !== undefined) {
        return queryCache[userKey];
      }
    }
    
    // Then check generic key
    return queryCache[key];
  }, [queryCache, user?.id]);
  
  // Invalidate specific cache entries
  const invalidateCache = useCallback((keyPattern) => {
    // Update state
    setQueryCache(prev => {
      const newCache = { ...prev };
      
      // Remove matching keys
      Object.keys(newCache).forEach(key => {
        if (typeof keyPattern === 'string' && key.includes(keyPattern)) {
          delete newCache[key];
        } else if (keyPattern instanceof RegExp && keyPattern.test(key)) {
          delete newCache[key];
        }
      });
      
      return newCache;
    });
    
    // Remove from localStorage
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          
          if (key?.startsWith(CACHE_PREFIX)) {
            const cacheKey = key.replace(CACHE_PREFIX, '');
            
            if ((typeof keyPattern === 'string' && cacheKey.includes(keyPattern)) ||
                (keyPattern instanceof RegExp && keyPattern.test(cacheKey))) {
              localStorage.removeItem(key);
            }
          }
        }
      } catch (error) {
        console.error("Error invalidating cache:", error);
      }
    }
  }, []);
  
  // Clear entire cache
  const clearCache = useCallback(() => {
    // Clear in-memory cache
    setQueryCache({});
    
    // Clear from localStorage
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          
          if (key?.startsWith(CACHE_PREFIX)) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error("Error clearing cache:", error);
      }
    }
  }, []);
  
  // IMPROVED: Loading state management with timeout safety
  const startLoading = useCallback(() => {
    loadingCountRef.current += 1;
    setIsLoading(true);
    
    // Safety timeout to prevent stuck loading state
    setTimeout(() => {
      if (loadingCountRef.current > 0) {
        console.warn('Loading state stuck for 10 seconds, auto-resetting');
        loadingCountRef.current = 0;
        setIsLoading(false);
      }
    }, 10000); // 10 second max loading time
  }, []);
  
  const stopLoading = useCallback(() => {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
    
    if (loadingCountRef.current === 0) {
      setIsLoading(false);
    }
  }, []);
  
  // Registry to track which data has been fetched
  const registerDataFetch = useCallback((key, options = {}) => {
    const { userSpecific = false } = options;
    
    let registryKey = key;
    if (userSpecific && user?.id) {
      registryKey = `user_${user.id}_${key}`;
    }
    
    setDataFetchRegistry(prev => ({
      ...prev,
      [registryKey]: Date.now()
    }));
  }, [user?.id]);
  
  const isFetched = useCallback((key, options = {}) => {
    const { userSpecific = false, maxAge = null } = options;
    
    let registryKey = key;
    if (userSpecific && user?.id) {
      registryKey = `user_${user.id}_${key}`;
    }
    
    const fetchTime = dataFetchRegistry[registryKey];
    
    if (!fetchTime) return false;
    
    // Check if fetch is still fresh
    if (maxAge !== null) {
      return (Date.now() - fetchTime) <= maxAge;
    }
    
    return true;
  }, [dataFetchRegistry, user?.id]);
  
  // Context value
  const value = {
    queryCache,
    addToCache,
    getFromCache,
    invalidateCache,
    clearCache,
    isLoading,
    startLoading,
    stopLoading,
    registerDataFetch,
    isFetched
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

// Specialized hooks for specific data types - WITH IMPROVED TIMEOUT & EXPIRY SETTINGS
export function useQueryCache(queryKey, fetchFunction, options = {}) {
  const {
    enabled = true,
    userSpecific = false,
    refetchOnMount = false,
    refetchOnFocus = false,
    staleTime = 30 * 60 * 1000, // 30 minutes (increased from 5)
    cacheTime = 2 * 60 * 60 * 1000, // 2 hours (increased from 30 min)
    onSuccess = () => {},
    onError = () => {},
    dependencies = []
  } = options;
  
  const { 
    getFromCache, 
    addToCache, 
    startLoading, 
    stopLoading,
    registerDataFetch,
    isFetched
  } = useGlobalData();
  
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fetchTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  
  // Clean up on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);
  
  // Function to fetch data with improved timeout handling
  const fetchData = useCallback(async (force = false) => {
    // Skip if disabled or already fetched and not forced
    if (!enabled || (!force && isFetched(queryKey, { userSpecific, maxAge: staleTime }))) {
      return;
    }
    
    // Check cache first
    const cachedData = getFromCache(queryKey, userSpecific);
    if (cachedData !== undefined && !force) {
      setData(cachedData);
      return;
    }
    
    // Set timeout for fetch operation
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        console.warn(`Fetch timeout for ${queryKey} after 15 seconds`);
        setIsLoading(false);
        stopLoading();
        setError(new Error('Fetch operation timed out'));
      }
    }, 15000); // 15 second timeout
    
    if (isMountedRef.current) {
      setIsLoading(true);
      startLoading();
    }
    
    try {
      const result = await fetchFunction();
      
      // Clear timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setData(result);
        setError(null);
        
        // Cache the result
        addToCache(queryKey, result, {
          expiry: cacheTime,
          userSpecific
        });
        
        // Register that this data has been fetched
        registerDataFetch(queryKey, { userSpecific });
        
        onSuccess(result);
      }
    } catch (err) {
      // Clear timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      
      console.error(`Error fetching data for ${queryKey}:`, err);
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setError(err);
        onError(err);
      }
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsLoading(false);
        stopLoading();
      }
    }
  }, [queryKey, fetchFunction, enabled, userSpecific, staleTime, cacheTime, 
      getFromCache, addToCache, startLoading, stopLoading, registerDataFetch, 
      isFetched, onSuccess, onError, ...dependencies]);
  
  // Initial fetch
  useEffect(() => {
    // Try to get from cache first
    const cachedData = getFromCache(queryKey, userSpecific);
    
    if (cachedData !== undefined) {
      setData(cachedData);
      
      // Refetch if requested and stale
      if (refetchOnMount && !isFetched(queryKey, { userSpecific, maxAge: staleTime })) {
        fetchData();
      }
    } else if (enabled) {
      // No cache, fetch fresh data
      fetchData();
    }
  }, [queryKey, enabled, fetchData, getFromCache, userSpecific, refetchOnMount, 
      isFetched, staleTime]);
  
  // IMPROVED: Handle refetch on focus with better debouncing
  useEffect(() => {
    if (!refetchOnFocus) return;
    
    let focusTimeout;
    
    const handleFocus = () => {
      // Skip the first focus event on mount
      if (!isMountedRef.current) return;
      
      // Debounce focus events
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
      
      focusTimeout = setTimeout(() => {
        // Only refetch if data is stale
        if (!isFetched(queryKey, { userSpecific, maxAge: staleTime })) {
          fetchData();
        }
      }, 100);
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
    };
  }, [refetchOnFocus, queryKey, userSpecific, staleTime, isFetched, fetchData]);
  
  return {
    data,
    error,
    isLoading,
    refetch: () => fetchData(true)
  };
}