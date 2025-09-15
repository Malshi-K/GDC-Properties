"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff } from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // New state for role request
  const [requestOwnerRole, setRequestOwnerRole] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    // Validate business info if requesting owner role
    if (requestOwnerRole && !businessName.trim()) {
      setError("Business name is required when requesting landlord role");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Sign up - ALL users get tenant role by default
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "tenant",
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;

      // Update the profile with the default role and full name
      if (authData.user) {
        const profileData = {
          id: authData.user.id,
          role: "tenant",
          full_name: fullName,
          email: email,
          created_at: new Date().toISOString(),
        };

        // If requesting owner role, add request info to preferences
        if (requestOwnerRole) {
          profileData.preferences = {
            role_request: {
              requested_role: "landlord",
              business_name: businessName,
              business_type: businessType,
              additional_info: additionalInfo,
              requested_at: new Date().toISOString(),
              status: "pending",
            },
          };
        }

        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(profileData);

        if (profileError) throw profileError;

        // If requesting owner role, create a notification record for admin
        // In your signup handleSubmit function, update this part:

        if (requestOwnerRole) {
          // Try to create role request record
          const { error: requestError } = await supabase
            .from("role_requests")
            .insert({
              user_id: authData.user.id,
              user_email: email,
              user_name: fullName,
              requested_role: "landlord",
              business_name: businessName,
              business_type: businessType,
              additional_info: additionalInfo,
              status: "pending",
            });

          if (requestError) {
            console.error("Failed to create role request:", requestError);
            // Don't fail signup, just log the error
          }

          // Send notification email to admin
          try {
            const response = await fetch("/api/send-role-request-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                admin_email: "malshisandu99@gmail.com", // Your admin email
                user_email: email,
                user_name: fullName,
                business_name: businessName,
                business_type: businessType,
                additional_info: additionalInfo,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error("Email API error:", errorData);
            } else {
              console.log("Admin notification email sent successfully");
            }
          } catch (emailError) {
            console.error("Failed to send admin notification:", emailError);
            // Don't fail signup if email fails
          }
        }
      }

      if (requestOwnerRole) {
        setMessage(
          "Registration successful! Please check your email to confirm your account. Your request for Landlord status has been submitted and will be reviewed by an administrator. You'll receive an email once your request is approved."
        );
      } else {
        setMessage(
          "Registration successful! Please check your email to confirm your account. You can start browsing properties as a Tenant."
        );
      }

      // Clear form
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setFullName("");
      setBusinessName("");
      setBusinessType("");
      setAdditionalInfo("");
      setRequestOwnerRole(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Tab Headers */}
      <div className="flex mb-8">
        <Link
          href="/login"
          className="flex-1 pb-2 text-gray-400 border-b border-gray-600 font-medium text-center"
        >
          Sign In
        </Link>
        <button className="flex-1 pb-2 text-custom-blue border-b-2 border-custom-orange font-medium">
          Sign Up
        </button>
      </div>

      {message && (
        <div className="mb-6 p-3 bg-green-100 text-green-700 rounded text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 p-3 bg-custom-yellow text-custom-orange rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            className="block text-custom-blue text-sm mb-2"
            htmlFor="full-name"
          >
            Full Name
          </label>
          <input
            id="full-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your Full Name"
            className="w-full px-3 py-3 bg-transparent border border-gray-600 rounded-full text-custom-blue placeholder-gray-500 focus:outline-none focus:border-custom-orange"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label
            className="block text-custom-blue text-sm mb-2"
            htmlFor="email"
          >
            Your email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your-email@gmail.com"
            className="w-full px-3 py-3 bg-transparent border border-gray-600 rounded-full text-custom-blue placeholder-gray-500 focus:outline-none focus:border-custom-orange"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label
            className="block text-custom-blue text-sm mb-2"
            htmlFor="password"
          >
            Your password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-3 bg-transparent border border-gray-600 rounded-full text-custom-blue placeholder-gray-500 focus:outline-none focus:border-custom-orange"
              required
              minLength={6}
              disabled={loading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label
            className="block text-custom-blue text-sm mb-2"
            htmlFor="confirm-password"
          >
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-3 bg-transparent border border-gray-600 rounded-full text-custom-blue placeholder-gray-500 focus:outline-none focus:border-custom-orange"
              required
              minLength={6}
              disabled={loading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
              onClick={toggleConfirmPasswordVisibility}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Role Request Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="request-owner"
              checked={requestOwnerRole}
              onChange={(e) => setRequestOwnerRole(e.target.checked)}
              className="w-4 h-4 text-custom-orange bg-gray-100 border-gray-300 rounded focus:ring-custom-orange"
              disabled={loading}
            />
            <label
              htmlFor="request-owner"
              className="text-sm text-custom-blue font-medium"
            >
              I am a Landlord and would like to list properties
            </label>
          </div>

          {/* Conditional fields for Landlord request */}
          {requestOwnerRole && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600">
                Please provide information for verification. An administrator
                will review your request.
              </p>

              <div>
                <label
                  className="block text-custom-blue text-sm mb-2"
                  htmlFor="business-name"
                >
                  Business/Company Name *
                </label>
                <input
                  id="business-name"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your business or company name"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-custom-blue placeholder-gray-400 focus:outline-none focus:border-custom-orange"
                  required={requestOwnerRole}
                  disabled={loading}
                />
              </div>

              <div>
                <label
                  className="block text-custom-blue text-sm mb-2"
                  htmlFor="business-type"
                >
                  Business Type
                </label>
                <select
                  id="business-type"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-custom-blue focus:outline-none focus:border-custom-orange"
                  disabled={loading}
                >
                  <option value="">Select business type</option>
                  <option value="real_estate_agency">Real Estate Agency</option>
                  <option value="property_developer">Property Developer</option>
                  <option value="individual_owner">
                    Individual Landlord
                  </option>
                  <option value="property_management">
                    Property Management Company
                  </option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label
                  className="block text-custom-blue text-sm mb-2"
                  htmlFor="additional-info"
                >
                  Additional Information
                </label>
                <textarea
                  id="additional-info"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Any additional information to support your request (optional)"
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-custom-blue placeholder-gray-400 focus:outline-none focus:border-custom-orange"
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>

        {/* Info Box - Account Type */}
        {!requestOwnerRole && (
          <div className="p-4 bg-gray-300 rounded-lg">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-custom-orange mr-2 mt-0.5 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm">
                <p className="text-custom-blue font-medium mb-1">
                  Account Type
                </p>
                <p className="text-gray-700">
                  You'll start as a <strong>Tenant</strong>. Check the
                  box above if you're a Landlord who wants to list
                  properties.
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-custom-orange text-white py-3 px-4 rounded-full font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 flex justify-center items-center"
        >
          {loading ? (
            <>
              <span className="mr-2">CREATING ACCOUNT</span>
              <span className="animate-pulse">...</span>
            </>
          ) : (
            "SIGN UP"
          )}
        </button>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex bg-custom-blue">
      {/* Left side - Image */}
      <div className="flex-1 relative">
        <Image
          src="/images/auth-bg.webp"
          alt="Signup Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white relative">
        <div className="mb-8">
          <Link href="/">
            <Image
              src="/images/logo.png"
              alt="GDC Properties"
              width={200}
              height={120}
              className="h-20 w-auto object-contain"
            />
          </Link>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
