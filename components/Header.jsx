"use client";

import React, { useState, useEffect } from "react";
import { Menu, X, ChevronDown, ChevronUp, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase"; // Make sure this path is correct

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  // Authentication states
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Check for authenticated user on load
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await getUserRole(session.user.id);
        await getUserProfile(session.user.id);
      } else {
        setUser(null);
        setUserRole(null);
        setUserProfile(null);
      }
    });

    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await getUserRole(session.user.id);
        await getUserProfile(session.user.id);
      }
    };

    getInitialSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Get user role from profiles table
  const getUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) throw error;

      setUserRole(data.role);
      // After fetching user role
      console.log("User role retrieved:", data.role);
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  // Get user profile data
  const getUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      setUserProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push("/");
  };

  // Navigate to dashboard (updated for unified dashboard)
  const navigateToDashboard = () => {
    // Use the single dashboard route
    router.push("/dashboard");
    setUserMenuOpen(false);
  };

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

  // Close mobile menu when navigating to a new page
  useEffect(() => {
    setIsMenuOpen(false);
    setIsMobileDropdownOpen(false);
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
    pathname.startsWith("/dashboard")
  ) {
    return null;
  }

  // Check if user should see Saved Properties option
  const shouldShowSavedProperties = userRole !== "owner";

  return (
    <header
      className={`fixed top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white shadow-md py-0 left-0 right-0"
          : "top-4 left-24 right-24"
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
                <Link href="/">
                  <Image
                    src="/images/logo.png"
                    alt="GDC Properties Logo"
                    width={128}
                    height={80}
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

            {/* Connect Button / User Menu */}
            <div className="hidden md:flex items-center relative">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 text-custom-gray hover:text-custom-red"
                  >
                    <User size={24} />
                    <span className="text-sm">
                      {userProfile?.full_name || user.email.split("@")[0]}
                    </span>
                    {userMenuOpen ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
                      <div className="py-1">
                        <button
                          onClick={navigateToDashboard}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Dashboard
                        </button>
                        {shouldShowSavedProperties && (
                          <Link
                            href="/favorites"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            Saved Properties
                          </Link>
                        )}
                        <button
                          onClick={handleSignOut}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="bg-custom-red text-white px-4 lg:px-6 py-2 rounded-full hover:bg-opacity-90 transition-colors text-sm lg:text-base whitespace-nowrap"
                >
                  Sign In
                </Link>
              )}
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
                  href="/search"
                  className={`block px-3 py-2 rounded-md ${
                    isActive("/search")
                      ? "text-custom-red bg-gray-100"
                      : "text-custom-gray hover:text-custom-red hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Search
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
                          {userProfile?.full_name || user.email}
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
                      Sign In
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
