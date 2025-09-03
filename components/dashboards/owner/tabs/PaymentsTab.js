// components/dashboards/owner/tabs/PaymentsTab.js
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGlobalData } from "@/contexts/GlobalDataContext";
import { toast } from "react-hot-toast";

export default function PaymentsTab({ onRefresh }) {
  const { user } = useAuth();
  const { fetchData, loading, data } = useGlobalData();

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState("all");

  useEffect(() => {
    if (user?.id) {
      fetchPayments();
    }
  }, [user?.id, selectedPeriod]);

  const fetchPayments = async () => {
    if (!user?.id) return;

    const cacheKey = `owner_payments_${user.id}`;

    try {
      // Step 1: Get payment distributions for this owner
      const distributions = await fetchData(
        {
          table: "payment_distributions",
          select:
            "id, amount, percentage, status, created_at, payment_record_id",
          filters: [
            { column: "recipient_id", operator: "eq", value: user.id },
            { column: "recipient_type", operator: "eq", value: "owner" },
          ],
          orderBy: { column: "created_at", ascending: false },
        },
        {
          useCache: true,
          ttl: 5 * 60 * 1000,
          _cached_key: cacheKey,
        }
      );

      if (!distributions || distributions.length === 0) {
        setPayments([]);
        calculateSummary([]);
        return;
      }

      // For now, let's see if we get the distributions first
      console.log("Distributions received:", distributions);

      // If this works, we can add the other steps to fetch related data
      setPayments(
        distributions.map((d) => ({
          ...d,
          owner_net_amount: d.amount,
          rental_applications: {
            properties: { title: "Loading...", location: "Loading..." },
            profiles: { full_name: "Loading..." },
          },
        }))
      );

      calculateSummary(
        distributions.map((d) => ({
          owner_net_amount: d.amount,
          platform_fee_amount: 0,
        }))
      );
    } catch (error) {
      console.error("Error fetching owner payments:", error);
      toast.error("Failed to load payment data");
    }
  };

  // Also update calculateSummary to use the correct amount field
  const calculateSummary = (paymentsData) => {
    const totalEarnings = paymentsData.reduce(
      (sum, p) => sum + (p.owner_net_amount || 0),
      0
    );
    const totalPlatformFees = paymentsData.reduce(
      (sum, p) => sum + (p.platform_fee_amount || 0),
      0
    );

    const now = new Date();
    const thisMonth = paymentsData.filter((p) => {
      const paymentDate = new Date(p.created_at);
      return (
        paymentDate.getMonth() === now.getMonth() &&
        paymentDate.getFullYear() === now.getFullYear()
      );
    });

    const thisMonthEarnings = thisMonth.reduce(
      (sum, p) => sum + (p.owner_net_amount || 0),
      0
    );

    setSummary({
      totalPayments: paymentsData.length,
      totalEarnings,
      totalPlatformFees,
      thisMonthEarnings,
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      case "processing":
        return "text-blue-600 bg-blue-50";
      case "failed":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const cacheKey = `owner_payments_${user?.id}`;
  const isLoading = loading[cacheKey];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Payment Dashboard
          </h1>
          <p className="text-gray-600">
            Track your rental income and payment distributions
          </p>
        </div>
        <button
          onClick={() => {
            onRefresh?.();
            fetchPayments();
          }}
          className="bg-custom-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dt className="text-sm font-medium text-gray-500">
                Total Earnings
              </dt>
              <dd className="text-lg font-semibold text-gray-900">
                {formatCurrency(summary.totalEarnings)}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1h-6a1 1 0 01-1-1V8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dt className="text-sm font-medium text-gray-500">This Month</dt>
              <dd className="text-lg font-semibold text-gray-900">
                {formatCurrency(summary.thisMonthEarnings)}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dt className="text-sm font-medium text-gray-500">
                Total Payments
              </dt>
              <dd className="text-lg font-semibold text-gray-900">
                {summary.totalPayments}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dt className="text-sm font-medium text-gray-500">
                Platform Fees
              </dt>
              <dd className="text-lg font-semibold text-gray-900">
                {formatCurrency(summary.totalPlatformFees)}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              Payment History
            </h2>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-custom-red focus:ring-custom-red"
            >
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property & Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Your Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {payment.rental_applications?.properties?.title ||
                          "Unknown Property"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.rental_applications?.properties?.location ||
                          "No location"}
                      </div>
                      <div className="text-xs text-gray-400">
                        Tenant:{" "}
                        {payment.rental_applications?.profiles?.full_name ||
                          "Unknown"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Type:{" "}
                        {payment.payment_type
                          ?.replace("_", " ")
                          ?.toUpperCase() || "RENTAL"}
                      </div>
                      {payment.platform_fee_amount > 0 && (
                        <div className="text-xs text-red-500">
                          Platform Fee: -
                          {formatCurrency(payment.platform_fee_amount)}
                        </div>
                      )}
                      {payment.management_fee_amount > 0 && (
                        <div className="text-xs text-orange-500">
                          Management Fee: -
                          {formatCurrency(payment.management_fee_amount)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(payment.owner_net_amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(
                        (payment.owner_net_amount / payment.amount) *
                        100
                      ).toFixed(1)}
                      % of total
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        payment.status
                      )}`}
                    >
                      {payment.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{formatDate(payment.created_at)}</div>
                    {payment.paid_at && (
                      <div className="text-xs text-green-600">
                        Paid: {formatDate(payment.paid_at)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {payments.length === 0 && (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4.5"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No payments yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Payments from your properties will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
