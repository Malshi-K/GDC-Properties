// app/dashboard/user/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';

// This would come from an API in a real application
const mockBookings = [
  {
    id: 1,
    propertyId: 1,
    propertyTitle: "Luxurious Beach House",
    propertyImage: "/images/property1.jpg",
    location: "Malibu Beach",
    price: 3500000,
    bookingDate: "2023-05-15T10:00:00",
    status: "confirmed", // confirmed, pending, canceled
    viewingDate: "2023-05-20T14:00:00"
  },
  {
    id: 2,
    propertyId: 3,
    propertyTitle: "Hillside Villa",
    propertyImage: "/images/property3.jpg",
    location: "Hollywood Hills",
    price: 4500000,
    bookingDate: "2023-05-10T15:30:00",
    status: "pending",
    viewingDate: "2023-05-25T11:00:00"
  },
  {
    id: 3,
    propertyId: 2,
    propertyTitle: "Modern Downtown Apartment",
    propertyImage: "/images/property2.jpg",
    location: "Beverly Hills",
    price: 1200000,
    bookingDate: "2023-04-28T09:15:00",
    status: "canceled",
    viewingDate: "2023-05-05T13:00:00"
  }
];

const mockApplications = [
  {
    id: 1,
    propertyId: 4,
    propertyTitle: "Cozy Beach Townhouse",
    propertyImage: "/images/property4.jpg",
    location: "Venice Beach",
    price: 850000,
    applicationDate: "2023-05-12T11:20:00",
    status: "pending", // pending, approved, rejected
    message: "I'm very interested in this property and would like to proceed with the application."
  },
  {
    id: 2,
    propertyId: 1,
    propertyTitle: "Luxurious Beach House",
    propertyImage: "/images/property1.jpg",
    location: "Malibu Beach",
    price: 3500000,
    applicationDate: "2023-05-08T14:45:00",
    status: "approved",
    message: "I'm looking for a beachfront property and this looks perfect."
  },
  {
    id: 3,
    propertyId: 2,
    propertyTitle: "Modern Downtown Apartment",
    propertyImage: "/images/property2.jpg",
    location: "Beverly Hills",
    price: 1200000,
    applicationDate: "2023-04-22T16:30:00",
    status: "rejected",
    message: "I would like to apply for this property as it meets all my requirements."
  }
];

export default function UserDashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  
  // Fetch user's favorite properties
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;
      
      try {
        setLoadingFavorites(true);
        
        // Get favorites from Supabase
        const { data, error } = await supabase
          .from('favorites')
          .select(`
            id,
            property_id,
            properties (
              id,
              title,
              location,
              price,
              bedrooms,
              bathrooms,
              main_image_url
            )
          `)
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        // Format the data for display
        const formattedFavorites = data.map(item => ({
          id: item.id,
          propertyId: item.property_id,
          ...item.properties
        }));
        
        setFavorites(formattedFavorites);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setLoadingFavorites(false);
      }
    };
    
    fetchFavorites();
  }, [user]);
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };
  
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  const getStatusColor = (status, type) => {
    if (type === 'booking') {
      switch(status) {
        case 'confirmed': return 'bg-green-100 text-green-800';
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'canceled': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    } else {
      switch(status) {
        case 'approved': return 'bg-green-100 text-green-800';
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
  };
  
  // Remove a property from favorites
  const removeFavorite = async (favoriteId) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);
        
      if (error) throw error;
      
      // Update local state
      setFavorites(favorites.filter(favorite => favorite.id !== favoriteId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };
  
  return (
    <ProtectedRoute allowedRoles={['user']}>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
              <Link href="/" className="text-custom-red hover:text-red-700">
                Return to Home
              </Link>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="flex flex-col items-center">
                  <div className="w-32 h-32 relative rounded-full overflow-hidden mb-4">
                    {/* In a real app, use the user's profile image */}
                    <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600">Profile Image</span>
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">{profile?.role || 'User'}</h2>
                  <p className="text-gray-600 mb-1">{user?.email}</p>
                  <p className="text-gray-600">{profile?.phone || 'No phone number'}</p>
                  <Link href="/profile" className="mt-4 w-full bg-custom-red hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors duration-300 text-center">
                    Edit Profile
                  </Link>
                </div>
              </div>
              
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <nav className="divide-y divide-gray-200">
                  <button 
                    onClick={() => setActiveTab('bookings')}
                    className={`w-full text-left px-6 py-4 flex items-center ${activeTab === 'bookings' ? 'bg-red-50 text-custom-red' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Property Viewings
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('applications')}
                    className={`w-full text-left px-6 py-4 flex items-center ${activeTab === 'applications' ? 'bg-red-50 text-custom-red' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    My Applications
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('favorites')}
                    className={`w-full text-left px-6 py-4 flex items-center ${activeTab === 'favorites' ? 'bg-red-50 text-custom-red' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Saved Properties
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('settings')}
                    className={`w-full text-left px-6 py-4 flex items-center ${activeTab === 'settings' ? 'bg-red-50 text-custom-red' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Account Settings
                  </button>
                </nav>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Property Viewings Tab */}
              {activeTab === 'bookings' && (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">My Property Viewings</h2>
                  
                  {mockBookings.length === 0 ? (
                    <div className="bg-white shadow rounded-lg p-6 text-center">
                      <p className="text-gray-500">You haven't scheduled any property viewings yet.</p>
                      <Link href="/search" className="inline-block mt-4 text-custom-red hover:text-red-700">
                        Browse Properties
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {mockBookings.map(booking => (
                        <div key={booking.id} className="bg-white shadow rounded-lg overflow-hidden">
                          <div className="md:flex">
                            <div className="md:flex-shrink-0 h-48 md:h-auto md:w-48 bg-gray-300 relative">
                              {/* In a real app, use the property image */}
                              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                                <span>Property Image</span>
                              </div>
                            </div>
                            
                            <div className="p-6 w-full">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                                    <Link href={`/property/${booking.propertyId}`} className="hover:text-custom-red">
                                      {booking.propertyTitle}
                                    </Link>
                                  </h3>
                                  <p className="text-gray-600 mb-2">{booking.location}</p>
                                  <p className="text-custom-red font-bold mb-4">{formatPrice(booking.price)}</p>
                                </div>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status, 'booking')}`}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                              </div>
                              
                              <div className="border-t border-gray-200 mt-4 pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-gray-600 text-sm font-medium">Viewing Date</p>
                                    <p className="font-semibold">{formatDate(booking.viewingDate)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 text-sm font-medium">Booking Made On</p>
                                    <p>{formatDate(booking.bookingDate)}</p>
                                  </div>
                                </div>
                                
                                <div className="flex justify-end space-x-3 mt-4">
                                  {booking.status === 'confirmed' && (
                                    <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                      Reschedule
                                    </button>
                                  )}
                                  {booking.status !== 'canceled' && (
                                    <button className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50">
                                      Cancel Viewing
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {/* Applications Tab */}
              {activeTab === 'applications' && (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">My Property Applications</h2>
                  
                  {mockApplications.length === 0 ? (
                    <div className="bg-white shadow rounded-lg p-6 text-center">
                      <p className="text-gray-500">You haven't applied for any properties yet.</p>
                      <Link href="/search" className="inline-block mt-4 text-custom-red hover:text-red-700">
                        Browse Properties
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {mockApplications.map(application => (
                        <div key={application.id} className="bg-white shadow rounded-lg overflow-hidden">
                          <div className="md:flex">
                            <div className="md:flex-shrink-0 h-48 md:h-auto md:w-48 bg-gray-300 relative">
                              {/* In a real app, use the property image */}
                              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                                <span>Property Image</span>
                              </div>
                            </div>
                            
                            <div className="p-6 w-full">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                                    <Link href={`/property/${application.propertyId}`} className="hover:text-custom-red">
                                      {application.propertyTitle}
                                    </Link>
                                  </h3>
                                  <p className="text-gray-600 mb-2">{application.location}</p>
                                  <p className="text-custom-red font-bold mb-4">{formatPrice(application.price)}</p>
                                </div>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status, 'application')}`}>
                                  {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                                </span>
                              </div>
                              
                              <div className="mt-2">
                                <p className="text-gray-600 text-sm font-medium">Your Message</p>
                                <p className="text-gray-700 mt-1">{application.message}</p>
                              </div>
                              
                              <div className="border-t border-gray-200 mt-4 pt-4">
                                <div>
                                  <p className="text-gray-600 text-sm font-medium">Applied On</p>
                                  <p>{formatDate(application.applicationDate)}</p>
                                </div>
                                
                                <div className="flex justify-end space-x-3 mt-4">
                                  {application.status === 'pending' && (
                                    <>
                                      <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                        Edit Application
                                      </button>
                                      <button className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50">
                                        Withdraw
                                      </button>
                                    </>
                                  )}
                                  {application.status === 'approved' && (
                                    <button className="inline-flex items-center px-4 py-2 border border-green-500 rounded-md text-sm font-medium text-white bg-green-500 hover:bg-green-600">
                                      Proceed with Rental
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {/* Favorites Tab */}
              {activeTab === 'favorites' && (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Saved Properties</h2>
                  
                  {loadingFavorites ? (
                    <div className="flex justify-center my-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
                    </div>
                  ) : favorites.length === 0 ? (
                    <div className="bg-white shadow rounded-lg p-6 text-center">
                      <p className="text-gray-500">You haven't saved any properties yet.</p>
                      <Link href="/search" className="inline-block mt-4 text-custom-red hover:text-red-700">
                        Browse Properties
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {favorites.map(property => (
                        <div key={property.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                          <div className="relative h-48">
                            <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
                              <span className="text-gray-600">Property Image</span>
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <div className="flex justify-between items-start">
                              <h3 className="text-lg font-bold mb-2 text-gray-800">
                                {property.title}
                              </h3>
                              <button 
                                onClick={() => removeFavorite(property.id)}
                                className="text-gray-500 hover:text-red-500"
                                aria-label="Remove from favorites"
                              >
                                <svg 
                                  className="h-5 w-5" 
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                >
                                  <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth="2" 
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                                  />
                                </svg>
                              </button>
                            </div>
                            
                            <p className="text-custom-red font-bold mb-2">
                              {formatPrice(property.price)}
                            </p>
                            
                            <div className="flex items-center text-gray-500 text-sm mb-3">
                              <span className="mr-3">{property.bedrooms} Beds</span>
                              <span className="mr-3">{property.bathrooms} Baths</span>
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                              {property.location}
                            </p>
                            
                            <Link 
                              href={`/properties/${property.propertyId}`}
                              className="block text-center bg-custom-red text-white px-4 py-2 rounded-full hover:bg-opacity-90 transition-colors"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {/* Settings Tab - Placeholder */}
              {activeTab === 'settings' && (
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
                            id="notifications-new-properties"
                            type="checkbox"
                            className="h-4 w-4 text-custom-red border-gray-300 rounded"
                          />
                          <label htmlFor="notifications-new-properties" className="ml-2 block text-sm text-gray-700">
                            New property alerts
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="notifications-application-updates"
                            type="checkbox"
                            className="h-4 w-4 text-custom-red border-gray-300 rounded"
                            defaultChecked
                          />
                          <label htmlFor="notifications-application-updates" className="ml-2 block text-sm text-gray-700">
                            Application status updates
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="notifications-viewing-reminders"
                            type="checkbox"
                            className="h-4 w-4 text-custom-red border-gray-300 rounded"
                            defaultChecked
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
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}