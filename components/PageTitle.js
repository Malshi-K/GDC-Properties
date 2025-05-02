// components/PageTitle.js
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

  // Configure titles and descriptions based on path
  const pageTitles = {
    search: {
      title: "SEARCH",
      titleColored: " PROPERTIES",
      description:
        "Find your dream home or investment property using our advanced search tools and extensive listings database.",
    },
    about: {
      title: "ABOUT",
      titleColored: " US",
      description:
        "Discover our experienced team of real estate professionals committed to helping you find the perfect property since 2010.",
    },
    contact: {
      title: "CONTACT",
      titleColored: " US",
      description:
        "Reach out to our property specialists for viewings, valuations, or to list your property with our trusted agency.",
    },
  };

  // Get the appropriate title and description based on current path
  const { title, titleColored, description } =
    pageTitles[currentPath] || pageTitles["default"];

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-custom-gray to-transparent z-10"></div>

      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/BACKGROUND.jpg"
          alt="Corporate meeting"
          layout="fill"
          objectFit="cover"
          quality={100}
          className="opacity-50"
        />
      </div>

      {/* Content container */}
      <div className="relative z-20 container mx-auto px-40 h-full flex items-center">
        <div className="max-w-2xl">
          {/* Main heading area with border */}
          <div className="relative border-l-2 border-t-2 border-white pl-10 pt-10">
            <h1 className="text-white text-6xl md:text-7xl font-bold leading-tight">
              {title}
              <span className="text-custom-red">{titleColored}</span>
              <br />
            </h1>

            <div className="mt-6 text-gray-300 max-w-lg">
              <p className="text-lg">{description}</p>
            </div>

            {/* CTA Button */}
            <div className="mt-10">
              <Link href="/login">
                <button className="bg-custom-red hover:bg-custom-gray text-white px-6 py-3 rounded-full flex items-center transition duration-300 group">
                  <span className="mr-2">Get Started Now</span>
                  <span className="bg-white p-1 rounded-full transform transition-transform group-hover:translate-x-1">
                    <FaArrowRight className="text-custom-red" />
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
