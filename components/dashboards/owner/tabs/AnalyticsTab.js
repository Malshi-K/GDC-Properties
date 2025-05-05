"use client";

import { useState, useEffect } from "react";
import { propertyService } from "@/lib/services/propertyService";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function AnalyticsTab() {
  const [properties, setProperties] = useState([]);
  const [viewingRequests, setViewingRequests] = useState([]);
  const [rentalApplications, setRentalApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState("overview");

  // Use the custom colors
  const customRed = "#c30011";
  const customYellow = "#ffc536";
  const customGray = "#585858";

  // Chart colors
  const COLORS = [
    customRed,
    customYellow,
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#A569BD",
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all required data
        const { data: propertiesData, error: propertiesError } =
          await propertyService.getOwnerProperties();

        const { data: viewingRequestsData, error: viewingError } =
          await propertyService.getAllViewingRequests();

        const { data: applicationsData, error: applicationsError } =
          await propertyService.getAllApplications();

        if (propertiesError) throw propertiesError;
        if (viewingError) throw viewingError;
        if (applicationsError) throw applicationsError;

        setProperties(propertiesData || []);
        setViewingRequests(viewingRequestsData || []);
        setRentalApplications(applicationsData || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching analytics data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Prepare data for charts
  const preparePropertyTypeData = () => {
    const typeCounts = {};

    properties.forEach((property) => {
      const type = property.property_type || "Unspecified";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return Object.keys(typeCounts).map((type) => ({
      name: type,
      value: typeCounts[type],
    }));
  };

  const prepareViewingRequestsData = () => {
    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    };

    viewingRequests.forEach((request) => {
      const status = request.status?.toLowerCase() || "pending";
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
    });

    return Object.keys(statusCounts).map((status) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: statusCounts[status],
    }));
  };

  const prepareApplicationStatusData = () => {
    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    rentalApplications.forEach((application) => {
      const status = application.status?.toLowerCase() || "pending";
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
    });

    return Object.keys(statusCounts).map((status) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: statusCounts[status],
    }));
  };

  const preparePropertyPriceData = () => {
    // Sort properties by price
    return [...properties]
      .sort((a, b) => (a.price || 0) - (b.price || 0))
      .map((property) => ({
        name: property.title?.substring(0, 15) || `Property ${property.id}`,
        price: property.price || 0,
      }));
  };

  const prepareBedBathData = () => {
    return properties.map((property) => ({
      name: property.title?.substring(0, 15) || `Property ${property.id}`,
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
    }));
  };

  const prepareTrendsData = () => {
    // Create a map to hold viewing requests by month
    const monthlyData = {};

    // Process all viewing requests
    viewingRequests.forEach((request) => {
      if (request.created_at) {
        const date = new Date(request.created_at);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;

        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = {
            month: monthYear,
            viewings: 0,
            applications: 0,
          };
        }

        monthlyData[monthYear].viewings++;
      }
    });

    // Process all applications
    rentalApplications.forEach((application) => {
      if (application.created_at) {
        const date = new Date(application.created_at);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;

        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = {
            month: monthYear,
            viewings: 0,
            applications: 0,
          };
        }

        monthlyData[monthYear].applications++;
      }
    });

    // Convert to array and sort by date
    return Object.values(monthlyData).sort((a, b) => {
      const [aMonth, aYear] = a.month.split("/");
      const [bMonth, bYear] = b.month.split("/");
      return new Date(aYear, aMonth - 1) - new Date(bYear, bMonth - 1);
    });
  };

  const preparePropertyEngagementData = () => {
    return properties.map((property) => {
      // Find viewing requests for this property
      const propertyViewings = viewingRequests.filter(
        (req) => req.property_id === property.id
      ).length;

      // Find applications for this property
      const propertyApplications = rentalApplications.filter(
        (app) => app.property_id === property.id
      ).length;

      return {
        name: property.title?.substring(0, 15) || `Property ${property.id}`,
        viewings: propertyViewings,
        applications: propertyApplications,
      };
    });
  };

  // Analytics metrics
  const totalProperties = properties.length;
  const occupiedProperties = properties.filter(
    (p) => p.status?.toLowerCase() === "occupied"
  ).length;
  const vacantProperties = properties.filter(
    (p) => p.status?.toLowerCase() === "available"
  ).length;
  const avgPrice = properties.length
    ? properties.reduce((sum, p) => sum + (p.price || 0), 0) / properties.length
    : 0;
  const totalViewingRequests = viewingRequests.length;
  const pendingApplications = rentalApplications.filter(
    (a) => a.status?.toLowerCase() === "pending"
  ).length;

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-custom-gray mb-6">
          Property Analytics
        </h2>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-custom-gray mb-6">
          Property Analytics
        </h2>
        <div className="bg-red-50 p-4 rounded-md text-custom-red">
          <p>Error loading analytics data. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-custom-gray mb-6">
        Property Analytics
      </h2>

      {/* Analytics navigation */}
      <div className="flex flex-wrap mb-6 gap-2">
        <button
          onClick={() => setActiveView("overview")}
          className={`px-4 py-2 rounded-md ${
            activeView === "overview"
              ? "bg-custom-red text-white"
              : "bg-gray-100 hover:bg-gray-200 text-custom-gray"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveView("properties")}
          className={`px-4 py-2 rounded-md ${
            activeView === "properties"
              ? "bg-custom-red text-white"
              : "bg-gray-100 hover:bg-gray-200 text-custom-gray"
          }`}
        >
          Properties
        </button>
        <button
          onClick={() => setActiveView("engagement")}
          className={`px-4 py-2 rounded-md ${
            activeView === "engagement"
              ? "bg-custom-red text-white"
              : "bg-gray-100 hover:bg-gray-200 text-custom-gray"
          }`}
        >
          Engagement
        </button>
        <button
          onClick={() => setActiveView("trends")}
          className={`px-4 py-2 rounded-md ${
            activeView === "trends"
              ? "bg-custom-red text-white"
              : "bg-gray-100 hover:bg-gray-200 text-custom-gray"
          }`}
        >
          Trends
        </button>
      </div>

      {activeView === "overview" && (
        <>
          {/* Overview summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-red-50 rounded-lg p-4 shadow-sm border-l-4 border-custom-red">
              <h3 className="text-lg font-medium text-custom-red">
                Properties
              </h3>
              <div className="mt-2 flex justify-between items-end">
                <div className="text-3xl font-bold text-custom-red">
                  {totalProperties}
                </div>
                <div className="text-sm">
                  <div className="text-green-600">
                    {vacantProperties} Available
                  </div>
                  <div className="text-custom-gray">
                    {occupiedProperties} Occupied
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 shadow-sm border-l-4 border-custom-yellow">
              <h3 className="text-lg font-medium text-amber-800">
                Viewing Requests
              </h3>
              <div className="mt-2 flex justify-between items-end">
                <div className="text-3xl font-bold text-custom-yellow">
                  {totalViewingRequests}
                </div>
                <div className="text-sm text-amber-700">
                  {
                    viewingRequests.filter(
                      (r) => r.status?.toLowerCase() === "pending"
                    ).length
                  }{" "}
                  Pending
                </div>
              </div>
            </div>

            <div className="bg-gray-100 rounded-lg p-4 shadow-sm border-l-4 border-custom-gray">
              <h3 className="text-lg font-medium text-custom-gray">
                Applications
              </h3>
              <div className="mt-2 flex justify-between items-end">
                <div className="text-3xl font-bold text-custom-gray">
                  {rentalApplications.length}
                </div>
                <div className="text-sm text-gray-600">
                  {pendingApplications} Pending
                </div>
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Property Types */}
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-custom-gray mb-4">
                Property Types
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={preparePropertyTypeData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill={customRed}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {preparePropertyTypeData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Property Engagement */}
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-custom-gray mb-4">
                Request Status
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prepareViewingRequestsData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill={customRed}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {prepareViewingRequestsData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {activeView === "properties" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Property Pricing */}
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-custom-gray mb-4">
                Property Pricing
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={preparePropertyPriceData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, "Price"]} />
                    <Bar dataKey="price" fill={customRed} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bedrooms & Bathrooms */}
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-custom-gray mb-4">
                Bedrooms & Bathrooms
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareBedBathData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="bedrooms" fill={customRed} name="Bedrooms" />
                    <Bar
                      dataKey="bathrooms"
                      fill={customYellow}
                      name="Bathrooms"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Property comparison table */}
          <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
            <h3 className="text-lg font-medium text-custom-gray mb-4">
              Property Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-custom-gray uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-custom-gray uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-custom-gray uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-custom-gray uppercase tracking-wider">
                      Bedrooms
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-custom-gray uppercase tracking-wider">
                      Bathrooms
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-custom-gray uppercase tracking-wider">
                      Size (sqft)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-custom-gray uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {properties.slice(0, 5).map((property, index) => (
                    <tr
                      key={property.id || index}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-custom-gray">
                        {property.title || `Property ${property.id}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${property.price?.toLocaleString() || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {property.property_type || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {property.bedrooms || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {property.bathrooms || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {property.square_footage?.toLocaleString() || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${
                            property.status?.toLowerCase() === "available"
                              ? "bg-green-100 text-green-800"
                              : property.status?.toLowerCase() === "occupied"
                              ? "bg-custom-yellow bg-opacity-20 text-amber-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {property.status || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeView === "engagement" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Property Engagement */}
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-custom-gray mb-4">
                Property Engagement
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={preparePropertyEngagementData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="viewings"
                      name="Viewing Requests"
                      fill={customRed}
                    />
                    <Bar
                      dataKey="applications"
                      name="Applications"
                      fill={customYellow}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Application Status */}
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-custom-gray mb-4">
                Application Status
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prepareApplicationStatusData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill={customRed}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {prepareApplicationStatusData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Applicant Details */}
          <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
            <h3 className="text-lg font-medium text-custom-gray mb-4">
              Recent Applications
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-custom-gray uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-custom-gray uppercase tracking-wider">
                      Employment Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-custom-gray uppercase tracking-wider">
                      Income
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-custom-gray uppercase tracking-wider">
                      Credit Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-custom-gray uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-custom-gray uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rentalApplications.slice(0, 5).map((app, index) => {
                    const property =
                      properties.find((p) => p.id === app.property_id) || {};
                    return (
                      <tr
                        key={app.id || index}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-custom-gray">
                          {property.title || `Property ${app.property_id}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {app.employment_status || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${app.income?.toLocaleString() || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {app.credit_score || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${
                              app.status?.toLowerCase() === "approved"
                                ? "bg-green-100 text-green-800"
                                : app.status?.toLowerCase() === "rejected"
                                ? "bg-custom-red bg-opacity-10 text-custom-red"
                                : "bg-custom-yellow bg-opacity-20 text-amber-800"
                            }`}
                          >
                            {app.status || "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {app.created_at
                            ? new Date(app.created_at).toLocaleDateString()
                            : "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeView === "trends" && (
        <>
          {/* Monthly Trends */}
          <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
            <h3 className="text-lg font-medium text-custom-gray mb-4">
              Monthly Activity Trends
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prepareTrendsData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="viewings"
                    stroke={customRed}
                    name="Viewing Requests"
                  />
                  <Line
                    type="monotone"
                    dataKey="applications"
                    stroke={customYellow}
                    name="Applications"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Property Performance Metrics */}
          <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Property Performance Overview
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Viewing Requests
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applications
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversion Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Listed
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {properties.slice(0, 5).map((property, index) => {
                    const propertyViewings = viewingRequests.filter(
                      (req) => req.property_id === property.id
                    ).length;

                    const propertyApplications = rentalApplications.filter(
                      (app) => app.property_id === property.id
                    ).length;

                    // Calculate conversion rate (applications / viewings)
                    const conversionRate =
                      propertyViewings > 0
                        ? (
                            (propertyApplications / propertyViewings) *
                            100
                          ).toFixed(1)
                        : "0";

                    // Calculate days listed (dummy calculation for demo)
                    const daysListed = property.created_at
                      ? Math.floor(
                          (new Date() - new Date(property.created_at)) /
                            (1000 * 60 * 60 * 24)
                        )
                      : "N/A";

                    return (
                      <tr
                        key={property.id || index}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {property.title || `Property ${property.id}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${property.price?.toLocaleString() || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {propertyViewings}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {propertyApplications}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {conversionRate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {daysListed}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Market Insights */}
          <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Market Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded shadow-sm">
                <h4 className="font-medium text-gray-700 mb-2">
                  Average Days to Rent
                </h4>
                <div className="text-2xl font-bold text-red-600">
                  {properties.length
                    ? Math.floor(Math.random() * 30) + 15 // Placeholder value for demo
                    : "N/A"}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Days from listing to occupation
                </p>
              </div>

              <div className="bg-white p-4 rounded shadow-sm">
                <h4 className="font-medium text-gray-700 mb-2">
                  Average Rent Price
                </h4>
                <div className="text-2xl font-bold text-red-600">
                  ${Math.round(avgPrice).toLocaleString()}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Average across all properties
                </p>
              </div>

              <div className="bg-white p-4 rounded shadow-sm">
                <h4 className="font-medium text-gray-700 mb-2">
                  Occupancy Rate
                </h4>
                <div className="text-2xl font-bold text-red-600">
                  {totalProperties
                    ? Math.round((occupiedProperties / totalProperties) * 100)
                    : 0}
                  %
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Percentage of occupied properties
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* No data state */}
      {properties.length === 0 && (
        <div className="bg-gray-50 p-6 rounded-lg text-center mt-6">
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Data Available
          </h3>
          <p className="text-gray-600 mb-4">
            Add properties to your portfolio to see analytics and insights.
          </p>
          <button
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-red hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            onClick={() =>
              (window.location.href = "/dashboard/owner?tab=properties")
            }
          >
            Add Your First Property
          </button>
        </div>
      )}
    </div>
  );
}
