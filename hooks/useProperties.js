// /hooks/useProperties.js
import { useQueryCache } from '@/contexts/GlobalDataContext';
import { supabase } from '@/lib/supabase';
import { generateCacheKey } from '@/lib/utils/dataFetchingUtils';
import { useImageLoader } from '@/lib/services/imageLoaderService';
import { useEffect } from 'react';

export function useProperties(options = {}) {
  const {
    filters = [],
    pagination = { page: 1, pageSize: 10 },
    orderBy = { column: 'created_at', ascending: false },
    enabled = true,
    staleTime = 5 * 60 * 1000,
    onSuccess = () => {}
  } = options;
  
  const { preloadPropertiesImages } = useImageLoader();
  
  // Generate cache key from options
  const cacheKey = `properties_${generateCacheKey({
    filters,
    pagination,
    orderBy
  })}`;
  
  // Fetch properties using global cache
  const result = useQueryCache(
    cacheKey,
    async () => {
      try {
        let query = supabase.from("properties").select('*', { count: 'exact' });
        
        // Apply filters
        filters.forEach(filter => {
          const { column, operator, value } = filter;
          
          switch (operator) {
            case 'eq':
              query = query.eq(column, value);
              break;
            case 'neq':
              query = query.neq(column, value);
              break;
            case 'gt':
              query = query.gt(column, value);
              break;
            case 'gte':
              query = query.gte(column, value);
              break;
            case 'lt':
              query = query.lt(column, value);
              break;
            case 'lte':
              query = query.lte(column, value);
              break;
            // Add other operators as needed
          }
        });
        
        // Apply order
        if (orderBy) {
          query = query.order(orderBy.column, { ascending: orderBy.ascending });
        }
        
        // Apply pagination
        if (pagination) {
          const from = (pagination.page - 1) * pagination.pageSize;
          const to = from + pagination.pageSize - 1;
          query = query.range(from, to);
        }
        
        // Execute
        const { data, error, count } = await query;
        
        if (error) throw error;
        
        return {
          properties: data || [],
          totalCount: count || 0
        };
      } catch (error) {
        console.error('Error fetching properties:', error);
        throw error;
      }
    },
    {
      enabled,
      staleTime,
      refetchOnFocus: false,
      onSuccess: (data) => {
        // Preload images when data is fetched
        if (data?.properties?.length > 0) {
          preloadPropertiesImages(data.properties);
        }
        onSuccess(data);
      }
    }
  );
  
  return {
    properties: result.data?.properties || [],
    totalCount: result.data?.totalCount || 0,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch
  };
}

// Hook for fetching a single property
export function useProperty(propertyId, options = {}) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000,
    onSuccess = () => {}
  } = options;
  
  const { preloadPropertiesImages } = useImageLoader();
  
  const result = useQueryCache(
    `property_${propertyId}`,
    async () => {
      try {
        const { data, error } = await supabase
          .from("properties")
          .select('*')
          .eq('id', propertyId)
          .single();
        
        if (error) throw error;
        
        return data;
      } catch (error) {
        console.error(`Error fetching property ${propertyId}:`, error);
        throw error;
      }
    },
    {
      enabled: enabled && !!propertyId,
      staleTime,
      refetchOnFocus: false,
      onSuccess: (data) => {
        // Preload property image
        if (data?.id && data?.owner_id && data?.images?.[0]) {
          preloadPropertiesImages([data]);
        }
        onSuccess(data);
      }
    }
  );
  
  return {
    property: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch
  };
}