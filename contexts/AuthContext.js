"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
  getProfileImageUrl: () => {},
});

// Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  // Add mounted check for SSR
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get user profile data
  const fetchProfile = async (userId) => {
    if (!isMounted) return null;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error fetching profile:", error.message);
      return null;
    }
  };

  // Function to refresh user profile data with retry logic
  const refreshProfile = async () => {
    if (!user || !isMounted)
      return { error: new Error("No authenticated user or not mounted") };

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        // Try once more with a delay in case of network issue
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const retryResult = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (retryResult.error) throw retryResult.error;

        setProfile(retryResult.data);
        setUserRole(retryResult.data.role);
        return { data: retryResult.data, error: null };
      }

      setProfile(data);
      setUserRole(data.role);
      return { data, error: null };
    } catch (error) {
      console.error("Error refreshing profile:", error);
      return { data: null, error };
    }
  };

  // Update profile information
  const updateProfile = async (profileData) => {
    if (!user || !isMounted) {
      return { error: new Error("No authenticated user or not mounted") };
    }

    try {
      // Validate data
      if (
        profileData.full_name !== undefined &&
        !profileData.full_name.trim()
      ) {
        return { error: new Error("Full name is required") };
      }

      // Prepare data with current timestamp
      const dataToUpdate = {
        ...profileData,
        updated_at: new Date().toISOString(),
      };

      // Update profile in database
      const { data, error } = await supabase
        .from("profiles")
        .update(dataToUpdate)
        .eq("id", user.id)
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
      console.error("Error updating profile:", error);
      return { data: null, error };
    }
  };

  // Updated updateProfilePhoto function with better error handling and database updates
  const updateProfilePhoto = async (photoData, isBase64 = false) => {
    if (!user || !isMounted) {
      return { error: new Error("No authenticated user or not mounted") };
    }

    try {
      // Generate a unique filename with timestamp to avoid caching issues
      const timestamp = Date.now();
      let filePath;
      let uploadResult;

      if (isBase64) {
        filePath = `${user.id}/profile_${timestamp}.jpg`;

        const base64Response = await fetch(
          `data:image/jpeg;base64,${photoData}`
        );
        const blob = await base64Response.blob();

        uploadResult = await supabase.storage
          .from("profile-images")
          .upload(filePath, blob, {
            contentType: "image/jpeg",
            upsert: true,
          });
      } else {
        const fileExt = photoData.name.split(".").pop();
        filePath = `${user.id}/profile_${timestamp}.${fileExt}`;

        uploadResult = await supabase.storage
          .from("profile-images")
          .upload(filePath, photoData, {
            upsert: true,
          });
      }

      if (uploadResult.error) {
        console.error("Upload error:", uploadResult.error);
        throw uploadResult.error;
      }

      console.log("Upload successful. File path:", filePath);

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(filePath);

      // Also create a signed URL for immediate use
      const { data: signedUrlData } = await supabase.storage
        .from("profile-images")
        .createSignedUrl(filePath, 3600);

      // Update profile in the database
      const profileUpdateData = {
        profile_image: filePath,
        profile_image_url: publicUrlData.publicUrl,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("profiles")
        .update(profileUpdateData)
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Database update error:", error);
        throw error;
      }

      // Update local state and return the signed URL for immediate display
      setProfile(data);

      return {
        data,
        error: null,
        signedUrl: signedUrlData?.signedUrl || publicUrlData.publicUrl,
      };
    } catch (error) {
      console.error("Error updating profile photo:", error);
      return { data: null, error };
    }
  };

  // Updated getProfileImageUrl function
  const getProfileImageUrl = async () => {
    if (!isMounted) return null;

    // Debug what values are available
    console.log("Profile data in getProfileImageUrl:", profile);

    // Check both profile_image and profile_image_url
    if (!profile?.profile_image && !profile?.profile_image_url) {
      console.log("No profile image data available");
      return null;
    }

    try {
      // If we have a profile_image path, try to generate a signed URL
      if (profile.profile_image) {
        console.log("Generating signed URL for:", profile.profile_image);

        const { data, error } = await supabase.storage
          .from("profile-images")
          .createSignedUrl(profile.profile_image, 3600);

        if (error) {
          console.error("Error generating signed URL:", error);

          // Fallback to public URL with cache busting
          if (profile.profile_image_url) {
            console.log("Falling back to public URL with cache busting");
            return `${profile.profile_image_url}?t=${Date.now()}`;
          }
          return null;
        }

        console.log("Successfully generated signed URL:", data.signedUrl);
        return data.signedUrl;
      }
      // Fallback to public URL with cache busting
      else if (profile.profile_image_url) {
        console.log("Using profile_image_url with cache busting");
        return `${profile.profile_image_url}?t=${Date.now()}`;
      }

      return null;
    } catch (error) {
      console.error("Error in getProfileImageUrl:", error);

      // Last resort fallback
      if (profile.profile_image_url) {
        return `${profile.profile_image_url}?t=${Date.now()}`;
      }
      return null;
    }
  };

  // Sign in with email + password
  const signIn = async (email, password) => {
    if (!isMounted) return { user: null, error: new Error("Not mounted") };

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Ensure profile exists
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError && profileError.code === "PGRST116") {
        // Profile not found → create it
        const { error: upsertError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          role: data.user.user_metadata?.role || "user",
          full_name: data.user.user_metadata?.full_name || "",
        });
        if (upsertError) throw upsertError;
      }

      return { user: data.user, error: null };
    } catch (err) {
      console.error("Sign in error:", err);
      return { user: null, error: err };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      // Clear local state immediately
      setUser(null);
      setProfile(null);
      setUserRole(null);

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error signing out:", error);
        // Even if there's an error, redirect to home since we cleared local state
      }

      // Always redirect to home
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
      // Still redirect even if there's an error
      router.push("/");
    }
  };

  // Initial load and auth state changes
  useEffect(() => {
    if (!isMounted) return;

    const setupUser = async () => {
      setIsLoading(true);

      // Get initial session
      const {
        data: { session },
      } = await supabase.auth.getSession();

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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
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
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [isMounted]);

  // Navigate to dashboard based on role
  const navigateToDashboard = () => {
    if (!isMounted) return;

    if (userRole === "owner") {
      router.push("/dashboard/owner");
    } else {
      router.push("/dashboard/user");
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return userRole === role;
  };

  // Update a user's role
  const updateUserRole = async (userId, newRole) => {
    if (!isMounted) return { success: false, error: new Error("Not mounted") };

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      // If the role change is for the current logged-in user, update state
      if (user?.id === userId) {
        setUserRole(newRole);
        setProfile((prev) => (prev ? { ...prev, role: newRole } : prev));
      }

      return { success: true, error: null };
    } catch (err) {
      console.error("Error updating user role:", err.message);
      return { success: false, error: err };
    }
  };

  // Reset password for a given email
  const resetPassword = async (email) => {
    if (!isMounted) return { success: false, error: new Error("Not mounted") };

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return { success: true, error: null };
    } catch (err) {
      console.error("Error resetting password:", err.message);
      return { success: false, error: err };
    }
  };

  // Don't render until mounted to prevent SSR issues
  if (!isMounted) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          profile: null,
          userRole: null,
          isLoading: true,
          signIn: async () => ({ user: null, error: new Error("Not mounted") }),
          signOut: async () => {},
          refreshProfile: async () => ({ error: new Error("Not mounted") }),
          updateProfile: async () => ({ error: new Error("Not mounted") }),
          updateProfilePhoto: async () => ({ error: new Error("Not mounted") }),
          navigateToDashboard: () => {},
          hasRole: () => false,
          getProfileImageUrl: () => null,
          updateUserRole: async () => ({
            success: false,
            error: new Error("Not mounted"),
          }),
          resetPassword: async () => ({
            success: false,
            error: new Error("Not mounted"),
          }),
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  // Provide context values
  const value = {
    user,
    profile,
    userRole,
    isLoading,
    signIn,
    signOut,
    refreshProfile,
    updateProfile,
    updateProfilePhoto,
    navigateToDashboard,
    hasRole,
    getProfileImageUrl,
    updateUserRole,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context with SSR protection
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Return safe defaults during SSR
    return {
      user: null,
      profile: null,
      userRole: null,
      isLoading: true,
      signIn: async () => ({
        user: null,
        error: new Error("Context not available"),
      }),
      signOut: async () => {},
      refreshProfile: async () => ({
        error: new Error("Context not available"),
      }),
      updateProfile: async () => ({
        error: new Error("Context not available"),
      }),
      updateProfilePhoto: async () => ({
        error: new Error("Context not available"),
      }),
      navigateToDashboard: () => {},
      hasRole: () => false,
      getProfileImageUrl: () => null,
      updateUserRole: async () => ({
        success: false,
        error: new Error("Context not available"),
      }),
      resetPassword: async () => ({
        success: false,
        error: new Error("Context not available"),
      }),
    };
  }
  return context;
}
