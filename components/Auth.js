"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase"; // Make sure this path is correct
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Auth({ isOpen, onClose }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [role, setRole] = useState("user");
  const [fullName, setFullName] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        // Sign up
        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email,
            password,
            options: {
              data: {
                role: role,
              },
            },
          }
        );

        if (authError) throw authError;

        // Update the profile with the role and full name
        if (authData.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              role: role,
              full_name: fullName,
            })
            .eq("id", authData.user.id);

          if (profileError) throw profileError;
        }

        setMessage("Check your email for the confirmation link!");
      } else {
        // Sign in
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) throw signInError;

        // Get user role from profiles table
        const { data: profileData, error: profileError } = await supabase
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

          // Redirect based on user metadata role
          const role = data.user.user_metadata?.role || "user";
          console.log("Using role from metadata:", role);

          if (role === "owner") {
            router.push("/dashboard/owner");
          } else {
            router.push("/dashboard/user");
          }
        } else {
          // Redirect based on profile role
          console.log("User role from profile:", profileData.role);
          if (profileData.role === "owner") {
            router.push("/dashboard/owner");
          } else {
            router.push("/dashboard/user");
          }
        }

        onClose(); // Close modal after successful sign in
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-center">
          {isSignUp ? "Create an Account" : "Sign In"}
        </h2>

        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="full-name"
              >
                Full Name
              </label>
              <input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
          )}

          <div className="mb-4">
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
            />
          </div>

          <div className="mb-6">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              required
              minLength={6}
            />
          </div>

          {isSignUp && (
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Account Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="user"
                    checked={role === "user"}
                    onChange={() => setRole("user")}
                    className="mr-2"
                  />
                  <span>Property Seeker</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="owner"
                    checked={role === "owner"}
                    onChange={() => setRole("owner")}
                    className="mr-2"
                  />
                  <span>Property Owner</span>
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-custom-red text-white py-2 px-4 rounded-full hover:bg-opacity-90 transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-custom-red hover:underline"
          >
            {isSignUp
              ? "Already have an account? Sign In"
              : "Need an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
