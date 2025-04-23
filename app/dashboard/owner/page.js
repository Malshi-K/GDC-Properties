"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { toast } from "react-hot-toast";

// Import components
import ProfileCard from "@/components/dashboards/ProfileCard";
import Sidebar from "@/components/dashboards/owner/Sidebar";
import PropertiesTab from "@/components/dashboards/owner/tabs/PropertiesTab";
import ViewingRequestsTab from "@/components/dashboards/owner/tabs/ViewingRequestsTab";
import ApplicationsTab from "@/components/dashboards/owner/tabs/ApplicationsTab";
import AnalyticsTab from "@/components/dashboards/owner/tabs/AnalyticsTab";
import SettingsTab from "@/components/dashboards/owner/tabs/SettingsTab";
import AddEditPropertyModal from "@/components/dashboards/owner/property/AddEditPropertyModal";

// Import services
import { propertyService } from "@/lib/services/propertyService";

export default function OwnerDashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("properties");
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [editPropertyId, setEditPropertyId] = useState(null);
  const [properties, setProperties] = useState([]);
  const [viewingRequests, setViewingRequests] = useState([]);
  const [rentalApplications, setRentalApplications] = useState([]);
  const [loading, setLoading] = useState({
    properties: true,
    viewings: true,
    applications: true,
  });
  const [error, setError] = useState({
    properties: null,
    viewings: null,
    applications: null,
  });

  // Fetch owner's properties
  useEffect(() => {
    if (!user) return;
    fetchProperties();
  }, [user]);

  // Fetch viewing requests and applications when tab changes
  useEffect(() => {
    if (!user) return;
    
    if (activeTab === "properties") {
      // Fetch all data when on properties tab
      fetchViewingRequests();
      fetchRentalApplications();
    } else if (activeTab === "viewings") {
      fetchViewingRequests();
    } else if (activeTab === "applications") {
      fetchRentalApplications();
    }
  }, [user, activeTab]);

  // Fetch properties
  // Inside OwnerDashboard.js
  // Update fetchProperties to include viewing requests and applications
  const fetchProperties = async () => {
    try {
      setLoading((prev) => ({ ...prev, properties: true }));

      // Fetch properties
      const { data: propertiesData, error: propertiesError } =
        await propertyService.getOwnerProperties();

      if (propertiesError) throw propertiesError;

      // Fetch viewing requests and applications for these properties
      const { data: viewingRequestsData, error: viewingError } =
        await propertyService.getAllViewingRequests();
      const { data: applicationsData, error: applicationsError } =
        await propertyService.getAllApplications();

      if (viewingError) throw viewingError;
      if (applicationsError) throw applicationsError;

      // Combine the data
      const propertiesWithRelatedData = propertiesData.map((property) => ({
        ...property,
        viewing_requests: viewingRequestsData.filter(
          (req) => req.property_id === property.id
        ),
        applications: applicationsData.filter(
          (app) => app.property_id === property.id
        ),
      }));

      setProperties(propertiesWithRelatedData || []);
      setError((prev) => ({ ...prev, properties: null }));
    } catch (err) {
      console.error("Error fetching properties:", err);
      setError((prev) => ({ ...prev, properties: err.message }));
      toast.error("Failed to load properties");
    } finally {
      setLoading((prev) => ({ ...prev, properties: false }));
    }
  };

  const fetchViewingRequests = async () => {
    try {
      setLoading(prev => ({ ...prev, viewings: true }));
      const { data, error } = await propertyService.getAllViewingRequests();
      
      if (error) throw error;
      
      console.log("Fetched viewing requests:", data);
      setViewingRequests(data || []);
      setError(prev => ({ ...prev, viewings: null }));
    } catch (err) {
      console.error('Error fetching viewing requests:', err);
      setError(prev => ({ ...prev, viewings: err.message }));
      toast.error('Failed to load viewing requests');
    } finally {
      setLoading(prev => ({ ...prev, viewings: false }));
    }
  };
  
  const fetchRentalApplications = async () => {
    try {
      setLoading(prev => ({ ...prev, applications: true }));
      const { data, error } = await propertyService.getAllApplications();
      
      if (error) throw error;
      
      console.log("Fetched rental applications:", data);
      setRentalApplications(data || []);
      setError(prev => ({ ...prev, applications: null }));
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(prev => ({ ...prev, applications: err.message }));
      toast.error('Failed to load rental applications');
    } finally {
      setLoading(prev => ({ ...prev, applications: false }));
    }
  };

  // Handle property actions
  const handleEditProperty = (propertyId) => {
    setEditPropertyId(propertyId);
    setShowAddPropertyModal(true);
  };

  const handleDeleteProperty = async (propertyId) => {
    if (confirm("Are you sure you want to delete this property?")) {
      try {
        const { error } = await propertyService.deleteProperty(propertyId);

        if (error) throw error;

        // Update local state after successful deletion
        setProperties(
          properties.filter((property) => property.id !== propertyId)
        );
        toast.success("Property deleted successfully");
      } catch (error) {
        console.error("Error deleting property:", error);
        toast.error("Failed to delete property. Please try again.");
      }
    }
  };

  const handleSaveProperty = async (formData) => {
    try {
      let result;

      if (editPropertyId) {
        // Update existing property
        const { data, error } = await propertyService.updateProperty(
          editPropertyId,
          formData
        );
        if (error) throw error;
        result = data;

        // Update local state
        setProperties(
          properties.map((property) =>
            property.id === editPropertyId ? result : property
          )
        );

        toast.success("Property updated successfully");
      } else {
        // Add new property
        const { data, error } = await propertyService.createProperty({
          ...formData,
          owner_id: user.id,
        });

        if (error) throw error;
        result = data;

        // Update local state with newly created property
        setProperties([result, ...properties]);
        toast.success("Property added successfully");
      }

      // Close modal after successful save
      setShowAddPropertyModal(false);
      setEditPropertyId(null);
    } catch (error) {
      console.error("Error saving property:", error);
      toast.error("Failed to save property. Please try again.");
    }
  };

  // Handle viewing request actions
  const handleViewingRequestStatusUpdate = async (requestId, status) => {
    try {
      const { data, error } = await propertyService.updateViewingRequestStatus(
        requestId,
        status
      );

      if (error) throw error;

      // Update local state
      setViewingRequests(
        viewingRequests.map((request) =>
          request.id === requestId ? { ...request, status } : request
        )
      );

      toast.success(`Viewing request ${status}`);
    } catch (error) {
      console.error("Error updating viewing request:", error);
      toast.error("Failed to update viewing request. Please try again.");
    }
  };

  // Handle rental application actions
  const handleApplicationStatusUpdate = async (applicationId, status) => {
    try {
      const { data, error } = await propertyService.updateApplicationStatus(
        applicationId,
        status
      );

      if (error) throw error;

      // Update local state
      setRentalApplications(
        rentalApplications.map((application) =>
          application.id === applicationId
            ? { ...application, status }
            : application
        )
      );

      toast.success(`Application ${status}`);
    } catch (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application. Please try again.");
    }
  };

  // Get property being edited if any
  const propertyToEdit = editPropertyId
    ? properties.find((property) => property.id === editPropertyId)
    : null;

  return (
    <ProtectedRoute allowedRoles={["owner"]}>
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
              <ProfileCard user={user} profile={profile} />
              <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Properties Tab */}
              {activeTab === "properties" && (
                <>
                  {console.log("Passing to PropertiesTab:", {
                    properties,
                    viewingRequests,
                    rentalApplications,
                  })}
                  <PropertiesTab
                    properties={properties}
                    loading={loading.properties}
                    error={error.properties}
                    viewingRequests={viewingRequests} // Make sure this is being passed
                    applications={rentalApplications} // Make sure this is being passed
                    onEdit={handleEditProperty}
                    onDelete={handleDeleteProperty}
                    onAddNew={() => {
                      setEditPropertyId(null);
                      setShowAddPropertyModal(true);
                    }}
                    onViewAllRequests={() => setActiveTab("viewings")}
                    onViewAllApplications={() => setActiveTab("applications")}
                    onRefresh={fetchProperties}
                  />
                </>
              )}

              {/* Viewing Requests Tab */}
              {activeTab === "viewings" && (
                <ViewingRequestsTab
                  viewingRequests={viewingRequests}
                  loading={loading.viewings}
                  error={error.viewings}
                  onStatusUpdate={handleViewingRequestStatusUpdate}
                  onRefresh={fetchViewingRequests}
                />
              )}

              {/* Applications Tab */}
              {activeTab === "applications" && (
                <ApplicationsTab
                  applications={rentalApplications}
                  loading={loading.applications}
                  error={error.applications}
                  onStatusUpdate={handleApplicationStatusUpdate}
                  onRefresh={fetchRentalApplications}
                />
              )}

              {/* Analytics Tab */}
              {activeTab === "analytics" && <AnalyticsTab />}

              {/* Settings Tab */}
              {activeTab === "settings" && <SettingsTab user={user} />}
            </div>
          </div>
        </main>

        {/* Add/Edit Property Modal */}
        {showAddPropertyModal && (
          <AddEditPropertyModal
            isOpen={showAddPropertyModal}
            onClose={() => {
              setShowAddPropertyModal(false);
              setEditPropertyId(null);
            }}
            property={propertyToEdit}
            onSave={handleSaveProperty}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
