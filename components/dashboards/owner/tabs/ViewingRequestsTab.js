"use client";

import { formatDate, getStatusColor } from "@/data/mockData";

export default function ViewingRequestsTab({ viewingRequests }) {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Viewing Requests
      </h2>
      {viewingRequests.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">No viewing requests yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {viewingRequests.map((request) => (
            <div key={request.id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {request.propertyTitle}
                    </h3>
                    <p className="text-gray-600 mb-2">Request from {request.userName}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      request.status,
                      "viewing"
                    )}`}
                  >
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Proposed Date</p>
                    <p className="font-semibold">{formatDate(request.proposedDate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Request Made On</p>
                    <p>{formatDate(request.requestDate)}</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-gray-600 text-sm font-medium">Message</p>
                  <p className="text-gray-700 mt-1">{request.message}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm">Email</p>
                      <p className="font-medium">{request.userEmail}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Phone</p>
                      <p className="font-medium">{request.userPhone}</p>
                    </div>
                  </div>
                </div>
                
                {request.status === "pending" && (
                  <div className="flex justify-end space-x-3 mt-4">
                    <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      Suggest New Time
                    </button>
                    <button className="inline-flex items-center px-4 py-2 border border-green-500 rounded-md text-sm font-medium text-white bg-green-500 hover:bg-green-600">
                      Approve
                    </button>
                    <button className="inline-flex items-center px-4 py-2 border border-red-500 rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-600">
                      Decline
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}