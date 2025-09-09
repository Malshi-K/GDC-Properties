"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const { resetPassword } = useAuth(); 

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { success, error } = await resetPassword(email);

    if (success) {
      setMessage("Password reset instructions sent to your email!");
    } else {
      setError(error.message);
    }

    setLoading(false);
  }

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-custom-gray mb-4">
          Forgot Your Password?
        </h2>
        <p className="text-gray-400">
          Enter your email address and we'll send you instructions to reset your
          password.
        </p>
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
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your-email@gmail.com"
            className="w-full px-3 py-3 bg-transparent border border-gray-600 rounded-full text-custom-gray placeholder-gray-500 focus:outline-none focus:border-custom-red"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-custom-red text-white py-3 px-4 rounded-full font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 flex justify-center items-center"
        >
          {loading ? (
            <>
              <span className="mr-2">SENDING INSTRUCTIONS</span>
              <span className="animate-pulse">...</span>
            </>
          ) : (
            "SEND RESET INSTRUCTIONS"
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <Link href="/login" className="text-custom-red hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex bg-custom-gray">
      {/* Left side - Image */}
      <div className="flex-1 relative">
        <Image
          src="/images/auth-bg.webp" // You'll need to add your background image here
          alt="Forgot Password Background"
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
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
