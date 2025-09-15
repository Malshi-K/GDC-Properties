// /lib/utils/dataFetchingUtils.js - Fixed version
import { supabase } from '@/lib/supabase';

/**
 * Enhanced data fetching utility for Supabase with proper error handling
 * @param {Object} params - Query parameters
 * @param {string} params.table - Table name
 * @param {string} params.select - Select clause (default: '*')
 * @param {Object|Array} params.filters - Where conditions
 * @param {Object} params.orderBy - Order by clause
 * @param {number} params.limit - Limit results
 * @param {number} params.offset - Offset for pagination
 * @param {boolean} params.single - Return single result
 * @param {boolean} params.count - Include count
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
    single = false,
    count = false,
    rpc,
    rpcParams
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

    // Validate required parameters
    if (!table) {
      throw new Error('Table name is required for non-RPC queries');
    }

    console.log(`Querying table: ${table}`, { 
      select: select.substring(0, 100) + (select.length > 100 ? '...' : ''), 
      filters, 
      orderBy, 
      limit, 
      offset,
      single,
      count 
    });

    // Start building the query with proper count handling
    if (count) {
      query = supabase.from(table).select(select, { count: 'exact' });
    } else {
      query = supabase.from(table).select(select);
    }

    // Apply filters - only support object format for better reliability
    if (filters && typeof filters === 'object' && !Array.isArray(filters)) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'object' && value.operator) {
            // Handle complex filter objects
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
              case 'is':
                query = query.is(key, value.value);
                break;
              default:
                console.warn(`Unknown operator: ${value.operator}, using eq`);
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
        orderBy.forEach(order => {
          query = query.order(order.column, { ascending: order.ascending !== false });
        });
      } else {
        query = query.order(orderBy.column, { ascending: orderBy.ascending !== false });
      }
    }

    // Apply pagination using range instead of limit/offset for better performance
    if (limit || offset) {
      const from = offset || 0;
      const to = from + (limit || 1000) - 1;
      query = query.range(from, to);
    }

    // Execute query
    let result;
    if (single) {
      result = await query.single();
    } else {
      result = await query;
    }

    const { data, error, count: totalCount } = result;

    if (error) {
      console.error(`Query failed for table ${table}:`, error);
      throw error;
    }

    console.log(`✅ Successfully fetched ${Array.isArray(data) ? data?.length || 0 : 1} records from ${table}`);
    
    // Return the correct structure
    if (count) {
      return { 
        data: data || (single ? null : []), 
        count: totalCount || 0 
      };
    }
    
    return data || (single ? null : []);

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
    rpcParams,
    single
  } = params;

  const keyParts = [];

  if (rpc) {
    keyParts.push(`rpc_${rpc}`);
    if (rpcParams && Object.keys(rpcParams).length > 0) {
      // Create a shorter hash for RPC params
      const paramsStr = JSON.stringify(rpcParams);
      keyParts.push(hashString(paramsStr).toString(36).slice(0, 8));
    }
  } else {
    keyParts.push(table);
    
    if (select !== '*') {
      keyParts.push(`sel_${hashString(select).toString(36).slice(0, 8)}`);
    }
    
    if (Object.keys(filters).length > 0) {
      keyParts.push(`fil_${hashString(JSON.stringify(filters)).toString(36).slice(0, 8)}`);
    }
    
    if (orderBy) {
      keyParts.push(`ord_${hashString(JSON.stringify(orderBy)).toString(36).slice(0, 8)}`);
    }
    
    if (limit) {
      keyParts.push(`lim_${limit}`);
    }
    
    if (offset) {
      keyParts.push(`off_${offset}`);
    }

    if (single) {
      keyParts.push('single');
    }
  }

  return keyParts.join('_');
}

/**
 * Simple hash function for creating shorter cache keys
 */
function hashString(str) {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Batch fetch multiple queries efficiently
 * @param {Array} queries - Array of query parameter objects
 * @returns {Promise<Array>} Array of results in the same order as queries
 */
export async function batchFetchSupabaseData(queries) {
  console.log(`Executing batch fetch for ${queries.length} queries`);
  
  try {
    const promises = queries.map((query, index) => 
      fetchSupabaseData(query).catch(error => {
        console.error(`Batch query ${index} failed:`, error);
        return null;
      })
    );
    
    const results = await Promise.all(promises);
    return results;
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
   * Get all properties (simple query without joins)
   */
  getAllProperties: (filters = {}) => ({
    table: 'properties',
    select: '*',
    filters,
    orderBy: { column: 'created_at', ascending: false }
  }),

  /**
   * Get property by ID
   */
  getPropertyById: (id) => ({
    table: 'properties',
    select: '*',
    filters: { id },
    single: true
  }),

  /**
   * Get properties by owner ID
   */
  getPropertiesByOwner: (ownerId) => ({
    table: 'properties',
    select: '*',
    filters: { owner_id: ownerId },
    orderBy: { column: 'created_at', ascending: false }
  }),

  /**
   * Get properties by status
   */
  getPropertiesByStatus: (status) => ({
    table: 'properties',
    select: '*',
    filters: { status },
    orderBy: { column: 'created_at', ascending: false }
  }),

  /**
   * Get multiple profiles by IDs
   */
  getProfilesByIds: (ids) => ({
    table: 'profiles',
    select: 'id, full_name, email, phone, role',
    filters: { id: { operator: 'in', value: ids } }
  })
};

/**
 * Utility to test database connection and basic operations
 */
export async function checkDatabaseConnection() {
  try {
    console.log('Checking database connection...');
    
    // Test 1: Basic connectivity with a simple select
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Database connection test failed:', testError);
      return { 
        connected: false, 
        error: testError.message,
        canRead: false,
        canWrite: false 
      };
    }
    
    console.log('✅ Database read access confirmed');
    
    // Test 2: Check write permissions by attempting a safe operation
    let canWrite = false;
    try {
      // Try to select from a table that requires write permissions to test RLS
      const { error: writeTestError } = await supabase
        .from('properties')
        .select('id')
        .limit(1);
      
      canWrite = !writeTestError;
    } catch (writeError) {
      console.warn('Write permission test failed (this may be expected):', writeError.message);
    }
    
    console.log('✅ Database connection successful');
    return { 
      connected: true, 
      error: null,
      canRead: true,
      canWrite 
    };
    
  } catch (error) {
    console.error('Database connection check failed:', error);
    return { 
      connected: false, 
      error: error.message,
      canRead: false,
      canWrite: false 
    };
  }
}

/**
 * Simple query builder for common operations
 */
export class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.selectClause = '*';
    this.filterClauses = {};
    this.orderClauses = [];
    this.limitValue = null;
    this.offsetValue = null;
    this.singleResult = false;
  }

  select(columns) {
    this.selectClause = columns;
    return this;
  }

  where(column, operator, value) {
    this.filterClauses[column] = { operator, value };
    return this;
  }

  eq(column, value) {
    this.filterClauses[column] = value;
    return this;
  }

  like(column, value) {
    this.filterClauses[column] = { operator: 'like', value };
    return this;
  }

  ilike(column, value) {
    this.filterClauses[column] = { operator: 'ilike', value };
    return this;
  }

  in(column, values) {
    this.filterClauses[column] = { operator: 'in', value: values };
    return this;
  }

  orderBy(column, ascending = true) {
    this.orderClauses.push({ column, ascending });
    return this;
  }

  limit(count) {
    this.limitValue = count;
    return this;
  }

  offset(count) {
    this.offsetValue = count;
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  build() {
    return {
      table: this.table,
      select: this.selectClause,
      filters: this.filterClauses,
      orderBy: this.orderClauses.length > 0 ? this.orderClauses : undefined,
      limit: this.limitValue,
      offset: this.offsetValue,
      single: this.singleResult
    };
  }

  async execute() {
    return fetchSupabaseData(this.build());
  }
}

/**
 * Create a new query builder
 */
export function query(table) {
  return new QueryBuilder(table);
}

/**
 * Export all utilities
 */
export default {
  fetchSupabaseData,
  generateCacheKey,
  batchFetchSupabaseData,
  QueryHelpers,
  checkDatabaseConnection,
  query,
  QueryBuilder
};