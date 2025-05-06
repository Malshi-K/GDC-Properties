"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FaUser,
  FaEdit,
  FaSignOutAlt,
  FaHome,
} from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import ProfileEditModal from "./ProfileEditModal";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const DashboardSidebar = ({ activeTab, setActiveTab }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const router = useRouter();

  const { user, profile, userRole } = useAuth();

  // Create a memoized function to load the profile image
  const loadProfileImage = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingImage(true);
      setImageError(false);
      
      // Try first approach: Use profile.profile_image if available
      if (profile?.profile_image) {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("profile-images")
          .createSignedUrl(profile.profile_image, 3600); // 1 hour expiry
          
        if (!signedUrlError && signedUrlData?.signedUrl) {
          setProfileImageUrl(signedUrlData.signedUrl);
          setImageError(false);
          setIsLoadingImage(false);
          return;
        }
      }
      
      // Second approach: List files and get the most recent one
      const { data: files, error: listError } = await supabase.storage
        .from("profile-images")
        .list(user.id);
        
      if (listError || !files || files.length === 0) {
        throw new Error("No profile images found");
      }
      
      // Find the most recent file
      const sortedFiles = [...files].sort((a, b) => {
        if (!a.created_at || !b.created_at) return 0;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      const latestFile = sortedFiles[0];
      const filePath = `${user.id}/${latestFile.name}`;
      
      // Get a signed URL instead of downloading the file
      const { data: urlData, error: urlError } = await supabase.storage
        .from("profile-images")
        .createSignedUrl(filePath, 3600); // 1 hour expiry
        
      if (urlError) {
        throw urlError;
      }
      
      setProfileImageUrl(urlData.signedUrl);
      setImageError(false);
    } catch (error) {
      console.error("Error loading profile image:", error);
      setImageError(true);
      setProfileImageUrl("");
    } finally {
      setIsLoadingImage(false);
    }
  }, [user?.id, profile?.profile_image]);
  
  // Load profile image when component mounts or when dependencies change
  useEffect(() => {
    loadProfileImage();
    
    // Set up a refresh interval (optional, for long sessions)
    const refreshInterval = setInterval(() => {
      loadProfileImage();
    }, 30 * 60 * 1000); // Refresh every 30 minutes
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [loadProfileImage, user?.id, profile?.profile_image]);
  
  // Add a focus event listener to refresh the image when tab gains focus
  useEffect(() => {
    const handleFocus = () => {
      loadProfileImage();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadProfileImage]);

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Navigate to home
  const navigateToHome = () => {
    router.push("/");
  };

  // Define all navigation items with role access
  const navItems = [
    // Owner tabs
    {
      id: "properties",
      label: "My Properties",
      icon: (
        <svg
          className="h-5 w-5 mr-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
      roles: ["owner"],
    },
    {
      id: "viewings",
      label: "Viewing Requests",
      icon: (
        <svg
          className="h-5 w-5 mr-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      roles: ["owner"],
    },
    {
      id: "applications",
      label: "Rental Applications",
      icon: (
        <svg
          className="h-5 w-5 mr-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      roles: ["owner"],
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: (
        <svg
          className="h-5 w-5 mr-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      roles: ["owner"],
    },

    // User tabs
    {
      id: "viewingRequests",
      label: "Viewing Requests",
      icon: (
        <svg
          className="h-5 w-5 mr-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      roles: ["user"],
    },
    {
      id: "applications",
      label: "My Applications",
      icon: (
        <svg
          className="h-5 w-5 mr-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      roles: ["user"],
    },
    {
      id: "favorites",
      label: "Saved Properties",
      icon: (
        <svg
          className="h-5 w-5 mr-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      ),
      roles: ["user"],
    },

    // Common tab for both roles
    {
      id: "settings",
      label: "Account Settings",
      icon: (
        <svg
          className="h-5 w-5 mr-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      roles: ["owner", "user"],
    },
  ];

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  // Debugging function - uncomment if needed
  // useEffect(() => {
  //   console.log("Profile image debug info:");
  //   console.log("User:", user?.id);
  //   console.log("Profile image path:", profile?.profile_image);
  //   console.log("Loaded image URL:", profileImageUrl);
  //   console.log("Loading state:", isLoadingImage);
  //   console.log("Error state:", imageError);
  //   console.log("Active tab:", activeTab);
  // }, [user?.id, profile?.profile_image, profileImageUrl, isLoadingImage, imageError, activeTab]);

  // Reload profile image when active tab changes
  useEffect(() => {
    loadProfileImage();
  }, [activeTab, loadProfileImage]);

  return (
    <div className="w-64 bg-custom-red text-white flex flex-col h-full relative">
      {/* Profile Section */}
      <div className="p-6 flex flex-col items-center border-b border-red-600">
        {/* Profile Image */}
        <div className="w-24 h-24 relative rounded-full overflow-hidden mb-4 bg-red-500 border-2 border-white">
          {profileImageUrl && !imageError ? (
            <img
              src={profileImageUrl}
              alt={profile?.full_name || "User"}
              className="w-full h-full object-cover"
              onError={() => {
                console.error("Image failed to load");
                setImageError(true);
              }}
              key={profileImageUrl} // Force re-render when URL changes
            />
          ) : (
            <div className="absolute inset-0 bg-white flex items-center justify-center">
              <FaUser className="text-custom-red text-3xl" />
            </div>
          )}

          {/* Loading spinner overlay - only shown when loading */}
          {isLoadingImage && (
            <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center">
              <div className="w-6 h-6 border-3 border-white border-t-red-300 rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* User Name & Email */}
        <h2 className="text-lg font-bold text-white mb-1">
          {profile?.full_name?.toUpperCase() || "USER"}
        </h2>
        <p className="text-red-200 text-sm mb-4">{user?.email}</p>

        {/* Edit Profile Button */}
        <button
          onClick={() => setShowEditModal(true)}
          className="w-full bg-red-600 hover:bg-red-800 text-white text-sm py-2 px-4 rounded-md transition-colors duration-300 flex items-center justify-center"
        >
          <FaEdit className="mr-2" size={12} />
          Edit Profile
        </button>
      </div>

      {/* Navigation Menu - with curved active tab */}
      <nav className="flex-1 mt-6 relative z-10">
        {filteredNavItems.map((item) => (
          <div key={item.id} className="relative mb-2">
            {/* Active tab curved background - only shown when active */}
            {activeTab === item.id && (
              <>
                {/* Top curve */}
                <div className="absolute right-0 -top-4 w-4 h-4 bg-[#f3f4f6]">
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-custom-red rounded-br-full"></div>
                </div>

                {/* Button background */}
                <div className="absolute right-0 top-0 bottom-0 w-[calc(100%-12px)] bg-[#f3f4f6] rounded-l-full"></div>

                {/* Bottom curve */}
                <div className="absolute right-0 -bottom-4 w-4 h-4 bg-[#f3f4f6]">
                  <div className="absolute top-0 right-0 w-4 h-4 bg-custom-red rounded-tr-full"></div>
                </div>
              </>
            )}

            {/* Button content */}
            <button
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left px-6 py-3 flex items-center relative z-10 ${
                activeTab === item.id
                  ? "text-custom-red font-medium"
                  : "text-white hover:bg-red-600"
              }`}
            >
              <div
                className={`mr-3 ${
                  activeTab === item.id ? "text-custom-red" : "text-white"
                }`}
              >
                {item.icon}
              </div>
              <span className="text-sm">{item.label}</span>
            </button>
          </div>
        ))}
      </nav>

      {/* Bottom Navigation with Icons */}
      <div className="border-t border-red-600 p-4 z-10">
        <div className="flex justify-around">
          <button
            onClick={navigateToHome}
            className="text-white hover:text-red-200 rounded-full hover:bg-red-600 transition-colors duration-200"
            title="Home"
          >
            <FaHome size={20} />
          </button>

          <button
            onClick={handleSignOut}
            className="text-white hover:text-red-200 rounded-full hover:bg-red-600 transition-colors duration-200"
            title="Sign Out"
          >
            <FaSignOutAlt size={20} />
          </button>
        </div>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          // Force refresh the profile image when modal is closed
          loadProfileImage();
        }}
      />
    </div>
  );
};

export default DashboardSidebar;