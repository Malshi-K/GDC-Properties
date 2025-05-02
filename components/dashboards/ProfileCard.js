"use client";

import { useState, useEffect } from "react";
import { FaUser, FaEdit, FaPhone, FaMapMarkerAlt } from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import ProfileEditModal from "./ProfileEditModal";
import { supabase } from "@/lib/supabase";

const ProfileCard = ({ user, profile }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [loadingImage, setLoadingImage] = useState(true);

  // Direct storage access with proper URL format
  useEffect(() => {
    const getProfileImage = async () => {
      if (!user?.id) return;
      
      try {
        setLoadingImage(true);
        console.log("Attempting to get profile image for user:", user.id);
        
        // List the files in user's folder
        const { data: files, error } = await supabase.storage
          .from("profile-images") // Make sure bucket name is correct
          .list(user.id);
          
        if (error) {
          console.error("Error listing files:", error);
          setLoadingImage(false);
          return;
        }
        
        console.log("Files found in storage:", files);
        
        if (!files || files.length === 0) {
          console.log("No profile images found");
          setLoadingImage(false);
          return;
        }
        
        // Sort files to get the most recent
        const sortedFiles = [...files].sort((a, b) => {
          if (!a.created_at || !b.created_at) return 0;
          return new Date(b.created_at) - new Date(a.created_at);
        });
        
        const latestFile = sortedFiles[0];
        const filePath = `${user.id}/${latestFile.name}`;
        console.log("Using file path:", filePath);
        
        // IMPORTANT: Check if we can download the file directly
        const { data, error: downloadError } = await supabase.storage
          .from("profile-images")
          .download(filePath);
          
        if (downloadError) {
          console.error("Error downloading file:", downloadError);
          setLoadingImage(false);
          return;
        }
        
        // Create a blob URL from the downloaded file
        const blobUrl = URL.createObjectURL(data);
        console.log("Created blob URL:", blobUrl);
        setProfileImageUrl(blobUrl);
      } catch (error) {
        console.error("Error getting profile image:", error);
      } finally {
        setLoadingImage(false);
      }
    };
    
    getProfileImage();
    
    // Clean up blob URLs on unmount
    return () => {
      if (profileImageUrl && profileImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(profileImageUrl);
      }
    };
  }, [user, profile]);

  // Extract user role
  const userRole = profile?.role || "user";

  return (
    <>
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex flex-col items-center">
          {/* Profile Image */}
          <div className="w-32 h-32 relative rounded-full overflow-hidden mb-4 bg-gray-300">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={profile?.full_name || "User"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error("Error loading image:", e);
                  setProfileImageUrl("");
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
                <FaUser className="text-gray-600 text-4xl" />
              </div>
            )}
            
            {loadingImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50">
                <div className="w-8 h-8 border-4 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* User Name & Role */}
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {profile?.full_name || "User"}
          </h2>
          <p className="text-gray-600 text-sm mb-3 bg-gray-100 px-3 py-1 rounded-full capitalize">
            {userRole}
          </p>

          {/* User Details */}
          <div className="w-full space-y-2 mb-4">
            <p className="text-gray-600 flex items-center justify-center">
              {user?.email}
            </p>

            {profile?.phone && (
              <p className="text-gray-600 flex items-center justify-center">
                <FaPhone className="text-gray-400 mr-2" size={14} />
                {profile.phone}
              </p>
            )}

            {profile?.address && (
              <p className="text-gray-600 flex items-center justify-center text-center">
                <FaMapMarkerAlt
                  className="text-gray-400 mr-2 flex-shrink-0"
                  size={14}
                />
                <span>{profile.address}</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="w-full bg-custom-red hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors duration-300 text-center flex items-center justify-center"
            >
              <FaEdit className="mr-2" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      <ProfileEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </>
  );
};

export default ProfileCard;