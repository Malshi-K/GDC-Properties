"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; // Make sure path is correct

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
  const router = useRouter();

  // Get user profile data
  const fetchProfile = async (userId) => {
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
    if (!user) return { error: new Error("No authenticated user") };

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
    if (!user) {
      return { error: new Error("No authenticated user") };
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
    if (!user) {
      return { error: new Error("No authenticated user") };
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

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Initial load and auth state changes
  useEffect(() => {
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
  }, [router]);

  // Navigate to dashboard based on role
  const navigateToDashboard = () => {
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
    getProfileImageUrl,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}
