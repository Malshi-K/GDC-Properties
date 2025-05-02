"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

// This component now serves as a transitional component that redirects to dedicated auth pages
export default function Auth({ isOpen, onClose }) {
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      // Redirect to login page if modal is opened
      router.push("/login");
      // Close the modal after redirecting
      if (onClose) onClose();
    }
  }, [isOpen, router, onClose]);

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  // This will render briefly before the redirect happens
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-custom-red mx-auto"></div>
          <p className="mt-4">Redirecting to login page...</p>
        </div>
      </div>
    </div>
  );
}