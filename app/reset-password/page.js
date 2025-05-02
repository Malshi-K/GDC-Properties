"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ResetPassword from "@/components/auth/ResetPassword";

export default function ResetPasswordPage() {
  const [isReady, setIsReady] = useState(false);
  const [isUrlProcessed, setIsUrlProcessed] = useState(false);
  
  // This useEffect handles the Supabase auth URL processing
  useEffect(() => {
    if (typeof window !== 'undefined' && !isUrlProcessed) {
      // Capture hash before Supabase processes it
      const hash = window.location.hash;
      const query = window.location.search;
      
      // Check if this is a recovery URL with token
      if ((hash && hash.includes('type=recovery')) || (query && query.includes('type=recovery'))) {
        console.log("Valid recovery URL detected");
        
        // Check if there's an existing session to sign out first
        const checkAndClearSession = async () => {
          try {
            const { data } = await supabase.auth.getSession();
            
            // If user was already signed in through normal means
            // sign them out to ensure clean recovery flow
            if (data?.session && !data.session.user.email_confirmed_at) {
              console.log("Existing session found, signing out for clean recovery");
              await supabase.auth.signOut();
            }
            
            setIsReady(true);
          } catch (e) {
            console.error("Error processing recovery:", e);
            setIsReady(true);
          }
        };
        
        checkAndClearSession();
      } else {
        console.log("No valid recovery parameters found");
        setIsReady(true);
      }
      
      setIsUrlProcessed(true);
    }
  }, [isUrlProcessed]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red mx-auto"></div>
          <p className="mt-4 text-gray-600">Preparing secure password reset...</p>
        </div>
      </div>
    );
  }

  return <ResetPassword />;
}