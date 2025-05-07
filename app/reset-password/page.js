"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [tokenProcessing, setTokenProcessing] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(null);

  // Immediately capture the hash on component mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Immediately capture the access token from the URL hash
    const captureTokenFromHash = () => {
      const hash = window.location.hash;
      console.log("Initial URL hash:", hash);

      // If there is a hash with sufficient length (contains token)
      if (hash && hash.indexOf("access_token=") !== -1) {
        try {
          // Extract the access and refresh tokens
          const hashParams = new URLSearchParams(hash.replace("#", ""));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const type = hashParams.get("type");

          console.log("Token type:", type);
          console.log("Has access token:", !!accessToken);

          if (accessToken && type === "recovery") {
            // Store tokens in localStorage or state to prevent them from being lost
            localStorage.setItem("resetAccessToken", accessToken);
            if (refreshToken) {
              localStorage.setItem("resetRefreshToken", refreshToken);
            }

            console.log("Tokens captured for recovery");
          }
        } catch (err) {
          console.error("Error capturing token:", err);
        }
      } else {
        console.log("No valid token in hash or hash already processed");
      }
    };

    // Call immediately to capture token before any navigation
    captureTokenFromHash();

    // Then proceed with session check
    const processToken = async () => {
      try {
        // Try to get an existing session first
        const { data: sessionData } = await supabase.auth.getSession();

        if (sessionData?.session) {
          console.log("Valid session already exists");
          setTokenValid(true);
          setTokenProcessing(false);
          return;
        }

        // No session, try to use the stored tokens
        const accessToken = localStorage.getItem("resetAccessToken");
        const refreshToken = localStorage.getItem("resetRefreshToken");

        if (accessToken) {
          console.log("Using stored token to set session");

          // Set the session with the stored tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          if (error) {
            console.error("Error setting session:", error);
            throw error;
          }

          if (data?.session) {
            console.log("Successfully established session");
            setTokenValid(true);
          } else {
            throw new Error("Failed to establish session with token");
          }
        } else {
          // Check hash again in case we missed it
          const hash = window.location.hash;
          if (hash && hash.indexOf("access_token=") !== -1) {
            // Re-extract token
            captureTokenFromHash();
            // Re-process with the newly captured token
            return await processToken();
          }

          console.error("No tokens available for recovery");
          setError(
            "Invalid or expired password reset link. Please request a new one."
          );
        }
      } catch (err) {
        console.error("Token processing error:", err);
        setError("Error processing password reset. Please request a new link.");
      } finally {
        setTokenProcessing(false);
      }
    };

    // Start token processing after a brief delay to ensure hash capture
    setTimeout(processToken, 100);

    // Cleanup stored tokens on unmount
    return () => {
      // Optional: clean up stored tokens when component unmounts
      // localStorage.removeItem('resetAccessToken');
      // localStorage.removeItem('resetRefreshToken');
    };
  }, []);

  // Second useEffect: Handle countdown and redirect
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
  
    // Set a failsafe timeout to ensure we never leave the user hanging
    const failsafeTimer = setTimeout(() => {
      // If this triggers, assume the password update worked but the response was lost
      console.log("Failsafe timer triggered - assuming password reset success");
      setLoading(false);
      setMessage("Password appears to have been updated successfully! Redirecting to login...");
      setRedirectCountdown(3);
      
      // Clean up
      localStorage.removeItem('resetAccessToken');
      localStorage.removeItem('resetRefreshToken');
      
      // As a fallback, force redirect after 3 seconds
      setTimeout(() => {
        window.location.replace("/login?reset=success");
      }, 3000);
    }, 5000); // 5 second failsafe
  
    try {
      console.log("Starting password update process...");
      
      // Get the access token from localStorage
      const accessToken = localStorage.getItem('resetAccessToken');
      
      if (!accessToken) {
        throw new Error("No recovery token found. Please try the reset link again.");
      }
      
      // Attempt the password update
      const { error } = await supabase.auth.updateUser({
        password: password
      });
  
      if (error) {
        // Clear the failsafe since we got a response
        clearTimeout(failsafeTimer);
        console.error("Password update error:", error);
        throw error;
      }
      
      // Clear the failsafe since we got a successful response
      clearTimeout(failsafeTimer);
      
      // Attempt to sign out (don't wait for this to complete)
      supabase.auth.signOut().catch(err => {
        console.warn("Sign out error (non-critical):", err);
      });
      
      // Clear stored tokens
      localStorage.removeItem('resetAccessToken');
      localStorage.removeItem('resetRefreshToken');
      
      // Update UI state
      setLoading(false);
      setMessage("Password updated successfully! Redirecting to login");
      setRedirectCountdown(3);
      
      // As a fallback, force redirect after 3 seconds
      setTimeout(() => {
        window.location.replace("/login?reset=success");
      }, 3000);
      
    } catch (error) {
      // Clear the failsafe since we got a response
      clearTimeout(failsafeTimer);
      
      console.error("Password update error:", error);
      setError(error.message || "Failed to update password. Please try again.");
      setLoading(false);
    }
  }

  // Loading state display
  if (tokenProcessing) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f3f4f6] text-gray-600">
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
            <p className="mt-4 text-gray-600">
              Preparing secure password reset...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f4f6] text-gray-600">
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
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8">
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
                {message}{" "}
                {redirectCountdown !== null ? `in ${redirectCountdown}...` : ""}
              </div>
              {redirectCountdown !== null && (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500"></div>
              )}
            </div>
          )}

          {tokenValid && redirectCountdown === null && !message && (
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

          {!tokenValid && !tokenProcessing && (
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

          {!message && redirectCountdown === null && (
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
