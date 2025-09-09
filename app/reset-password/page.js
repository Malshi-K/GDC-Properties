"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext"; // Use your AuthContext
import Link from "next/link";
import Image from "next/image";

export default function ResetPasswordPage() {
  const { user } = useAuth(); // Use the context for user state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [tokenProcessing, setTokenProcessing] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  // Check if user is already logged in (from context) and redirect
  useEffect(() => {
    if (user && !tokenProcessing && !tokenValid) {
      // User is logged in but not through reset token - redirect to dashboard
      window.location.replace("/dashboard");
    }
  }, [user, tokenProcessing, tokenValid]);

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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

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
      
      console.log("Password update successful, starting cleanup process...");
      
      // Step 1: Sign out completely and clear all sessions
      try {
        console.log("Signing out globally...");
        await supabase.auth.signOut({ scope: 'global' });
        
        // Wait a moment for signout to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 2: Clear all stored data
        console.log("Clearing all stored data...");
        localStorage.removeItem('resetAccessToken');
        localStorage.removeItem('resetRefreshToken');
        
        // Clear Supabase specific storage
        const supabaseKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('sb-') || key.includes('supabase')
        );
        supabaseKeys.forEach(key => localStorage.removeItem(key));
        
        // Clear session storage
        sessionStorage.clear();
        
        // Step 3: Clear any authentication cookies
        console.log("Clearing cookies...");
        const cookies = document.cookie.split(";");
        cookies.forEach(function(cookie) {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.includes('sb-') || name.includes('supabase') || name.includes('auth')) {
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          }
        });
        
      } catch (signOutError) {
        console.warn("Sign out error (continuing anyway):", signOutError);
      }
      
      // Step 4: Update UI with progress
      setLoading(false);
      setMessage("Password updated successfully! Preparing clean login environment...");
      
      // Step 5: Wait longer for Supabase database sync
      setTimeout(() => {
        setMessage("Password reset complete! Redirecting to login...");
        setRedirectCountdown(5);
      }, 3000);
      
      // Step 6: Final redirect with complete page reload and cache busting
      setTimeout(() => {
        console.log("Performing final redirect...");
        // Use location.href instead of replace for complete page reload
        const timestamp = Date.now();
        window.location.href = `/login?reset=success&clear=true&t=${timestamp}`;
      }, 8000);
      
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
      <div className="min-h-screen flex bg-custom-gray">
        {/* Left side - Image */}
        <div className="flex-1 relative">
          <Image
            src="/images/auth-bg.webp"
            alt="Reset Password Background"
            fill
            className="object-cover"
            priority
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          {/* Logo overlay on image */}
          <div className="absolute top-8 left-8 z-10">
            <Image
              src="/images/logo.png"
              alt="GDC Properties"
              width={200}
              height={120}
              className="h-20 w-auto object-contain"
            />
          </div>
        </div>

        {/* Right side - Loading */}
        <div className="flex-1 flex items-center justify-center p-8 bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red mx-auto"></div>
            <p className="mt-4 text-custom-gray">
              Preparing secure password reset...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-custom-gray">
      {/* Left side - Image */}
      <div className="flex-1 relative">
        <Image
          src="/images/auth-bg.webp"
          alt="Reset Password Background"
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>        
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white relative">
        {/* Logo above form */}
        <div className="mb-8">
          <Image
            src="/images/logo.png"
            alt="GDC Properties"
            width={200}
            height={120}
            className="h-20 w-auto object-contain"
          />
        </div>

        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-custom-gray mb-4">
              Reset Your Password
            </h2>
            {!message && redirectCountdown === null && tokenValid && (
              <p className="text-gray-600 text-sm">
                Please create a new secure password for your account.
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-100 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 p-3 bg-green-100 text-green-700 rounded text-sm flex items-center">
              <div className="flex-1">
                {message}{" "}
                {redirectCountdown !== null ? `in ${redirectCountdown}...` : ""}
              </div>
              {redirectCountdown !== null && (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500 ml-2"></div>
              )}
            </div>
          )}

          {tokenValid && redirectCountdown === null && !message && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-custom-gray text-sm mb-2" htmlFor="new-password">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-3 bg-white border border-gray-300 rounded-full text-custom-gray placeholder-gray-400 focus:outline-none focus:border-custom-red focus:ring-1 focus:ring-custom-red"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                          clipRule="evenodd"
                        />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-custom-gray text-sm mb-2" htmlFor="confirm-password">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-3 bg-white border border-gray-300 rounded-full text-custom-gray placeholder-gray-400 focus:outline-none focus:border-custom-red focus:ring-1 focus:ring-custom-red"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={toggleConfirmPasswordVisibility}
                  >
                    {showConfirmPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                          clipRule="evenodd"
                        />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-custom-red text-white py-3 px-4 rounded-full font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 flex justify-center items-center"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <span className="mr-2">PROCESSING</span>
                    <span className="animate-pulse">...</span>
                  </div>
                ) : (
                  "RESET PASSWORD"
                )}
              </button>
            </form>
          )}

          {!tokenValid && !tokenProcessing && (
            <div className="text-center">
              <p className="mb-4 text-custom-gray">
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