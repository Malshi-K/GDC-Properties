"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        router.push("/dashboard");
      }
    };

    checkSession();
  }, [router]);

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

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Sign up - ALL users get property_seeker role by default
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "property_seeker", // Secure: No user role selection
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;

      // Update the profile with the default role and full name
      if (authData.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: authData.user.id,
          role: "property_seeker", // Secure: Always property_seeker
          full_name: fullName,
          email: email, // Add email to profile
        });

        if (profileError) throw profileError;
      }

      setMessage(
        "Registration successful! Please check your email to confirm your account. You can start as a Property Seeker, and an admin can upgrade your account to Property Owner if needed."
      );

      // Clear form
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setFullName("");
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
        <button className="flex-1 pb-2 text-custom-gray border-b-2 border-custom-red font-medium">
          Sign Up
        </button>
      </div>

      {message && (
        <div className="mb-6 p-3 bg-green-100 text-green-700 rounded text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            className="block text-custom-gray text-sm mb-2"
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
            className="w-full px-3 py-3 bg-transparent border border-gray-600 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-custom-red"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label
            className="block text-custom-gray text-sm mb-2"
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
            className="w-full px-3 py-3 bg-transparent border border-gray-600 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-custom-red"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label
            className="block text-custom-gray text-sm mb-2"
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
              className="w-full px-3 py-3 bg-transparent border border-gray-600 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-custom-red"
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
                  className="h-5 w-5 text-gray-500"
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
                  className="h-5 w-5 text-gray-500"
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
          <label
            className="block text-custom-gray text-sm mb-2"
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
              className="w-full px-3 py-3 bg-transparent border border-gray-600 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-custom-red"
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
                  className="h-5 w-5 text-gray-500"
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
                  className="h-5 w-5 text-gray-500"
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

        {/* Info Box - Account Type */}
        <div className="p-4 bg-gray-300 rounded-lg">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-custom-red mr-2 mt-0.5 flex-shrink-0"
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
              <p className="text-custom-gray font-medium mb-1">Account Type</p>
              <p className="text-gray-700">
                You'll start as a <strong>Property Seeker</strong>. If you're a
                property owner, an administrator can upgrade your account after
                verification.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-custom-red text-white py-3 px-4 rounded-full font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 flex justify-center items-center"
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
    <div className="min-h-screen flex bg-custom-gray">
      {/* Left side - Image */}
      <div className="flex-1 relative">
        <Image
          src="/images/auth-bg.webp" // You'll need to add your background image here
          alt="Signup Background"
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
