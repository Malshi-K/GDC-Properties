// components/ConditionalFooter.js
"use client";
import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();

  // List of paths where footer should be hidden
  const hideFooterPaths = [
    "/dashboard",
    "/login", 
    "/signup",
    "/forgot-password",
    "/payment/"
  ];

  // Check if current path should hide footer
  const shouldHideFooter = hideFooterPaths.some(path => 
    pathname?.startsWith(path)
  );

  // Skip rendering footer on specified pages
  if (shouldHideFooter) {
    return null;
  }

  return <Footer />;
}