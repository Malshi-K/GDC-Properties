import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function BankingSetupTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (user?.id) {
      checkAccountStatus();
    }
  }, [user?.id]);

  const checkAccountStatus = async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch(`/api/stripe/account-status?userId=${user.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setAccountStatus(data);
      } else {
        console.error('Failed to check account status:', data.error);
      }
    } catch (error) {
      console.error('Error checking account status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const startOnboarding = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          businessType: 'individual'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.alreadyOnboarded) {
          toast.success('Your banking is already set up!');
          checkAccountStatus();
        } else {
          // Redirect to Stripe onboarding
          window.location.href = data.onboardingUrl;
        }
      } else {
        throw new Error(data.error || 'Failed to start onboarding');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ status, label }) => {
    const getStatusColor = () => {
      switch (status) {
        case true:
          return 'bg-green-100 text-green-800';
        case false:
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    const getStatusIcon = () => {
      switch (status) {
        case true:
          return '✓';
        case false:
          return '✗';
        default:
          return '?';
      }
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
        <span className="mr-1">{getStatusIcon()}</span>
        {label}
      </span>
    );
  };

  if (checkingStatus) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Checking banking status...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Banking Setup</h1>
        <p className="text-gray-600">
          Set up your bank account to receive rental payments directly and securely.
        </p>
      </div>

      {/* Account Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Status</h2>
        
        {accountStatus?.hasAccount ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Stripe Account</span>
                  <StatusBadge status={accountStatus.hasAccount} label="Connected" />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Onboarding Complete</span>
                  <StatusBadge status={accountStatus.onboardingComplete} label={accountStatus.onboardingComplete ? "Complete" : "Pending"} />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Can Accept Charges</span>
                  <StatusBadge status={accountStatus.chargesEnabled} label={accountStatus.chargesEnabled ? "Enabled" : "Disabled"} />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Can Receive Payouts</span>
                  <StatusBadge status={accountStatus.payoutsEnabled} label={accountStatus.payoutsEnabled ? "Enabled" : "Disabled"} />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Transfer Ready</span>
                  <StatusBadge status={accountStatus.canReceiveTransfers} label={accountStatus.canReceiveTransfers ? "Ready" : "Not Ready"} />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Details Submitted</span>
                  <StatusBadge status={accountStatus.detailsSubmitted} label={accountStatus.detailsSubmitted ? "Submitted" : "Missing"} />
                </div>
              </div>
            </div>

            {/* Account ID Display */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <span className="font-medium text-gray-700">Stripe Account ID: </span>
                <code className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                  {accountStatus.accountId}
                </code>
              </div>
            </div>

            {/* Requirements */}
            {accountStatus.requirements && accountStatus.requirements.currently_due?.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Action Required</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {accountStatus.requirements.currently_due.map((requirement, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                      {requirement.replace(/_/g, ' ').toUpperCase()}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4 mt-6">
              {!accountStatus.onboardingComplete && (
                <button
                  onClick={startOnboarding}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Complete Setup'}
                </button>
              )}
              
              <button
                onClick={checkAccountStatus}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
              >
                Refresh Status
              </button>
            </div>
          </div>
        ) : (
          /* No Account Setup */
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Banking Setup</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Connect your bank account to receive rental payments directly. This is secure and powered by Stripe.
            </p>
            
            <button
              onClick={startOnboarding}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting up...' : 'Set Up Banking'}
            </button>
          </div>
        )}
      </div>

      {/* Test Mode Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800">Test Mode Active</h3>
            <p className="text-sm text-blue-700 mt-1">
              You're currently in test mode. Use test bank account details during setup:
            </p>
            <div className="mt-2 text-xs text-blue-600 bg-blue-100 p-2 rounded font-mono">
              Routing: 110000000 | Account: 000123456789
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Benefits of Setting Up Banking</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Automatic Transfers</h3>
            <p className="text-sm text-gray-600">Receive rental payments automatically without manual processing</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.40A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Secure & Verified</h3>
            <p className="text-sm text-gray-600">Bank-level security with identity verification through Stripe</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Transparent Fees</h3>
            <p className="text-sm text-gray-600">Clear fee structure with automatic deductions before transfer</p>
          </div>
        </div>
      </div>
    </div>
  );
}