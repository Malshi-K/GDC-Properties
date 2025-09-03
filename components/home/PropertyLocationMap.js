"use client";

import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";

export default function PropertyLocationMap() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        setFetchError(null);
        console.log("🚀 Fetching properties from API...");

        const response = await fetch("/api/properties", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        console.log(
          "📡 Response status:",
          response.status,
          response.statusText
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("📊 API Response:", result);

        if (result.success) {
          if (result.data && result.data.length > 0) {
            // Filter properties that have coordinates
            const propertiesWithCoords = result.data.filter((property) => {
              const hasCoords =
                property.coordinates &&
                property.coordinates.lat &&
                property.coordinates.lng &&
                !isNaN(property.coordinates.lat) &&
                !isNaN(property.coordinates.lng);

              if (!hasCoords) {
                console.log(
                  "❌ Property missing coordinates:",
                  property.title || property.id,
                  property.location
                );
              }
              return hasCoords;
            });

            console.log(
              `✅ Found ${propertiesWithCoords.length} properties with valid coordinates`
            );
            setProperties(propertiesWithCoords);
            setFetchError(null);

            if (propertiesWithCoords.length === 0) {
              setFetchError(
                `Found ${result.total} properties but none have valid addresses for mapping. Properties need addresses like "123 Main St, Hamilton" to appear on the map.`
              );
            }
          } else {
            console.log("📭 No properties returned from API");
            setFetchError("No properties found in database");
            setProperties([]);
          }
        } else {
          console.log("❌ API returned error:", result.message);
          setFetchError(result.message || "Failed to load properties");
          setProperties([]);
        }
      } catch (error) {
        console.error("💥 Error fetching properties:", error);
        setFetchError(`Failed to load properties: ${error.message}`);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  useEffect(() => {
    if (loading || properties.length === 0) return;

    let map = null;

    const initMap = () => {
      try {
        // Load Leaflet CSS and JS
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        if (!window.L) {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => {
            createMap();
          };
          document.head.appendChild(script);
        } else {
          createMap();
        }

        function createMap() {
          const mapElement = document.getElementById("property-map");
          if (!mapElement || window.mapInstance) return;

          // Calculate center point from all properties
          const centerLat =
            properties.reduce((sum, p) => sum + p.coordinates.lat, 0) /
            properties.length;
          const centerLng =
            properties.reduce((sum, p) => sum + p.coordinates.lng, 0) /
            properties.length;

          // Create map centered on calculated center point
          map = window.L.map("property-map").setView(
            [centerLat, centerLng],
            12
          );
          window.mapInstance = map;

          // Add OpenStreetMap tiles
          window.L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              attribution: "© OpenStreetMap contributors",
            }
          ).addTo(map);

          // Add markers for each property
          properties.forEach((property) => {
            if (
              !property.coordinates ||
              !property.coordinates.lat ||
              !property.coordinates.lng
            )
              return;

            // Create a custom marker icon
            const customIcon = window.L.divIcon({
              html: `
                <div style="
                  background-color: #dc2626;
                  width: 30px;
                  height: 30px;
                  border-radius: 50%;
                  border: 3px solid white;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  position: relative;
                ">
                  <div style="
                    width: 0;
                    height: 0;
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-top: 10px solid white;
                    position: absolute;
                    bottom: -8px;
                  "></div>
                  <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
              `,
              className: "custom-marker",
              iconSize: [30, 30],
              iconAnchor: [15, 30],
            });

            const marker = window.L.marker(
              [property.coordinates.lat, property.coordinates.lng],
              {
                icon: customIcon,
              }
            ).addTo(map);

            // Create popup with property details
            const price = property.price
              ? `$${property.price.toLocaleString()}`
              : "Price on request";
            const propertyType = property.property_type
              ? property.property_type.charAt(0).toUpperCase() +
                property.property_type.slice(1)
              : "";
            const bedrooms = property.bedrooms
              ? `${property.bedrooms} bed`
              : "";
            const bathrooms = property.bathrooms
              ? `${property.bathrooms} bath`
              : "";
            const sqft = property.square_footage
              ? `${property.square_footage} sqft`
              : "";

            // Build features string
            const features = [bedrooms, bathrooms, sqft]
              .filter(Boolean)
              .join(" • ");

            marker.bindPopup(
              `
              <div style="padding: 12px; min-width: 220px;">
                <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937; font-size: 16px;">
                  ${property.title || "Property"}
                </h3>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">
                  ${property.location}
                </p>
                ${
                  propertyType
                    ? `<p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af; text-transform: capitalize;">${propertyType}</p>`
                    : ""
                }
                ${
                  features
                    ? `<p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">${features}</p>`
                    : ""
                }
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #dc2626;">
                  ${price}
                </p>
                ${
                  property.status
                    ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #059669; text-transform: uppercase; font-weight: 500;">${property.status}</p>`
                    : ""
                }
              </div>
            `,
              {
                maxWidth: 280,
              }
            );
          });

          // Fit map to show all markers
          if (properties.length > 1) {
            const group = new window.L.featureGroup(
              properties.map((p) =>
                window.L.marker([p.coordinates.lat, p.coordinates.lng])
              )
            );
            map.fitBounds(group.getBounds().pad(0.1));
          }

          setMapError(false);
        }
      } catch (error) {
        console.error("Map initialization error:", error);
        setMapError(true);
      }
    };

    initMap();

    return () => {
      if (window.mapInstance) {
        window.mapInstance.remove();
        window.mapInstance = null;
      }
    };
  }, [properties, loading]);

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Property Locations
            </h2>
            <p className="text-lg text-gray-600">
              Discover properties in Hamilton and surrounding areas
            </p>
          </div>
          <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                Loading properties and generating map...
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (fetchError || properties.length === 0) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Property Locations
            </h2>
            <p className="text-lg text-gray-600">
              Discover properties in Hamilton and surrounding areas
            </p>
          </div>
          <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">
                No properties available for mapping
              </p>
              <p className="text-sm text-gray-500">
                {fetchError ||
                  "Properties need valid addresses to appear on the map"}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (mapError) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Property Locations
            </h2>
            <p className="text-lg text-gray-600">
              Discover properties in Hamilton and surrounding areas
            </p>
          </div>
          <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Unable to load map</p>
              <p className="text-sm text-gray-500">
                Please check your internet connection
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-10 bg-gray-50">
      <div className="max-w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Discover properties in Hamilton and surrounding areas
          </h2>
          <p className="text-lg text-gray-600">
            Showing {properties.length}{" "}
            {properties.length === 1 ? "property" : "properties"} on map
          </p>
        </div>

        {/* Map */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div
            id="property-map"
            className="w-full h-96 lg:h-[500px]"
            style={{ minHeight: "400px" }}
          />
        </div>
      </div>
    </section>
  );
}
