// /hooks/useSupabaseData.js
import { useState, useEffect, useCallback } from 'react';
import { useGlobalData } from '@/contexts/GlobalDataContext';

export function useSupabaseData(params, options = {}) {
  const { 
    enabled = true,
    refetchOnMount = false,
    ttl = 10 * 60 * 1000 // 10 minutes
  } = options;

  const { fetchData, data: globalData, loading: globalLoading } = useGlobalData();
  const [error, setError] = useState(null);
  
  // Generate cache key for this query
  const cacheKey = JSON.stringify(params, Object.keys(params).sort());
  
  // Get data and loading state for this specific query
  const data = globalData[cacheKey] || null;
  const loading = globalLoading[cacheKey] || false;

  // Fetch function
  const fetch = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    try {
      setError(null);
      const result = await fetchData(params, {
        useCache: !forceRefresh,
        ttl,
        onError: (err) => setError(err)
      });
      return result;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [enabled, fetchData, params, ttl]);

  // Initial fetch
  useEffect(() => {
    if (enabled && (!data || refetchOnMount)) {
      fetch();
    }
  }, [enabled, data, refetchOnMount, fetch]);

  // Refetch function
  const refetch = useCallback(() => {
    return fetch(true);
  }, [fetch]);

  return {
    data,
    loading,
    error,
    refetch
  };
}

// Specialized hooks for common data patterns
export function useProperties(filters = [], options = {}) {
  return useSupabaseData({
    table: 'properties',
    select: '*, owner:profiles!owner_id(full_name)',
    filters,
    orderBy: { column: 'created_at', ascending: false }
  }, options);
}

export function useUserProfile(userId, options = {}) {
  return useSupabaseData({
    table: 'profiles',
    select: '*',
    filters: [{ column: 'id', operator: 'eq', value: userId }]
  }, {
    enabled: !!userId,
    ...options
  });
}

export function usePropertyById(propertyId, options = {}) {
  return useSupabaseData({
    table: 'properties',
    select: '*, owner:profiles!owner_id(full_name)',
    filters: [{ column: 'id', operator: 'eq', value: propertyId }]
  }, {
    enabled: !!propertyId,
    ...options
  });
}