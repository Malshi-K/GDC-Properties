"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";

export default function ResetPassword() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [resetSuccess, setResetSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [debug, setDebug] = useState({});
  const [hasValidToken, setHasValidToken] = useState(false);
  
  // Initialize and check if we have a valid reset token
  useEffect(() => {
    const checkResetToken = async () => {
      try {
        // Get URL parameters for debugging
        const url = window.location.href;
        const hash = window.location.hash;
        const searchParams = new URLSearchParams(window.location.search);
        
        // For debugging
        const debugInfo = {
          url,
          hash: hash || "none",
          search: window.location.search || "none",
          error: searchParams.get('error') || "none",
          errorDescription: searchParams.get('error_description') || "none"
        };
        
        setDebug(debugInfo);
        
        console.log("Hash parameters:", hash);
        
        // Check if we have a recovery token
        const hasRecoveryToken = hash && (
          hash.includes('type=recovery') || 
          hash.includes('access_token')
        );
        
        setHasValidToken(hasRecoveryToken);
        console.log("Has recovery token:", hasRecoveryToken);
        
        if (!hasRecoveryToken) {
          setStatusMessage("Invalid or expired password reset link. Please request a new one.");
          console.warn("No recovery token found in URL");
        } else {
          // Hash parameters exist - set the component to allow password reset
          setHasValidToken(true);
          console.log("Recovery token found, enabling password reset form");
        }
      } catch (error) {
        console.error("Error checking reset token:", error);
        setStatusMessage("An error occurred while processing your reset link. Please try again.");
      }
    };
    
    checkResetToken();
  }, []);
  
  // Password validation
  const validatePassword = (password) => {
    const errors = {};
    
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Password must contain at least one uppercase letter";
    } else if (!/[a-z]/.test(password)) {
      errors.password = "Password must contain at least one lowercase letter";
    } else if (!/[0-9]/.test(password)) {
      errors.password = "Password must contain at least one number";
    }
    
    return errors;
  };
  
  // Request a new password reset link
  const requestNewResetLink = () => {
    router.push("/?reset=true");
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({});
    
    // Validate passwords
    const passwordValidationErrors = validatePassword(newPassword);
    const formErrors = { ...passwordValidationErrors };
    
    if (!confirmPassword) {
      formErrors.confirmPassword = "Please confirm your new password";
    } else if (confirmPassword !== newPassword) {
      formErrors.confirmPassword = "Passwords do not match";
    }
    
    // If there are errors, display them and stop
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    setIsSubmitting(true);
    setStatusMessage("Processing your request...");
    
    try {
      console.log("Attempting to update password");
      
      // Use the updateUser method which works with the token in the URL hash
      const { data, error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      console.log("Update password response:", data ? "Data exists" : "No data", error ? error.message : "No error");
      
      if (error) throw error;
      
      // Success!
      setResetSuccess(true);
      setStatusMessage("Your password has been reset successfully. You can now sign in with your new password.");
      toast.success("Password reset successful");
      
      // Redirect to home page after a delay
      setTimeout(() => {
        router.push("/");
      }, 3000);
      
    } catch (error) {
      console.error("Error in password reset:", error);
      setStatusMessage(`Failed to reset password: ${error.message || "Unknown error"}`);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img 
            src="/images/logo.png" 
            alt="GDC Properties"
            className="mx-auto h-12 w-auto"
            onError={(e) => {
              e.target.style.display = 'none';
              // Show a fallback
              const parent = e.target.parentElement;
              if (parent) {
                const fallback = document.createElement('div');
                fallback.className = "w-full h-12 flex items-center justify-center font-bold text-red-600 text-xl";
                fallback.innerText = "GDC";
                parent.appendChild(fallback);
              }
            }}
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-gray-600">
          Enter your new password below
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {!hasValidToken && !resetSuccess && (
            <div className="rounded-md bg-blue-50 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Invalid or expired password reset link. Please request a new one.
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={requestNewResetLink}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                    >
                      Request New Reset Link
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {statusMessage && !resetSuccess && hasValidToken && (
            <div className="rounded-md bg-blue-50 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">{statusMessage}</p>
                </div>
              </div>
            </div>
          )}
          
          {resetSuccess ? (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Password Reset Successful
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>{statusMessage || "Your password has been reset successfully."}</p>
                  </div>
                  <div className="mt-4">
                    <div className="-mx-2 -my-1.5 flex">
                      <a 
                        href="/"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                      >
                        Go to home page
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : hasValidToken ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="mt-1">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`appearance-none block w-full px-3 py-2 border ${
                      errors.password ? "border-red-500" : "border-gray-300"
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm`}
                  />
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Password must be at least 8 characters and include uppercase, lowercase, and numbers
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`appearance-none block w-full px-3 py-2 border ${
                      errors.confirmPassword ? "border-red-500" : "border-gray-300"
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm`}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <a
                  href="/"
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Return to home
                </a>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : "Reset Password"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
      
      {/* Debug information - only shown in development */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-8 mx-auto max-w-md bg-gray-800 text-white p-4 text-xs rounded overflow-auto max-h-96">
          <h3 className="font-bold mb-2">Debug Information</h3>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}