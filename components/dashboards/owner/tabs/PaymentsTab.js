// Fixed PaymentsTab.js - Removes data duplication in payment breakdown
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
      // Get owner distributions specifically
      const ownerDistributions = await fetchData(
        {
          table: "payment_distributions",
          select: "id, amount, percentage, status, created_at, payment_record_id",
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

      if (!ownerDistributions || ownerDistributions.length === 0) {
        setPayments([]);
        calculateSummary([]);
        return;
      }

      // Get payment records
      const paymentRecordIds = ownerDistributions.map(d => d.payment_record_id).filter(Boolean);
      
      if (paymentRecordIds.length === 0) {
        setPayments([]);
        calculateSummary([]);
        return;
      }

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
          created_at,
          payment_intent_id
        `,
        filters: [
          { column: "id", operator: "in", value: paymentRecordIds }
        ]
      });

      if (!paymentRecords || paymentRecords.length === 0) {
        setPayments([]);
        calculateSummary([]);
        return;
      }

      // Get ALL distributions for these payment records to show complete breakdown
      const allPaymentDistributions = await fetchData({
        table: "payment_distributions",
        select: "id, amount, percentage, status, payment_record_id, recipient_type, recipient_id",
        filters: [
          { column: "payment_record_id", operator: "in", value: paymentRecordIds }
        ]
      }) || [];

      // Get application and property info
      const applicationIds = [...new Set(paymentRecords.map(pr => pr.application_id).filter(Boolean))];
      
      let applications = [];
      let tenants = [];
      
      if (applicationIds.length > 0) {
        applications = await fetchData({
          table: "rental_applications",
          select: `
            id,
            user_id,
            property_id,
            properties!inner (
              id,
              title,
              location,
              owner_id
            )
          `,
          filters: [
            { column: "id", operator: "in", value: applicationIds },
            { column: "properties.owner_id", operator: "eq", value: user.id }
          ]
        }) || [];

        const tenantIds = [...new Set(applications.map(app => app.user_id).filter(Boolean))];
        
        if (tenantIds.length > 0) {
          tenants = await fetchData({
            table: "profiles",
            select: "id, full_name",
            filters: [{ column: "id", operator: "in", value: tenantIds }]
          }) || [];
        }
      }

      // FIXED: Group payments by payment_intent_id and avoid duplication
      const groupedPayments = {};
      
      // First, create groups by payment_intent_id
      paymentRecords.forEach(paymentRecord => {
        const paymentIntentId = paymentRecord.payment_intent_id;
        
        if (!groupedPayments[paymentIntentId]) {
          const application = applications.find(app => app.id === paymentRecord.application_id);
          const tenant = tenants.find(t => t.id === application?.user_id);
          
          groupedPayments[paymentIntentId] = {
            id: paymentIntentId,
            payment_intent_id: paymentIntentId,
            application_id: paymentRecord.application_id,
            created_at: paymentRecord.created_at,
            paid_at: paymentRecord.paid_at,
            status: paymentRecord.status,
            total_amount: 0,
            total_owner_earnings: 0,
            total_platform_fees: 0,
            payment_breakdown: [],
            property: application?.properties || { title: "Unknown Property", location: "Unknown" },
            tenant: tenant || { full_name: "Unknown Tenant" },
            processed_records: new Set() // Track processed records to avoid duplicates
          };
        }
      });

      // Then, process each payment record only once
      paymentRecords.forEach(paymentRecord => {
        const paymentIntentId = paymentRecord.payment_intent_id;
        const group = groupedPayments[paymentIntentId];
        
        // Skip if we've already processed this record
        if (group.processed_records.has(paymentRecord.id)) {
          return;
        }
        
        // Mark as processed
        group.processed_records.add(paymentRecord.id);
        
        // Get distributions for this specific payment record
        const recordDistributions = allPaymentDistributions.filter(d => d.payment_record_id === paymentRecord.id);
        const ownerAmount = recordDistributions.find(d => d.recipient_type === 'owner')?.amount || 0;
        const platformAmount = recordDistributions.find(d => d.recipient_type === 'platform')?.amount || 0;
        
        // Add to totals
        group.total_amount += paymentRecord.amount;
        group.total_owner_earnings += ownerAmount;
        group.total_platform_fees += platformAmount;
        
        // Add to breakdown (only once per record)
        group.payment_breakdown.push({
          type: paymentRecord.payment_type,
          amount: paymentRecord.amount,
          owner_earnings: ownerAmount,
          platform_fee: platformAmount
        });
      });

      // Clean up the processed_records set and convert to array
      const groupedPaymentsArray = Object.values(groupedPayments).map(group => {
        const { processed_records, ...cleanGroup } = group;
        return cleanGroup;
      });

      setPayments(groupedPaymentsArray);
      calculateSummary(groupedPaymentsArray);

    } catch (error) {
      console.error("Error fetching owner payments:", error);
      toast.error("Failed to load payment data");
      setPayments([]);
      calculateSummary([]);
    }
  };

  const calculateSummary = (paymentsData) => {
    const totalEarnings = paymentsData.reduce((sum, p) => sum + p.total_owner_earnings, 0);
    const totalPlatformFees = paymentsData.reduce((sum, p) => sum + p.total_platform_fees, 0);

    const now = new Date();
    const thisMonth = paymentsData.filter((p) => {
      const paymentDate = new Date(p.created_at);
      return (
        paymentDate.getMonth() === now.getMonth() &&
        paymentDate.getFullYear() === now.getFullYear()
      );
    });

    const thisMonthEarnings = thisMonth.reduce((sum, p) => sum + p.total_owner_earnings, 0);

    setSummary({
      totalPayments: paymentsData.length,
      totalEarnings,
      totalPlatformFees,
      thisMonthEarnings,
    });
  };

  const getFilteredPayments = () => {
    if (selectedPeriod === "all") return payments;

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
        return "text-green-800 bg-green-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      case "processing":
        return "text-gray-600 bg-gray-50";
      case "failed":
        return "text-red-600 bg-red-50";
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
          <h1 className="text-2xl font-bold text-custom-blue">Payment Dashboard</h1>
          <p className="text-gray-600">Track your rental income and payment distributions</p>
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
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dt className="text-sm font-medium text-gray-500">Total Earnings</dt>
              <dd className="text-lg font-semibold text-custom-blue">{formatCurrency(summary.totalEarnings)}</dd>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-custom-orange rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dt className="text-sm font-medium text-gray-500">This Month</dt>
              <dd className="text-lg font-semibold text-custom-blue">{formatCurrency(summary.thisMonthEarnings)}</dd>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-custom-orange rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dt className="text-sm font-medium text-gray-500">Total Transactions</dt>
              <dd className="text-lg font-semibold text-custom-blue">{summary.totalPayments}</dd>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-custom-orange rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dt className="text-sm font-medium text-gray-500">Platform Fees</dt>
              <dd className="text-lg font-semibold text-custom-blue">{formatCurrency(summary.totalPlatformFees)}</dd>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-custom-blue">Recent Transactions</h2>
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
          {filteredPayments.map((payment) => (
            <div key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
              {/* Main Transaction Row */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="text-lg font-semibold text-custom-blue">
                          {payment.property?.title || "Unknown Property"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payment.property?.location || "No location"} • {payment.tenant?.full_name || "Unknown Tenant"}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-custom-blue">
                      {formatCurrency(payment.total_owner_earnings)}
                    </div>
                    <div className="text-sm text-gray-500">
                      from {formatCurrency(payment.total_amount)} total
                    </div>
                  </div>
                  
                  <div className="ml-6">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                      {payment.status?.toUpperCase()}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(payment.created_at)}
                    </div>
                  </div>
                </div>
                
                {/* Mobile-Responsive Payment Breakdown */}
                <div className="mt-3 ml-4">
                  <div className="text-md font-bold text-gray-600 mb-3">Payment Breakdown:</div>
                  
                  {/* Mobile-first approach: Stack sections vertically on small screens, side by side on larger screens */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    
                    {/* Landlord Receives Section */}
                    <div className="p-3">
                      <div className="flex items-center mb-2">
                        <h6 className="text-sm font-semibold text-custom-blue">Landlord Receives</h6>
                      </div>
                      <div className="space-y-1">
                        {payment.payment_breakdown.map((item, index) => (
                          <div key={`owner-${index}`} className="flex justify-between text-xs">
                            <span className="text-custom-blue capitalize">{item.type.replace('_', ' ')}</span>
                            <span className="font-medium text-custom-blue">{formatCurrency(item.owner_earnings)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Platform Keeps Section */}
                    <div className="p-3">
                      <div className="flex items-center mb-2">
                        <h6 className="text-sm font-semibold text-orange-700">Platform Keeps</h6>
                      </div>
                      <div className="space-y-1">
                        {payment.payment_breakdown.map((item, index) => (
                          <div key={`platform-${index}`} className="flex justify-between text-xs">
                            <span className="text-orange-600 capitalize">{item.type.replace('_', ' ')}</span>
                            <span className="font-medium text-orange-800">{formatCurrency(item.platform_fee)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredPayments.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4.5" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-custom-blue">No transactions yet</h3>
              <p className="mt-1 text-sm text-gray-500">Payments from your properties will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}