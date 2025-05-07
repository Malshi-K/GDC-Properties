"use client";
import React from "react";
import Image from "next/image";
import { FaArrowRight } from "react-icons/fa";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const PageTitle = () => {
  const pathname = usePathname();

  // Get the current path without leading slash
  const currentPath = pathname?.split("/")[1] || "";

  // Configure titles, descriptions, and background images based on path
  const pageConfig = {
    search: {
      title: "SEARCH",
      titleColored: " PROPERTIES",
      description:
        "Find your dream home or investment property using our advanced search tools and extensive listings database.",
      backgroundImage: "/images/search.jpg",
      altText: "Property search"
    },
    about: {
      title: "ABOUT",
      titleColored: " US",
      description:
        "Discover our experienced team of real estate professionals committed to helping you find the perfect property since 2010.",
      backgroundImage: "/images/about.jpg",
      altText: "Our real estate team"
    },
    contact: {
      title: "CONTACT",
      titleColored: " US",
      description:
        "Reach out to our property specialists for viewings, valuations, or to list your property with our trusted agency.",
      backgroundImage: "/images/contact.jpg",
      altText: "Contact our agents"
    },    
  };

  // Get the appropriate config based on current path
  const { title, titleColored, description, backgroundImage, altText } =
    pageConfig[currentPath] || pageConfig["default"];

  return (
    <div className="relative w-full h-[60vh] sm:h-[70vh] md:h-[80vh] lg:h-screen bg-gray-900 overflow-hidden">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-custom-gray to-transparent z-10"></div>

      {/* Background image - dynamically set based on the current page */}
      <div className="absolute inset-0 z-0">
        <Image
          src={backgroundImage}
          alt={altText}
          fill
          sizes="100vw"
          priority
          quality={80}
          className="opacity-50 object-cover"
        />
      </div>

      {/* Content container */}
      <div className="relative z-20 container mx-auto px-4 sm:px-6 md:px-12 lg:px-24 xl:px-40 h-full flex items-center">
        <div className="max-w-2xl">
          {/* Main heading area with border */}
          <div className="relative border-l-2 border-t-2 border-white pl-4 sm:pl-6 md:pl-10 pt-4 sm:pt-6 md:pt-10">
            <h1 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
              {title}
              <span className="text-custom-red">{titleColored}</span>
              <br />
            </h1>

            <div className="mt-3 sm:mt-4 md:mt-6 text-gray-300 max-w-lg">
              <p className="text-base sm:text-lg">{description}</p>
            </div>

            {/* CTA Button */}
            <div className="mt-6 sm:mt-8 md:mt-10">
              <Link href="/login">
                <button className="bg-custom-red hover:bg-custom-gray text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full flex items-center transition duration-300 group text-sm sm:text-base">
                  <span className="mr-2">Get Started Now</span>
                  <span className="bg-white p-1 rounded-full transform transition-transform group-hover:translate-x-1">
                    <FaArrowRight className="text-custom-red text-xs sm:text-sm" />
                  </span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};