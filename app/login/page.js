"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// Create a client component that safely uses useSearchParams
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Import useSearchParams inside the client component
  const { useSearchParams } = require("next/navigation");
  const searchParams = useSearchParams();
  const resetSuccess = searchParams?.get("reset") === "success";

  useEffect(() => {
    if (resetSuccess) {
      setMessage(
        "Your password has been successfully reset. Please log in with your new password."
      );
    }
  }, [resetSuccess]);

  // In LoginForm component, update the checkSession function

  useEffect(() => {
    const checkSession = async () => {
      // If we've just come from password reset, force sign out first
      const resetSuccess = searchParams?.get("reset") === "success";

      if (resetSuccess) {
        // Force sign out to ensure no lingering session
        await supabase.auth.signOut();
        setMessage(
          "Your password has been successfully reset. Please log in with your new password."
        );
        return; // Skip the redirect check when coming from password reset
      }

      // Only check for session and redirect if not coming from password reset
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        // User is already logged in, redirect to unified dashboard
        router.push("/dashboard");
      }
    };

    checkSession();
  }, [router, searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Get user role from profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        // Create profile if it doesn't exist
        await supabase.from("profiles").upsert({
          id: data.user.id,
          role: data.user.user_metadata?.role || "user", // Use metadata or default to user
          full_name: data.user.user_metadata?.full_name || "",
        });
      }

      // Redirect to unified dashboard regardless of role
      router.push("/dashboard");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
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
          <span>{message}</span>
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

      <form onSubmit={handleSubmit} className="text-gray-600">
        <div className="mb-4 text-gray-600">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
            required
            disabled={loading}
          />
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label
              className="block text-gray-700 text-sm font-bold"
              htmlFor="password"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-custom-red hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-custom-red text-white py-2 px-4 rounded-full hover:bg-opacity-90 transition-colors disabled:opacity-50 flex justify-center items-center"
        >
          {loading ? (
            <>
              <span className="mr-2">Signing In</span>
              <span className="flex h-5 w-5">
                <span className="animate-pulse">...</span>
              </span>
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Don't have an account?{" "}
          <Link href="/signup" className="text-custom-red hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </>
  );
}

// Loading fallback for Suspense
function LoginFormLoading() {
  return <div className="p-4 text-center">Loading login form...</div>;
}

// Main page component
export default function LoginPage() {
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
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8">
          <h2 className="text-2xl font-bold text-custom-gray mb-6 text-center">
            Sign In
          </h2>

          {/* Wrap the component using useSearchParams in Suspense */}
          <Suspense fallback={<LoginFormLoading />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
