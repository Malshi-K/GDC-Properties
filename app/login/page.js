"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

// Create a client component that safely uses useSearchParams
function LoginForm() {
  const { signIn, signOut, session } = useAuth();
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
      // Clear any old session if user just reset password
      signOut?.();
      setMessage(
        "Your password has been successfully reset. Please log in with your new password."
      );
    }
  }, [resetSuccess, signOut]);

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { user, error } = await signIn(email, password);

    if (error) {
      setError(error.message || "Failed to sign in");
    } else if (user) {
      router.push("/dashboard");
    }

    setLoading(false);
  }

  // In your login component
  useEffect(() => {
    const checkForApproval = async () => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("preferences")
          .eq("id", session.user.id)
          .single();

        if (
          profile?.preferences?.role_request?.status === "approved" &&
          !profile?.preferences?.role_request?.acknowledged
        ) {
          setMessage(
            "Your Property Owner status has been approved! Please sign in again to access your new features."
          );
        }
      }
    };

    checkForApproval();
  }, [session]);

  return (
    <div className="w-full max-w-sm text-black">
      {/* Tab Headers */}
      <div className="flex mb-8">
        <button className="flex-1 pb-2 text-custom-blue border-b-2 border-custom-orange font-medium">
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
        <div className="mb-6 p-3 bg-custom-yellow text-custom-orange rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-black">
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
              disabled={loading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? "🙈" : "👁️"}
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
            <span className="text-gray-500 text-sm">Keep me logged in</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-custom-orange hover:underline text-sm"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-custom-orange text-white py-3 px-4 rounded-full font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 flex justify-center items-center"
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
    <div className="min-h-screen flex bg-custom-blue">
      {/* Left side - Image */}
      <div className="flex-1 relative">
        <Image
          src="/images/auth-bg.webp"
          alt="Login Background"
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

        <Suspense fallback={<LoginFormLoading />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
