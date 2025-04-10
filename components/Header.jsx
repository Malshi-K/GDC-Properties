"use client";
import React, { useState, useEffect } from "react";
import { Menu, X, ChevronDown, ChevronUp } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const Header = () => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      // Close mobile menu if screen becomes larger than mobile breakpoint
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };

    // Set initial window width
    if (typeof window !== "undefined") {
      setWindowWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== "undefined") {
        const scrollPosition = window.scrollY;
        setIsScrolled(scrollPosition > 50);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("scroll", handleScroll);
      // Call once to set initial state
      handleScroll();
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const toggleMobileDropdown = () => {
    setIsMobileDropdownOpen(!isMobileDropdownOpen);
  };

  // Close mobile menu when navigating to a new page
  useEffect(() => {
    setIsMenuOpen(false);
    setIsMobileDropdownOpen(false);
  }, [pathname]);

  // Check if the current path matches or starts with the given link
  const isActive = (link) => {
    if (link === "/") {
      return pathname === link;
    }
    return pathname === link || pathname.startsWith(`${link}/`);
  };

  // Check if any job-seekers related page is active
  const isJobSeekersActive =
    pathname.includes("/job-seekers/caregivers") ||
    pathname.includes("/job-seekers/nurses");

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white shadow-md py-0" : "top-4"
      }`}
    >
      <div className={`${isScrolled ? "w-full" : "container mx-auto"}`}>
        <div
          className={`${
            isScrolled
              ? "px-4 md:px-6"
              : "bg-white rounded-full shadow-md px-4 md:px-6 mx-2 sm:mx-4"
          } transition-all`}
        >
          <div className="flex justify-between items-center py-2 md:py-0 px-0 sm:px-2 md:px-4 lg:px-24">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-20 sm:w-24 md:w-32 h-12 sm:h-16 md:h-20 flex items-center justify-center overflow-hidden">
                {/* Using Next.js Image for better optimization */}
                <Image
                  src="/images/logo.png"
                  alt="Recruitment Logo"
                  width={128}
                  height={80}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center justify-center flex-1 px-2 lg:px-4">
              <div className="flex items-center justify-center gap-1 sm:gap-2 lg:gap-6 w-full max-w-2xl">
                <Link
                  href="/"
                  className={`relative text-custom-gray hover:text-custom-red transition-colors px-1 lg:px-2 py-4 text-sm lg:text-base ${
                    isActive("/") ? "text-custom-red" : ""
                  }`}
                >
                  {isActive("/") && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-custom-red rounded-b-sm"></div>
                  )}
                  Home
                </Link>

                <Link
                  href="/search"
                  className={`relative text-custom-gray hover:text-custom-red transition-colors px-1 lg:px-3 py-4 text-sm lg:text-base ${
                    isActive("/search") ? "text-custom-red" : ""
                  }`}
                >
                  {isActive("/search") && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-custom-red rounded-b-sm"></div>
                  )}
                  Search
                </Link>

                <Link
                  href="/about"
                  className={`relative text-custom-gray hover:text-custom-red transition-colors px-1 lg:px-3 py-4 text-sm lg:text-base ${
                    isActive("/about") ? "text-custom-red" : ""
                  }`}
                >
                  {isActive("/about") && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-custom-red rounded-b-sm"></div>
                  )}
                  About
                </Link>

                <Link
                  href="/contact"
                  className={`relative text-custom-gray hover:text-custom-red transition-colors px-1 lg:px-3 py-4 text-sm lg:text-base ${
                    isActive("/contact") ? "text-custom-red" : ""
                  }`}
                >
                  {isActive("/contact") && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-custom-red rounded-b-sm"></div>
                  )}
                  Contact
                </Link>
              </div>
            </nav>

            {/* Connect Button */}
            <div className="hidden md:flex items-center">
              <button className="bg-custom-red text-white px-4 lg:px-6 py-2 rounded-full hover:bg-opacity-90 transition-colors text-sm lg:text-base whitespace-nowrap">
                Sign In
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-custom-gray hover:text-custom-red focus:outline-none p-1"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg max-h-[80vh] overflow-y-auto">
              <div className="px-4 py-3 space-y-1">
                <Link
                  href="/"
                  className={`block px-3 py-2 rounded-md ${
                    isActive("/")
                      ? "text-custom-red bg-gray-100"
                      : "text-custom-gray hover:text-custom-red hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>

                <Link
                  href="/about"
                  className={`block px-3 py-2 rounded-md ${
                    isActive("/about")
                      ? "text-custom-red bg-gray-100"
                      : "text-custom-gray hover:text-custom-red hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  About
                </Link>

                {/* Mobile Job Seekers Dropdown - Only dropdown, no direct page */}
                <div>
                  <button
                    onClick={toggleMobileDropdown}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-md ${
                      isJobSeekersActive
                        ? "text-custom-red bg-gray-100"
                        : "text-custom-gray hover:text-custom-red hover:bg-gray-50"
                    }`}
                    aria-expanded={isMobileDropdownOpen}
                  >
                    <span>Job Seekers</span>
                    {isMobileDropdownOpen ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>

                  {isMobileDropdownOpen && (
                    <div className="pl-6 space-y-1 mt-1">
                      <Link
                        href="/job-seekers/caregivers"
                        className={`block px-3 py-2 rounded-md ${
                          isActive("/job-seekers/caregivers")
                            ? "text-custom-red bg-gray-100"
                            : "text-custom-gray hover:text-custom-red hover:bg-gray-50"
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Caregivers
                      </Link>
                      <Link
                        href="/job-seekers/nurses"
                        className={`block px-3 py-2 rounded-md ${
                          isActive("/job-seekers/nurses")
                            ? "text-custom-red bg-gray-100"
                            : "text-custom-gray hover:text-custom-red hover:bg-gray-50"
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Nurses
                      </Link>
                    </div>
                  )}
                </div>

                <Link
                  href="/rate-our-work"
                  className={`block px-3 py-2 rounded-md ${
                    isActive("/rate-our-work")
                      ? "text-custom-red bg-gray-100"
                      : "text-custom-gray hover:text-custom-red hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Rate Our Work
                </Link>

                <Link
                  href="/contact"
                  className={`block px-3 py-2 rounded-md ${
                    isActive("/contact")
                      ? "text-custom-red bg-gray-100"
                      : "text-custom-gray hover:text-custom-red hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Get In Touch
                </Link>

                <div className="mt-4 pb-2">
                  <button className="w-full bg-custom-red text-white px-6 py-2 rounded-full hover:bg-opacity-90 transition-colors">
                    Sign In
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
