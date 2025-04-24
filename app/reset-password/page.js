"use client";

import { useEffect } from "react";
import { toast } from "react-hot-toast";
import ResetPassword from "@/components/ResetPassword"; // Adjust the path as needed

export default function ResetPasswordPage() {
  // Check for specific Supabase error parameters in the URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error && errorDescription) {
      console.error(`Supabase error: ${error} - ${errorDescription}`);
      toast.error(errorDescription || "An error occurred with the reset link");
    }
  }, []);
  
  return <ResetPassword />;
}