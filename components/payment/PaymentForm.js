// components/payment/PaymentForm.js
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

// Enhanced Card Brand Components
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
      className={`
        p-4 border-2 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2
        ${
          selected
            ? `border-${config.color}-500 bg-${config.color}-50 ring-2 ring-${config.color}-500 shadow-md`
            : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
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

export default function PaymentForm({
  applicationId,
  amount,
  paymentItems,
  onSuccess,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedCardType, setSelectedCardType] = useState("");
  const [detectedCardBrand, setDetectedCardBrand] = useState("unknown");
  const [cardComplete, setCardComplete] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [stripeError, setStripeError] = useState("");

  const handleCardTypeSelect = (cardType) => {
    setSelectedCardType(cardType);
    setShowCardForm(true);
    setErrorMessage("");
    setStripeError("");
  };

  const handleCardChange = (event) => {
    // Handle Stripe validation errors
    setStripeError(event.error ? event.error.message : "");
    setDetectedCardBrand(event.brand || "unknown");
    setCardComplete(event.complete);
    
    // Clear any previous error messages when user starts typing
    if (errorMessage && !event.error) {
      setErrorMessage("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast.error("Payment system not loaded. Please refresh and try again.");
      return;
    }

    if (!selectedCardType) {
      toast.error("Please select a payment method first.");
      return;
    }

    if (!cardComplete) {
      toast.error("Please complete your card information.");
      return;
    }

    // Check for Stripe validation errors
    if (stripeError) {
      toast.error("Please fix the card information errors before proceeding.");
      return;
    }

    setProcessing(true);
    setErrorMessage("");

    try {
      // Create payment intent
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
          },
        });

      if (stripeError) {
        setErrorMessage(stripeError.message);
        toast.error(stripeError.message);
      } else if (paymentIntent.status === "succeeded") {
        // Confirm payment in our backend
        const confirmResponse = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            applicationId,
            paymentIntentId: paymentIntent.id,
            cardType: selectedCardType,
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step 1: Payment Method Selection */}
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
            />
            <CardBrandOption
              brand="mastercard"
              selected={selectedCardType === "mastercard"}
              onClick={handleCardTypeSelect}
            />
          </div>
        </div>
      </div>

      {/* Step 2: Card Details Form */}
      {showCardForm && (
        <div className="space-y-4 border-t pt-6">
          <div className="text-center">
            <label className="block text-sm font-bold text-gray-700 mb-4">
              Step 2: Enter Your Card Details
            </label>
          </div>

          {/* Selected Card Type Indicator */}
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
            <CardBrandIcon brand={selectedCardType} />
            <span className="text-sm font-medium text-gray-700">
              {selectedCardType.charAt(0).toUpperCase() +
                selectedCardType.slice(1)}{" "}
              Card Selected
            </span>
            {/* Show detected card brand only when complete and matching */}
            {cardComplete && 
             detectedCardBrand !== "unknown" && 
             detectedCardBrand === selectedCardType && (
              <div className="flex items-center text-green-600 text-sm">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
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

          {/* Card Element */}
          <div className="relative">
            <div className="p-4 border border-gray-300 rounded-lg focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-500">
              <CardElement
                options={CARD_ELEMENT_OPTIONS}
                onChange={handleCardChange}
              />
            </div>

            {/* Card validation indicators */}
            <div className="mt-2 flex items-center justify-between text-xs">
              <div
                className={`flex items-center ${
                  cardComplete ? "text-green-600" : "text-gray-400"
                }`}
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {cardComplete ? "Card Details Complete" : "Enter card details"}
              </div>

              {/* Only show detected card brand when card is complete */}
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

          {/* Security Features */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-gray-400 mt-0.5 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-gray-800">
                  Secure Payment Processing
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  Your card information is protected by 256-bit SSL encryption and PCI compliance standards.
                </p>
              </div>
            </div>
          </div>
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
            <p className="text-sm text-orange-600">{errorMessage || stripeError}</p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || processing || !cardComplete || !selectedCardType || !!stripeError}
        className={`w-full py-4 px-6 border border-transparent rounded-lg shadow-lg text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 ${
          processing || !stripe || !cardComplete || !selectedCardType || !!stripeError
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-orange-600 hover:bg-orange-700 transform hover:scale-[1.02] hover:shadow-xl"
        }`}
      >
        {processing ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
            Processing Payment...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <svg
              className="w-5 h-5 mr-3"
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
            Pay ${amount?.toLocaleString()}
          </div>
        )}
      </button>

      {/* Terms */}
      <div className="text-center space-y-2">
        <p className="text-xs text-gray-500">
          By proceeding with payment, you agree to the rental terms and conditions.
        </p>
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
          <span className="flex items-center">
            <svg className="h-3 w-3 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            SSL Secured
          </span>
          <span className="flex items-center">
            <svg className="h-3 w-3 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            PCI Compliant
          </span>
          <span className="flex items-center">
            <svg className="h-3 w-3 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Money Back Guarantee
          </span>
        </div>
      </div>
    </form>
  );
}