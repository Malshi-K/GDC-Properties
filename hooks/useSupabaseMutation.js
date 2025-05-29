// /hooks/useSupabaseMutation.js
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useGlobalData } from '@/contexts/GlobalDataContext';

export function useSupabaseMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { invalidateCache } = useGlobalData();

  const mutate = useCallback(async (mutationFn, invalidationPatterns = []) => {
    setLoading(true);
    setError(null);

    try {
      const result = await mutationFn();
      
      if (result.error) {
        throw result.error;
      }

      // Invalidate related cache entries
      invalidationPatterns.forEach(pattern => {
        invalidateCache(pattern);
      });

      console.log('Mutation successful, invalidated cache patterns:', invalidationPatterns);
      return result;
    } catch (err) {
      console.error('Mutation error:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [invalidateCache]);

  return {
    mutate,
    loading,
    error
  };
}

// Specific mutation hooks
export function useCreateProperty() {
  const { mutate, loading, error } = useSupabaseMutation();

  const createProperty = useCallback(async (propertyData) => {
    return mutate(
      () => supabase.from('properties').insert(propertyData).select().single(),
      ['properties'] // Invalidate all properties cache
    );
  }, [mutate]);

  return { createProperty, loading, error };
}

export function useUpdateProperty() {
  const { mutate, loading, error } = useSupabaseMutation();

  const updateProperty = useCallback(async (id, updates) => {
    return mutate(
      () => supabase.from('properties').update(updates).eq('id', id).select().single(),
      ['properties'] // Invalidate all properties cache
    );
  }, [mutate]);

  return { updateProperty, loading, error };
}

export function useDeleteProperty() {
  const { mutate, loading, error } = useSupabaseMutation();

  const deleteProperty = useCallback(async (id) => {
    return mutate(
      () => supabase.from('properties').delete().eq('id', id),
      ['properties'] // Invalidate all properties cache
    );
  }, [mutate]);

  return { deleteProperty, loading, error };
}