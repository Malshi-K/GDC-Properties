"use client";

export default function SettingsTab({ user }) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>
      
      <form className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            disabled
            value={user?.email || ''}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Change Password
          </button>
        </div>
        
        <div>
          <label htmlFor="notifications" className="block text-sm font-medium text-gray-700 mb-1">
            Email Notifications
          </label>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                id="notifications-new-inquiries"
                type="checkbox"
                className="h-4 w-4 text-custom-red border-gray-300 rounded"
                defaultChecked
              />
              <label htmlFor="notifications-new-inquiries" className="ml-2 block text-sm text-gray-700">
                New property inquiries
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="notifications-viewing-requests"
                type="checkbox"
                className="h-4 w-4 text-custom-red border-gray-300 rounded"
                defaultChecked
              />
              <label htmlFor="notifications-viewing-requests" className="ml-2 block text-sm text-gray-700">
                Viewing requests
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="notifications-applications"
                type="checkbox"
                className="h-4 w-4 text-custom-red border-gray-300 rounded"
                defaultChecked
              />
              <label htmlFor="notifications-applications" className="ml-2 block text-sm text-gray-700">
                Rental applications
              </label>
            </div>
          </div>
        </div>
        
        <div className="pt-5">
          <div className="flex justify-end">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-red hover:bg-red-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}