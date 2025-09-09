// app/ClientProviders.js (new file)
'use client';
export const dynamic = 'force-dynamic'
import { AuthProvider } from "@/contexts/AuthContext";
import ConditionalFooter from "@/components/ConditionalFooter";
import { GlobalDataProvider } from "@/contexts/GlobalDataContext";
import { ImageLoadingProvider } from "@/lib/services/imageLoaderService";
import { Toaster } from "react-hot-toast";
import Header from "@/components/Header";

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