// app/payment/[applicationId]/page.js
"use client";
export const dynamic = 'force-dynamic'
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { toast } from "react-hot-toast";
import ProtectedRoute from "@/components/ProtectedRoute";
import EmailVerificationPaymentForm from "@/components/payment/EmailVerificationPaymentForm";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params.applicationId;

  const [application, setApplication] = useState(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (applicationId) {
      fetchApplicationAndPaymentDetails();
    }
  }, [applicationId]);

  const fetchApplicationAndPaymentDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payment/details/${applicationId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch payment details");
      }

      const data = await response.json();
      setApplication(data.application);
      setPaymentBreakdown(data.paymentBreakdown);
    } catch (error) {
      console.error("Error fetching payment details:", error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    toast.success("Payment completed successfully!");
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payment details...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <svg
                className="h-12 w-12 text-red-400 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Payment Error
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => router.push("/dashboard")}
                className="bg-custom-red text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Complete Your Rental Payment
            </h1>
            <p className="text-gray-600">
              Secure your rental with a one-time payment
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Property & Application Summary */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-custom-red">
                Application Summary
              </h2>

              {/* Property Details */}
              <div className="border-b border-gray-200 pb-4 mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {application.properties.title}
                </h3>
                <p className="text-gray-600 mb-1">
                  {application.properties.location}
                </p>
                <p className="text-custom-red font-bold text-lg">
                  ${application.properties.price.toLocaleString()}/month
                </p>
              </div>

              {/* Application Details */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">
                  Your Application
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Employment:</span>
                    <p className="font-medium text-gray-400">
                      {application.employment_status}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Annual Income:</span>
                    <p className="font-medium text-gray-400">
                      ${parseInt(application.income).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Credit Score:</span>
                    <p className="font-medium text-gray-400">
                      {application.credit_score}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Applied:</span>
                    <p className="font-medium text-gray-400">
                      {new Date(application.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-custom-red">
                Payment Details
              </h2>

              {/* Payment Breakdown */}
              <div className="mb-6">
                <div className="space-y-3">
                  {paymentBreakdown?.items.map((item) => (
                    <div key={item.type} className="flex justify-between">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium text-gray-400">
                        ${item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-bold text-lg text-gray-400">
                      <span>Total Amount</span>
                      <span className="text-custom-red">
                        ${paymentBreakdown?.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <Elements stripe={stripePromise}>
                <EmailVerificationPaymentForm
                  applicationId={applicationId}
                  amount={paymentBreakdown?.total}
                  paymentItems={paymentBreakdown?.items}
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center text-sm text-gray-500">
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Secured by Stripe. Your payment information is encrypted and
              secure.
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
