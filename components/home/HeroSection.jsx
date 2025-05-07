import React from "react";
import PropertySearchForm from "../property/PropertySearchForm";
import Link from "next/link";

export default function HeroSection() {
  return (
    <div className="relative w-full max-w-7xl min-h-screen flex items-center py-24 md:py-32 lg:py-24 px-4 sm:px-6 mt-16 sm:mt-20 md:mt-24">
      {/* Content container */}
      <div className="container mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left side - Text content */}
        <div className="w-full lg:w-1/2 text-white z-10 text-center lg:text-left">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-2 sm:mb-4">
            Find Your Perfect Rental
          </h1>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8">
            Discover amazing propeties for your next stay
          </p>
          <Link href="/contact">
            <button className="bg-custom-red hover:bg-red-700 text-white font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-md transition-colors duration-300">
              Get in Touch
            </button>
          </Link>
        </div>

        {/* Right side - Property Filter */}
        <PropertySearchForm />
      </div>
    </div>
  );
}
