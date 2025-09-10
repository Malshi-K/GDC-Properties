"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setMessage("Password reset instructions sent to your email!");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Minimal header with logo */}
      <div className="py-4 px-6 bg-white shadow-sm mb-8 flex justify-between items-center">
        <Link href="/">
          <Image
            src="/images/logo.png"
            alt="GDC Properties"
            width={128}
            height={80}
            className="h-12 w-auto object-contain"
          />
        </Link>
        <Link
          href="/"
          className="text-custom-blue hover:text-custom-orange transition-colors"
        >
          <X size={24} />
        </Link>
      </div>

      <div className="flex-grow flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Reset Your Password
          </h2>
          
          <p className="text-gray-600 mb-6 text-center">
            Enter your email address and we'll send you instructions to reset your password.
          </p>

          {message && (
            <div className="mb-4 p-4 bg-green-100 text-green-700 rounded flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-orange-100 text-orange-700 rounded flex items-center">
              <svg className="h-5 w-5 text-orange-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="email"
              >
                Email Address
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-custom-orange text-white py-2 px-4 rounded-full hover:bg-opacity-90 transition-colors disabled:opacity-50 flex justify-center items-center"
            >
              {loading ? (
                <>
                  <span className="mr-2">Sending Instructions</span>
                  <span className="flex h-5 w-5">
                    <span className="animate-pulse">...</span>
                  </span>
                </>
              ) : (
                "Send Reset Instructions"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-custom-orange hover:underline"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}