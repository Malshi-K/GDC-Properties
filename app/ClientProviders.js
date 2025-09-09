// app/ClientProviders.js (new file)
'use client';

import Header from "@/components/Header";
import { AuthProvider } from "@/contexts/AuthContext";
import ConditionalFooter from "@/components/ConditionalFooter";
import { GlobalDataProvider } from "@/contexts/GlobalDataContext";
import { ImageLoadingProvider } from "@/lib/services/imageLoaderService";
import { Toaster } from "react-hot-toast";

export default function ClientProviders({ children }) {
  return (
    <AuthProvider>
      <GlobalDataProvider>
        <ImageLoadingProvider>
          <Header />
          {children}
          <ConditionalFooter />
          <Toaster position="top-right" />
        </ImageLoadingProvider>
      </GlobalDataProvider>
    </AuthProvider>
  );
}