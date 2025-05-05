"use client";

import { useState, useEffect } from "react";
import { FaUser, FaEdit, FaPhone, FaMapMarkerAlt } from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import ProfileEditModal from "./ProfileEditModal";
import { useImageLoader } from "@/lib/services/imageLoaderService";

const ProfileCard = ({ user, profile }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const { getProfileImage, profileImages, isProfileImageLoading } = useImageLoader();
  
  // Start loading profile image in the background but don't block rendering
  useEffect(() => {
    if (user?.id && profile?.profile_image && !imageError) {
      getProfileImage(user.id, profile.profile_image)
        .catch(error => {
          console.error("Background profile image loading error:", error);
          setImageError(true);
        });
    }
  }, [user?.id, profile?.profile_image, imageError, getProfileImage]);

  // Get image URL from context
  const profileImageUrl = user?.id ? profileImages[user.id] || "" : "";
  const isLoading = user?.id ? isProfileImageLoading(user.id) : false;

  // Extract user role
  const userRole = profile?.role || "user";

  return (
    <>
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex flex-col items-center">
          {/* Profile Image - Will render immediately with a placeholder */}
          <div className="w-32 h-32 relative rounded-full overflow-hidden mb-4 bg-gray-300">
            {profileImageUrl && !imageError ? (
              <>
                <img
                  src={profileImageUrl}
                  alt={profile?.full_name || "User"}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
                {isLoading && (
                  <div className="absolute inset-0 bg-gray-300 bg-opacity-50 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-gray-400 border-t-custom-red rounded-full animate-spin"></div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
                <FaUser className="text-gray-600 text-4xl" />
              </div>
            )}
          </div>

          {/* User Name & Role - Always show regardless of image loading */}
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {profile?.full_name || "User"}
          </h2>
          <p className="text-gray-600 text-sm mb-3 bg-gray-100 px-3 py-1 rounded-full capitalize">
            {userRole}
          </p>

          {/* User Details - Always show regardless of image loading */}
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