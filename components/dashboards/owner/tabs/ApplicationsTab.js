"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function ApplicationsTab({ 
  applications = [], 
  loading = false, 
  error = null, 
  onStatusUpdate,
  onRefresh 
}) {
  const [actionInProgress, setActionInProgress] = useState(null);

  // Get the appropriate status color based on the status
  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'withdrawn': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle application status update
  const handleStatusUpdate = async (applicationId, newStatus) => {
    try {
      setActionInProgress(applicationId);
      await onStatusUpdate(applicationId, newStatus);
      toast.success(`Application ${newStatus} successfully`);
    } catch (error) {
      console.error(`Error ${newStatus} application:`, error);
      toast.error(`Failed to ${newStatus} application`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle requesting more information
  const handleRequestMoreInfo = (applicationId) => {
    // This would open a modal to request more information
    // For now we'll just show a toast
    toast.info('Feature coming soon: Request More Information');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Rental Applications</h2>
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Rental Applications</h2>
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          <p>Error: {error}</p>
        </div>
        <button 
          onClick={onRefresh}
          className="text-custom-red hover:text-red-700 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  // Filter out withdrawn applications if needed
  const filteredApplications = applications.filter(app => app.status !== 'withdrawn');

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Rental Applications</h2>
        
        <button
          onClick={onRefresh}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-red"
        >
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      
      {filteredApplications.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No rental applications at this time.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredApplications.map((application) => (
            <div key={application.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      <Link href={`/properties/${application.property_id}`} className="hover:text-custom-red">
                        {application.property_title || 'Property'}
                      </Link>
                    </h3>
                    <p className="text-gray-600 mb-2">
                      Application from {application.user_name || application.user_id}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}
                  >
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Employment Status</p>
                    <p className="font-medium">{application.employment_status}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Annual Income</p>
                    <p className="font-medium">${parseInt(application.income).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Credit Score</p>
                    <p className="font-medium">{application.credit_score}</p>
                  </div>
                </div>
                
                {application.message && (
                  <div className="mb-4">
                    <p className="text-gray-600 text-sm font-medium">Message</p>
                    <p className="text-gray-700 mt-1 bg-gray-50 p-3 rounded">{application.message}</p>
                  </div>
                )}
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm">Email</p>
                      <p className="font-medium">{application.user_email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Phone</p>
                      <p className="font-medium">{application.user_phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
                
                {/* Action buttons based on current status */}
                <div className="flex flex-wrap justify-end space-x-2 gap-y-2 mt-4">
                  {/* Pending application actions */}
                  {application.status === "pending" && (
                    <>
                      <button 
                        onClick={() => handleRequestMoreInfo(application.id)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Request More Info
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(application.id, 'approved')}
                        disabled={actionInProgress === application.id}
                        className="inline-flex items-center px-4 py-2 border border-green-500 rounded-md text-sm font-medium text-white bg-green-500 hover:bg-green-600 disabled:opacity-50"
                      >
                        {actionInProgress === application.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(application.id, 'rejected')}
                        disabled={actionInProgress === application.id}
                        className="inline-flex items-center px-4 py-2 border border-red-500 rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                      >
                        {actionInProgress === application.id ? 'Processing...' : 'Reject'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}