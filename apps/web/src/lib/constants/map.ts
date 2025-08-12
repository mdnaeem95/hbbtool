// Singapore's geographical bounds
export const SINGAPORE_BOUNDS = {
  north: 1.4784,
  south: 1.1496,
  east: 104.0945,
  west: 103.6055
} as const

// Default center of Singapore
export const SINGAPORE_CENTER = {
  lat: 1.3521,
  lng: 103.8198
} as const

// Map zoom levels
export const MAP_ZOOM = {
  DEFAULT: 11.5,
  DETAIL: 14,
  MIN: 10,
  MAX: 17
} as const

// Regions in Singapore for filtering
export const SINGAPORE_REGIONS = [
  { value: 'central', label: 'Central', bounds: { north: 1.3321, south: 1.2671, east: 103.8998, west: 103.7998 } },
  { value: 'east', label: 'East', bounds: { north: 1.3531, south: 1.3131, east: 103.9898, west: 103.8898 } },
  { value: 'north', label: 'North', bounds: { north: 1.4321, south: 1.3521, east: 103.8498, west: 103.7498 } },
  { value: 'northeast', label: 'North-East', bounds: { north: 1.4181, south: 1.3381, east: 103.9198, west: 103.8198 } },
  { value: 'west', label: 'West', bounds: { north: 1.3821, south: 1.3021, east: 103.7498, west: 103.6498 } },
] as const