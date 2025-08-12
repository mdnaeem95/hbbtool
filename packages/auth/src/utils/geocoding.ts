// OneMap API for Singapore postal code geocoding
const ONEMAP_SEARCH_URL = 'https://www.onemap.gov.sg/api/common/elastic/search'

export interface GeocodeResult {
  latitude: number
  longitude: number
  address: string
  postalCode: string
}

/**
 * Convert Singapore postal code to coordinates using OneMap API
 * @param postalCode - 6-digit Singapore postal code
 * @returns Geocoding result with coordinates
 */
export async function geocodePostalCode(postalCode: string): Promise<GeocodeResult | null> {
  try {
    // Validate postal code format
    if (!/^\d{6}$/.test(postalCode)) {
      throw new Error('Invalid postal code format. Must be 6 digits.')
    }

    const response = await fetch(
      `${ONEMAP_SEARCH_URL}?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=Y`
    )

    if (!response.ok) {
      throw new Error('Failed to geocode postal code')
    }

    const data = await response.json()

    if (data.found === 0 || !data.results?.[0]) {
      return null
    }

    const result = data.results[0]

    return {
      latitude: parseFloat(result.LATITUDE),
      longitude: parseFloat(result.LONGITUDE),
      address: result.ADDRESS,
      postalCode: postalCode
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Calculate distance between two coordinates in kilometers
 * Using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return Math.round(distance * 10) / 10 // Round to 1 decimal place
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Check if a coordinate is within Singapore bounds
 */
export function isWithinSingapore(lat: number, lng: number): boolean {
  return (
    lat >= 1.1496 && lat <= 1.4784 &&
    lng >= 103.6055 && lng <= 104.0945
  )
}

/**
 * Get nearby postal codes based on distance
 * This would typically query a database of postal codes
 */
export function getNearbyPostalCodes(
  centerPostalCode: string,
  radiusKm: number
): string[] {
  // This is a placeholder - in production, you'd query a database
  // of postal codes with their coordinates
  console.warn('getNearbyPostalCodes is not yet implemented')
  return []
}