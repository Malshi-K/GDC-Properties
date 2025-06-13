"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const resetSuccess = searchParams?.get("reset") === "success";

  useEffect(() => {
    if (resetSuccess) {
      setMessage(
        "Your password has been successfully reset. Please log in with your new password."
      );
    }
  }, [resetSuccess]);

  useEffect(() => {
    const checkSession = async () => {
      const resetSuccess = searchParams?.get("reset") === "success";

      if (resetSuccess) {
        await supabase.auth.signOut();
        setMessage(
          "Your password has been successfully reset. Please log in with your new password."
        );
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        router.push("/dashboard");
      }
    };

    checkSession();
  }, [router, searchParams]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log("Attempting to sign in with email:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Auth error:", error);
        throw error;
      }

      console.log("Sign in successful:", data);

      // Try to get user role, but don't fail if profile doesn't exist
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Profile error:", profileError);

          // Try to create profile if it doesn't exist
          const { error: upsertError } = await supabase
            .from("profiles")
            .upsert({
              id: data.user.id,
              role: data.user.user_metadata?.role || "user",
              full_name: data.user.user_metadata?.full_name || "",
            });

          if (upsertError) {
            console.error("Profile creation error:", upsertError);
          }
        }
      } catch (profileError) {
        console.error("Profile handling error:", profileError);
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Tab Headers */}
      <div className="flex mb-8">
        <button className="flex-1 pb-2 text-custom-gray border-b-2 border-custom-red font-medium">
          Sign In
        </button>
        <Link
          href="/signup"
          className="flex-1 pb-2 text-gray-400 border-b border-gray-600 font-medium text-center"
        >
          Sign Up
        </Link>
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

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={keepLoggedIn}
              onChange={(e) => setKeepLoggedIn(e.target.checked)}
              className="mr-2 rounded"
            />
            <span className="text-custom-gray text-sm">Keep me logged in</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-custom-red hover:underline text-sm"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-custom-red text-white py-3 px-4 rounded-full font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 flex justify-center items-center"
        >
          {loading ? (
            <>
              <span className="mr-2">SIGNING IN</span>
              <span className="animate-pulse">...</span>
            </>
          ) : (
            "SIGN IN"
          )}
        </button>
      </form>
    </div>
  );
}

// Loading fallback for Suspense
function LoginFormLoading() {
  return (
    <div className="p-4 text-center text-white">Loading login form...</div>
  );
}

// Main page component
export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-custom-gray">
      {/* Left side - Image */}
      <div className="flex-1 relative">
        <Image
          src="/images/auth-bg.webp" // You'll need to add your background image here
          alt="Login Background"
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

        <Suspense fallback={<LoginFormLoading />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
