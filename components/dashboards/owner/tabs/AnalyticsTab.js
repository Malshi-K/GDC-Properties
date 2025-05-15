"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
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
  const [userLookup, setUserLookup] = useState({});
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

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch properties data
        const { data: propertiesData, error: propertiesError } = await supabase
          .from("properties")
          .select("*");

        // Fetch profiles data for user info
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("*");

        // Fetch viewing requests data
        const { data: viewingRequestsData, error: viewingError } =
          await supabase.from("viewing_requests").select("*");

        // Fetch rental applications data
        const { data: applicationsData, error: applicationsError } =
          await supabase.from("rental_applications").select("*");

        if (propertiesError) throw propertiesError;
        if (profilesError) throw profilesError;
        if (viewingError) throw viewingError;
        if (applicationsError) throw applicationsError;

        // Create a user lookup for easier access
        const userLookup = {};
        if (profilesData) {
          profilesData.forEach((profile) => {
            userLookup[profile.id] = profile;
          });
        }

        setProperties(propertiesData || []);
        setViewingRequests(viewingRequestsData || []);
        setRentalApplications(applicationsData || []);

        // Store the user lookup for use in rendering
        setUserLookup(userLookup);

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

  // Function to get user display info
  const getUserDisplayInfo = (userId) => {
    const user = userLookup[userId];
    if (!user)
      return { name: `ID: ${userId.substring(0, 8)}...`, avatar: null };

    return {
      name: user.full_name || `User ${userId.substring(0, 8)}`,
      avatar: user.profile_image_url || null,
    };
  };

  // Error handling component
  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-custom-gray mb-6">
          Property Analytics
        </h2>
        <div className="bg-red-50 p-4 rounded-md text-red-600">
          <p>Error loading analytics data: {error}</p>
          <p className="mt-2">
            Please ensure your database connection is properly configured and
            all required tables exist.
          </p>
          <p className="mt-2">
            If you're seeing relationship errors, make sure foreign key
            relationships are correctly set up in your database schema.
          </p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="bg-white shadow rounded-lg p-6 text-custom-gray">
      <h2 className="text-2xl font-bold text-custom-gray mb-6">
        Property Analytics
      </h2>

      {/* Navigation */}
      <div className="flex flex-wrap mb-6 gap-2">
        <button
          onClick={() => setActiveView("overview")}
          className={`px-4 py-2 rounded-md ${
            activeView === "overview"
              ? "bg-custom-red text-white"
              : "bg-gray-100 text-custom-gray"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveView("properties")}
          className={`px-4 py-2 rounded-md ${
            activeView === "properties"
              ? "bg-custom-red text-white"
              : "bg-gray-100 text-custom-gray"
          }`}
        >
          Properties
        </button>
        <button
          onClick={() => setActiveView("requests")}
          className={`px-4 py-2 rounded-md ${
            activeView === "requests"
              ? "bg-custom-red text-white"
              : "bg-gray-100 text-custom-gray"
          }`}
        >
          Viewing Requests
        </button>
        <button
          onClick={() => setActiveView("applications")}
          className={`px-4 py-2 rounded-md ${
            activeView === "applications"
              ? "bg-custom-red text-white"
              : "bg-gray-100 text-custom-gray"
          }`}
        >
          Applications
        </button>
        <button
          onClick={() => setActiveView("trends")}
          className={`px-4 py-2 rounded-md ${
            activeView === "trends"
              ? "bg-custom-red text-white"
              : "bg-gray-100 text-custom-gray"
          }`}
        >
          Trends
        </button>
      </div>

      {/* Overview Section - Key Metrics */}
      {activeView === "overview" && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-lg font-semibold text-custom-gray mb-2">
                Property Metrics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Total Properties</p>
                  <p className="text-2xl font-bold text-custom-gray">
                    {totalProperties}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg. Price</p>
                  <p className="text-2xl font-bold text-custom-gray">
                    $
                    {avgPrice.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Occupied</p>
                  <p className="text-2xl font-bold text-custom-gray">
                    {occupiedProperties}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Available</p>
                  <p className="text-2xl font-bold text-custom-gray">
                    {vacantProperties}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-lg font-semibold text-custom-gray mb-2">
                Viewing Requests
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Total Requests</p>
                  <p className="text-2xl font-bold text-custom-gray">
                    {totalViewingRequests}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Conversion Rate</p>
                  <p className="text-2xl font-bold text-custom-gray">
                    {totalViewingRequests
                      ? Math.round(
                          (rentalApplications.length / totalViewingRequests) *
                            100
                        )
                      : 0}
                    %
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-custom-yellow">
                    {
                      viewingRequests.filter(
                        (r) => r.status?.toLowerCase() === "pending"
                      ).length
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-custom-gray">
                    {
                      viewingRequests.filter(
                        (r) => r.status?.toLowerCase() === "completed"
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-lg font-semibold text-custom-gray mb-2">
                Applications
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Total Applications</p>
                  <p className="text-2xl font-bold text-custom-gray">
                    {rentalApplications.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-custom-yellow">
                    {pendingApplications}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {
                      rentalApplications.filter(
                        (a) => a.status?.toLowerCase() === "approved"
                      ).length
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rejected</p>
                  <p className="text-2xl font-bold text-custom-red">
                    {
                      rentalApplications.filter(
                        (a) => a.status?.toLowerCase() === "rejected"
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border rounded-md p-4">
              <h3 className="text-lg font-semibold text-custom-gray mb-4">
                Property Types
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={preparePropertyTypeData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        percent,
                        index,
                        name,
                      }) => {
                        const RADIAN = Math.PI / 180;
                        const radius =
                          innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);

                        return (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor={x > cx ? "start" : "end"}
                            dominantBaseline="central"
                          >
                            {`${name} ${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {preparePropertyTypeData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border rounded-md p-4">
              <h3 className="text-lg font-semibold text-custom-gray mb-4">
                Viewing Request Status
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prepareViewingRequestsData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        percent,
                        index,
                        name,
                      }) => {
                        const RADIAN = Math.PI / 180;
                        const radius =
                          innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);

                        return (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor={x > cx ? "start" : "end"}
                            dominantBaseline="central"
                          >
                            {`${name} ${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {prepareViewingRequestsData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Properties View */}
      {activeView === "properties" && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border rounded-md p-4">
              <h3 className="text-lg font-semibold text-custom-gray mb-4">
                Property Prices
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={preparePropertyPriceData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [
                        `$${value.toLocaleString()}`,
                        "Price",
                      ]}
                    />
                    <Bar dataKey="price" fill={customRed} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border rounded-md p-4">
              <h3 className="text-lg font-semibold text-custom-gray mb-4">
                Bedrooms & Bathrooms
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareBedBathData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                  >
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

          <div className="bg-white border rounded-md p-4">
            <h3 className="text-lg font-semibold text-custom-gray mb-4">
              Property Engagement
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={preparePropertyEngagementData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                >
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
                    fill={customYellow}
                    name="Viewing Requests"
                  />
                  <Bar
                    dataKey="applications"
                    fill={customRed}
                    name="Applications"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Viewing Requests View */}
      {activeView === "requests" && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border rounded-md p-4">
              <h3 className="text-lg font-semibold text-custom-gray mb-4">
                Viewing Request Status
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prepareViewingRequestsData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        percent,
                        index,
                        name,
                      }) => {
                        const RADIAN = Math.PI / 180;
                        const radius =
                          innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);

                        return (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor={x > cx ? "start" : "end"}
                            dominantBaseline="central"
                          >
                            {`${name} ${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {prepareViewingRequestsData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.name === "Pending"
                              ? customYellow
                              : entry.name === "Approved"
                              ? "#00C49F"
                              : entry.name === "Rejected"
                              ? customRed
                              : "#0088FE"
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border rounded-md p-4">
              <h3 className="text-lg font-semibold text-custom-gray mb-4">
                Top Properties by Viewing Requests
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={preparePropertyEngagementData()
                      .sort((a, b) => b.viewings - a.viewings)
                      .slice(0, 10)}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="viewings"
                      fill={customYellow}
                      name="Viewing Requests"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Viewing Requests Table */}
          <div className="bg-white border rounded-md p-4">
            <h3 className="text-lg font-semibold text-custom-gray mb-4">
              Recent Viewing Requests
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Property
                    </th>

                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Proposed Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {viewingRequests
                    .sort(
                      (a, b) => new Date(b.created_at) - new Date(a.created_at)
                    )
                    .slice(0, 5)
                    .map((request) => {
                      const property = properties.find(
                        (p) => p.id === request.property_id
                      );
                      const userInfo = getUserDisplayInfo(request.user_id);
                      return (
                        <tr key={request.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {property
                              ? property.title
                              : `Property ID: ${request.property_id}`}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(
                              request.proposed_date
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                request.status?.toLowerCase() === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : request.status?.toLowerCase() === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : request.status?.toLowerCase() === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : request.status?.toLowerCase() === "canceled"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {request.status || "Pending"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Applications View */}
      {activeView === "applications" && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border rounded-md p-4">
              <h3 className="text-lg font-semibold text-custom-gray mb-4">
                Application Status
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prepareApplicationStatusData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        percent,
                        index,
                        name,
                      }) => {
                        const RADIAN = Math.PI / 180;
                        const radius =
                          innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);

                        return (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor={x > cx ? "start" : "end"}
                            dominantBaseline="central"
                          >
                            {`${name} ${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {prepareApplicationStatusData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.name === "Pending"
                              ? customYellow
                              : entry.name === "Approved"
                              ? "#00C49F"
                              : customRed
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border rounded-md p-4">
              <h3 className="text-lg font-semibold text-custom-gray mb-4">
                Top Properties by Applications
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={preparePropertyEngagementData()
                      .sort((a, b) => b.applications - a.applications)
                      .slice(0, 10)}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="applications"
                      fill={customRed}
                      name="Applications"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Applications Table */}
          <div className="bg-white border rounded-md p-4">
            <h3 className="text-lg font-semibold text-custom-gray mb-4">
              Recent Applications
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Property
                    </th>

                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Income
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Credit Score
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rentalApplications
                    .sort(
                      (a, b) => new Date(b.created_at) - new Date(a.created_at)
                    )
                    .slice(0, 5)
                    .map((application) => {
                      const property = properties.find(
                        (p) => p.id === application.property_id
                      );
                      const userInfo = getUserDisplayInfo(application.user_id);
                      return (
                        <tr key={application.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {property
                              ? property.title
                              : `Property ID: ${application.property_id}`}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            ${application.income?.toLocaleString() || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {application.credit_score || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                application.status?.toLowerCase() === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : application.status?.toLowerCase() ===
                                    "approved"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {application.status || "Pending"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Trends View */}
      {activeView === "trends" && (
        <div>
          <div className="bg-white border rounded-md p-4 mb-6">
            <h3 className="text-lg font-semibold text-custom-gray mb-4">
              Monthly Trends
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={prepareTrendsData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="viewings"
                    stroke={customYellow}
                    name="Viewing Requests"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="applications"
                    stroke={customRed}
                    name="Applications"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border rounded-md p-4">
            <h3 className="text-lg font-semibold text-custom-gray mb-4">
              Conversion Rates Over Time
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={prepareTrendsData().map((item) => ({
                    month: item.month,
                    conversionRate:
                      item.viewings > 0
                        ? Math.round((item.applications / item.viewings) * 100)
                        : 0,
                  }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis unit="%" />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Conversion Rate"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="conversionRate"
                    stroke={customGray}
                    name="Conversion Rate"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
