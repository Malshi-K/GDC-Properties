'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';

// Import components
import UserProfile from '@/components/dashboards/user/UserProfile';
import DashboardSidebar from '@/components/dashboards/user/DashboardSidebar';
import PropertyApplications from '@/components/dashboards/user/PropertyApplications';
import SavedProperties from '@/components/dashboards/user/SavedProperties';
import AccountSettings from '@/components/dashboards/user/AccountSettings';
import ViewingRequestsTab from '@/components/dashboards/user/ViewingRequestsTab';

/**
 * User Dashboard Page
 */
export default function UserDashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('viewingRequests'); // Set default to viewingRequests
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(true); 
  const [viewingRequests, setViewingRequests] = useState([]);
  const [loadingViewingRequests, setLoadingViewingRequests] = useState(true);
  
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
              images
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
  
  // Fetch rental applications
  useEffect(() => {
    const fetchApplications = async () => {
      if (!user) return;
      
      try {
        setLoadingApplications(true);
        
        console.log('Fetching applications for user:', user.id);
        
        // Get applications from Supabase
        const { data, error } = await supabase
          .from('rental_applications')
          .select(`
            *,
            properties (
              id,
              title,
              location,
              price,
              images
            )
          `)
          .eq('user_id', user.id);
          
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        console.log('Applications data from DB:', data);
        
        // Format the data for display
        const formattedApplications = data.map(item => {
          // Get the first image from the images array if it exists
          const firstImage = item.properties?.images && item.properties.images.length > 0 
            ? item.properties.images[0] 
            : null;
            
          return {
            id: item.id,
            property_id: item.property_id,
            user_id: item.user_id,
            owner_id: item.owner_id,
            employment_status: item.employment_status,
            income: item.income,
            credit_score: item.credit_score,
            message: item.message,
            status: item.status,
            created_at: item.created_at,
            updated_at: item.updated_at,
            property_title: item.properties?.title || 'Property',
            property_location: item.properties?.location || '',
            property_price: item.properties?.price || 0,
            property_image: firstImage || ''
          };
        });
        
        console.log('Formatted applications:', formattedApplications);
        setApplications(formattedApplications);
      } catch (error) {
        console.error('Error fetching applications:', error);
        setApplications([]);
      } finally {
        setLoadingApplications(false);
      }
    };
    
    fetchApplications();
  }, [user]);
  
  // Fetch viewing requests
  useEffect(() => {
    const fetchViewingRequests = async () => {
      if (!user) return;
      
      try {
        setLoadingViewingRequests(true);
        
        console.log('Fetching viewing requests for user:', user.id);
        
        // Get viewing requests from Supabase
        const { data, error } = await supabase
          .from('viewing_requests')
          .select(`
            *,
            properties (
              id,
              title,
              location,
              price,
              images
            )
          `)
          .eq('user_id', user.id);
          
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        console.log('Viewing requests data from DB:', data);
        
        // Format the data for display
        const formattedRequests = data.map(item => {
          // Get the first image from the images array if it exists
          const firstImage = item.properties?.images && item.properties.images.length > 0 
            ? item.properties.images[0] 
            : null;
            
          return {
            id: item.id,
            property_id: item.property_id,
            user_id: item.user_id,
            owner_id: item.owner_id,
            proposed_date: item.proposed_date,
            message: item.message,
            status: item.status,
            user_phone: item.user_phone,
            created_at: item.created_at,
            updated_at: item.updated_at,
            property_title: item.properties?.title || 'Property',
            property_location: item.properties?.location || '',
            property_price: item.properties?.price || 0,
            property_image: firstImage || ''
          };
        });
        
        console.log('Formatted viewing requests:', formattedRequests);
        setViewingRequests(formattedRequests);
      } catch (error) {
        console.error('Error fetching viewing requests:', error);
        setViewingRequests([]);
      } finally {
        setLoadingViewingRequests(false);
      }
    };
    
    fetchViewingRequests();
  }, [user]);
  
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
              <UserProfile user={user} profile={profile} />
              <DashboardSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
            
            {/* Main Content */}
            <div className="lg:col-span-3">             
              {activeTab === 'viewingRequests' && (
                <div>
                  {loadingViewingRequests ? (
                    <div className="flex justify-center my-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
                    </div>
                  ) : (
                    <ViewingRequestsTab 
                      viewingRequests={viewingRequests} 
                      setViewingRequests={setViewingRequests}
                      isOwner={false}
                    />
                  )}
                </div>
              )}
              
              {activeTab === 'applications' && (
                <div>
                  {loadingApplications ? (
                    <div className="flex justify-center my-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
                    </div>
                  ) : (
                    <PropertyApplications 
                      applications={applications} 
                      setApplications={setApplications}
                      loading={false}
                    />
                  )}
                </div>
              )}
              
              {activeTab === 'favorites' && (
                <SavedProperties 
                  favorites={favorites} 
                  loadingFavorites={loadingFavorites} 
                  onRemoveFavorite={removeFavorite} 
                />
              )}
              
              {activeTab === 'settings' && (
                <AccountSettings user={user} />
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}