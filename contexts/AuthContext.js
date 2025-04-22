'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Make sure path is correct

// Create context
const AuthContext = createContext({
  user: null,
  profile: null,
  userRole: null,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
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

  // Sign out function
  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
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

  // Provide context values
  const value = {
    user,
    profile,
    userRole,
    isLoading,
    signOut,
    refreshProfile,
    navigateToDashboard,
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