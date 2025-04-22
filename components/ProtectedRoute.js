"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, userRole, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Debugging
    console.log("Current user role:", userRole);
    console.log("Allowed roles:", allowedRoles);

    // If not loading and no user, redirect to homepage
    if (!isLoading && !user) {
      router.push("/");
    }

    // If user is logged in but role is not allowed, redirect to appropriate dashboard
    if (!isLoading && user && userRole) {
      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        console.log(
          "User has wrong role:",
          userRole,
          "Expected:",
          allowedRoles
        );
        if (userRole === "owner") {
          router.push("/dashboard/owner");
        } else {
          router.push("/dashboard/user");
        }
      }
    }
  }, [user, userRole, isLoading, router, allowedRoles]);

  // Show loading state while checking authentication
  if (
    isLoading ||
    !user ||
    (allowedRoles.length > 0 && !allowedRoles.includes(userRole))
  ) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
      </div>
    );
  }

  // If user is authenticated and has the correct role, render children
  return <>{children}</>;
}
