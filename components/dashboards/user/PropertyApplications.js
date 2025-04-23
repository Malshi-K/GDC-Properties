// components/dashboards/user/PropertyApplications.js
import { useState } from 'react';
import Link from 'next/link';
import { formatPrice, formatDate } from '@/utils/formatters';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

/**
 * Property applications component for user dashboard
 */
const PropertyApplications = ({ applications = [], setApplications, loading = false }) => {
  const [withdrawingId, setWithdrawingId] = useState(null);

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

  // Handle application withdrawal
  const handleWithdraw = async (applicationId) => {
    try {
      setWithdrawingId(applicationId);
      
      const { error } = await supabase
        .from('rental_applications')
        .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
        .eq('id', applicationId);
        
      if (error) throw error;
      
      // Update the local state
      setApplications(
        applications.map(application => 
          application.id === applicationId 
            ? { ...application, status: 'withdrawn' } 
            : application
        )
      );
      
      toast.success('Application withdrawn successfully');
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast.error('Failed to withdraw application');
    } finally {
      setWithdrawingId(null);
    }
  };

  // Handle editing an application
  const handleEditApplication = (applicationId) => {
    // This would navigate to an edit page or open a modal
    // For now we'll just show a toast
    toast.info('Feature coming soon: Edit Application');
  };
  
  if (loading) {
    return (
      <div className="flex justify-center my-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Property Applications</h2>
      
      {!applications || applications.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">You haven't applied for any properties yet.</p>
          <Link href="/search" className="inline-block mt-4 text-custom-red hover:text-red-700">
            Browse Properties
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {applications.map(application => (
            <div key={application.id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="md:flex">
                <div className="md:flex-shrink-0 h-48 md:h-auto md:w-48 bg-gray-300 relative">
                  {application.property_image ? (
                    <img 
                      src={application.property_image} 
                      alt={application.property_title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                      <span>Property Image</span>
                    </div>
                  )}
                </div>
                
                <div className="p-6 w-full">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        <Link href={`/properties/${application.property_id}`} className="hover:text-custom-red">
                          {application.property_title}
                        </Link>
                      </h3>
                      <p className="text-gray-600 mb-2">{application.property_location}</p>
                      <p className="text-custom-red font-bold mb-4">{formatPrice(application.property_price)}</p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                      {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
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
                    <div className="mt-2">
                      <p className="text-gray-600 text-sm font-medium">Your Message</p>
                      <p className="text-gray-700 mt-1">{application.message}</p>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-200 mt-4 pt-4">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Applied On</p>
                      <p>{formatDate(application.created_at)}</p>
                    </div>
                    
                    <div className="flex justify-end space-x-3 mt-4">
                      {application.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleEditApplication(application.id)}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Edit Application
                          </button>
                          <button 
                            onClick={() => handleWithdraw(application.id)}
                            disabled={withdrawingId === application.id}
                            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                          >
                            {withdrawingId === application.id ? 'Withdrawing...' : 'Withdraw'}
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
  );
};

export default PropertyApplications;