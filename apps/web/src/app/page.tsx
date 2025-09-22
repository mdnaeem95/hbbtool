'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { MerchantMap } from '../components/map/merchant-map'
import { MobileSearchHeader } from '../components/map/mobile-search-header'
import { MobileBottomSheet } from '../components/map/mobile-bottom-sheet'
import { DesktopLayout } from '../components/map/desktop-layout'
import { Button } from '@homejiak/ui'
import { Store, MapPin } from 'lucide-react'
import { api } from '../lib/trpc/client'
import { LngLatBounds } from 'react-map-gl/mapbox'
import { useMediaQuery } from '../hooks/use-media-query'
import { useUserLocation } from '../hooks/use-user-location'

export interface FilterState {
  cuisineType?: string[]
  dietaryOptions?: ('HALAL' | 'VEGETARIAN' | 'VEGAN')[]
  priceRange?: { min?: number; max?: number }
  deliveryOnly?: boolean
  pickupOnly?: boolean
}

export default function HomePage() {
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({})
  const [mapBounds, setMapBounds] = useState<LngLatBounds | null>(null)
  const [isListView, setIsListView] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [mapHeight, setMapHeight] = useState(() => {
  if (typeof window !== 'undefined') {
    return `${window.innerHeight}px`
  }
  return '100vh'
  })

  // Location hook
  const {
    latitude,
    longitude,
    loading: locationLoading,
    permission,
    getUserLocation,
    hasLocation,
  } = useUserLocation()

  // Fetch merchants with location-based sorting
  const { data, isLoading } = api.merchant.searchNearby.useQuery({
    query: searchQuery,
    filters: {
      cuisineType: filters.cuisineType,
      dietaryOptions: filters.dietaryOptions,
      priceRange: filters.priceRange,
      deliveryOnly: filters.deliveryOnly,
      pickupOnly: filters.pickupOnly,
      bounds: mapBounds ? {
        north: mapBounds.getNorth(),
        south: mapBounds.getSouth(),
        east: mapBounds.getEast(),
        west: mapBounds.getWest()
      } : undefined,
      // User location goes here inside filters
      userLocation: hasLocation ? {
        lat: latitude!,
        lng: longitude!
      } : !hasLocation && !mapBounds ? {
        // Default to central Singapore if no location permission
        lat: 1.3521,  // Central Singapore coordinates
        lng: 103.8198
      } : undefined,
      radius: 10, // You can adjust this or make it dynamic
    },
  }, {
    enabled: true,
    refetchOnWindowFocus: false,
  })

  // Handle location request
  const handleLocationRequest = useCallback(() => {
    getUserLocation()
  }, [getUserLocation])

  // Show location permission prompt on first load
  useEffect(() => {
    if (permission === 'prompt' && !locationLoading) {
      // Auto-request location after a short delay
      const timer = setTimeout(() => {
        getUserLocation()
      }, 1000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [permission, getUserLocation, locationLoading])

  // Extract merchants array with default
  const merchants = data?.merchants ?? []
  const totalResults = data?.total ?? 0

  // Adjust map height based on content
  useEffect(() => {
    if (isMobile) {
      const calculateHeight = () => {
        const header = document.querySelector('.mobile-header')
        const banner = document.querySelector('.merchant-banner')
        const windowHeight = window.innerHeight
        const headerHeight = header?.clientHeight || 0
        const bannerHeight = banner?.clientHeight || 0
        
        const availableHeight = windowHeight - headerHeight - bannerHeight
        setMapHeight(`${Math.max(availableHeight, 400)}px`)
      }

      calculateHeight()
      window.addEventListener('resize', calculateHeight)

      return () => window.removeEventListener('resize', calculateHeight)
    } else {
      setMapHeight('100vh')
      return undefined
    }
  }, [isMobile])

  const handleBoundsChange = useCallback((bounds: LngLatBounds) => {
    setMapBounds(bounds)
  }, [])

  // Mobile view
  if (isMobile) {
    return (
      <div className="relative min-h-screen bg-background">
        {/* Location Permission Banner */}
        {permission === 'denied' && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-3">
            <p className="text-xs text-yellow-800 text-center">
              Enable location to see merchants sorted by distance
            </p>
          </div>
        )}

        {/* Merchant Banner - Only show when no merchants */}
        {totalResults === 0 && !isLoading && (
          <div className="merchant-banner bg-gradient-to-r from-orange-50 to-purple-50 border-b">
            <div className="p-4 text-center">
              <Store className="h-6 w-6 mx-auto mb-2 text-orange-500" />
              <p className="text-sm font-medium text-gray-800">
                Are you a home-based food business?
              </p>
              <Button 
                asChild 
                size="sm" 
                className="mt-2 bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Link href="/merchant/signup">
                  Register Now →
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Search Header - Always visible */}
        <div className="mobile-header sticky top-0 z-30 bg-white">
          <MobileSearchHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filters={filters}
            setFilters={setFilters}
            totalResults={totalResults}
            isLoading={isLoading}
            onToggleView={() => setIsListView(!isListView)}
            isListView={isListView}
            onRequestLocation={handleLocationRequest}
            locationLoading={locationLoading}
            hasLocation={hasLocation}
          />
        </div>

        {/* Map Container - Hidden in list view */}
        {!isListView ? (
          <div 
            className="relative bg-gray-100" 
            style={{ height: mapHeight }}
          >
            <MerchantMap
              merchants={merchants}
              selectedMerchantId={selectedMerchantId}
              onMerchantSelect={setSelectedMerchantId}
              onBoundsChange={handleBoundsChange}
              showPopup={!isMobile}
              userLocation={hasLocation ? { lat: latitude!, lng: longitude! } : undefined}
            />
            
            {/* Map overlay for loading/empty states */}
            {totalResults === 0 && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6 m-4 max-w-sm pointer-events-auto">
                  <MapPin className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                  <h3 className="text-lg font-semibold text-center mb-2">
                    No merchants found
                  </h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Try adjusting your search or filters to find home-based food businesses near you
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Mobile Bottom Sheet */}
        <MobileBottomSheet
          merchants={merchants}
          selectedMerchantId={selectedMerchantId}
          onMerchantSelect={setSelectedMerchantId}
          isLoading={isLoading}
          isListView={isListView}
          isFullScreen={isListView} 
        />
      </div>
    )
  }

  // Desktop view (existing layout with improvements)
  return (
    <DesktopLayout
      merchants={merchants}
      selectedMerchantId={selectedMerchantId}
      onMerchantSelect={setSelectedMerchantId}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      filters={filters}
      setFilters={setFilters}
      isLoading={isLoading}
      onBoundsChange={handleBoundsChange}
    />
  )
}