"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import SavedProperties from "@/components/dashboards/user/tabs/SavedProperties";

export default function UserDashboard() {
  const { user, profile } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  // Fetch all user data in parallel when component mounts
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        // Create array of promises to fetch data in parallel
        const dataPromises = [
          fetchFavorites(),
          fetchApplications(),
          fetchViewingRequests(),
        ];

        // Wait for all promises to resolve
        await Promise.all(dataPromises);
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load some data. Please refresh the page.");
      }
    };

    fetchUserData();
  }, [user]);

  // Fetch user's favorite properties
  const fetchFavorites = async () => {
    if (!user) return;

    try {
      setLoadingFavorites(true);
      console.log("Fetching favorites for user:", user.id);

      // Get favorites from Supabase
      const { data, error } = await supabase
        .from("favorites")
        .select(
          `
            id,
            property_id,
            properties (
              id,
              title,
              location,
              price,
              bedrooms,
              bathrooms,
              images,
              owner_id
            )
          `
        )
        .eq("user_id", user.id);

      if (error) throw error;
      console.log("Raw favorites data:", data);

      // Filter out any null property entries (could happen if property was deleted)
      const validData = data.filter((item) => item.properties !== null);

      // Format the data for display
      const formattedFavorites = validData.map((item) => ({
        id: item.id,
        propertyId: item.property_id,
        ...item.properties,
        owner_id: item.properties.owner_id,
      }));

      console.log("Formatted favorites:", formattedFavorites);
      setFavorites(formattedFavorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      toast.error("Failed to load saved properties.");
      setFavorites([]);
    } finally {
      setLoadingFavorites(false);
    }
  };

  // Fetch rental applications
  const fetchApplications = async () => {
    if (!user) return;

    try {
      setLoadingApplications(true);

      console.log("Fetching applications for user:", user.id);

      // Get applications from Supabase
      const { data, error } = await supabase
        .from("rental_applications")
        .select(
          `
          *,
          properties (
            id,
            title,
            location,
            price,
            images
          )
        `
        )
        .eq("user_id", user.id);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Applications data from DB:", data);

      // Format the data for display
      const formattedApplications = data.map((item) => {
        // Get the first image from the images array if it exists
        const firstImage =
          item.properties?.images && item.properties.images.length > 0
            ? item.properties.images[0]
            : null;

        return {
          id: item.id,
          property_id: item.property_id,
          user_id: item.user_id,
          owner_id: item.owner_id,
          employment_status: item.employment_status,
          income: item.income,
          credit_score: item.credit_score,
          message: item.message,
          status: item.status,
          created_at: item.created_at,
          updated_at: item.updated_at,
          property_title: item.properties?.title || "Property",
          property_location: item.properties?.location || "",
          property_price: item.properties?.price || 0,
          property_image: firstImage || "",
        };
      });

      console.log("Formatted applications:", formattedApplications);
      setApplications(formattedApplications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      setApplications([]);
      toast.error("Failed to load applications.");
    } finally {
      setLoadingApplications(false);
    }
  };

  // Fetch viewing requests
  const fetchViewingRequests = async () => {
    if (!user) return;

    try {
      setLoadingViewingRequests(true);

      console.log("Fetching viewing requests for user:", user.id);

      // Get viewing requests from Supabase
      const { data, error } = await supabase
        .from("viewing_requests")
        .select(
          `
          *,
          properties (
            id,
            title,
            location,
            price,
            images
          )
        `
        )
        .eq("user_id", user.id);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Viewing requests data from DB:", data);

      // Format the data for display
      const formattedRequests = data.map((item) => {
        // Get the first image from the images array if it exists
        const firstImage =
          item.properties?.images && item.properties.images.length > 0
            ? item.properties.images[0]
            : null;

        return {
          id: item.id,
          property_id: item.property_id,
          user_id: item.user_id,
          owner_id: item.owner_id,
          proposed_date: item.proposed_date,
          message: item.message,
          status: item.status,
          user_phone: item.user_phone,
          created_at: item.created_at,
          updated_at: item.updated_at,
          property_title: item.properties?.title || "Property",
          property_location: item.properties?.location || "",
          property_price: item.properties?.price || 0,
          property_image: firstImage || "",
        };
      });

      console.log("Formatted viewing requests:", formattedRequests);
      setViewingRequests(formattedRequests);
    } catch (error) {
      console.error("Error fetching viewing requests:", error);
      setViewingRequests([]);
      toast.error("Failed to load viewing requests.");
    } finally {
      setLoadingViewingRequests(false);
    }
  };

  // Remove a property from favorites
  const removeFavorite = async (favoriteId) => {
    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;

      // Update local state
      setFavorites(favorites.filter((favorite) => favorite.id !== favoriteId));
      toast.success("Property removed from favorites");
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Failed to remove property from favorites");
    }
  };

  return (
    <ProtectedRoute allowedRoles={["user"]}>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
              <Link href="/" className="text-custom-red hover:text-red-700">
                Return to Home
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SavedProperties
            favorites={favorites}
            loadingFavorites={loadingFavorites}
            onRemoveFavorite={removeFavorite}
          />
        </main>
      </div>
    </ProtectedRoute>
  );
}
