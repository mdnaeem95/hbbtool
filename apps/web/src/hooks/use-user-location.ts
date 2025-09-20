import { useState, useEffect, useCallback } from 'react'

interface LocationState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  error: string | null
  loading: boolean
  permission: 'prompt' | 'granted' | 'denied' | null
}

export function useUserLocation(options = { enableHighAccuracy: true }) {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    permission: null,
  })

  // Check permission status
  const checkPermission = useCallback(async () => {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' })
        setLocation(prev => ({ ...prev, permission: permission.state }))
        
        permission.addEventListener('change', () => {
          setLocation(prev => ({ ...prev, permission: permission.state }))
        })
      } catch (error) {
        console.error('Permission check failed:', error)
      }
    }
  }, [])

  // Get user location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        loading: false,
      }))
      return
    }

    setLocation(prev => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
          permission: 'granted',
        })
      },
      (error) => {
        let errorMessage = 'Failed to get location'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied'
            setLocation(prev => ({ ...prev, permission: 'denied' }))
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
        }
        
        setLocation(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }))
      },
      {
        enableHighAccuracy: options.enableHighAccuracy,
        timeout: 10000,
        maximumAge: 30000, // Cache location for 30 seconds
      }
    )
  }, [options.enableHighAccuracy])

  // Watch position for real-time updates
  const watchPosition = useCallback(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
          permission: 'granted',
        }))
      },
      (error) => {
        console.error('Watch position error:', error)
      },
      {
        enableHighAccuracy: options.enableHighAccuracy,
        timeout: 10000,
        maximumAge: 5000,
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [options.enableHighAccuracy])

  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  return {
    ...location,
    getUserLocation,
    watchPosition,
    hasLocation: location.latitude !== null && location.longitude !== null,
  }
}