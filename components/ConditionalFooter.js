// components/ConditionalFooter.js
"use client";
import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();

  // Skip rendering footer on dashboard page
  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  return <Footer />;
}