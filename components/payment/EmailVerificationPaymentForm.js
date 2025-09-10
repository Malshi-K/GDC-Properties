// components/payment/EmailVerificationPaymentForm.js
"use client";

import { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { toast } from "react-hot-toast";

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#424770",
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: "antialiased",
      fontSize: "16px",
      "::placeholder": {
        color: "#aab7c4",
      },
    },
    invalid: {
      color: "#9e2146",
      iconColor: "#9e2146",
    },
  },
};

// Card Brand Components
const CardBrandOption = ({ brand, selected, onClick, disabled = false }) => {
  const brandConfig = {
    visa: {
      name: "Visa",
      icon: (
        <div className="w-20 h-10 flex items-center justify-center p-1">
          <img
            src="/images/card/visa.png"
            alt="Visa"
            className="w-full h-full object-contain"
          />
        </div>
      ),
      color: "gray",
    },
    mastercard: {
      name: "Mastercard",
      icon: (
        <div className="w-20 h-10 flex items-center justify-center p-1">
          <img
            src="/images/card/master.png"
            alt="Mastercard"
            className="w-full h-full object-contain"
          />
        </div>
      ),
      color: "gray",
    },
  };

  const config = brandConfig[brand];
  if (!config) return null;

  return (
    <button
      type="button"
      onClick={() => !disabled && onClick(brand)}
      disabled={disabled}
      className={`p-4 border-2 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        selected
          ? `border-${config.color}-500 bg-${config.color}-50 ring-2 ring-${config.color}-500 shadow-md`
          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="flex flex-col items-center space-y-2">
        {config.icon}
        <span
          className={`text-sm font-medium ${
            selected ? `text-${config.color}-700` : "text-gray-600"
          }`}
        >
          {config.name}
        </span>
      </div>
    </button>
  );
};

const CardBrandIcon = ({ brand }) => {
  const brandIcons = {
    visa: (
      <div className="w-8 h-5 flex items-center justify-center">
        <img
          src="/images/card/visa.png"
          alt="Visa"
          className="w-full h-full object-contain"
        />
      </div>
    ),
    mastercard: (
      <div className="w-8 h-5 flex items-center justify-center">
        <img
          src="/images/card/master.png"
          alt="Mastercard"
          className="w-full h-full object-contain"
        />
      </div>
    ),
    unknown: (
      <div className="w-8 h-5 bg-gray-400 rounded text-white text-xs flex items-center justify-center">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    ),
  };

  return brandIcons[brand] || brandIcons.unknown;
};

export default function EmailVerificationPaymentForm({
  applicationId,
  amount,
  paymentItems,
  onSuccess,
}) {
  const stripe = useStripe();
  const elements = useElements();

  // Payment states
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedCardType, setSelectedCardType] = useState("");
  const [detectedCardBrand, setDetectedCardBrand] = useState("unknown");
  const [cardComplete, setCardComplete] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [stripeError, setStripeError] = useState("");

  // Verification states
  const [currentStep, setCurrentStep] = useState(1); // 1: card selection, 2: card details, 3: email verification, 4: code verification, 5: payment
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verificationId, setVerificationId] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const handleCardTypeSelect = (cardType) => {
    setSelectedCardType(cardType);
    setShowCardForm(true);
    setCurrentStep(2);
    setErrorMessage("");
    setStripeError("");
  };

  const handleCardChange = (event) => {
    setStripeError(event.error ? event.error.message : "");
    setDetectedCardBrand(event.brand || "unknown");
    setCardComplete(event.complete);

    if (errorMessage && !event.error) {
      setErrorMessage("");
    }
  };

  const proceedToEmailVerification = () => {
    if (!cardComplete) {
      toast.error("Please complete your card information first.");
      return;
    }
    if (stripeError) {
      toast.error("Please fix the card information errors before proceeding.");
      return;
    }
    setCurrentStep(3);
  };

  const sendVerificationCode = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSendingCode(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/payment/send-email-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          applicationId,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to send verification code");
      }

      setVerificationId(data.verificationId);
      setCodeSent(true);
      setCurrentStep(4);
      toast.success("Verification code sent to your email!");
    } catch (error) {
      console.error("Send email code error:", error);
      setErrorMessage(error.message);
      toast.error(error.message);
    } finally {
      setSendingCode(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }

    setVerifyingCode(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/payment/verify-email-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verificationId,
          code: verificationCode,
          applicationId,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Invalid verification code");
      }

      setCurrentStep(5);
      toast.success("Email verified successfully! Proceeding to payment...");

      // Auto-proceed to payment after successful verification
      setTimeout(() => {
        handlePayment();
      }, 1000);
    } catch (error) {
      console.error("Verify code error:", error);
      setErrorMessage(error.message);
      toast.error(error.message);
    } finally {
      setVerifyingCode(false);
    }
  };

  const handlePayment = async () => {
    console.log("🔄 Starting payment process...");
    console.log("Stripe loaded:", !!stripe);
    console.log("Elements loaded:", !!elements);

    if (!stripe || !elements) {
      toast.error("Payment system not loaded. Please refresh and try again.");
      return;
    }

    setProcessing(true);
    setErrorMessage("");

    try {
      // Create payment intent with verification confirmation
      const response = await fetch("/api/payment/create-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId,
          amount,
          paymentItems,
          cardType: selectedCardType,
          verificationId,
          email: email.toLowerCase().trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to create payment intent");
      }

      // Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement);
      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              email: email,
            },
          },
          receipt_email: email,
        });

      if (stripeError) {
        setErrorMessage(stripeError.message);
        toast.error(stripeError.message);
      } else if (paymentIntent.status === "succeeded") {
        // Confirm payment in backend
        const confirmResponse = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            applicationId,
            paymentIntentId: paymentIntent.id,
            cardType: selectedCardType,
            verificationId,
          }),
        });

        if (confirmResponse.ok) {
          toast.success("Payment completed successfully!");
          onSuccess();
        } else {
          throw new Error("Payment processed but confirmation failed");
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      const errorMsg =
        error.message || "An unexpected error occurred. Please try again.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form className="space-y-6">
      {/* Progress Steps */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 1
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            1
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-2">
            <div
              className={`h-full transition-all duration-300 ${
                currentStep > 1 ? "bg-green-500" : "bg-gray-200"
              }`}
            ></div>
          </div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 2
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            2
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-2">
            <div
              className={`h-full transition-all duration-300 ${
                currentStep > 2 ? "bg-green-500" : "bg-gray-200"
              }`}
            ></div>
          </div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 3
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            3
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-2">
            <div
              className={`h-full transition-all duration-300 ${
                currentStep > 3 ? "bg-green-500" : "bg-gray-200"
              }`}
            ></div>
          </div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 4
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            4
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-6">
          <span
            className={currentStep === 1 ? "font-medium text-gray-700" : ""}
          >
            Card Selection
          </span>
          <span className="mx-2">•</span>
          <span
            className={currentStep === 2 ? "font-medium text-gray-700" : ""}
          >
            Card Details
          </span>
          <span className="mx-2">•</span>
          <span
            className={currentStep === 3 ? "font-medium text-gray-700" : ""}
          >
            Email Verification
          </span>
          <span className="mx-2">•</span>
          <span className={currentStep >= 4 ? "font-medium text-gray-700" : ""}>
            Complete Payment
          </span>
        </div>
      </div>

      {/* Step 1: Payment Method Selection */}
      {currentStep >= 1 && (
        <div className="text-center">
          <label className="block text-sm font-bold text-gray-700 mb-4">
            Step 1: Choose Your Payment Method
          </label>
          <div className="flex justify-center">
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <CardBrandOption
                brand="visa"
                selected={selectedCardType === "visa"}
                onClick={handleCardTypeSelect}
                disabled={currentStep > 2}
              />
              <CardBrandOption
                brand="mastercard"
                selected={selectedCardType === "mastercard"}
                onClick={handleCardTypeSelect}
                disabled={currentStep > 2}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Card Details */}
      {showCardForm && currentStep >= 2 && (
        <div className="space-y-4 border-t pt-6">
          <div className="text-center">
            <label className="block text-sm font-bold text-gray-700 mb-4">
              Step 2: Enter Your Card Details
            </label>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
            <CardBrandIcon brand={selectedCardType} />
            <span className="text-sm font-medium text-gray-700">
              {selectedCardType.charAt(0).toUpperCase() +
                selectedCardType.slice(1)}{" "}
              Card Selected
            </span>
            {cardComplete &&
              detectedCardBrand !== "unknown" &&
              detectedCardBrand === selectedCardType && (
                <div className="flex items-center text-green-600 text-sm">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified
                </div>
              )}
          </div>

          <div className="relative">
            <div className="p-4 border border-gray-300 rounded-lg focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-500">
              <CardElement
                options={CARD_ELEMENT_OPTIONS}
                onChange={handleCardChange}
                disabled={currentStep > 2}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <div
                className={`flex items-center ${
                  cardComplete ? "text-green-600" : "text-gray-400"
                }`}
              >
                <svg
                  className="w-3 h-3 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {cardComplete ? "Card Details Complete" : "Enter card details"}
              </div>

              {cardComplete && detectedCardBrand !== "unknown" && (
                <div className="flex items-center text-gray-600">
                  <CardBrandIcon brand={detectedCardBrand} />
                  <span className="ml-1 capitalize text-xs">
                    {detectedCardBrand} detected
                  </span>
                </div>
              )}
            </div>
          </div>

          {currentStep === 2 && (
            <button
              type="button"
              onClick={proceedToEmailVerification}
              disabled={!cardComplete || !!stripeError}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                cardComplete && !stripeError
                  ? "bg-gray-600 text-white hover:bg-gray-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Continue to Email Verification
            </button>
          )}
        </div>
      )}

      {/* Step 3: Email Input */}
      {currentStep >= 3 && (
        <div className="space-y-4 border-t pt-6">
          <div className="text-center">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Step 3: Email Verification
            </label>
            <p className="text-sm text-gray-600 mb-4">
              For added security, we'll send a verification code to your email
              before processing the payment.
            </p>
          </div>

          <div className="max-w-sm mx-auto">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={codeSent || currentStep > 3}
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:bg-gray-100"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          {currentStep === 3 && !codeSent && (
            <div className="text-center">
              <button
                type="button"
                onClick={sendVerificationCode}
                disabled={sendingCode || !email}
                className={`py-3 px-6 rounded-lg font-medium transition-all ${
                  !sendingCode && email
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {sendingCode ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Sending Code...
                  </div>
                ) : (
                  "Send Verification Code"
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Code Verification */}
      {currentStep >= 4 && codeSent && (
        <div className="space-y-4 border-t pt-6">
          <div className="text-center">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Step 4: Enter Verification Code
            </label>
            <p className="text-sm text-gray-600 mb-4">
              We sent a 6-digit code to{" "}
              <span className="font-medium">{email}</span>. Please check your
              email and enter it below.
            </p>
          </div>

          <div className="max-w-xs mx-auto">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) =>
                setVerificationCode(
                  e.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              placeholder="Enter 6-digit code"
              disabled={verifyingCode || currentStep > 4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-center text-2xl tracking-wider disabled:bg-gray-100"
              maxLength={6}
            />
          </div>

          {currentStep === 4 && (
            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={verifyCode}
                disabled={verifyingCode || verificationCode.length !== 6}
                className={`py-3 px-6 rounded-lg font-medium transition-all ${
                  !verifyingCode && verificationCode.length === 6
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {verifyingCode ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  "Verify Code & Process Payment"
                )}
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setCodeSent(false);
                    setCurrentStep(3);
                    setVerificationCode("");
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Didn't receive the code? Send again
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Final Payment */}
      {currentStep === 5 && (
        <div className="space-y-4 border-t pt-6">
          <div className="text-center">
            <div className="flex items-center justify-center text-green-600 mb-4">
              <svg
                className="w-8 h-8 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-lg font-semibold">
                Email Verified Successfully!
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Processing your secure payment...
            </p>
          </div>

          {processing && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">
                Processing payment securely...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Messages */}
      {(errorMessage || stripeError) && (
        <div className="p-4 bg-orange-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-orange-400 mt-0.5 mr-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-orange-600">
              {errorMessage || stripeError}
            </p>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg
            className="h-5 w-5 text-green-400 mt-0.5 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.40A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-green-800">
              Enhanced Email Verification
            </h4>
            <p className="text-xs text-green-600 mt-1">
              Email verification adds an extra layer of security to protect your
              payment and ensures delivery of your payment receipt.
            </p>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="text-center space-y-2">
        <p className="text-xs text-gray-500">
          By proceeding with payment, you agree to the rental terms and
          conditions.
        </p>
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
          <span className="flex items-center">
            <svg
              className="h-3 w-3 text-green-500 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Email Verified
          </span>
          <span className="flex items-center">
            <svg
              className="h-3 w-3 text-green-500 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            SSL Secured
          </span>
          <span className="flex items-center">
            <svg
              className="h-3 w-3 text-green-500 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            PCI Compliant
          </span>
        </div>
      </div>
    </form>
  );
}
