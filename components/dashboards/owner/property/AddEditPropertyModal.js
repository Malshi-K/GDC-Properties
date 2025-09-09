"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { v4 as uuidv4 } from "uuid";
import LoadingFallback from "@/components/LoadingFallback";

export default function AddEditPropertyModal({
  isOpen,
  onClose,
  property,
  onSave,
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(true);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    address: "",
    price: "",
    bedrooms: "",
    bathrooms: "",
    square_footage: "",
    available_from: "",
    description: "",
    amenities: [],
    nearby_amenities: [],
    property_type: "apartment",
    status: "available",
    year_built: "",
    images: [],
  });

  const [imagePreviews, setImagePreviews] = useState([]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingFallback />;
  }

  // Define the list of New Zealand locations for the dropdown
  const nzLocations = [
    "Auckland",
    "Hamilton",
    "Tauranga",
    "Lower Hutt",
    "Wellington",
    "Christchurch",
    "Dunedin",
  ];

  useEffect(() => {
    const resetForm = () => {
      if (property) {
        // Editing existing property
        // Convert date format for input field if exists
        const formattedAvailableFrom = property.available_from
          ? new Date(property.available_from).toISOString().split("T")[0]
          : "";

        setFormData({
          title: property.title || "",
          location: property.location || "",
          address: property.address || "",
          price: property.price || "",
          bedrooms: property.bedrooms || "",
          bathrooms: property.bathrooms || "",
          square_footage: property.square_footage || "",
          available_from: formattedAvailableFrom,
          description: property.description || "",
          amenities: property.amenities || [],
          nearby_amenities: property.nearby_amenities || [],
          property_type: property.property_type || "apartment",
          status: property.status || "available",
          year_built: property.year_built || "",
          images: property.images || [],
        });

        // Hide upload section initially when editing a property that has images
        setShowUploadSection(!(property.images && property.images.length > 0));

        // Load image previews for existing images with signed URLs
        loadExistingImages(property.images);
      } else {
        // Adding new property - reset form
        setFormData({
          title: "",
          location: "",
          address: "",
          price: "",
          bedrooms: "",
          bathrooms: "",
          square_footage: "",
          available_from: "",
          description: "",
          amenities: [],
          nearby_amenities: [],
          property_type: "apartment",
          status: "available",
          year_built: "",
          images: [],
        });
        setImagePreviews([]);
        setShowUploadSection(true);
      }

      // Clear any previous errors
      setError(null);
    };

    if (isOpen) {
      resetForm();
    }
  }, [property, isOpen]);

  // Function to load existing images with signed URLs
  const loadExistingImages = async (images) => {
    if (!images || images.length === 0) {
      setImagePreviews([]);
      return;
    }

    setLoading(true);
    try {
      const previews = [];

      for (const imagePath of images) {
        try {
          // Get a signed URL for each image
          const { data, error } = await supabase.storage
            .from("property-images")
            .createSignedUrl(imagePath, 60 * 60); // 1 hour expiry

          if (error) {
            console.error(
              "Error getting signed URL for image:",
              imagePath,
              error
            );
            continue;
          }

          previews.push({
            url: data.signedUrl,
            path: imagePath,
          });
        } catch (err) {
          console.error("Error processing image:", imagePath, err);
        }
      }

      setImagePreviews(previews);
    } catch (err) {
      console.error("Error loading image previews:", err);
      setError("Failed to load property images. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      // Store uploaded image paths
      const uploadedImagePaths = [];
      const newPreviews = [...imagePreviews];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Create a unique file name to avoid collisions
        const fileExt = file.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Upload the file to Supabase Storage
        const { data, error } = await supabase.storage
          .from("property-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) throw error;

        // Add the file path to our array
        uploadedImagePaths.push(filePath);

        // Create a local preview URL
        const previewUrl = URL.createObjectURL(file);
        newPreviews.push({
          url: previewUrl,
          path: filePath,
        });

        // Update progress
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      // Update the form data with the new image paths
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedImagePaths],
      }));

      // Update the image previews
      setImagePreviews(newPreviews);
    } catch (err) {
      console.error("Error uploading images:", err);
      setError(`Error uploading images: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async (index) => {
    const imageToRemove = imagePreviews[index];

    // Create a copy of the arrays to mutate
    const newPreviews = [...imagePreviews];
    const newImages = [...formData.images];

    try {
      // If this is an image stored in Supabase (not just a preview of a new upload)
      if (imageToRemove.path && imageToRemove.path.includes(user.id)) {
        // Delete from Supabase storage
        const { error } = await supabase.storage
          .from("property-images")
          .remove([imageToRemove.path]);

        if (error) throw error;
      }

      // Remove from preview array
      newPreviews.splice(index, 1);

      // Find and remove from formData.images array
      const pathIndex = newImages.findIndex(
        (path) => path === imageToRemove.path
      );
      if (pathIndex !== -1) {
        newImages.splice(pathIndex, 1);
      }

      // Update state
      setImagePreviews(newPreviews);
      setFormData((prev) => ({
        ...prev,
        images: newImages,
      }));

      // Show upload section if all images are removed
      if (newPreviews.length === 0) {
        setShowUploadSection(true);
      }
    } catch (err) {
      console.error("Error removing image:", err);
      setError(`Error removing image: ${err.message}`);
    }
  };

  // Toggle upload section visibility
  const toggleUploadSection = () => {
    setShowUploadSection(!showUploadSection);
  };

  // Handle array fields like features and nearby_amenities
  const handleArrayItemChange = (e, index, arrayName) => {
    const value = e.target.value;
    setFormData((prev) => {
      const newArray = [...prev[arrayName]];
      newArray[index] = value;
      return {
        ...prev,
        [arrayName]: newArray,
      };
    });
  };

  const handleAddArrayItem = (arrayName) => {
    setFormData((prev) => ({
      ...prev,
      [arrayName]: [...prev[arrayName], ""],
    }));
  };

  const handleRemoveArrayItem = (index, arrayName) => {
    setFormData((prev) => {
      const newArray = [...prev[arrayName]];
      newArray.splice(index, 1);
      return {
        ...prev,
        [arrayName]: newArray,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!user || !user.id) {
        throw new Error("You must be logged in to save a property");
      }

      // Prepare data for Supabase
      const propertyData = {
        ...formData,
        owner_id: user.id,
        price: parseFloat(formData.price),
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseFloat(formData.bathrooms),
        square_footage: parseInt(formData.square_footage),
        year_built: parseInt(formData.year_built) || null,
        updated_at: new Date().toISOString(),
      };

      // Call the parent's onSave function which handles the actual database update
      await onSave(propertyData);
    } catch (err) {
      console.error("Error saving property:", err);
      setError(err.message || "Failed to save property. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle amenities as a multi-select
  const handleAmenityChange = (e) => {
    const { value, checked } = e.target;

    setFormData((prevData) => {
      if (checked) {
        return {
          ...prevData,
          amenities: [...prevData.amenities, value],
        };
      } else {
        return {
          ...prevData,
          amenities: prevData.amenities.filter((item) => item !== value),
        };
      }
    });
  };

  if (!isOpen) return null;

  const amenitiesList = [
    "Air Conditioning",
    "Heating",
    "Washer/Dryer",
    "Dishwasher",
    "Parking",
    "Gym",
    "Pool",
    "Pet Friendly",
    "Balcony",
    "Elevator",
    "Security System",
    "WiFi",
    "Furnished",
  ];

  const propertyTypes = [
    { value: "apartment", label: "Apartment" },
    { value: "house", label: "House" },
    { value: "townhouse", label: "Townhouse" },
    { value: "units", label: "Units" },
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {property ? "Edit Property" : "Add New Property"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={loading}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-gray-700">
          {/* Image Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Images
            </label>

            {/* Image Preview Grid */}
            {imagePreviews.length > 0 && (
              <div className="mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-video w-full bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                        {loading ? (
                          <div className="animate-pulse flex items-center justify-center h-full bg-gray-200">
                            <svg
                              className="w-10 h-10 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        ) : (
                          <img
                            src={preview.url}
                            alt={`Property image ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/placeholder-image.jpg";
                            }}
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {property && imagePreviews.length > 0 && (
                  <div className="flex justify-end mb-4">
                    <button
                      type="button"
                      onClick={toggleUploadSection}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      {showUploadSection
                        ? "Hide Upload Section"
                        : "Add More Images"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-custom-red h-2.5 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Uploading: {uploadProgress}%
                </p>
              </div>
            )}

            {/* Upload Section - Only show if showUploadSection is true */}
            {(showUploadSection || imagePreviews.length === 0) && (
              <div className="mb-4">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="property-images"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg
                        className="w-8 h-8 mb-4 text-gray-500"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 16"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                        />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG or WEBP (MAX. 5MB each)
                      </p>
                    </div>
                    <input
                      id="property-images"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Upload clear images of the property to attract potential
                  tenants
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Property Title*
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
              />
            </div>

            {/* Modified Location field to use a dropdown with proper empty default */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Location*
              </label>
              <select
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
              >
                <option value="">Select a location</option>
                {nzLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Full Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
              />
            </div>

            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Price (USD)*
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
              />
            </div>

            <div>
              <label
                htmlFor="property_type"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Property Type*
              </label>
              <select
                id="property_type"
                name="property_type"
                value={formData.property_type}
                onChange={handleChange}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
              >
                {propertyTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="bedrooms"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Bedrooms*
              </label>
              <input
                type="number"
                id="bedrooms"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                required
                min="0"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
              />
            </div>

            <div>
              <label
                htmlFor="bathrooms"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Bathrooms*
              </label>
              <input
                type="number"
                id="bathrooms"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                required
                min="0"
                step="0.5"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
              />
            </div>

            <div>
              <label
                htmlFor="square_footage"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Square Footage*
              </label>
              <input
                type="number"
                id="square_footage"
                name="square_footage"
                value={formData.square_footage}
                onChange={handleChange}
                required
                min="0"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
              />
            </div>

            <div>
              <label
                htmlFor="year_built"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Year Built
              </label>
              <input
                type="number"
                id="year_built"
                name="year_built"
                value={formData.year_built}
                onChange={handleChange}
                min="1800"
                max={new Date().getFullYear()}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
              />
            </div>

            <div>
              <label
                htmlFor="available_from"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Available From
              </label>
              <input
                type="date"
                id="available_from"
                name="available_from"
                value={formData.available_from}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
              />
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
              >
                <option value="available">Available</option>
                <option value="pending">Pending</option>
                <option value="rented">Rented</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Short Description*
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
              placeholder="Brief description for property listings"
            ></textarea>
          </div>

          {/* Amenities Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amenities
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {amenitiesList.map((amenity) => (
                <div key={amenity} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`amenity-${amenity}`}
                    value={amenity}
                    checked={formData.amenities.includes(amenity)}
                    onChange={handleAmenityChange}
                    className="h-4 w-4 text-custom-red border-gray-300 rounded focus:ring-custom-red"
                  />
                  <label
                    htmlFor={`amenity-${amenity}`}
                    className="ml-2 block text-sm text-gray-700"
                  >
                    {amenity}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Nearby Amenities Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Nearby Amenities
              </label>
              <button
                type="button"
                onClick={() => handleAddArrayItem("nearby_amenities")}
                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-custom-red bg-red-50 hover:bg-red-100"
              >
                Add Nearby Amenity
              </button>
            </div>
            {formData.nearby_amenities.map((amenity, index) => (
              <div key={index} className="flex items-center mb-2">
                <input
                  type="text"
                  value={amenity}
                  onChange={(e) =>
                    handleArrayItemChange(e, index, "nearby_amenities")
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-custom-red focus:border-custom-red"
                  placeholder="e.g., Premium shopping centers (5 min drive)"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleRemoveArrayItem(index, "nearby_amenities")
                  }
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="pt-5">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading || isUploading}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || isUploading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-red hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {loading && (
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                {property ? "Update Property" : "Add Property"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
