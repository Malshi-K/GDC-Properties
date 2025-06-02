"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [validToken, setValidToken] = useState(false);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [debug, setDebug] = useState(false);

  // Toggle debug info
  const toggleDebug = () => setDebug(!debug);

  // This useEffect handles the Supabase auth URL processing and token verification
  useEffect(() => {
    const checkTokenValidity = async () => {
      try {
        console.log("Checking session validity...");
        
        // Log the current URL for debugging
        if (typeof window !== 'undefined') {
          console.log("URL:", window.location.href);
        }
        
        // Use getSession to check if the recovery token was recognized by Supabase
        const { data, error } = await supabase.auth.getSession();
        
        // Store session data for debugging
        setSessionInfo(data?.session ? {
          userId: data.session.user.id,
          email: data.session.user.email,
          tokenExpires: new Date(data.session.expires_at * 1000).toLocaleString(),
          tokenType: data.session.token_type,
          // Don't store the actual token for security reasons
          hasAccessToken: !!data.session.access_token,
        } : null);
        
        if (error) {
          console.error("Session error:", error);
          setError("Invalid or expired password reset link. Please request a new one.");
          setTokenChecked(true);
          return;
        }
        
        if (!data?.session) {
          console.error("No session found");
          setError("Invalid or expired password reset link. Please request a new one.");
          setTokenChecked(true);
          return;
        }
        
        // Token is valid, user can proceed to reset password
        console.log("Valid token confirmed");
        setValidToken(true);
        setTokenChecked(true);
      } catch (e) {
        console.error("Error checking session:", e);
        setError("An error occurred while verifying your reset link. Please try again.");
        setTokenChecked(true);
      }
    };

    // Give Supabase a moment to process the URL parameters before checking
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        checkTokenValidity();
      }, 2000); // Increased delay to ensure Supabase has time to process
    }
  }, []);

  // Handle countdown and redirect
  useEffect(() => {
    if (redirectCountdown !== null) {
      if (redirectCountdown <= 0) {
        // Force a hard refresh to the login page
        window.location.replace("/login?reset=success");
      } else {
        const timer = setTimeout(() => {
          setRedirectCountdown(redirectCountdown - 1);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [redirectCountdown]);

  async function handleSubmit(e) {
    e.preventDefault();

    // Validate passwords
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      console.log("Attempting to update password...");
      
      // Double-check session before updating password
      const { data: sessionData } = await supabase.auth.getSession();
      console.log("Session check before password update:", !!sessionData?.session);
      
      if (!sessionData?.session) {
        throw new Error("No active session found. Please try the reset link again.");
      }
      
      // Add an explicit log 
      console.log("Starting password update with supabase.auth.updateUser...");
      
      // Update the user's password with detailed error checking
      const updateResult = await supabase.auth.updateUser({
        password: password
      });
      
      console.log("Password update result:", updateResult.error ? "Error occurred" : "Success");
      
      if (updateResult.error) {
        console.error("Password update error details:", updateResult.error);
        throw updateResult.error;
      }

      // Check if the update was actually successful by checking the user data
      if (!updateResult.data?.user) {
        console.error("No user data returned after password update");
        throw new Error("Password update failed. No user data returned.");
      }

      console.log("Password updated successfully");
      
      // IMPORTANT: First set loading to false
      setLoading(false);
      
      // Show success message with countdown
      setMessage("Password updated successfully! Redirecting in");
      
      // Start countdown for redirect
      setRedirectCountdown(3);
      
      // As a fallback, force redirect after 4 seconds
      setTimeout(() => {
        window.location.replace("/login?reset=success");
      }, 4000);
      
    } catch (error) {
      console.error("Password update error:", error);
      
      // Provide a more specific error message based on the error type
      let errorMessage = "Failed to update password. Please try again.";
      
      if (error.message) {
        if (error.message.includes("expired")) {
          errorMessage = "Your password reset link has expired. Please request a new one.";
        } else if (error.message.includes("invalid")) {
          errorMessage = "Invalid reset link. Please request a new password reset.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  }

  // Debug button for development only
  const DebugButton = process.env.NODE_ENV === 'development' ? (
    <button 
      onClick={toggleDebug} 
      className="absolute top-2 right-2 bg-gray-200 text-xs px-2 py-1 rounded"
      type="button"
    >
      {debug ? 'Hide Debug' : 'Debug'}
    </button>
  ) : null;

  // If still checking token, show loading spinner
  if (!tokenChecked) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f3f4f6]">
        {/* Minimal header with logo */}
        <div className="py-4 px-6 bg-white shadow-sm mb-8 flex justify-center">
          <Link href="/">
            <Image
              src="/images/logo.png"
              alt="GDC Properties"
              width={128}
              height={80}
              className="h-12 w-auto object-contain"
            />
          </Link>
        </div>
        
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red mx-auto"></div>
            <p className="mt-4 text-gray-600">Preparing secure password reset...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f4f6]">
      {/* Minimal header with logo */}
      <div className="py-4 px-6 bg-white shadow-sm mb-8 flex justify-center">
        <Link href="/">
          <Image
            src="/images/logo.png"
            alt="GDC Properties"
            width={128}
            height={80}
            className="h-12 w-auto object-contain"
          />
        </Link>
      </div>

      <div className="flex-grow flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8 relative">
          {DebugButton}
          
          <h2 className="text-2xl font-bold mb-6 text-center text-custom-gray">
            Reset Your Password
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded flex items-center">
              <svg
                className="h-5 w-5 text-red-500 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-100 text-green-700 rounded flex items-center">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                {message} {redirectCountdown !== null ? `${redirectCountdown}...` : ""}
              </div>
              {redirectCountdown !== null && (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500"></div>
              )}
            </div>
          )}

          {/* {debug && sessionInfo && (
            <div className="mb-6 p-3 bg-blue-50 text-blue-800 rounded text-xs">
              <h4 className="font-bold mb-1">Session Debug Info:</h4>
              <pre className="overflow-auto max-h-32">
                {JSON.stringify(sessionInfo, null, 2)}
              </pre>
            </div>
          )} */}

          {validToken && redirectCountdown === null && (
            <>
              <p className="text-gray-600 mb-6 text-center">
                Please create a new secure password for your account.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="new-password"
                  >
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                </div>

                <div className="mb-6">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="confirm-password"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-custom-red text-white py-2 px-4 rounded-full hover:bg-opacity-90 transition-colors disabled:opacity-50 flex justify-center items-center"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <span className="mr-2">Processing</span>
                      <span className="flex h-5 w-5">
                        <span className="animate-pulse">...</span>
                      </span>
                    </div>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            </>
          )}

          {!validToken && (
            <div className="text-center mt-4">
              <p className="mb-4">
                Your password reset link is invalid or has expired.
              </p>
              <Link
                href="/forgot-password"
                className="text-custom-red hover:underline font-medium"
              >
                Request a new password reset link
              </Link>
            </div>
          )}

          {redirectCountdown === null && (
            <div className="mt-6 text-center">
              <Link href="/login" className="text-custom-red hover:underline">
                Return to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}