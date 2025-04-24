"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";

export default function SettingsTab({ user, profile }) {
  // State for form data
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    preferences: {}
  });

  // State for notification settings based on user role
  const [notifications, setNotifications] = useState({
    // Common notifications
    systemUpdates: true,
    marketingEmails: false,
    
    // Owner specific notifications
    newInquiries: true,
    viewingRequests: true,
    rentalApplications: true,
    
    // Tenant specific notifications
    newProperties: false,
    applicationUpdates: true,
    viewingReminders: true
  });

  // State for handling form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  const isOwner = profile?.role === "owner";
  const isTenant = profile?.role === "user";

  // Load user profile data on component mount
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        preferences: profile.preferences || {}
      });

      // Load notification preferences if they exist
      if (profile.preferences?.notifications) {
        setNotifications(prev => ({
          ...prev,
          ...profile.preferences.notifications
        }));
      }
    }
  }, [profile]);

  // Handle text input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle notification checkbox changes
  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotifications(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Handle password reset email request
  const handlePasswordResetRequest = async () => {
    setIsSubmitting(true);
    
    try {
      // Request password reset email through Supabase Auth with 24-hour expiration
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
        // Use emailRedirectTo for older Supabase versions
        emailRedirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      
      setPasswordResetSent(true);
      toast.success("Password reset link sent to your email. You'll be signed out when you use the link.");
    } catch (error) {
      console.error("Error requesting password reset:", error);
      toast.error(error.message || "Failed to send password reset email");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle profile form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Prepare updated profile data
      const updatedData = {
        full_name: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        preferences: {
          ...formData.preferences,
          notifications: notifications
        },
        updated_at: new Date().toISOString()
      };
      
      // Update profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update(updatedData)
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success("Settings updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>
      
      {/* Basic Profile Information */}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-custom-red focus:border-custom-red"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                disabled
                value={user?.email || ""}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-custom-red focus:border-custom-red"
              />
            </div>
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                rows="3"
                value={formData.address}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-custom-red focus:border-custom-red"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPasswordChange(!showPasswordChange)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {showPasswordChange ? "Cancel" : "Change Password"}
              </button>
            </div>
          </div>
        </div>
        
        {/* Password Change Form */}
        {showPasswordChange && (
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
            
            {passwordResetSent ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Password reset link sent</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>
                        We've sent a password reset link to your email address. Please check your inbox.
                      </p>
                      <p className="mt-1">
                        The link will expire in 24 hours. When you click the link, you'll be signed out automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Secure Password Reset</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          We'll send a password reset link to your email address. This link will:
                        </p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>Expire after 24 hours</li>
                          <li>Can only be used once</li>
                          <li>Automatically sign you out when used</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    We'll send a secure password reset link to: <span className="font-medium">{user?.email}</span>
                  </p>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPasswordChange(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePasswordResetRequest}
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-red hover:bg-red-700"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </span>
                    ) : "Send Reset Link"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Notification Preferences */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
          <div className="space-y-3">
            {/* Common notifications for all users */}
            <div className="flex items-center">
              <input
                id="notifications-system-updates"
                name="systemUpdates"
                type="checkbox"
                checked={notifications.systemUpdates}
                onChange={handleNotificationChange}
                className="h-4 w-4 text-custom-red border-gray-300 rounded"
              />
              <label htmlFor="notifications-system-updates" className="ml-2 block text-sm text-gray-700">
                System updates and announcements
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="notifications-marketing"
                name="marketingEmails"
                type="checkbox"
                checked={notifications.marketingEmails}
                onChange={handleNotificationChange}
                className="h-4 w-4 text-custom-red border-gray-300 rounded"
              />
              <label htmlFor="notifications-marketing" className="ml-2 block text-sm text-gray-700">
                Marketing emails and promotions
              </label>
            </div>
            
            {/* Owner specific notifications */}
            {isOwner && (
              <>
                <div className="mt-4 mb-2 border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-700">Property Owner Notifications</h4>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="notifications-new-inquiries"
                    name="newInquiries"
                    type="checkbox"
                    checked={notifications.newInquiries}
                    onChange={handleNotificationChange}
                    className="h-4 w-4 text-custom-red border-gray-300 rounded"
                  />
                  <label htmlFor="notifications-new-inquiries" className="ml-2 block text-sm text-gray-700">
                    New property inquiries
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="notifications-viewing-requests"
                    name="viewingRequests"
                    type="checkbox"
                    checked={notifications.viewingRequests}
                    onChange={handleNotificationChange}
                    className="h-4 w-4 text-custom-red border-gray-300 rounded"
                  />
                  <label htmlFor="notifications-viewing-requests" className="ml-2 block text-sm text-gray-700">
                    Viewing requests
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="notifications-applications"
                    name="rentalApplications"
                    type="checkbox"
                    checked={notifications.rentalApplications}
                    onChange={handleNotificationChange}
                    className="h-4 w-4 text-custom-red border-gray-300 rounded"
                  />
                  <label htmlFor="notifications-applications" className="ml-2 block text-sm text-gray-700">
                    Rental applications
                  </label>
                </div>
              </>
            )}
            
            {/* Tenant specific notifications */}
            {isTenant && (
              <>
                <div className="mt-4 mb-2 border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-700">Tenant Notifications</h4>
                </div>
                
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
              </>
            )}
          </div>
        </div>
        
        {/* Actions */}
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
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-red hover:bg-red-700"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
      
      {/* Delete Account Section */}
      <div className="mt-10 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Account</h3>
        <p className="text-sm text-gray-500 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button
          type="button"
          className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}