"use client";

import { useState } from "react";
import Link from "next/link";
import { FaUser, FaEdit, FaPhone, FaMapMarkerAlt } from "react-icons/fa";
import ProfileEditModal from "./ProfileEditModal";

export default function ProfileCard({ user, profile }) {
  const [showEditModal, setShowEditModal] = useState(false);

  // Get profile image URL if available
  const profileImageUrl = profile?.profile_image_url;
  
  // Extract user role
  const userRole = profile?.role || "user";

  return (
    <>
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex flex-col items-center">
          {/* Profile Image */}
          <div className="w-32 h-32 relative rounded-full overflow-hidden mb-4">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={profile?.full_name || "User"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = ""; // Set to empty to show fallback
                  e.target.parentNode.classList.add("bg-gray-300");
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
                <FaUser className="text-gray-600 text-4xl" />
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
                <FaMapMarkerAlt className="text-gray-400 mr-2 flex-shrink-0" size={14} />
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
      
      {/* Edit Profile Modal */}
      <ProfileEditModal 
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </>
  );
}