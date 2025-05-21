// /lib/cachedSupabase.js
import { supabase } from '@/lib/supabase';
import { generateCacheKey } from '@/lib/utils/dataFetchingUtils';

// Create a caching wrapper around Supabase client
export function createCachedSupabaseClient(cacheManager) {
  const { getFromCache, addToCache, invalidateCache } = cacheManager;
  
  // Helper to create a cached query
  const createCachedQuery = (tableMethod) => {
    return {
      select: (columns = '*', options = {}) => {
        let query = tableMethod.select(columns, options);
        let queryFilters = [];
        let queryOrder = null;
        let queryPagination = null;
        let queryCount = options?.count || false;
        
        // Methods to build the query
        const buildMethods = {
          eq: (column, value) => {
            queryFilters.push({ type: 'eq', column, value });
            query = query.eq(column, value);
            return buildMethods;
          },
          neq: (column, value) => {
            queryFilters.push({ type: 'neq', column, value });
            query = query.neq(column, value);
            return buildMethods;
          },
          gt: (column, value) => {
            queryFilters.push({ type: 'gt', column, value });
            query = query.gt(column, value);
            return buildMethods;
          },
          gte: (column, value) => {
            queryFilters.push({ type: 'gte', column, value });
            query = query.gte(column, value);
            return buildMethods;
          },
          lt: (column, value) => {
            queryFilters.push({ type: 'lt', column, value });
            query = query.lt(column, value);
            return buildMethods;
          },
          lte: (column, value) => {
            queryFilters.push({ type: 'lte', column, value });
            query = query.lte(column, value);
            return buildMethods;
          },
          like: (column, value) => {
            queryFilters.push({ type: 'like', column, value });
            query = query.like(column, value);
            return buildMethods;
          },
          ilike: (column, value) => {
            queryFilters.push({ type: 'ilike', column, value });
            query = query.ilike(column, value);
            return buildMethods;
          },
          is: (column, value) => {
            queryFilters.push({ type: 'is', column, value });
            query = query.is(column, value);
            return buildMethods;
          },
          in: (column, values) => {
            queryFilters.push({ type: 'in', column, value: values });
            query = query.in(column, values);
            return buildMethods;
          },
          not: (column, operator, value) => {
            queryFilters.push({ type: 'not', column, operator, value });
            query = query.not(column, operator, value);
            return buildMethods;
          },
          order: (column, options = {}) => {
            queryOrder = { column, options };
            query = query.order(column, options);
            return buildMethods;
          },
          range: (from, to) => {
            queryPagination = { from, to };
            query = query.range(from, to);
            return buildMethods;
          },
          limit: (count) => {
            queryPagination = { limit: count };
            query = query.limit(count);
            return buildMethods;
          },
          single: () => {
            query = query.single();
            return buildMethods;
          },
          
          // Execute query with caching
          execute: async (cacheOptions = {}) => {
            const {
              enabled = true,
              key = null,
              ttl = 5 * 60 * 1000, // 5 minutes
              invalidateOn = []
            } = cacheOptions;
            
            // Generate cache key if none provided
            const cacheKey = key || generateCacheKey({
              table: tableMethod.table,
              columns,
              filters: queryFilters,
              order: queryOrder,
              pagination: queryPagination,
              count: queryCount
            });
            
            // Try to get from cache if enabled
            if (enabled) {
              const cachedResult = getFromCache(cacheKey);
              if (cachedResult) return cachedResult;
            }
            
            // Otherwise execute the query
            const result = await query;
            
            // Cache the result if successful and enabled
            if (enabled && !result.error) {
              addToCache(cacheKey, result, { expiry: ttl });
            }
            
            // Handle invalidation patterns if provided
            if (result.data && invalidateOn.length > 0) {
              invalidateOn.forEach(pattern => {
                invalidateCache(pattern);
              });
            }
            
            return result;
          }
        };
        
        return buildMethods;
      },
      
      // Add other methods like insert, update, delete with cache invalidation
      insert: (data, options = {}) => {
        const query = tableMethod.insert(data, options);
        const tableName = tableMethod.table;
        
        return {
          ...query,
          
          // Override the original execute method
          execute: async (invalidationPatterns = []) => {
            const result = await query;
            
            // Invalidate cache on successful insert
            if (!result.error) {
              // Always invalidate the table's cache
              invalidateCache(tableName);
              
              // Also invalidate any additional patterns
              invalidationPatterns.forEach(pattern => {
                invalidateCache(pattern);
              });
            }
            
            return result;
          }
        };
      },
      
      update: (data, options = {}) => {
        const query = tableMethod.update(data, options);
        const tableName = tableMethod.table;
        
        // Add filter methods with chaining
        const buildMethods = {
          eq: (column, value) => {
            query = query.eq(column, value);
            return buildMethods;
          },
          // Add other filter methods as needed
          
          execute: async (invalidationPatterns = []) => {
            const result = await query;
            
            // Invalidate cache on successful update
            if (!result.error) {
              // Always invalidate the table's cache
              invalidateCache(tableName);
              
              // Also invalidate any additional patterns
              invalidationPatterns.forEach(pattern => {
                invalidateCache(pattern);
              });
            }
            
            return result;
          }
        };
        
        return buildMethods;
      },
      
      delete: () => {
        const query = tableMethod.delete();
        const tableName = tableMethod.table;
        
        // Add filter methods with chaining
        const buildMethods = {
          eq: (column, value) => {
            query = query.eq(column, value);
            return buildMethods;
          },
          // Add other filter methods as needed
          
          execute: async (invalidationPatterns = []) => {
            const result = await query;
            
            // Invalidate cache on successful delete
            if (!result.error) {
              // Always invalidate the table's cache
              invalidateCache(tableName);
              
              // Also invalidate any additional patterns
              invalidationPatterns.forEach(pattern => {
                invalidateCache(pattern);
              });
            }
            
            return result;
          }
        };
        
        return buildMethods;
      }
    };
  };
  
  // Create cached version of Supabase API
  return {
    from: (table) => {
      return createCachedQuery(supabase.from(table));
    },
    
    // Pass through other Supabase methods
    auth: supabase.auth,
    storage: supabase.storage,
    // Add other Supabase API methods as needed
    
    // Add a method to get the original client
    getRawClient: () => supabase
  };
}

// Custom hook to get cached Supabase client
export function useCachedSupabase() {
  const cacheManager = useGlobalData();
  return useMemo(() => createCachedSupabaseClient(cacheManager), [cacheManager]);
}