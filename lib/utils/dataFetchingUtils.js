// /lib/utils/dataFetchingUtils.js
import { supabase } from '@/lib/supabase';

// Generic function to fetch data from Supabase with caching support
export async function fetchSupabaseData({ 
  table, 
  select = '*', 
  filters = [], 
  orderBy = null,
  pagination = null,
  count = false,
  distinct = false
}) {
  try {
    // Start building query
    let query = supabase.from(table).select(select, count ? { count: 'exact' } : undefined);
    
    // Apply filters
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
          // FIXED: Handle the not.is operator correctly
          query = query.not(column, 'is', value);
          break;
        case 'in':
          query = negate ? query.not(column, 'in', value) : query.in(column, value);
          break;
        case 'not.in':
          // Handle not.in operator
          query = query.not(column, 'in', value);
          break;
        default:
          console.warn(`Unknown operator: ${operator}`);
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
    
    if (error) {
      console.error(`Supabase query error for table ${table}:`, error);
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
    
    // FIXED: Always return the correct structure
    if (count) {
      return { 
        data: processedData || [], 
        count: totalCount || 0 
      };
    }
    
    return processedData || [];
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