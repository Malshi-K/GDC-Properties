// page.js
export const dynamic = 'force-dynamic'
import AboutSection from "@/components/about/AboutSection";
import GlobalOffices from "@/components/about/GlobalOffices";
import { PageTitle } from "@/components/PageTitle";
import React from "react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageTitle />
      <AboutSection />
      <GlobalOffices />
    </div>
  );
}
