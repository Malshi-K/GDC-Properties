// /lib/utils/dataFetchingUtils.js
import { supabase } from '@/lib/supabase';

/**
 * Enhanced data fetching utility for Supabase with support for various query types
 * @param {Object} params - Query parameters
 * @param {string} params.table - Table name
 * @param {string} params.select - Select clause (default: '*')
 * @param {Object|Array} params.filters - Where conditions (supports both object and array formats)
 * @param {Object} params.orderBy - Order by clause
 * @param {number} params.limit - Limit results
 * @param {number} params.offset - Offset for pagination
 * @param {string} params.rpc - RPC function name (for stored procedures)
 * @param {Object} params.rpcParams - RPC function parameters
 * @returns {Promise<Array|Object>} Query results
 */
export async function fetchSupabaseData(params) {
  const {
    table,
    select = '*',
    filters = {},
    orderBy,
    limit,
    offset,
    rpc,
    rpcParams,
    single = false,
    count = false,
    distinct = false,
    pagination = null
  } = params;

  try {
    let query;

    // Handle RPC calls
    if (rpc) {
      console.log(`Executing RPC: ${rpc}`, rpcParams);
      const { data, error } = await supabase.rpc(rpc, rpcParams || {});
      
      if (error) {
        console.error(`RPC ${rpc} failed:`, error);
        throw error;
      }
      
      return data;
    }

    // Handle regular table queries
    if (!table) {
      throw new Error('Table name is required for non-RPC queries');
    }

    console.log(`Querying table: ${table}`, { select, filters, orderBy, limit, offset });

    // Start building the query
    query = supabase.from(table).select(select, count ? { count: 'exact' } : undefined);

    // Apply filters - support both object and array formats
    if (Array.isArray(filters)) {
      // Handle array format (from original dataFetchingUtils)
      filters.forEach(filter => {
        const { column, operator, value, negate = false } = filter;
        
        switch (operator) {
          case 'eq':
            query = negate ? query.neq(column, value) : query.eq(column, value);
            break;
          case 'neq':
            query = negate ? query.eq(column, value) : query.neq(column, value);
            break;
          case 'gt':
            query = negate ? query.lte(column, value) : query.gt(column, value);
            break;
          case 'gte':
            query = negate ? query.lt(column, value) : query.gte(column, value);
            break;
          case 'lt':
            query = negate ? query.gte(column, value) : query.lt(column, value);
            break;
          case 'lte':
            query = negate ? query.gt(column, value) : query.lte(column, value);
            break;
          case 'like':
            query = negate ? query.not(column, 'like', value) : query.like(column, value);
            break;
          case 'ilike':
            query = negate ? query.not(column, 'ilike', value) : query.ilike(column, value);
            break;
          case 'is':
            query = negate ? query.not(column, 'is', value) : query.is(column, value);
            break;
          case 'not.is':
            query = query.not(column, 'is', value);
            break;
          case 'in':
            query = negate ? query.not(column, 'in', value) : query.in(column, value);
            break;
          case 'not.in':
            query = query.not(column, 'in', value);
            break;
          default:
            console.warn(`Unknown operator: ${operator}`);
            break;
        }
      });
    } else if (filters && typeof filters === 'object') {
      // Handle object format (new enhanced format)
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && value.operator) {
            // Handle complex filter objects like { operator: 'ilike', value: '%search%' }
            switch (value.operator) {
              case 'ilike':
                query = query.ilike(key, value.value);
                break;
              case 'like':
                query = query.like(key, value.value);
                break;
              case 'eq':
                query = query.eq(key, value.value);
                break;
              case 'neq':
                query = query.neq(key, value.value);
                break;
              case 'gt':
                query = query.gt(key, value.value);
                break;
              case 'gte':
                query = query.gte(key, value.value);
                break;
              case 'lt':
                query = query.lt(key, value.value);
                break;
              case 'lte':
                query = query.lte(key, value.value);
                break;
              case 'in':
                query = query.in(key, value.value);
                break;
              case 'contains':
                query = query.contains(key, value.value);
                break;
              case 'containedBy':
                query = query.containedBy(key, value.value);
                break;
              case 'is':
                query = query.is(key, value.value);
                break;
              default:
                query = query.eq(key, value.value);
            }
          } else {
            // Simple equality filter
            query = query.eq(key, value);
          }
        }
      });
    }

    // Apply ordering
    if (orderBy) {
      if (Array.isArray(orderBy)) {
        // Multiple order by clauses
        orderBy.forEach(order => {
          query = query.order(order.column, { ascending: order.ascending !== false });
        });
      } else {
        // Single order by clause
        query = query.order(orderBy.column, { ascending: orderBy.ascending !== false });
      }
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }

    // Apply offset for pagination
    if (offset) {
      query = query.range(offset, offset + (limit || 1000) - 1);
    }

    // Apply pagination (alternative to offset/limit)
    if (pagination) {
      const { page, pageSize } = pagination;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    // Execute query
    const { data, error, count: totalCount } = single ? await query.single() : await query;

    if (error) {
      console.error(`Query failed for table ${table}:`, error);
      throw error;
    }

    // Handle distinct at the data level if needed
    let processedData = data;
    if (distinct && data && Array.isArray(data) && select && select !== '*') {
      const columnName = select.split(',')[0].trim(); // Get first column for distinct
      const seen = new Set();
      processedData = data.filter(item => {
        const value = item[columnName];
        if (seen.has(value)) {
          return false;
        }
        seen.add(value);
        return true;
      });
    }

    console.log(`✅ Successfully fetched ${Array.isArray(processedData) ? processedData.length : 1} records from ${table}`);
    
    // Return the correct structure
    if (count) {
      return { 
        data: processedData || [], 
        count: totalCount || 0 
      };
    }
    
    return processedData || [];

  } catch (error) {
    console.error('fetchSupabaseData error:', error);
    throw error;
  }
}

/**
 * Generate a consistent cache key from query parameters
 * @param {Object} params - Query parameters
 * @returns {string} Cache key
 */
export function generateCacheKey(params) {
  // Handle special cached keys
  if (params._cached_key) {
    return params._cached_key;
  }

  const {
    table,
    select = '*',
    filters = {},
    orderBy,
    limit,
    offset,
    rpc,
    rpcParams
  } = params;

  const keyParts = [];

  if (rpc) {
    keyParts.push(`rpc_${rpc}`);
    if (rpcParams && Object.keys(rpcParams).length > 0) {
      keyParts.push(btoa(JSON.stringify(rpcParams)).slice(0, 8));
    }
  } else {
    keyParts.push(table);
    
    if (select !== '*') {
      keyParts.push(`sel_${btoa(select).slice(0, 8)}`);
    }
    
    if (Object.keys(filters).length > 0) {
      keyParts.push(`fil_${btoa(JSON.stringify(filters)).slice(0, 8)}`);
    }
    
    if (orderBy) {
      keyParts.push(`ord_${btoa(JSON.stringify(orderBy)).slice(0, 8)}`);
    }
    
    if (limit) {
      keyParts.push(`lim_${limit}`);
    }
    
    if (offset) {
      keyParts.push(`off_${offset}`);
    }
  }

  return keyParts.join('_');
}

/**
 * Batch fetch multiple queries efficiently
 * @param {Array} queries - Array of query parameter objects
 * @returns {Promise<Array>} Array of results in the same order as queries
 */
export async function batchFetchSupabaseData(queries) {
  console.log(`Executing batch fetch for ${queries.length} queries`);
  
  try {
    const promises = queries.map(query => fetchSupabaseData(query));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Batch query ${index} failed:`, result.reason);
        return null;
      }
    });
  } catch (error) {
    console.error('Batch fetch error:', error);
    throw error;
  }
}

/**
 * Helper function to create common query patterns
 */
export const QueryHelpers = {
  /**
   * Get all profiles with optional filters
   */
  getAllProfiles: (filters = {}) => ({
    table: 'profiles',
    select: '*',
    filters,
    orderBy: { column: 'created_at', ascending: false }
  }),

  /**
   * Get profile by ID
   */
  getProfileById: (id) => ({
    table: 'profiles',
    select: '*',
    filters: { id },
    single: true
  }),

  /**
   * Get profiles by role
   */
  getProfilesByRole: (role) => ({
    table: 'profiles',
    select: '*',
    filters: { role },
    orderBy: { column: 'created_at', ascending: false }
  }),

  /**
   * Search profiles by name or email
   */
  searchProfiles: (searchTerm) => ({
    table: 'profiles',
    select: '*',
    filters: {
      full_name: { operator: 'ilike', value: `%${searchTerm}%` }
    },
    orderBy: { column: 'created_at', ascending: false }
  }),

  /**
   * Get properties with owner details
   */
  getPropertiesWithOwners: () => ({
    table: 'properties',
    select: `
      *,
      profiles:owner_id (
        id,
        full_name,
        email,
        phone
      )
    `,
    orderBy: { column: 'created_at', ascending: false }
  }),

  /**
   * Get user statistics
   */
  getUserStats: () => ({
    rpc: 'get_user_statistics'
  }),

  /**
   * Get property statistics
   */
  getPropertyStats: () => ({
    rpc: 'get_property_statistics'
  })
};

/**
 * Real-time subscription helper
 * @param {string} table - Table to subscribe to
 * @param {Function} callback - Callback function for changes
 * @param {Object} filters - Optional filters for subscription
 * @returns {Object} Subscription object
 */
export function createRealtimeSubscription(table, callback, filters = {}) {
  console.log(`Creating realtime subscription for table: ${table}`);
  
  let subscription = supabase
    .channel(`${table}_changes`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: table,
      filter: Object.keys(filters).length > 0 ? 
        Object.entries(filters).map(([key, value]) => `${key}=eq.${value}`).join(',') : 
        undefined
    }, callback);

  return {
    subscribe: () => {
      subscription.subscribe((status) => {
        console.log(`Subscription status for ${table}:`, status);
      });
      return subscription;
    },
    unsubscribe: () => {
      subscription.unsubscribe();
      console.log(`Unsubscribed from ${table} changes`);
    }
  };
}

/**
 * Utility to check database connection and permissions
 */
export async function checkDatabaseConnection() {
  try {
    console.log('Checking database connection...');
    
    // Test basic connectivity
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      return { connected: false, error: error.message };
    }
    
    console.log('✅ Database connection successful');
    return { connected: true, error: null };
    
  } catch (error) {
    console.error('Database connection check failed:', error);
    return { connected: false, error: error.message };
  }
}

/**
 * Export all utilities
 */
export default {
  fetchSupabaseData,
  generateCacheKey,
  batchFetchSupabaseData,
  QueryHelpers,
  createRealtimeSubscription,
  checkDatabaseConnection
};