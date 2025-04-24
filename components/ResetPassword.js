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

  useEffect(() => {
    // Parse the hash fragment from the URL to get the access token
    const checkTokenFromHash = async () => {
      // Wait a bit for Supabase to process the hash
      setTimeout(async () => {
        try {
          const { data, error } = await supabase.auth.getSession();

          if (error || !data?.session) {
            console.error("Session error:", error);
            setError(
              "Invalid or expired password reset link. Please request a new one."
            );
            setTokenChecked(true);
            return;
          }

          // Valid session found
          setValidToken(true);
          setTokenChecked(true);
        } catch (e) {
          console.error("Error checking session:", e);
          setError(
            "An error occurred while verifying your reset link. Please try again."
          );
          setTokenChecked(true);
        }
      }, 500); // Short delay to ensure Supabase has processed the hash
    };

    checkTokenFromHash();
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
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

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
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
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
          <h2 className="text-2xl font-bold mb-6 text-center">
            Reset Your Password
          </h2>

          {!tokenChecked && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-custom-red"></div>
              <span className="ml-3">Verifying your reset link...</span>
            </div>
          )}

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
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500"></div>
            </div>
          )}

          {tokenChecked && validToken && redirectCountdown === null && (
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

          {tokenChecked && !validToken && (
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