// 'use client';

// import { useState, useEffect } from 'react';
// import Link from 'next/link';
// import Image from 'next/image';
// import { useUser } from '../../contexts/UserContext';
// import ProtectedRoute from '../../components/ProtectedRoute';
// import { supabase } from '@/lib/superbase';
// import { Trash2 } from 'lucide-react';

// export default function FavoritesPage() {
//   const { user } = useUser();
//   const [favorites, setFavorites] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Fetch user's favorite properties
//   useEffect(() => {
//     const fetchFavorites = async () => {
//       if (!user) return;
      
//       try {
//         setLoading(true);
        
//         // First get the favorite IDs
//         const { data: favoriteData, error: favoriteError } = await supabase
//           .from('favorites')
//           .select('property_id')
//           .eq('user_id', user.id);
          
//         if (favoriteError) throw favoriteError;
        
//         if (favoriteData.length === 0) {
//           setFavorites([]);
//           return;
//         }
        
//         // Get the property details for each favorite
//         const propertyIds = favoriteData.map(f => f.property_id);
        
//         const { data: propertyData, error: propertyError } = await supabase
//           .from('properties')
//           .select('*')
//           .in('id', propertyIds);
          
//         if (propertyError) throw propertyError;
        
//         setFavorites(propertyData);
//       } catch (error) {
//         console.error('Error fetching favorites:', error);
//         setError('Failed to load your saved properties');
//       } finally {
//         setLoading(false);
//       }
//     };
    
//     fetchFavorites();
//   }, [user]);

//   // Remove a property from favorites
//   const removeFavorite = async (propertyId) => {
//     try {
//       const { error } = await supabase
//         .from('favorites')
//         .delete()
//         .eq('user_id', user.id)
//         .eq('property_id', propertyId);
        
//       if (error) throw error;
      
//       // Update local state
//       setFavorites(favorites.filter(property => property.id !== propertyId));
//     } catch (error) {
//       console.error('Error removing favorite:', error);
//       setError('Failed to remove property from favorites');
//     }
//   };

//   return (
//     <ProtectedRoute>
//       <div className="container mx-auto py-8 px-4 md:px-0 mt-12">
//         <h1 className="text-3xl font-bold mb-6">Saved Properties</h1>
        
//         {error && (
//           <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
//             {error}
//           </div>
//         )}
        
//         {loading ? (
//           <div className="flex justify-center my-12">
//             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-red"></div>
//           </div>
//         ) : favorites.length === 0 ? (
//           <div className="text-center py-12">
//             <p className="text-gray-600 mb-4">You haven't saved any properties yet.</p>
//             <Link href="/search" className="bg-custom-red text-white px-6 py-2 rounded-full hover:bg-opacity-90 transition-colors">
//               Browse Properties
//             </Link>
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {favorites.map(property => (
//               <div key={property.id} className="bg-white rounded-lg shadow-md overflow-hidden">
//                 <div className="relative h-48">
//                   <Image
//                     src={property.main_image_url || '/images/property-placeholder.jpg'}
//                     alt={property.title}
//                     fill
//                     className="object-cover"
//                   />
//                 </div>
                
//                 <div className="p-4">
//                   <div className="flex justify-between items-start">
//                     <h3 className="text-lg font-bold mb-2 text-gray-800">
//                       {property.title}
//                     </h3>
//                     <button 
//                       onClick={() => removeFavorite(property.id)}
//                       className="text-gray-500 hover:text-red-500"
//                       aria-label="Remove from favorites"
//                     >
//                       <Trash2 size={18} />
//                     </button>
//                   </div>
                  
//                   <p className="text-custom-red font-bold mb-2">
//                     ${property.price}
//                     {property.price_period ? `/${property.price_period}` : ''}
//                   </p>
                  
//                   <div className="flex items-center text-gray-500 text-sm mb-3">
//                     <span className="mr-3">{property.bedrooms} Beds</span>
//                     <span className="mr-3">{property.bathrooms} Baths</span>
//                     <span>{property.square_footage} sq ft</span>
//                   </div>
                  
//                   <p className="text-gray-600 text-sm mb-4 line-clamp-2">
//                     {property.location}
//                   </p>
                  
//                   <Link 
//                     href={`/properties/${property.id}`}
//                     className="block text-center bg-custom-red text-white px-4 py-2 rounded-full hover:bg-opacity-90 transition-colors"
//                   >
//                     View Details
//                   </Link>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </ProtectedRoute>
//   );
// }