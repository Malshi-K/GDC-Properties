'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Make sure path is correct
import { toast } from 'react-hot-toast'; // Optional but recommended for user feedback

// Create context with expanded functionality
const AuthContext = createContext({
  user: null,
  profile: null,
  userRole: null,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfile: async () => {},
  updateProfilePhoto: async () => {},
  navigateToDashboard: () => {},
});

// Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Get user profile data
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error.message);
      return null;
    }
  };

  // Function to refresh user profile data
  const refreshProfile = async () => {
    if (!user) return;
    
    const profileData = await fetchProfile(user.id);
    if (profileData) {
      setProfile(profileData);
      setUserRole(profileData.role);
    }
  };

  // Update profile information
  const updateProfile = async (profileData) => {
    if (!user) {
      return { error: new Error('No authenticated user') };
    }

    try {
      // Prepare data with current timestamp
      const dataToUpdate = {
        ...profileData,
        updated_at: new Date().toISOString(),
      };

      // Update profile in database
      const { data, error } = await supabase
        .from('profiles')
        .update(dataToUpdate)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setProfile(data);
      if (data.role !== userRole) {
        setUserRole(data.role);
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { data: null, error };
    }
  };

  // Update profile photo
  const updateProfilePhoto = async (file) => {
    if (!user) {
      return { error: new Error('No authenticated user') };
    }

    try {
      // Create a unique file path
      const filePath = `${user.id}/${Date.now()}_profile`;
      
      // Upload the file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL for the file
      const { data: publicUrlData } = await supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // Update the profile with the new image path
      const { data, error } = await supabase
        .from('profiles')
        .update({
          profile_image: filePath,
          profile_image_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setProfile(data);

      return { data, error: null };
    } catch (error) {
      console.error('Error updating profile photo:', error);
      return { data: null, error };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Initial load and auth state changes
  useEffect(() => {
    const setupUser = async () => {
      setIsLoading(true);
      
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        const profileData = await fetchProfile(session.user.id);
        if (profileData) {
          setProfile(profileData);
          setUserRole(profileData.role);
        }
      }
      
      setIsLoading(false);
    };
    
    setupUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          const profileData = await fetchProfile(session.user.id);
          if (profileData) {
            setProfile(profileData);
            setUserRole(profileData.role);
          }
        } else {
          setUser(null);
          setProfile(null);
          setUserRole(null);
        }
        setIsLoading(false);
      }
    );
    
    return () => {
      subscription?.unsubscribe();
    };
  }, [router]);

  // Navigate to dashboard based on role
  const navigateToDashboard = () => {
    if (userRole === 'owner') {
      router.push('/dashboard/owner');
    } else {
      router.push('/dashboard/user');
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return userRole === role;
  };

  // Provide context values
  const value = {
    user,
    profile,
    userRole,
    isLoading,
    signOut,
    refreshProfile,
    updateProfile,
    updateProfilePhoto,
    navigateToDashboard,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}