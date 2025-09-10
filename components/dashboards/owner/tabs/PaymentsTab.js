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

      console.log("Distributions received:", distributions);

      // Step 2: Get payment record IDs
      const paymentRecordIds = distributions.map(d => d.payment_record_id).filter(Boolean);
      
      if (paymentRecordIds.length === 0) {
        setPayments([]);
        calculateSummary([]);
        return;
      }

      // Step 3: Fetch payment records with application details
      const paymentRecords = await fetchData({
        table: "payment_records",
        select: `
          id,
          application_id,
          payment_type,
          amount,
          status,
          platform_fee_amount,
          management_fee_amount,
          owner_net_amount,
          due_date,
          paid_at,
          created_at
        `,
        filters: [
          { 
            column: "id", 
            operator: "in", 
            value: paymentRecordIds 
          }
        ]
      });

      console.log("Payment records:", paymentRecords);

      if (!paymentRecords || paymentRecords.length === 0) {
        setPayments([]);
        calculateSummary([]);
        return;
      }

      // Step 4: Get application IDs to fetch rental agreements
      const applicationIds = paymentRecords.map(pr => pr.application_id).filter(Boolean);
      
      if (applicationIds.length === 0) {
        // If no applications, just use the payment records data
        const enrichedPayments = distributions.map(dist => {
          const paymentRecord = paymentRecords.find(pr => pr.id === dist.payment_record_id);
          return {
            ...dist,
            ...paymentRecord,
            owner_net_amount: dist.amount, // Use distribution amount as owner's share
            rental_applications: {
              properties: { title: "Direct Payment", location: "N/A" },
              profiles: { full_name: "Direct Payment" },
            },
          };
        });
        
        setPayments(enrichedPayments);
        calculateSummary(enrichedPayments);
        return;
      }

      // Step 5: Fetch rental agreements to get property and tenant info
      const rentalAgreements = await fetchData({
        table: "rental_agreements",
        select: `
          id,
          application_id,
          property_id,
          tenant_id,
          owner_id
        `,
        filters: [
          { 
            column: "application_id", 
            operator: "in", 
            value: applicationIds 
          },
          // Ensure these are agreements where the current user is the owner
          {
            column: "owner_id",
            operator: "eq",
            value: user.id
          }
        ]
      });

      console.log("Rental agreements:", rentalAgreements);

      if (!rentalAgreements || rentalAgreements.length === 0) {
        // No matching rental agreements for this owner
        setPayments([]);
        calculateSummary([]);
        return;
      }

      // Step 6: Get property and tenant details
      const propertyIds = [...new Set(rentalAgreements.map(ra => ra.property_id))];
      const tenantIds = [...new Set(rentalAgreements.map(ra => ra.tenant_id))];

      const [properties, tenants] = await Promise.all([
        fetchData({
          table: "properties",
          select: "id, title, location",
          filters: [
            { column: "id", operator: "in", value: propertyIds }
          ]
        }),
        fetchData({
          table: "profiles",
          select: "id, full_name",
          filters: [
            { column: "id", operator: "in", value: tenantIds }
          ]
        })
      ]);

      console.log("Properties:", properties);
      console.log("Tenants:", tenants);

      // Step 7: Combine all data
      const enrichedPayments = distributions.map(dist => {
        const paymentRecord = paymentRecords.find(pr => pr.id === dist.payment_record_id);
        
        if (!paymentRecord) {
          return {
            ...dist,
            owner_net_amount: dist.amount,
            rental_applications: {
              properties: { title: "Unknown Property", location: "Unknown" },
              profiles: { full_name: "Unknown Tenant" },
            },
          };
        }

        const rentalAgreement = rentalAgreements.find(ra => ra.application_id === paymentRecord.application_id);
        
        if (!rentalAgreement) {
          return {
            ...dist,
            ...paymentRecord,
            owner_net_amount: dist.amount,
            rental_applications: {
              properties: { title: "No Property Link", location: "N/A" },
              profiles: { full_name: "No Tenant Link" },
            },
          };
        }

        const property = properties?.find(p => p.id === rentalAgreement.property_id) || {};
        const tenant = tenants?.find(t => t.id === rentalAgreement.tenant_id) || {};

        return {
          ...dist,
          ...paymentRecord,
          owner_net_amount: dist.amount, // Use the distribution amount as the owner's share
          rental_applications: {
            properties: { 
              title: property.title || "Unknown Property", 
              location: property.location || "Unknown Location" 
            },
            profiles: { 
              full_name: tenant.full_name || "Unknown Tenant" 
            },
          },
        };
      });

      console.log("Final enriched payments:", enrichedPayments);

      setPayments(enrichedPayments);
      calculateSummary(enrichedPayments);

    } catch (error) {
      console.error("Error fetching owner payments:", error);
      toast.error("Failed to load payment data");
      setPayments([]);
      calculateSummary([]);
    }
  };

  const calculateSummary = (paymentsData) => {
    const totalEarnings = paymentsData.reduce(
      (sum, p) => sum + (p.owner_net_amount || p.amount || 0),
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
      (sum, p) => sum + (p.owner_net_amount || p.amount || 0),
      0
    );

    setSummary({
      totalPayments: paymentsData.length,
      totalEarnings,
      totalPlatformFees,
      thisMonthEarnings,
    });
  };

  // Apply period filter to payments before rendering
  const getFilteredPayments = () => {
    if (selectedPeriod === "all") {
      return payments;
    }

    const now = new Date();
    return payments.filter(payment => {
      const paymentDate = new Date(payment.created_at);
      
      switch (selectedPeriod) {
        case "month":
          return paymentDate.getMonth() === now.getMonth() && 
                 paymentDate.getFullYear() === now.getFullYear();
        case "quarter":
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const paymentQuarter = Math.floor(paymentDate.getMonth() / 3);
          return paymentQuarter === currentQuarter && 
                 paymentDate.getFullYear() === now.getFullYear();
        case "year":
          return paymentDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
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
        return "text-custom-blue bg-green-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      case "processing":
        return "text-gray-600 bg-gray-50";
      case "failed":
        return "text-orange-600 bg-orange-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const cacheKey = `owner_payments_${user?.id}`;
  const isLoading = loading[cacheKey];
  const filteredPayments = getFilteredPayments();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-orange"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-custom-blue">
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
          className="bg-custom-orange text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-custom-orange rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
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
              <dd className="text-lg font-semibold text-custom-blue">
                {formatCurrency(summary.totalEarnings)}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-custom-orange rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dt className="text-sm font-medium text-gray-500">This Month</dt>
              <dd className="text-lg font-semibold text-custom-blue">
                {formatCurrency(summary.thisMonthEarnings)}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-custom-orange rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
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
              <dd className="text-lg font-semibold text-custom-blue">
                {summary.totalPayments}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-custom-orange rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
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
              <dd className="text-lg font-semibold text-custom-blue">
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
            <h2 className="text-lg font-bold text-custom-blue">
              Payment History
            </h2>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="focus:border-custom-orange focus:ring-custom-orange text-custom-blue"
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
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-custom-blue">
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
                      <div className="text-sm font-medium text-custom-blue">
                        Total: {formatCurrency(payment.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Type:{" "}
                        {payment.payment_type
                          ?.replace("_", " ")
                          ?.toUpperCase() || "RENTAL"}
                      </div>
                      {payment.platform_fee_amount > 0 && (
                        <div className="text-xs text-orange-500">
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
                    <div className="text-lg font-semibold text-custom-blue">
                      {formatCurrency(payment.owner_net_amount || payment.amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {payment.percentage ? `${payment.percentage}%` : 
                       payment.amount ? `${((payment.owner_net_amount || payment.amount) / payment.amount * 100).toFixed(1)}%` : '0%'} of total
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
                      <div className="text-xs text-custom-blue">
                        Paid: {formatDate(payment.paid_at)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPayments.length === 0 && (
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
              <h3 className="mt-2 text-sm font-medium text-custom-blue">
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