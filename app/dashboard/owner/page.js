// app/dashboard/owner/page.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

// Mock viewing requests data
const mockViewingRequests = [
  {
    id: 1,
    propertyId: 1,
    propertyTitle: "Luxurious Beach House",
    userName: "Michael Brown",
    userEmail: "michael.brown@example.com",
    userPhone: "(555) 234-5678",
    requestDate: "2023-05-18T09:30:00",
    proposedDate: "2023-05-23T14:00:00",
    status: "pending", // pending, approved, declined
    message: "I'm interested in viewing this property as soon as possible.",
  },
  {
    id: 2,
    propertyId: 3,
    propertyTitle: "Hillside Villa",
    userName: "Emma Wilson",
    userEmail: "emma.wilson@example.com",
    userPhone: "(555) 345-6789",
    requestDate: "2023-05-17T11:45:00",
    proposedDate: "2023-05-22T10:00:00",
    status: "approved",
    message:
      "I would like to see this property in person to evaluate if it meets my needs.",
  },
  {
    id: 3,
    propertyId: 2,
    propertyTitle: "Modern Downtown Apartment",
    userName: "David Lee",
    userEmail: "david.lee@example.com",
    userPhone: "(555) 456-7890",
    requestDate: "2023-05-15T16:20:00",
    proposedDate: "2023-05-20T13:30:00",
    status: "declined",
    message:
      "I'm looking for a property in this area and this one caught my attention.",
  },
];

// Mock rental applications data
const mockRentalApplications = [
  {
    id: 1,
    propertyId: 1,
    propertyTitle: "Luxurious Beach House",
    userName: "Jennifer Taylor",
    userEmail: "jennifer.taylor@example.com",
    userPhone: "(555) 567-8901",
    applicationDate: "2023-05-16T14:30:00",
    status: "pending", // pending, approved, rejected
    message:
      "I'm very interested in this property and would like to apply for rental.",
    employmentStatus: "Employed",
    income: "150000",
    creditScore: "Excellent",
  },
  {
    id: 2,
    propertyId: 4,
    propertyTitle: "Cozy Beach Townhouse",
    userName: "Robert Garcia",
    userEmail: "robert.garcia@example.com",
    userPhone: "(555) 678-9012",
    applicationDate: "2023-05-14T10:15:00",
    status: "approved",
    message:
      "I've been looking for a property like this for a while and would love to apply.",
    employmentStatus: "Self-employed",
    income: "120000",
    creditScore: "Good",
  },
  {
    id: 3,
    propertyId: 2,
    propertyTitle: "Modern Downtown Apartment",
    userName: "Susan Martinez",
    userEmail: "susan.martinez@example.com",
    userPhone: "(555) 789-0123",
    applicationDate: "2023-05-12T09:45:00",
    status: "rejected",
    message:
      "I'm interested in applying for this property for a long-term rental.",
    employmentStatus: "Employed",
    income: "90000",
    creditScore: "Fair",
  },
];

export default function OwnerDashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("properties");
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [editPropertyId, setEditPropertyId] = useState(null);
  const [showPropertyDetails, setShowPropertyDetails] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch owner's properties
  useEffect(() => {
    const fetchProperties = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('owner_id', user.id);
          
        if (error) throw error;
        
        setProperties(data || []);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperties();
  }, [user]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const getStatusColor = (status, type) => {
    if (type === "viewing") {
      switch (status) {
        case "approved":
          return "bg-green-100 text-green-800";
        case "pending":
          return "bg-yellow-100 text-yellow-800";
        case "declined":
          return "bg-red-100 text-red-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    } else {
      switch (status) {
        case "approved":
          return "bg-green-100 text-green-800";
        case "pending":
          return "bg-yellow-100 text-yellow-800";
        case "rejected":
          return "bg-red-100 text-red-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    }
  };

  const handleEditProperty = (propertyId) => {
    setEditPropertyId(propertyId);
    setShowAddPropertyModal(true);
  };

  const handleDeleteProperty = async (propertyId) => {
    if (confirm("Are you sure you want to delete this property?")) {
      try {
        const { error } = await supabase
          .from('properties')
          .delete()
          .eq('id', propertyId);
          
        if (error) throw error;
        
        // Update local state after successful deletion
        setProperties(properties.filter(property => property.id !== propertyId));
      } catch (error) {
        console.error('Error deleting property:', error);
        alert('Failed to delete property. Please try again.');
      }
    }
  };

  const getPropertyViewingRequests = (propertyId) => {
    return mockViewingRequests.filter(
      (request) => request.propertyId === propertyId
    );
  };

  const getPropertyApplications = (propertyId) => {
    return mockRentalApplications.filter(
      (application) => application.propertyId === propertyId
    );
  };

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                Owner Dashboard
              </h1>
              <Link href="/" className="text-custom-red hover:text-red-700">
                Return to Home
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="flex flex-col items-center">
                  <div className="w-32 h-32 relative rounded-full overflow-hidden mb-4">
                    {/* In a real app, use the owner's profile image */}
                    <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600">Profile Image</span>
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {profile?.role || 'Property Owner'}
                  </h2>
                  <p className="text-gray-600 mb-1">{user?.email}</p>
                  <p className="text-gray-600">{profile?.phone || 'No phone number'}</p>
                  <Link href="/profile" className="mt-4 w-full bg-custom-red hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors duration-300 text-center">
                    Edit Profile
                  </Link>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg overflow-hidden">
                <nav className="divide-y divide-gray-200">
                  <button
                    onClick={() => setActiveTab("properties")}
                    className={`w-full text-left px-6 py-4 flex items-center ${
                      activeTab === "properties"
                        ? "bg-red-50 text-custom-red"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <svg
                      className="h-5 w-5 mr-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                    My Properties
                  </button>

                  <button
                    onClick={() => setActiveTab("viewings")}
                    className={`w-full text-left px-6 py-4 flex items-center ${
                      activeTab === "viewings"
                        ? "bg-red-50 text-custom-red"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <svg
                      className="h-5 w-5 mr-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Viewing Requests
                  </button>

                  <button
                    onClick={() => setActiveTab("applications")}
                    className={`w-full text-left px-6 py-4 flex items-center ${
                      activeTab === "applications"
                        ? "bg-red-50 text-custom-red"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <svg
                      className="h-5 w-5 mr-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Rental Applications
                  </button>

                  <button
                    onClick={() => setActiveTab("analytics")}
                    className={`w-full text-left px-6 py-4 flex items-center ${
                      activeTab === "analytics"
                        ? "bg-red-50 text-custom-red"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <svg
                      className="h-5 w-5 mr-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    Analytics
                  </button>

                  <button
                    onClick={() => setActiveTab("settings")}
                    className={`w-full text-left px-6 py-4 flex items-center ${
                      activeTab === "settings"
                        ? "bg-red-50 text-custom-red"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <svg
                      className="h-5 w-5 mr-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Account Settings
                  </button>
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Properties Tab */}
              {activeTab === "properties" && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      My Properties
                    </h2>
                    <button
                      onClick={() => {
                        setEditPropertyId(null);
                        setShowAddPropertyModal(true);
                      }}
                      className="bg-custom-red hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300 flex items-center"
                    >
                      <svg
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Add New Property
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex justify-center my-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
                    </div>
                  ) : properties.length === 0 ? (
                    <div className="bg-white shadow rounded-lg p-6 text-center">
                      <p className="text-gray-500">
                        You haven't added any properties yet.
                      </p>
                      <button
                        onClick={() => {
                          setEditPropertyId(null);
                          setShowAddPropertyModal(true);
                        }}
                        className="inline-block mt-4 text-custom-red hover:text-red-700"
                      >
                        Add Your First Property
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {properties.map((property) => {
                        const viewingRequests = getPropertyViewingRequests(
                          property.id
                        );
                        const applications = getPropertyApplications(property.id);
                        const pendingViewings = viewingRequests.filter(
                          (request) => request.status === "pending"
                        ).length;
                        const pendingApplications = applications.filter(
                          (application) => application.status === "pending"
                        ).length;

                        return (
                          <div
                            key={property.id}
                            className="bg-white shadow rounded-lg overflow-hidden"
                          >
                            <div className="md:flex">
                              <div className="md:flex-shrink-0 h-48 md:h-auto md:w-48 bg-gray-300 relative">
                                {/* In a real app, use the property image */}
                                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                                  <span>Property Image</span>
                                </div>
                              </div>

                              <div className="p-6 w-full">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                                      {property.title}
                                    </h3>
                                    <p className="text-gray-600 mb-2">
                                      {property.location}
                                    </p>
                                    <p className="text-custom-red font-bold mb-4">
                                      {formatPrice(property.price)}
                                    </p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() =>
                                        handleEditProperty(property.id)
                                      }
                                      className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
                                      title="Edit Property"
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
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteProperty(property.id)
                                      }
                                      className="inline-flex items-center p-2 border border-red-300 rounded-md text-sm text-red-700 bg-white hover:bg-red-50"
                                      title="Delete Property"
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
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                  <div>
                                    <span className="block text-gray-600 text-sm">
                                      Bedrooms
                                    </span>
                                    <span className="font-medium">
                                      {property.bedrooms}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="block text-gray-600 text-sm">
                                      Bathrooms
                                    </span>
                                    <span className="font-medium">
                                      {property.bathrooms}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="block text-gray-600 text-sm">
                                      Square Feet
                                    </span>
                                    <span className="font-medium">
                                      {property.square_footage?.toLocaleString() || 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="block text-gray-600 text-sm">
                                      Available From
                                    </span>
                                    <span className="font-medium">
                                      {property.available_from 
                                        ? new Date(property.available_from).toLocaleDateString() 
                                        : 'Available Now'}
                                    </span>
                                  </div>
                                </div>

                                <div className="border-t border-gray-200 mt-4 pt-4">
                                  <div className="flex flex-wrap justify-between">
                                    <div className="mb-2 md:mb-0">
                                      <div className="flex items-center">
                                        <div className="mr-6">
                                          <span className="block text-gray-600 text-sm">
                                            Viewing Requests
                                          </span>
                                          <div className="flex items-center">
                                            <span className="font-medium mr-2">
                                              {viewingRequests.length}
                                            </span>
                                            {pendingViewings > 0 && (
                                              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                                {pendingViewings} pending
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="block text-gray-600 text-sm">
                                            Applications
                                          </span>
                                          <div className="flex items-center">
                                            <span className="font-medium mr-2">
                                              {applications.length}
                                            </span>
                                            {pendingApplications > 0 && (
                                              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                                {pendingApplications} pending
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex space-x-3">
                                      <button
                                        onClick={() =>
                                          setShowPropertyDetails(property.id)
                                        }
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                      >
                                        View Details
                                      </button>
                                      <Link
                                        href={`/properties/${property.id}`}
                                        className="inline-flex items-center px-4 py-2 border border-custom-red rounded-md text-sm font-medium text-custom-red bg-white hover:bg-red-50"
                                      >
                                        Preview Listing
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Property Details Section (expanded view) */}
                            {showPropertyDetails === property.id && (
                              <div className="border-t border-gray-200 px-6 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Viewing Requests */}
                                  <div>
                                    <h4 className="font-medium text-gray-900 mb-3">
                                      Recent Viewing Requests
                                    </h4>
                                    {viewingRequests.length === 0 ? (
                                      <p className="text-gray-500 text-sm">
                                        No viewing requests yet.
                                      </p>
                                    ) : (
                                      <div className="space-y-3">
                                        {viewingRequests
                                          .slice(0, 2)
                                          .map((request) => (
                                            <div
                                              key={request.id}
                                              className="bg-gray-50 p-3 rounded-md text-sm"
                                            >
                                              <div className="flex justify-between mb-1">
                                                <span className="font-medium">
                                                  {request.userName}
                                                </span>
                                                <span
                                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                                    request.status,
                                                    "viewing"
                                                  )}`}
                                                >
                                                  {request.status
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    request.status.slice(1)}
                                                </span>
                                              </div>
                                              <p className="text-gray-600 mb-2">
                                                Proposed:{" "}
                                                {formatDate(request.proposedDate)}
                                              </p>
                                              {request.status === "pending" && (
                                                <div className="flex space-x-2 mt-2">
                                                  <button className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-1 px-2 rounded">
                                                    Approve
                                                  </button>
                                                  <button className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium py-1 px-2 rounded">
                                                    Decline
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        {viewingRequests.length > 2 && (
                                          <button
                                            onClick={() =>
                                              setActiveTab("viewings")
                                            }
                                            className="text-custom-red hover:text-red-700 text-sm font-medium"
                                          >
                                            View all {viewingRequests.length}{" "}
                                            requests
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Rental Applications */}
                                  <div>
                                    <h4 className="font-medium text-gray-900 mb-3">
                                      Recent Applications
                                    </h4>
                                    {applications.length === 0 ? (
                                      <p className="text-gray-500 text-sm">
                                        No rental applications yet.
                                      </p>
                                    ) : (
                                      <div className="space-y-3">
                                        {applications
                                          .slice(0, 2)
                                          .map((application) => (
                                            <div
                                              key={application.id}
                                              className="bg-gray-50 p-3 rounded-md text-sm"
                                            >
                                              <div className="flex justify-between mb-1">
                                                <span className="font-medium">
                                                  {application.userName}
                                                </span>
                                                <span
                                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                                    application.status,
                                                    "application"
                                                  )}`}
                                                >
                                                  {application.status
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    application.status.slice(1)}
                                                </span>
                                              </div>
                                              <p className="text-gray-600 mb-1">
                                                Applied:{" "}
                                                {formatDate(
                                                  application.applicationDate
                                                )}
                                              </p>
                                              <p className="text-gray-600 mb-2">
                                                Income: $
                                                {parseInt(
                                                  application.income
                                                ).toLocaleString()}
                                                /year
                                              </p>
                                              {application.status ===
                                                "pending" && (
                                                <div className="flex space-x-2 mt-2">
                                                  <button className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-1 px-2 rounded">
                                                    Approve
                                                  </button>
                                                  <button className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium py-1 px-2 rounded">
                                                    Reject
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        {applications.length > 2 && (
                                          <button
                                            onClick={() =>
                                              setActiveTab("applications")
                                            }
                                            className="text-custom-red hover:text-red-700 text-sm font-medium"
                                          >
                                            View all {applications.length}{" "}
                                            applications
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex justify-center mt-4">
                                  <button
                                    onClick={() => setShowPropertyDetails(null)}
                                    className="text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center"
                                  >
                                    <svg
                                      className="h-4 w-4 mr-1"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M5 15l7-7 7 7"
                                      />
                                    </svg>
                                    Hide Details
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Viewing Requests Tab */}
              {activeTab === "viewings" && (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Viewing Requests
                  </h2>
                  {mockViewingRequests.length === 0 ? (
                    <div className="bg-white shadow rounded-lg p-6 text-center">
                      <p className="text-gray-500">No viewing requests yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {mockViewingRequests.map((request) => (
                        <div key={request.id} className="bg-white shadow rounded-lg overflow-hidden">
                          <div className="p-6">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                                  {request.propertyTitle}
                                </h3>
                                <p className="text-gray-600 mb-2">Request from {request.userName}</p>
                              </div>
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                  request.status,
                                  "viewing"
                                )}`}
                              >
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-gray-600 text-sm font-medium">Proposed Date</p>
                                <p className="font-semibold">{formatDate(request.proposedDate)}</p>
                              </div>
                              <div>
                                <p className="text-gray-600 text-sm font-medium">Request Made On</p>
                                <p>{formatDate(request.requestDate)}</p>
                              </div>
                            </div>
                            
                            <div className="mb-4">
                              <p className="text-gray-600 text-sm font-medium">Message</p>
                              <p className="text-gray-700 mt-1">{request.message}</p>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <p className="text-gray-600 text-sm">Email</p>
                                  <p className="font-medium">{request.userEmail}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 text-sm">Phone</p>
                                  <p className="font-medium">{request.userPhone}</p>
                                </div>
                              </div>
                            </div>
                            
                            {request.status === "pending" && (
                              <div className="flex justify-end space-x-3 mt-4">
                                <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                  Suggest New Time
                                </button>
                                <button className="inline-flex items-center px-4 py-2 border border-green-500 rounded-md text-sm font-medium text-white bg-green-500 hover:bg-green-600">
                                  Approve
                                </button>
                                <button className="inline-flex items-center px-4 py-2 border border-red-500 rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-600">
                                  Decline
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {/* Applications Tab */}
              {activeTab === "applications" && (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Rental Applications
                  </h2>
                  {mockRentalApplications.length === 0 ? (
                    <div className="bg-white shadow rounded-lg p-6 text-center">
                      <p className="text-gray-500">No rental applications yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {mockRentalApplications.map((application) => (
                        <div key={application.id} className="bg-white shadow rounded-lg overflow-hidden">
                          <div className="p-6">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                                  {application.propertyTitle}
                                </h3>
                                <p className="text-gray-600 mb-2">Application from {application.userName}</p>
                              </div>
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                  application.status,
                                  "application"
                                )}`}
                              >
                                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-gray-600 text-sm font-medium">Employment Status</p>
                                <p className="font-medium">{application.employmentStatus}</p>
                              </div>
                              <div>
                                <p className="text-gray-600 text-sm font-medium">Annual Income</p>
                                <p className="font-medium">${parseInt(application.income).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-gray-600 text-sm font-medium">Credit Score</p>
                                <p className="font-medium">{application.creditScore}</p>
                              </div>
                            </div>
                            
                            <div className="mb-4">
                              <p className="text-gray-600 text-sm font-medium">Message</p>
                              <p className="text-gray-700 mt-1">{application.message}</p>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <p className="text-gray-600 text-sm">Email</p>
                                  <p className="font-medium">{application.userEmail}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 text-sm">Phone</p>
                                  <p className="font-medium">{application.userPhone}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 text-sm">Applied On</p>
                                  <p className="font-medium">{formatDate(application.applicationDate)}</p>
                                </div>
                              </div>
                            </div>
                            
                            {application.status === "pending" && (
                              <div className="flex justify-end space-x-3 mt-4">
                                <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                  Request More Info
                                </button>
                                <button className="inline-flex items-center px-4 py-2 border border-green-500 rounded-md text-sm font-medium text-white bg-green-500 hover:bg-green-600">
                                  Approve
                                </button>
                                <button className="inline-flex items-center px-4 py-2 border border-red-500 rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-600">
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {/* Analytics Tab - Placeholder */}
              {activeTab === "analytics" && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Property Analytics</h2>
                  <p className="text-gray-500 text-center mb-8">This feature will be available soon.</p>
                  
                  <div className="bg-gray-50 p-6 rounded-lg text-center">
                    <svg 
                      className="h-16 w-16 mx-auto text-gray-400 mb-4" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="2" 
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                      />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Coming Soon</h3>
                    <p className="text-gray-600">
                      We're working on comprehensive property analytics to help you make better decisions.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Settings Tab - Placeholder */}
              {activeTab === "settings" && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>
                  
                  <form className="space-y-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        disabled
                        value={user?.email || ''}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                    </div>
                    
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Change Password
                      </button>
                    </div>
                    
                    <div>
                      <label htmlFor="notifications" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Notifications
                      </label>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <input
                            id="notifications-new-inquiries"
                            type="checkbox"
                            className="h-4 w-4 text-custom-red border-gray-300 rounded"
                            defaultChecked
                          />
                          <label htmlFor="notifications-new-inquiries" className="ml-2 block text-sm text-gray-700">
                            New property inquiries
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="notifications-viewing-requests"
                            type="checkbox"
                            className="h-4 w-4 text-custom-red border-gray-300 rounded"
                            defaultChecked
                          />
                          <label htmlFor="notifications-viewing-requests" className="ml-2 block text-sm text-gray-700">
                            Viewing requests
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="notifications-applications"
                            type="checkbox"
                            className="h-4 w-4 text-custom-red border-gray-300 rounded"
                            defaultChecked
                          />
                          <label htmlFor="notifications-applications" className="ml-2 block text-sm text-gray-700">
                            Rental applications
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-5">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-red hover:bg-red-700"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}