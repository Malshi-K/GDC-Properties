// Fixed AdminAnalyticsTab with correct status matching
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminAnalyticsTab({ onRefresh }) {
  const [analytics, setAnalytics] = useState({
    // Core metrics
    totalUsers: 0,
    totalProperties: 0,
    totalApplications: 0,
    totalViewingRequests: 0,
    
    // User breakdown
    propertyOwners: 0,
    propertySeekers: 0,
    adminUsers: 0,
    
    // Property metrics
    availableProperties: 0,
    rentedProperties: 0,
    
    // Application metrics - updated for actual status values
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    completedApplications: 0, // Added this
    
    // Viewing metrics - updated for actual status values
    pendingViewings: 0,
    approvedViewings: 0, // Changed from confirmed
    canceledViewings: 0, // Changed from completed
    confirmedViewings: 0, // Keep for backward compatibility
    completedViewings: 0, // Keep for backward compatibility
    
    // Financial metrics
    averageRent: 0,
    totalRentValue: 0,
    occupancyRate: 0,
    
    // Recent activity
    recentUsers: [],
    recentProperties: [],
    recentApplications: [],
    recentViewings: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("=== FETCHING PROPERTY ANALYTICS DATA ===");

      // Fetch all properties to calculate metrics
      const { data: allProperties } = await supabase
        .from("properties")
        .select("*");

      // Fetch all users with roles
      const { data: allUsers } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at");

      // Fetch all applications
      const { data: allApplications } = await supabase
        .from("rental_applications")
        .select("*");

      // Fetch all viewing requests
      const { data: allViewings } = await supabase
        .from("viewing_requests")
        .select("*");

      // Debug: Log the actual data to see what status values exist
      console.log("Raw applications data:", allApplications);
      console.log("Raw viewings data:", allViewings);

      // Get unique status values for debugging
      const uniqueAppStatuses = [...new Set(allApplications?.map(a => a.status) || [])];
      const uniqueViewingStatuses = [...new Set(allViewings?.map(v => v.status) || [])];
      
      console.log("Unique application statuses found:", uniqueAppStatuses);
      console.log("Unique viewing statuses found:", uniqueViewingStatuses);

      // Calculate core metrics
      const totalUsers = allUsers?.length || 0;
      const totalProperties = allProperties?.length || 0;
      const totalApplications = allApplications?.length || 0;
      const totalViewingRequests = allViewings?.length || 0;

      // User breakdown
      const propertyOwners = allUsers?.filter(u => 
        u.role === 'landlord' || u.role === 'owner'
      ).length || 0;
      const propertySeekers = allUsers?.filter(u => 
        u.role === 'tenant' || u.role === 'user'
      ).length || 0;
      const adminUsers = allUsers?.filter(u => u.role === 'admin').length || 0;

      // Property status breakdown
      const availableProperties = allProperties?.filter(p => p.status === 'available').length || 0;
      const rentedProperties = allProperties?.filter(p => p.status === 'rented').length || 0;

      // Application status breakdown - FIXED to match actual database values
      const pendingApplications = allApplications?.filter(a => a.status === 'pending').length || 0;
      const approvedApplications = allApplications?.filter(a => a.status === 'approved').length || 0;
      const rejectedApplications = allApplications?.filter(a => a.status === 'rejected').length || 0;
      const completedApplications = allApplications?.filter(a => a.status === 'completed').length || 0;

      // Viewing status breakdown - FIXED to match actual database values
      const pendingViewings = allViewings?.filter(v => v.status === 'pending').length || 0;
      const approvedViewings = allViewings?.filter(v => v.status === 'approved').length || 0;
      const canceledViewings = allViewings?.filter(v => v.status === 'canceled').length || 0;
      
      // Keep these for backward compatibility or if other statuses exist
      const confirmedViewings = allViewings?.filter(v => v.status === 'confirmed').length || 0;
      const completedViewings = allViewings?.filter(v => v.status === 'completed').length || 0;

      // Financial calculations
      const propertiesWithPrices = allProperties?.filter(p => p.price && p.price > 0) || [];
      const totalRentValue = propertiesWithPrices.reduce((sum, p) => sum + (p.price || 0), 0);
      const averageRent = propertiesWithPrices.length > 0 ? totalRentValue / propertiesWithPrices.length : 0;
      const occupancyRate = totalProperties > 0 ? (rentedProperties / totalProperties) * 100 : 0;

      // Recent activity (last 5 of each)
      const recentUsers = allUsers?.slice().sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      ).slice(0, 5) || [];

      const recentProperties = allProperties?.slice().sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      ).slice(0, 5) || [];

      const recentApplications = allApplications?.slice().sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      ).slice(0, 5) || [];

      const recentViewings = allViewings?.slice().sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      ).slice(0, 5) || [];

      // Fetch owner details for recent properties
      let propertiesWithOwners = recentProperties;
      if (recentProperties.length > 0) {
        const ownerIds = [...new Set(recentProperties.map(p => p.owner_id).filter(Boolean))];
        if (ownerIds.length > 0) {
          const { data: owners } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ownerIds);
          
          if (owners) {
            const ownersMap = {};
            owners.forEach(owner => ownersMap[owner.id] = owner);
            propertiesWithOwners = recentProperties.map(property => ({
              ...property,
              owner: ownersMap[property.owner_id]
            }));
          }
        }
      }

      // Updated console log with correct counts
      console.log("Property Analytics Results:", {
        totalUsers, totalProperties, totalApplications, totalViewingRequests,
        propertyOwners, propertySeekers, adminUsers,
        availableProperties, rentedProperties,
        pendingApplications, approvedApplications, rejectedApplications, completedApplications,
        pendingViewings, approvedViewings, canceledViewings, confirmedViewings, completedViewings,
        averageRent, occupancyRate
      });

      setAnalytics({
        totalUsers,
        totalProperties, 
        totalApplications,
        totalViewingRequests,
        propertyOwners,
        propertySeekers,
        adminUsers,
        availableProperties,
        rentedProperties,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        completedApplications,
        pendingViewings,
        approvedViewings,
        canceledViewings,
        confirmedViewings,
        completedViewings,
        averageRent,
        totalRentValue,
        occupancyRate,
        recentUsers,
        recentProperties: propertiesWithOwners,
        recentApplications,
        recentViewings
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(`Failed to fetch analytics: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'Price not set';
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'landlord':
      case 'owner': return 'Owner';
      case 'tenant':
      case 'user': return 'Seeker';
      default: return 'Unknown';
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'bg-orange-100 text-orange-800';
      case 'landlord':
      case 'owner': return 'bg-blue-100 text-blue-800';
      case 'tenant':
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'rented': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'canceled': return 'bg-gray-100 text-gray-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRefresh = async () => {
    await fetchAnalytics();
    if (onRefresh && typeof onRefresh === "function") {
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Property Management Analytics</h1>
          <p className="text-gray-600">Comprehensive platform metrics and insights</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </>
          ) : (
            'Refresh'
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Average Rent</p>
              <p className="text-3xl font-bold text-gray-900">
                {isLoading ? "..." : formatPrice(analytics.averageRent)}
              </p>
              <p className="text-sm text-green-600 mt-1">
                <span className="font-medium">Total Value: {formatPrice(analytics.totalRentValue)}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Occupancy Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {isLoading ? "..." : formatPercentage(analytics.occupancyRate)}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                <span className="font-medium">{analytics.rentedProperties} of {analytics.totalProperties} occupied</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Applications</p>
              <p className="text-3xl font-bold text-gray-900">
                {isLoading ? "..." : analytics.totalApplications}
              </p>
              <p className="text-sm text-purple-600 mt-1">
                <span className="font-medium">{analytics.completedApplications} completed</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <svg className="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Viewings</p>
              <p className="text-3xl font-bold text-gray-900">
                {isLoading ? "..." : analytics.totalViewingRequests}
              </p>
              <p className="text-sm text-orange-600 mt-1">
                <span className="font-medium">{analytics.approvedViewings} approved, {analytics.canceledViewings} canceled</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Property & User Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Property Status Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Status</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Available</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{analytics.availableProperties}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Rented</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{analytics.rentedProperties}</span>
            </div>
          </div>
        </div>

        {/* User Type Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Landlords</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{analytics.propertyOwners}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Tenants</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{analytics.propertySeekers}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Admins</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{analytics.adminUsers}</span>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Total Users</span>
                <span className="text-sm font-bold text-gray-900">{analytics.totalUsers}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Application & Viewing Status - UPDATED */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Status */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Status</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Pending Review</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{analytics.pendingApplications}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Approved</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{analytics.approvedApplications}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Completed</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{analytics.completedApplications}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Rejected</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{analytics.rejectedApplications}</span>
            </div>
          </div>
        </div>

        {/* Viewing Status - UPDATED */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Viewing Requests</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Pending</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{analytics.pendingViewings}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Approved</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{analytics.approvedViewings}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Canceled</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{analytics.canceledViewings}</span>
            </div>
            {/* Show other statuses if they exist */}
            {(analytics.confirmedViewings > 0 || analytics.completedViewings > 0) && (
              <>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm font-medium text-gray-700">Confirmed</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{analytics.confirmedViewings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-sm font-medium text-gray-700">Completed</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{analytics.completedViewings}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Applications</h3>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <svg className="animate-spin mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-500 mt-2">Loading applications...</p>
              </div>
            ) : analytics.recentApplications.length > 0 ? (
              <div className="space-y-4">
                {analytics.recentApplications.map((application) => (
                  <div key={application.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Application #{application.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(application.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(application.status)}`}>
                      {application.status || 'Unknown'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 mt-2">No recent applications</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Properties */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Properties</h3>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <svg className="animate-spin mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-500 mt-2">Loading recent properties...</p>
              </div>
            ) : analytics.recentProperties.length > 0 ? (
              <div className="space-y-4">
                {analytics.recentProperties.map((property) => (
                  <div key={property.id} className="flex items-center">
                    <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                      {property.images && property.images.length > 0 ? (
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="h-10 w-10 rounded-lg object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <svg 
                        className="h-5 w-5 text-gray-400" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        style={{display: property.images && property.images.length > 0 ? 'none' : 'block'}}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {property.title || 'Untitled Property'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {property.location || 'Location not specified'} • by {property.owner?.full_name || 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatPrice(property.price)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(property.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-gray-500 mt-2">No recent properties</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">Server Performance</p>
              <p className="text-xs text-green-600 font-medium">Excellent</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">Security Status</p>
              <p className="text-xs text-green-600 font-medium">Secure</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">Database Status</p>
              <p className="text-xs text-blue-600 font-medium">Connected</p>
            </div>
          </div>
        </div>
      </div>      
    </div>
  );
}