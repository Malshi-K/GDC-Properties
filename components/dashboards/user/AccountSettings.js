// components/dashboard/AccountSettings.js
import { useState } from 'react';

/**
 * Account settings component for user dashboard
 */
const AccountSettings = ({ user }) => {
  // State for notification settings
  const [notifications, setNotifications] = useState({
    newProperties: false,
    applicationUpdates: true,
    viewingReminders: true
  });
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, this would update user settings in the database
    console.log('Notification settings updated:', notifications);
    // Show success message, etc.
  };
  
  // Handle notification checkbox changes
  const handleNotificationChange = (e) => {
    setNotifications({
      ...notifications,
      [e.target.name]: e.target.checked
    });
  };
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>
      
      <form className="space-y-6" onSubmit={handleSubmit}>
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
                id="notifications-new-properties"
                name="newProperties"
                type="checkbox"
                checked={notifications.newProperties}
                onChange={handleNotificationChange}
                className="h-4 w-4 text-custom-red border-gray-300 rounded"
              />
              <label htmlFor="notifications-new-properties" className="ml-2 block text-sm text-gray-700">
                New property alerts
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="notifications-application-updates"
                name="applicationUpdates"
                type="checkbox"
                checked={notifications.applicationUpdates}
                onChange={handleNotificationChange}
                className="h-4 w-4 text-custom-red border-gray-300 rounded"
              />
              <label htmlFor="notifications-application-updates" className="ml-2 block text-sm text-gray-700">
                Application status updates
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="notifications-viewing-reminders"
                name="viewingReminders"
                type="checkbox"
                checked={notifications.viewingReminders}
                onChange={handleNotificationChange}
                className="h-4 w-4 text-custom-red border-gray-300 rounded"
              />
              <label htmlFor="notifications-viewing-reminders" className="ml-2 block text-sm text-gray-700">
                Viewing reminders
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
};

export default AccountSettings;