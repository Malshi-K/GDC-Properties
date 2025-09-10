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

  // State for account deletion
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const isOwner = profile?.role === "owner";
  const isTenant = profile?.role === "user";

  // Active tab state
  const [activeTab, setActiveTab] = useState("profile");

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

  // Handle delete password input change
  const handleDeletePasswordChange = (e) => {
    setDeletePassword(e.target.value);
    // Clear previous error when typing
    if (deletePasswordError) {
      setDeletePasswordError("");
    }
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

  // Handle account deletion confirmation toggle
  const toggleDeleteConfirmation = () => {
    setShowDeleteConfirmation(!showDeleteConfirmation);
    // Reset the password field and error when toggling
    setDeletePassword("");
    setDeletePasswordError("");
  };

  // Handle the actual account deletion
  const handleAccountDeletion = async (e) => {
    e.preventDefault();
    
    if (!deletePassword) {
      setDeletePasswordError("Please enter your password");
      return;
    }
    
    setIsDeletingAccount(true);
    setDeletePasswordError("");
    
    try {
      // Step 1: Verify the password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });
      
      if (signInError) {
        setDeletePasswordError("Incorrect password. Please try again.");
        setIsDeletingAccount(false);
        return;
      }
      
      // Step 2: Delete user data from profiles table
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
        
      if (profileDeleteError) throw profileDeleteError;
      
      // Step 3: Delete user from auth
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        user.id
      );
      
      if (authDeleteError) {
        // If we can't delete the auth user, we should show an error,
        // but at this point the profile is already deleted
        throw new Error("Failed to delete your account. Please contact support.");
      }
      
      // Step 4: Sign out
      await supabase.auth.signOut();
      
      // Show success message
      toast.success("Your account has been deleted successfully. You will be redirected to the homepage.");
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
      
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(error.message || "Failed to delete account. Please try again later.");
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Tabs Header */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("profile")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "profile"
                  ? "border-custom-orange text-custom-orange"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "notifications"
                  ? "border-custom-orange text-custom-orange"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "security"
                  ? "border-custom-orange text-custom-orange"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Security
            </button>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>
                
                <div className="max-w-2xl space-y-6 text-gray-600">
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
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-custom-orange focus:border-custom-orange"
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
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-custom-orange focus:border-custom-orange"
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
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-custom-orange focus:border-custom-orange"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
  
            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Email Notifications</h2>
                
                <div className="max-w-2xl space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-gray-700 mb-3">General Notifications</h3>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          id="notifications-system-updates"
                          name="systemUpdates"
                          type="checkbox"
                          checked={notifications.systemUpdates}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-custom-orange border-gray-300 rounded"
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
                          className="h-4 w-4 text-custom-orange border-gray-300 rounded"
                        />
                        <label htmlFor="notifications-marketing" className="ml-2 block text-sm text-gray-700">
                          Marketing emails and promotions
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Owner specific notifications */}
                  {isOwner && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h3 className="font-medium text-gray-700 mb-3">Property Owner Notifications</h3>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            id="notifications-new-inquiries"
                            name="newInquiries"
                            type="checkbox"
                            checked={notifications.newInquiries}
                            onChange={handleNotificationChange}
                            className="h-4 w-4 text-custom-orange border-gray-300 rounded"
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
                            className="h-4 w-4 text-custom-orange border-gray-300 rounded"
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
                            className="h-4 w-4 text-custom-orange border-gray-300 rounded"
                          />
                          <label htmlFor="notifications-applications" className="ml-2 block text-sm text-gray-700">
                            Rental applications
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Tenant specific notifications */}
                  {isTenant && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h3 className="font-medium text-gray-700 mb-3">Tenant Notifications</h3>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            id="notifications-new-properties"
                            name="newProperties"
                            type="checkbox"
                            checked={notifications.newProperties}
                            onChange={handleNotificationChange}
                            className="h-4 w-4 text-custom-orange border-gray-300 rounded"
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
                            className="h-4 w-4 text-custom-orange border-gray-300 rounded"
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
                            className="h-4 w-4 text-custom-orange border-gray-300 rounded"
                          />
                          <label htmlFor="notifications-viewing-reminders" className="ml-2 block text-sm text-gray-700">
                            Viewing reminders
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
  
            {/* Security Tab */}
            {activeTab === "security" && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Security Settings</h2>
                
                <div className="max-w-2xl space-y-6">
                  {/* Password Change Section */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <h3 className="text-lg font-medium text-gray-900">Password</h3>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-700">Update your password or reset it if you've forgotten it</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPasswordChange(!showPasswordChange)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          {showPasswordChange ? "Cancel" : "Change Password"}
                        </button>
                      </div>
                      
                      {showPasswordChange && (
                        <div className="mt-4 bg-gray-50 p-4 rounded-md">
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
                              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
                                <div className="flex">
                                  <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <div className="ml-3">
                                    <h3 className="text-sm font-medium text-gray-800">Secure Password Reset</h3>
                                    <div className="mt-2 text-sm text-gray-700">
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
                                  onClick={handlePasswordResetRequest}
                                  disabled={isSubmitting}
                                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-orange hover:bg-orange-700"
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
                    </div>
                  </div>
                  
                  {/* Delete Account Section */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <h3 className="text-lg font-medium text-custom-orange">Delete Account</h3>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-700">Permanently delete your account and all associated data</p>
                        </div>
                        {!showDeleteConfirmation && (
                          <button
                            type="button"
                            onClick={toggleDeleteConfirmation}
                            className="inline-flex items-center px-3 py-1.5 border border-custom-orange rounded-md text-sm font-medium text-custom-orange bg-white hover:bg-orange-50"
                          >
                            Delete Account
                          </button>
                        )}
                      </div>
                      
                      {showDeleteConfirmation && (
                        <div className="mt-4 bg-custom-orange border border-custom-orange rounded-lg p-4">
                          <h4 className="text-lg font-medium text-custom-orange mb-2">Confirm Account Deletion</h4>
                          <p className="text-sm text-custom-orange mb-4">
                            This action cannot be undone. Please confirm your password to proceed with account deletion.
                          </p>
                          
                          <form onSubmit={handleAccountDeletion} className="space-y-4">
                            <div>
                              <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700 mb-1">
                                Enter your password
                              </label>
                              <input
                                id="deletePassword"
                                type="password"
                                value={deletePassword}
                                onChange={handleDeletePasswordChange}
                                className={`block w-full px-3 py-2 border ${
                                  deletePasswordError ? 'border-custom-orange focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-custom-orange focus:border-custom-orange'
                                } rounded-md shadow-sm`}
                                placeholder="Your current password"
                              />
                              {deletePasswordError && (
                                <p className="mt-1 text-sm text-orange-600">{deletePasswordError}</p>
                              )}
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-700 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                              <svg className="h-5 w-5 text-yellow-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              By proceeding, all of your data will be permanently deleted, including your profile, saved properties, applications, and viewing requests.
                            </div>
                            
                            <div className="flex justify-end space-x-3">
                              <button
                                type="button"
                                onClick={toggleDeleteConfirmation}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isDeletingAccount}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                {isDeletingAccount ? (
                                  <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Deleting...
                                  </span>
                                ) : "Permanently Delete Account"}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
  
            {/* Save Changes Button - only show on Profile and Notifications tabs */}
            {(activeTab === "profile" || activeTab === "notifications") && (
              <div className="pt-5 border-t border-gray-200">
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-orange hover:bg-custom-yellow"
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
            )}
          </form>
        </div>
      </div>
    </div>
  );
}