"use client"
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import propertiesData from '@/data/properties.json';

export default function PropertyDetail() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    // In a real app, you would fetch the property from an API using the ID
    const propertyId = parseInt(params.id);
    const foundProperty = propertiesData.properties.find(p => p.id === propertyId);
    
    if (foundProperty) {
      setProperty(foundProperty);
    }
    
    setLoading(false);
  }, [params.id]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading property details...</h2>
          <div className="w-12 h-12 border-4 border-gray-300 border-t-custom-red rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-100 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Property Not Found</h1>
          <p className="text-gray-600 mb-8">We couldn't find the property you're looking for.</p>
          <Link 
            href="/search" 
            className="inline-block bg-custom-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-300"
          >
            Back to Search Results
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-40 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link href="/" className="text-gray-700 hover:text-custom-red">
                  Home
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="mx-2 text-gray-400">/</span>
                  <Link href="/search" className="text-gray-700 hover:text-custom-red">
                    Search
                  </Link>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-500">{property.title}</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
        
        {/* Property Title and Price */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
          <p className="text-gray-600 mt-1">{property.address}</p>
          <div className="mt-4">
            <span className="text-3xl font-bold text-custom-red">{formatPrice(property.price)}</span>
          </div>
        </div>
        
        {/* Property Images */}
        <div className="bg-white rounded-lg overflow-hidden shadow-lg mb-8">
          <div className="bg-gray-300 h-96 relative">
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xl">
              <span>Property Images Would Appear Here</span>
            </div>
          </div>
        </div>
        
        {/* Property Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Main Content - Left Side (2/3) */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b">
                <button 
                  className={`px-4 py-3 text-sm font-medium ${activeTab === 'description' ? 'text-custom-red border-b-2 border-custom-red' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('description')}
                >
                  Description
                </button>
                <button 
                  className={`px-4 py-3 text-sm font-medium ${activeTab === 'features' ? 'text-custom-red border-b-2 border-custom-red' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('features')}
                >
                  Features
                </button>
                <button 
                  className={`px-4 py-3 text-sm font-medium ${activeTab === 'location' ? 'text-custom-red border-b-2 border-custom-red' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('location')}
                >
                  Location
                </button>
              </div>
              
              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'description' && (
                  <div className="space-y-4">
                    <p className="text-gray-700 whitespace-pre-line">{property.fullDescription}</p>
                  </div>
                )}
                
                {activeTab === 'features' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Property Features</h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                        {property.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-gray-700">
                            <svg className="h-5 w-5 text-custom-red mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Nearby Amenities</h3>
                      <ul className="space-y-2">
                        {property.nearbyAmenities.map((amenity, index) => (
                          <li key={index} className="flex items-center text-gray-700">
                            <svg className="h-5 w-5 text-custom-red mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            {amenity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {activeTab === 'location' && (
                  <div className="space-y-4">
                    <div className="bg-gray-200 h-80 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">Map would appear here</p>
                    </div>
                    <p className="text-gray-700">Located in {property.location === 'malibu' ? 'Malibu Beach' : property.location === 'beverly' ? 'Beverly Hills' : property.location === 'hollywood' ? 'Hollywood Hills' : 'Venice Beach'}, this property offers convenient access to local amenities, shopping, dining, and entertainment options.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Sidebar - Right Side (1/3) */}
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Property Details</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Property Type:</span>
                  <span className="text-gray-800 font-medium capitalize">{property.propertyType.slice(0, -1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bedrooms:</span>
                  <span className="text-gray-800 font-medium">{property.bedrooms}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bathrooms:</span>
                  <span className="text-gray-800 font-medium">{property.bathrooms}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Square Feet:</span>
                  <span className="text-gray-800 font-medium">{property.squareFeet.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Year Built:</span>
                  <span className="text-gray-800 font-medium">{property.yearBuilt}</span>
                </div>
                
                <div className="border-t border-gray-200 my-4 pt-4">
                  <button 
                    className="w-full bg-custom-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors duration-300 mb-3"
                  >
                    Book Viewing
                  </button>
                  <button 
                    className="w-full border border-custom-red text-custom-red hover:bg-red-50 font-bold py-3 px-4 rounded-md transition-colors duration-300"
                  >
                    Apply For Property
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Back to search button */}
        <div className="text-center mt-6 mb-8">
          <button 
            onClick={() => router.back()} 
            className="inline-flex items-center text-custom-red hover:text-red-700 font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to Search Results
          </button>
        </div>
      </div>
    </div>
  );
}