// AdminPropertiesTab with proper image loading and error handling
"use client";
import { useState, useEffect } from 'react';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Simple image component with fallback
function PropertyImage({ property, className = "h-12 w-12 rounded-lg object-cover" }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      setImageError(false);

      // Check if property has images
      if (!property?.images || !Array.isArray(property.images) || property.images.length === 0) {
        setIsLoading(false);
        setImageError(true);
        return;
      }

      const firstImage = property.images[0];
      
      // If it's already a full URL (http/https), use it directly
      if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
        setImageUrl(firstImage);
        setIsLoading(false);
        return;
      }

      // If it's a Supabase storage path, try to get signed URL
      if (property.owner_id && firstImage) {
        try {
          // Normalize the path - ensure it includes the owner_id folder
          const imagePath = firstImage.includes('/') ? firstImage : `${property.owner_id}/${firstImage}`;
          
          console.log(`Loading image for property ${property.id}: ${imagePath}`);
          
          // Try signed URL first
          const { data: signedData, error: signedError } = await supabase.storage
            .from('property-images')
            .createSignedUrl(imagePath, 3600);

          if (!signedError && signedData?.signedUrl) {
            setImageUrl(signedData.signedUrl);
            setIsLoading(false);
            return;
          }

          // Fallback to public URL
          const { data: publicData } = supabase.storage
            .from('property-images')
            .getPublicUrl(imagePath);

          if (publicData?.publicUrl) {
            setImageUrl(publicData.publicUrl);
            setIsLoading(false);
            return;
          }

          throw new Error('No valid image URL found');
        } catch (error) {
          console.error(`Failed to load image for property ${property.id}:`, error);
          setImageError(true);
          setIsLoading(false);
        }
      } else {
        setImageError(true);
        setIsLoading(false);
      }
    };

    loadImage();
  }, [property]);

  if (isLoading) {
    return (
      <div className={`${className} bg-gray-200 flex items-center justify-center animate-pulse`}>
        <svg className="h-4 w-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (imageError || !imageUrl) {
    return (
      <div className={`${className} bg-gray-200 flex items-center justify-center`}>
        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={property.title || 'Property image'}
      className={className}
      onError={() => setImageError(true)}
      onLoad={() => setIsLoading(false)}
    />
  );
}

export default function AdminPropertiesTab({ onRefresh }) {
  const { user } = useAuth();
  const { fetchData, updateData, invalidateCache } = useGlobalData();
  const [properties, setProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setIsLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      console.log('=== FETCHING PROPERTIES ===');
      
      // Try to get cached properties first
      let cachedProperties = null;
      try {
        cachedProperties = await fetchData(
          { _cached_key: 'admin_all_properties' },
          { useCache: true }
        );
        
        if (cachedProperties && Array.isArray(cachedProperties) && cachedProperties.length > 0) {
          console.log(`✅ Using cached properties: ${cachedProperties.length} properties`);
          setProperties(cachedProperties);
          setIsLoading(false);
          return;
        }
      } catch (cacheError) {
        console.log('🔍 No cache found, proceeding with fresh fetch');
      }

      // Fetch properties with owner information
      const propertiesData = await fetchData({
        table: 'properties',
        select: `
          *,
          profiles!properties_owner_id_fkey (
            id,
            full_name,
            email
          )
        `,
        filters: {},
        orderBy: { column: 'created_at', ascending: false }
      }, {
        useCache: true,
        ttl: 5 * 60 * 1000,
        onError: (error) => {
          console.error('Properties query failed:', error);
          setError(`Failed to fetch properties: ${error.message}`);
        }
      });

      console.log('Properties data received:', propertiesData);
      
      if (!propertiesData || !Array.isArray(propertiesData)) {
        // Try simple query without joins as fallback
        console.log('Trying simple query without joins...');
        const simplePropertiesData = await fetchData({
          table: 'properties',
          select: '*',
          filters: {},
          orderBy: { column: 'created_at', ascending: false }
        }, {
          useCache: false,
          onError: (error) => {
            console.error('Simple properties query failed:', error);
            setError(`Failed to fetch properties: ${error.message}`);
          }
        });

        if (simplePropertiesData && Array.isArray(simplePropertiesData)) {
          setProperties(simplePropertiesData);
          updateData('admin_all_properties', simplePropertiesData);
          setDebugInfo({
            message: `Loaded ${simplePropertiesData.length} properties (without owner details)`,
            hasOwnerData: false,
            propertiesCount: simplePropertiesData.length
          });
        } else {
          setError('No properties data received from database');
          setProperties([]);
        }
        return;
      }

      if (propertiesData.length === 0) {
        console.log('No properties found in database');
        setProperties([]);
        setError(null);
        setDebugInfo({
          message: 'Database is accessible but contains no properties',
          propertiesCount: 0,
          hasOwnerData: false
        });
        return;
      }

      console.log(`✅ Successfully loaded ${propertiesData.length} properties`);
      
      setProperties(propertiesData);
      setError(null);
      setDebugInfo({
        message: `Successfully loaded ${propertiesData.length} properties`,
        propertiesCount: propertiesData.length,
        hasOwnerData: propertiesData.some(p => p.profiles),
        sampleProperty: propertiesData[0]
      });

      // Cache the successful result
      updateData('admin_all_properties', propertiesData);

    } catch (error) {
      console.error('💥 Error in fetchProperties:', error);
      setError(`Failed to fetch properties: ${error.message}`);
      setProperties([]);
      setDebugInfo({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test function to check database access and create sample data
  const testDatabaseAndCreateSample = async () => {
    console.log('=== TESTING DATABASE ACCESS ===');
    
    try {
      // Test 1: Check if properties table exists and is accessible
      const { data: testData, error: testError } = await supabase
        .from('properties')
        .select('*')
        .limit(1);
      
      console.log('Properties table test:', { testData, testError });
      
      if (testError) {
        alert(`Database access failed: ${testError.message}`);
        return;
      }

      if (testData && testData.length > 0) {
        alert(`✅ Database access works! Found ${testData.length} existing properties.`);
        
        // Log first property structure for debugging
        console.log('Sample property structure:', testData[0]);
        console.log('Images data:', testData[0]?.images);
        
        return;
      }

      // Test 3: If no properties exist, offer to create sample data
      const createSample = window.confirm(
        'No properties found in database. Would you like to create some sample properties for testing?'
      );

      if (!createSample) return;

      // Get current user to use as owner
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser?.user?.id) {
        alert('No authenticated user found to create sample properties');
        return;
      }

      // Create sample properties with proper image arrays
      const sampleProperties = [
        {
          title: 'Modern 2BR Apartment',
          description: 'Beautiful modern apartment in the city center with stunning views',
          location: 'Auckland CBD',
          price: 650,
          rent_type: 'per week',
          bedrooms: 2,
          bathrooms: 1,
          property_type: 'apartment',
          status: 'available',
          owner_id: currentUser.user.id,
          features: ['parking', 'balcony', 'gym', 'dishwasher'],
          images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop']
        },
        {
          title: 'Family House with Garden',
          description: 'Spacious family house with large garden and modern amenities',
          location: 'Ponsonby',
          price: 850,
          rent_type: 'per week',
          bedrooms: 3,
          bathrooms: 2,
          property_type: 'house',
          status: 'available',
          owner_id: currentUser.user.id,
          features: ['garden', 'garage', 'dishwasher', 'heating'],
          images: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=300&fit=crop']
        },
        {
          title: 'Studio Near University',
          description: 'Cozy studio apartment perfect for students, fully furnished',
          location: 'Mt Eden',
          price: 400,
          rent_type: 'per week',
          bedrooms: 1,
          bathrooms: 1,
          property_type: 'studio',
          status: 'rented',
          owner_id: currentUser.user.id,
          features: ['furnished', 'internet', 'heating'],
          images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop']
        },
        {
          title: 'Luxury Penthouse',
          description: 'Stunning penthouse with panoramic city views',
          location: 'Viaduct Harbour',
          price: 1200,
          rent_type: 'per week',
          bedrooms: 2,
          bathrooms: 2,
          property_type: 'apartment',
          status: 'available',
          owner_id: currentUser.user.id,
          features: ['parking', 'balcony', 'gym', 'concierge', 'pool'],
          images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop']
        }
      ];

      const { data: insertedProperties, error: insertError } = await supabase
        .from('properties')
        .insert(sampleProperties)
        .select();

      if (insertError) {
        alert(`Failed to create sample properties: ${insertError.message}`);
        console.error('Insert error:', insertError);
        return;
      }

      alert(`✅ Successfully created ${insertedProperties.length} sample properties with images!`);
      
      // Refresh the properties list
      await fetchProperties();

    } catch (error) {
      console.error('Database test failed:', error);
      alert(`Database test failed: ${error.message}`);
    }
  };

  // Clear cache and refresh
  const handleRefresh = async () => {
    invalidateCache('admin_all_properties');
    invalidateCache('properties');
    
    if (onRefresh && typeof onRefresh === 'function') {
      onRefresh();
    }
    
    await fetchProperties();
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available': return 'bg-green-100 text-green-800 border border-green-200';
      case 'rented': return 'bg-orange-100 text-orange-800 border border-red-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'Price not set';
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Filter and sort properties
  const filteredAndSortedProperties = properties
    .filter(property => {
      const matchesSearch = 
        property.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || property.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_low':
          return (a.price || 0) - (b.price || 0);
        case 'price_high':
          return (b.price || 0) - (a.price || 0);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'location':
          return (a.location || '').localeCompare(b.location || '');
        case 'created_at':
        default:
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });

  const propertyStats = {
    total: properties.length,
    available: properties.filter(p => p.status === 'available').length,
    rented: properties.filter(p => p.status === 'rented').length,
    maintenance: properties.filter(p => p.status === 'maintenance').length,
    pending: properties.filter(p => p.status === 'pending').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Properties</h1>
          <p className="text-gray-600">Overview of all properties in the system</p>
        </div>
        
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-orange-50 border border-red-200 text-orange-700 px-4 py-3 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">Error</h3>
              <div className="mt-2 text-sm text-orange-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {debugInfo && (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-800">Debug Info</h3>
              <div className="mt-2 text-sm text-gray-700">
                <p>{debugInfo.message}</p>
                {debugInfo.sampleProperty && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">Sample Property Data</summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(debugInfo.sampleProperty, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{propertyStats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Available</p>
              <p className="text-2xl font-bold text-gray-900">{propertyStats.available}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Rented</p>
              <p className="text-2xl font-bold text-gray-900">{propertyStats.rented}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Maintenance</p>
              <p className="text-2xl font-bold text-gray-900">{propertyStats.maintenance}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{propertyStats.pending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Properties</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by title, location, or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="maintenance">Maintenance</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="created_at">Latest Added</option>
              <option value="title">Title A-Z</option>
              <option value="location">Location A-Z</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Properties ({filteredAndSortedProperties.length})</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading properties...</p>
          </div>
        ) : filteredAndSortedProperties.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {properties.length === 0 
                ? 'No properties have been added yet. Click "Test DB & Create Sample" to add some sample properties.' 
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {properties.length === 0 && (
              <button
                onClick={testDatabaseAndCreateSample}
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Create Sample Properties
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedProperties.map((property) => (
                  <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <PropertyImage property={property} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {property.title || 'Untitled Property'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {property.location || 'Location not specified'}
                          </div>
                          {/* Show image info for debugging */}
                          {property.images && property.images.length > 0 && (
                            <div className="text-xs text-gray-600 mt-1">
                              {property.images.length} image{property.images.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {property.profiles?.full_name || 'Unknown Owner'}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {property.owner_id?.slice(0, 8)}...
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(property.price)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {property.rent_type || 'per week'}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(property.status)}`}>
                        {property.status || 'available'}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        <div>{property.bedrooms || 0} bed • {property.bathrooms || 0} bath</div>
                        <div>{property.property_type || 'Unknown type'}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {property.created_at ? new Date(property.created_at).toLocaleDateString() : 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}