"use client";

import Link from "next/link";

export default function ProfileCard({ user, profile }) {
  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="flex flex-col items-center">
        <div className="w-32 h-32 relative rounded-full overflow-hidden mb-4">
          {/* In a real app, use the owner's profile image */}
          <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
            <span className="text-gray-600">Profile Image</span>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {profile?.role || 'Property Owner'}
        </h2>
        <p className="text-gray-600 mb-1">{user?.email}</p>
        <p className="text-gray-600">{profile?.phone || 'No phone number'}</p>
        <Link 
          href="/profile" 
          className="mt-4 w-full bg-custom-red hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors duration-300 text-center"
        >
          Edit Profile
        </Link>
      </div>
    </div>
  );
}