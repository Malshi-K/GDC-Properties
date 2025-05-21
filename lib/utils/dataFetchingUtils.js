// /lib/utils/dataFetchingUtils.js
import { supabase } from '@/lib/supabase';

// Generic function to fetch data from Supabase with caching support
export async function fetchSupabaseData({ 
  table, 
  select = '*', 
  filters = [], 
  orderBy = null,
  pagination = null,
  count = false
}) {
  try {
    // Start building query
    let query = supabase.from(table).select(select, count ? { count: 'exact' } : undefined);
    
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
        case 'like':
          query = query.like(column, value);
          break;
        case 'ilike':
          query = query.ilike(column, value);
          break;
        case 'is':
          query = query.is(column, value);
          break;
        case 'in':
          query = query.in(column, value);
          break;
        default:
          break;
      }
    });
    
    // Apply order
    if (orderBy) {
      const { column, ascending = true } = orderBy;
      query = query.order(column, { ascending });
    }
    
    // Apply pagination
    if (pagination) {
      const { page, pageSize } = pagination;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }
    
    // Execute query
    const { data, error, count: totalCount } = await query;
    
    if (error) throw error;
    
    return count ? { data, totalCount } : data;
  } catch (error) {
    console.error(`Error fetching data from ${table}:`, error);
    throw error;
  }
}

// Helper to generate a consistent cache key
export function generateCacheKey(params) {
  try {
    // Sort object keys to ensure consistent cache keys regardless of property order
    return JSON.stringify(params, Object.keys(params).sort());
  } catch (e) {
    // Fallback for non-serializable objects
    return String(Date.now());
  }
}