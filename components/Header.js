// components/Header.js
'use client';

import React, { useState, useEffect, useRef } from "react";
import { Menu, X, ChevronDown, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile: userProfile, userRole, signOut } = useAuth();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Ref for the dropdown container to handle hover events
  const dropdownRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Check if we're on a property detail page
  const isPropertyDetailPage = pathname.startsWith("/property/");

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    router.push("/");
  };

  // Navigate to dashboard
  const navigateToDashboard = () => {
    router.push("/dashboard");
    setUserMenuOpen(false);
  };

  // Hover handlers for dropdown
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setUserMenuOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setUserMenuOpen(false);
    }, 150);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };

    if (typeof window !== "undefined") {
      setWindowWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);
      
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
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
      handleScroll();
      
      return () => {
        window.removeEventListener("scroll", handleScroll);
      };
    }
  }, []);

  // Close mobile menu when navigating to a new page
  useEffect(() => {
    setIsMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Check if the current path matches or starts with the given link
  const isActive = (link) => {
    if (link === "/") {
      return pathname === link;
    }
    return pathname === link || pathname.startsWith(`${link}/`);
  };

  // Skip rendering header on auth pages or dashboard page
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/payment/")
  ) {
    return null;
  }

  // Determine header styling based on page type and scroll state
  const shouldShowSolidHeader = isPropertyDetailPage || isScrolled;

  return (
    <header
      className={`fixed top-0 z-50 transition-all duration-300 ${
        shouldShowSolidHeader
          ? "bg-white shadow-md py-0 left-0 right-0"
          : "top-4 left-24 right-24"
      }`}
    >
      <div className={`${shouldShowSolidHeader ? "w-full" : "container mx-auto"}`}>
        <div
          className={`${
            shouldShowSolidHeader
              ? "px-10 md:px-20"
              : "bg-white/20 rounded-full shadow-md px-4 md:px-6 mx-2 sm:mx-4"
          } transition-all`}
        >
          <div className="flex justify-between items-center py-3 md:py-0 px-0 sm:px-2 md:px-4 lg:px-6">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-24 sm:w-28 md:w-36 h-16 sm:h-20 md:h-24 flex items-center justify-center overflow-hidden">
                <Link href="/">
                  <Image
                    src={shouldShowSolidHeader ? "/images/logo.png" : "/images/properties logo.png"}
                    alt="GDC Properties Logo"
                    width={144}
                    height={96}
                    className="w-full h-full object-contain"
                    priority
                  />
                </Link>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center justify-center flex-1 px-2 lg:px-4">
              <div className="flex items-center justify-center gap-1 sm:gap-2 lg:gap-6 w-full max-w-2xl">
                <Link
                  href="/"
                  className={`relative ${
                    shouldShowSolidHeader 
                      ? "text-custom-gray hover:text-custom-red" 
                      : "text-white hover:text-custom-red"
                  } transition-colors px-1 lg:px-2 py-6 text-sm lg:text-lg ${
                    isActive("/") ? "!text-custom-red" : ""
                  }`}
                >
                  {isActive("/") && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-custom-red rounded-b-sm"></div>
                  )}
                  Home
                </Link>

                <Link
                  href="/search"
                  className={`relative ${
                    shouldShowSolidHeader 
                      ? "text-custom-gray hover:text-custom-red" 
                      : "text-white hover:text-custom-red"
                  } transition-colors px-1 lg:px-3 py-6 text-sm lg:text-lg ${
                    isActive("/search") ? "!text-custom-red" : ""
                  }`}
                >
                  {isActive("/search") && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-custom-red rounded-b-sm"></div>
                  )}
                  For Rent
                </Link>

                <Link
                  href="/about"
                  className={`relative ${
                    shouldShowSolidHeader 
                      ? "text-custom-gray hover:text-custom-red" 
                      : "text-white hover:text-custom-red"
                  } transition-colors px-1 lg:px-3 py-6 text-sm lg:text-lg ${
                    isActive("/about") ? "!text-custom-red" : ""
                  }`}
                >
                  {isActive("/about") && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-custom-red rounded-b-sm"></div>
                  )}
                  About
                </Link>

                <Link
                  href="/contact"
                  className={`relative ${
                    shouldShowSolidHeader 
                      ? "text-custom-gray hover:text-custom-red" 
                      : "text-white hover:text-custom-red"
                  } transition-colors px-1 lg:px-3 py-6 text-sm lg:text-lg ${
                    isActive("/contact") ? "!text-custom-red" : ""
                  }`}
                >
                  {isActive("/contact") && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-custom-red rounded-b-sm"></div>
                  )}
                  Contact
                </Link>
              </div>
            </nav>

            {/* Connect Button / User Menu */}
            <div className="hidden md:flex items-center relative">
              {user ? (
                <div 
                  className="relative"
                  ref={dropdownRef}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    className={`flex items-center space-x-2 ${
                      shouldShowSolidHeader 
                        ? "text-custom-gray hover:text-custom-red" 
                        : "text-white hover:text-custom-red"
                    } transition-colors duration-200`}
                  >
                    <User size={24} />
                    <span className="text-sm">
                      {userProfile?.full_name || user.email?.split("@")[0] || "User"}
                    </span>
                    <div className={`transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : 'rotate-0'}`}>
                      <ChevronDown size={16} />
                    </div>
                  </button>

                  {/* Dropdown Menu with smooth animation */}
                  <div 
                    className={`absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 transition-all duration-200 transform origin-top ${
                      userMenuOpen 
                        ? 'opacity-100 scale-100 translate-y-0' 
                        : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                    }`}
                  >
                    <div className="py-1">
                      <button
                        onClick={navigateToDashboard}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                      >
                        Dashboard
                      </button>                        
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="bg-custom-red text-white px-4 lg:px-6 py-2 rounded-full hover:bg-opacity-90 transition-colors text-sm lg:text-lg whitespace-nowrap"
                >
                  Tenant Portal
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`${
                  shouldShowSolidHeader 
                    ? "text-custom-gray hover:text-custom-red" 
                    : "text-white hover:text-custom-red"
                } focus:outline-none p-1`}
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
                  href="/search"
                  className={`block px-3 py-2 rounded-md ${
                    isActive("/search")
                      ? "text-custom-red bg-gray-100"
                      : "text-custom-gray hover:text-custom-red hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  For Rent
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

                <Link
                  href="/contact"
                  className={`block px-3 py-2 rounded-md ${
                    isActive("/contact")
                      ? "text-custom-red bg-gray-100"
                      : "text-custom-gray hover:text-custom-red hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contact
                </Link>

                <div className="mt-4 pb-2">
                  {user ? (
                    <div className="space-y-2">
                      <div className="px-3 py-2 text-sm text-gray-700 border-b">
                        Signed in as{" "}
                        <span className="font-medium">
                          {userProfile?.full_name || user.email || "User"}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigateToDashboard();
                        }}
                        className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={() => {
                          handleSignOut();
                          setIsMenuOpen(false);
                        }}
                        className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      className="block w-full text-center bg-custom-red text-white px-6 py-2 rounded-full hover:bg-opacity-90 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Tenant Portal
                    </Link>
                  )}
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