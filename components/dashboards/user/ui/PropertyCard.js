// components/ui/PropertyCard.js
import Link from 'next/link';
import { formatPrice } from '@/lib/utils/formatters';

/**
 * Reusable property card component for displaying property information
 */
const PropertyCard = ({ property, onRemove = null }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
          {onRemove && (
            <button 
              onClick={() => onRemove(property.id)}
              className="text-gray-500 hover:text-orange-500"
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
          )}
        </div>
        
        <p className="text-custom-orange font-bold mb-2">
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
          className="block text-center bg-custom-orange text-white px-4 py-2 rounded-full hover:bg-opacity-90 transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

export default PropertyCard;