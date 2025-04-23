// components/dashboard/SavedProperties.js
import Link from 'next/link';
import PropertyCard from '@/components/dashboards/user/ui/PropertyCard';

/**
 * Saved properties component for user dashboard
 */
const SavedProperties = ({ favorites, loadingFavorites, onRemoveFavorite }) => {
  return (
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
            <PropertyCard 
              key={property.id} 
              property={property} 
              onRemove={onRemoveFavorite}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default SavedProperties;