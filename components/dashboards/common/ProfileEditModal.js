// In ProfileEditModal.jsx
"use client";

import { useState, useEffect } from "react";
import { FaUser, FaUpload, FaSave, FaTimes } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useImageLoader } from "@/lib/services/imageLoaderService"; // NEW: Import useImageLoader
import { supabase } from "@/lib/supabase";
import LoadingFallback from "@/components/LoadingFallback";

export default function ProfileEditModal({ isOpen, onClose }) {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  
  // NEW: Use centralized image loader service
  const { 
    profileImages, 
    loadProfileImage, 
    isProfileImageLoading 
  } = useImageLoader();
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    address: "",
    preferences: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingFallback />;
  }

  // NEW: Get profile image URL and loading state from imageLoader
  const profileImageUrl = profileImages[user?.id];
  const isLoadingImage = isProfileImageLoading(user?.id);

  // NEW: Load profile image when modal opens
  useEffect(() => {
    if (isOpen && user?.id) {
      console.log("ProfileEditModal: Loading profile image for user:", user.id);
      loadProfileImage(user.id, profile?.profile_image);
    }
  }, [isOpen, user?.id, profile?.profile_image, loadProfileImage]);

  // Initialize form data when profile is loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        preferences: profile.preferences || "",
      });
    }
  }, [profile]);

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setPhotoFile(null);
      setPhotoPreview(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle photo change
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // NEW: Enhanced form submission with imageLoader integration
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Update profile basic info
      const { error: profileError } = await updateProfile({
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address,
        preferences: formData.preferences,
      });

      if (profileError) throw profileError;

      // Upload photo if selected
      if (photoFile) {
        try {
          const fileExt = photoFile.name.split(".").pop();
          const filePath = `${user.id}/profile.${fileExt}`;

          console.log("Uploading profile photo to:", filePath);

          const { error: uploadError } = await supabase.storage
            .from("profile-images")
            .upload(filePath, photoFile, {
              upsert: true,
            });

          if (uploadError) throw uploadError;

          console.log("Profile photo uploaded successfully");
          
          // NEW: Reload the profile image after successful upload
          setTimeout(() => {
            loadProfileImage(user.id, filePath);
          }, 500);
          
        } catch (photoError) {
          console.error("Error uploading profile photo:", photoError);
          toast.error("Profile updated but photo upload failed");
        }
      }

      await refreshProfile();
      toast.success("Profile updated successfully");
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Edit Profile
                </h3>

                <form onSubmit={handleSubmit}>
                  {/* Profile Photo */}
                  <div className="mb-5 flex flex-col items-center">
                    <div className="w-24 h-24 relative rounded-full overflow-hidden mb-3 bg-gray-300">
                      {/* NEW: Enhanced image handling with imageLoader */}
                      {photoPreview ? (
                        // Show preview of new photo being uploaded
                        <img
                          src={photoPreview}
                          alt="Profile Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : profileImageUrl ? (
                        // Show current profile image from imageLoader
                        <img
                          src={profileImageUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error("Profile image failed to load in modal");
                            e.target.onerror = null;
                            e.target.style.display = "none";
                            // Show fallback icon
                            e.target.parentElement.querySelector('.fallback-icon').style.display = 'flex';
                          }}
                        />
                      ) : null}

                      {/* Fallback icon */}
                      <div 
                        className={`fallback-icon absolute inset-0 bg-gray-300 flex items-center justify-center ${(photoPreview || profileImageUrl) ? 'hidden' : 'flex'}`}
                        style={{ display: (photoPreview || profileImageUrl) ? 'none' : 'flex' }}
                      >
                        <FaUser className="text-gray-600 text-4xl" />
                      </div>

                      {/* NEW: Loading spinner from imageLoader */}
                      {isLoadingImage && !photoPreview && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50">
                          <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}

                      {/* Upload button */}
                      <label className="absolute bottom-0 right-0 bg-custom-red hover:bg-red-700 text-white rounded-full p-1.5 cursor-pointer transition-colors duration-300">
                        <FaUpload className="text-xs" />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          disabled={loading}
                        />
                      </label>
                    </div>
                    
                    {/* NEW: Image status indicator */}
                    <div className="text-xs text-gray-500 mt-1">
                      {photoPreview ? (
                        <span className="text-green-600">New photo selected</span>
                      ) : profileImageUrl ? (
                        <span className="text-blue-600">Current profile photo</span>
                      ) : isLoadingImage ? (
                        <span className="text-yellow-600">Loading photo...</span>
                      ) : (
                        <span className="text-gray-400">No photo uploaded</span>
                      )}
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-3 text-gray-400">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red disabled:bg-gray-50"
                        placeholder="Enter your full name"
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
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red disabled:bg-gray-50"
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
                        disabled={loading}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red disabled:bg-gray-50"
                        placeholder="Enter your address"
                      ></textarea>
                    </div>

                    {/* Role-specific fields */}
                    {profile?.role === "user" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rental Preferences
                        </label>
                        <textarea
                          name="preferences"
                          value={formData.preferences}
                          onChange={handleChange}
                          disabled={loading}
                          rows="2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-red disabled:bg-gray-50"
                          placeholder="Describe your rental preferences"
                        ></textarea>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-custom-red text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-red sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                          {photoFile ? "Uploading..." : "Saving..."}
                        </>
                      ) : (
                        <>
                          <FaSave className="mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={loading}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-red sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaTimes className="mr-2" />
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}