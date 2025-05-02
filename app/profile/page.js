"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { FaArrowLeft, FaUser, FaUpload } from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Skeleton loader for profile form
const ProfileSkeleton = () => (
  <div className="bg-white shadow rounded-lg p-6 animate-pulse">
    <div className="mb-6 flex flex-col items-center">
      <div className="w-32 h-32 bg-gray-300 rounded-full mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-48"></div>
    </div>
    <div className="space-y-4">
      {[...Array(5)].map((_, index) => (
        <div key={index}>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      ))}
      <div className="pt-4">
        <div className="h-12 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  </div>
);

export default function ProfilePage() {
  const router = useRouter();
  const {
    user,
    profile,
    isLoading,
    updateProfile,
    updateProfilePhoto,
    refreshProfile,
    getProfileImageUrl,
  } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    address: "",
    preferences: "",
  });

  // File upload state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null); // Add base64 state for fallback

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Cached profile data to avoid unnecessary re-renders
  const [cachedProfile, setCachedProfile] = useState(null);

  const [profileImageUrl, setProfileImageUrl] = useState(null);

  // In ProfilePage.jsx - Add this to the top of the file (after imports)
  useEffect(() => {
    const getDirectProfileImage = async () => {
      if (!user?.id) return;

      try {
        setInitialLoading(true);

        // List files in user's folder
        const { data: files, error } = await supabase.storage
          .from("profile-images")
          .list(user.id);

        if (error) {
          console.error("Error listing files:", error);
          return;
        }

        if (files && files.length > 0) {
          // Sort files to get the most recent
          const sortedFiles = [...files].sort((a, b) => {
            if (!a.created_at || !b.created_at) return 0;
            return new Date(b.created_at) - new Date(a.created_at);
          });

          // Get the latest file
          const latestFile = sortedFiles[0];
          const filePath = `${user.id}/${latestFile.name}`;

          // Download file directly
          const { data, error: downloadError } = await supabase.storage
            .from("profile-images")
            .download(filePath);

          if (downloadError) {
            console.error("Error downloading file:", downloadError);
            return;
          }

          // Create blob URL
          const blobUrl = URL.createObjectURL(data);
          setProfileImageUrl(blobUrl);
        }
      } catch (error) {
        console.error("Error getting profile image:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    getDirectProfileImage();

    // Clean up blob URLs
    return () => {
      if (profileImageUrl && profileImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(profileImageUrl);
      }
    };
  }, [user]);

  useEffect(() => {
    const loadProfileImage = async () => {
      if (profile?.profile_image) {
        const url = await getProfileImageUrl();
        setProfileImageUrl(url);
      }
    };

    loadProfileImage();
  }, [profile, getProfileImageUrl]);

  // Load profile data when available
  useEffect(() => {
    if (profile && !cachedProfile) {
      // Initialize form data from profile
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        preferences: profile.preferences || "",
      });

      // Cache profile to avoid re-initializing on re-renders
      setCachedProfile(profile);

      // Set initial loading to false after a short delay to avoid flicker
      setTimeout(() => setInitialLoading(false), 300);
    }
  }, [profile, cachedProfile]);

  // Hide spinner if loading takes too long
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 3000); // 3 second fallback

    return () => clearTimeout(timer);
  }, []);

  // Handle input changes
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // Handle profile photo change with improved validation and preview
  const handlePhotoChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please select a valid image file (JPEG, PNG, GIF, WEBP)");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    // Set file for upload
    setPhotoFile(file);

    // Create preview
    const reader = new FileReader();

    // Set preview URL
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
      setPhotoBase64(reader.result.split(",")[1]); // Store base64 data as fallback
    };

    reader.readAsDataURL(file);
  }, []);

  // Handle form submission with optimized error handling
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      // Client-side validation
      if (!formData.full_name.trim()) {
        toast.error("Please enter your full name");
        setIsSubmitting(false);
        return;
      }

      // First attempt: Update profile info
      const { error: profileError } = await updateProfile(formData);
      if (profileError) throw profileError;

      // Second attempt only if photo is selected: Upload profile photo
      if (photoFile) {
        try {
          // Try with file object first
          const { error: photoError } = await updateProfilePhoto(photoFile);

          if (photoError) {
            // If file upload fails, try with base64 data as fallback
            if (photoBase64) {
              // Use the base64 fallback method
              const { error: base64Error } = await updateProfilePhoto(
                photoBase64,
                true
              );
              if (base64Error) throw base64Error;
            } else {
              throw photoError;
            }
          }
        } catch (photoUploadError) {
          console.error("Photo upload error:", photoUploadError);
          // Continue with success even if photo upload fails
          toast.error(
            "Profile updated but photo upload failed. Please try again later."
          );
        }
      }

      // Update local user data
      await refreshProfile();

      toast.success("Profile updated successfully");

      // Redirect based on role with short delay for toast to be visible
      setTimeout(() => {
        const returnPath =
          profile?.role === "owner" ? "/dashboard/owner" : "/dashboard/user";
        router.push(returnPath);
      }, 1000);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(
        error.message || "Failed to update profile. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine return path based on user role
  const getReturnPath = useCallback(() => {
    if (!profile) return "/";
    return profile.role === "owner" ? "/dashboard/owner" : "/dashboard/user";
  }, [profile]);

  // Show skeleton loader during initial load
  if (isLoading || initialLoading) {
    return (
      <div className="min-h-screen bg-gray-100 py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 text-gray-400">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
              <Link
                href={getReturnPath()}
                className="flex items-center text-custom-red hover:text-red-700"
              >
                <FaArrowLeft className="mr-2" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit}>
              {/* Profile Photo */}
              <div className="mb-6 flex flex-col items-center">
                <div className="w-32 h-32 relative rounded-full overflow-hidden mb-4 border-2 border-gray-200 bg-gray-300">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profile Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error("Image failed to load");
                        e.target.onerror = null;
                        e.target.src = "";
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
                      <FaUser className="text-gray-600 text-4xl" />
                    </div>
                  )}

                  {initialLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50">
                      <div className="w-8 h-8 border-4 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}

                  <label className="absolute bottom-0 right-0 bg-custom-red hover:bg-red-700 text-white rounded-full p-2 cursor-pointer transition-colors duration-300">
                    <FaUpload />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg, image/png, image/gif, image/webp"
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500">
                  Click the icon to upload a new profile photo
                </p>
              </div>

              {/* Profile Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red"
                    placeholder="Enter your address"
                  ></textarea>
                </div>

                {/* Conditional fields based on user role */}
                {profile?.role === "user" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rental Preferences
                    </label>
                    <textarea
                      name="preferences"
                      value={formData.preferences}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red"
                      placeholder="Describe your rental preferences (budget, location, amenities, etc.)"
                    ></textarea>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-custom-red hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors duration-300 flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                        Updating...
                      </>
                    ) : (
                      "Save Profile"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
