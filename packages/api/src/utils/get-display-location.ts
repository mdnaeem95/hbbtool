export function getDisplayLocation(args: {
  latitude: number | null
  longitude: number | null
  showExactLocation: boolean | null
}): { lat: number; lng: number } | null {
  const { latitude, longitude } = args
  if (latitude == null || longitude == null) return null
  // if you need to obfuscate, do it here
  return { lat: latitude, lng: longitude }
}