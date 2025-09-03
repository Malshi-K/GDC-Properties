// app/api/properties/route.js - HYBRID VERSION
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Simple geocoding function
async function geocodeAddress(address) {
  if (!address || address.trim() === '') return null
  
  try {
    const cleanAddress = address.replace(/,/g, ', ').trim()
    const searchQuery = `${cleanAddress}, New Zealand`
    const encodedQuery = encodeURIComponent(searchQuery)
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&countrycodes=nz`,
      {
        headers: { 'User-Agent': 'GDC-Properties/1.0' }
      }
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      }
    }
  } catch (error) {
    console.error('Geocoding failed:', error)
  }
  
  return null
}

// Fallback coordinates for major cities
function getCityFallback(address) {
  const upper = address.toUpperCase()
  if (upper.includes('AUCKLAND')) return { lat: -36.8485, lng: 174.7633 }
  if (upper.includes('WELLINGTON')) return { lat: -41.2865, lng: 174.7762 }
  if (upper.includes('HAMILTON')) return { lat: -37.7870, lng: 175.2793 }
  if (upper.includes('CHRISTCHURCH')) return { lat: -43.5321, lng: 172.6362 }
  return null
}

// Store coordinates back to database
async function storeCoordinates(propertyId, coordinates) {
  try {
    const { error } = await supabase
      .from('properties')
      .update({
        latitude: coordinates.lat,
        longitude: coordinates.lng
      })
      .eq('id', propertyId)
      
    if (error) {
      console.error('Failed to store coordinates:', error)
    } else {
      console.log(`Stored coordinates for property ${propertyId}`)
    }
  } catch (error) {
    console.error('Database update error:', error)
  }
}

export async function GET(request) {
  try {
    console.log('Fetching properties...')
    
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        total: 0
      })
    }

    console.log(`Found ${properties.length} properties`)
    const processedProperties = []
    
    for (const property of properties) {
      let coordinates = null
      
      // Check if coordinates already exist in database
      if (property.latitude && property.longitude) {
        coordinates = {
          lat: parseFloat(property.latitude),
          lng: parseFloat(property.longitude)
        }
        console.log(`Using stored coordinates for: ${property.title}`)
      } 
      // Auto-geocode if coordinates missing
      else if (property.address) {
        console.log(`Auto-geocoding: ${property.address}`)
        
        // Try live geocoding
        coordinates = await geocodeAddress(property.address)
        
        // Fall back to city coordinates if needed
        if (!coordinates) {
          coordinates = getCityFallback(property.address)
          console.log('Using city fallback coordinates')
        }
        
        // Store the coordinates for future use
        if (coordinates) {
          await storeCoordinates(property.id, coordinates)
        }
        
        // Small delay to respect API limits
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      if (coordinates) {
        processedProperties.push({
          id: property.id,
          title: property.title || 'Property',
          location: property.address || property.location || 'Address not specified',
          address: property.address,
          price: property.price ? parseFloat(property.price) : 0,
          bedrooms: property.bedrooms ? parseInt(property.bedrooms) : null,
          bathrooms: property.bathrooms ? parseFloat(property.bathrooms) : null,
          square_footage: property.square_footage ? parseInt(property.square_footage) : null,
          property_type: property.property_type,
          status: property.status || 'available',
          coordinates: coordinates,
          created_at: property.created_at,
          description: property.description,
          nearby_amenities: property.nearby_amenities,
          year_built: property.year_built,
          security_deposit: property.security_deposit
        })
      }
    }

    console.log(`Processed ${processedProperties.length}/${properties.length} properties with coordinates`)

    return NextResponse.json({
      success: true,
      data: processedProperties,
      count: processedProperties.length,
      total: properties.length
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch properties',
        message: error.message,
        data: []
      },
      { status: 500 }
    )
  }
}