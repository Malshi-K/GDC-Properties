"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, userRole, isLoading } = useAuth();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [startTime] = useState(Date.now());
  const [authChecked, setAuthChecked] = useState(false);

  // Primary authentication check and redirection
  useEffect(() => {
    // Only attempt redirection if auth state is determined (not loading)
    if (!isLoading) {
      setAuthChecked(true);
      
      // No user means not authenticated - redirect to home page
      if (!user) {
        console.log("No authenticated user detected, redirecting to homepage");
        setRedirectAttempted(true);
        
        // Hard redirect using window.location for more reliable navigation
        window.location.href = "/";
        return;
      }

      // Check for role-based access if needed
      if (user && userRole && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        console.log(`User role '${userRole}' not in allowed roles: [${allowedRoles.join(", ")}]`);
        window.location.href = "/dashboard";
        setRedirectAttempted(true);
      }
    }
  }, [user, userRole, isLoading, allowedRoles]);

  // Failsafe timeout - if authentication check takes too long
  useEffect(() => {
    // Only set the timeout if we're still loading and haven't redirected
    if (isLoading && !redirectAttempted) {
      const timeoutId = setTimeout(() => {
        const timeElapsed = Date.now() - startTime;
        
        // If we've been on this page for more than 3 seconds and still loading auth, force redirect
        if (isLoading && !user && !redirectAttempted) {
          console.log("Auth check timeout after", timeElapsed, "ms - forcing redirect to homepage");
          setRedirectAttempted(true);
          window.location.href = "/";
        }
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, user, redirectAttempted, startTime]);

  // Show loading state only while checking authentication
  // This means either isLoading is true OR auth has finished but we're not authenticated
  if (isLoading || (!authChecked)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center">Loading dashboard...</h2>
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-orange"></div>
          </div>
        </div>
      </div>
    );
  }

  // Auth check complete, user does not exist
  if (!user) {
    // This is a fallback in case the redirect hasn't happened yet
    if (!redirectAttempted) {
      window.location.href = "/";
    }
    
    // Show loading while redirecting
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center">Redirecting...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-orange mx-auto"></div>
        </div>
      </div>
    );
  }

  // For role-restricted routes
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-orange"></div>
      </div>
    );
  }

  // If user is authenticated and has the correct role (or no specific role is required), render children
  return <>{children}</>;
}