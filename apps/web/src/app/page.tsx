'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { MerchantMap } from '../components/map/merchant-map'
import { MapSearchHeader, FilterState } from '../components/map/map-search-header'
import { MerchantListSidebar } from '../components/map/merchant-list-sidebar'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, Button } from '@kitchencloud/ui'
import { Store, ArrowRight } from 'lucide-react'
import { api } from '../lib/trpc/client'
import { LngLatBounds } from 'react-map-gl/mapbox'

export default function HomePage() {
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({})
  const [mapBounds, setMapBounds] = useState<LngLatBounds | null>(null)

  // Calculate search radius from map bounds
  const calculateRadiusFromBounds = (bounds: LngLatBounds | null) => {
    if (!bounds) return 10 // default 10km for initial load
    
    // Calculate distance between bounds corners to get diagonal
    const north = bounds.getNorth()
    const south = bounds.getSouth()
    const east = bounds.getEast()
    const west = bounds.getWest()
    
    // Simple approximation: use the larger of width or height
    // Convert degrees to km (rough approximation at Singapore's latitude)
    const latDiff = Math.abs(north - south) * 111 // 1 degree latitude ≈ 111km
    const lngDiff = Math.abs(east - west) * 111 * Math.cos((north + south) / 2 * Math.PI / 180)
    
    // Use diagonal distance and add some buffer
    const diagonal = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff)
    return Math.min(Math.max(diagonal * 0.75, 2), 20) // Between 2-20km
  }

  // Fetch merchants with filters
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
      radius: calculateRadiusFromBounds(mapBounds)
    }
  }, {
    refetchInterval: 30000 // Refresh every 30 seconds for open/closed status
  })

  const merchants = data?.merchants || []

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setSelectedMerchantId(null)
  }, [])

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    setSelectedMerchantId(null)
  }, [])

  // Handle bounds change
  const handleBoundsChange = useCallback((bounds: LngLatBounds) => {
    setMapBounds(bounds)
  }, [])

  // Handle merchant selection
  const handleMerchantSelect = useCallback((merchantId: string | null) => {
    setSelectedMerchantId(merchantId)
  }, [])

  return (
    <div className="h-screen flex flex-col">
      {/* Merchant Registration Banner */}
      <div className="bg-primary/10 border-b border-primary/20">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Store className="h-4 w-4" />
              <span className="font-medium">Are you a home-based food business?</span>
              <span className="hidden sm:inline text-muted-foreground">
                Join KitchenCloud and start accepting orders online!
              </span>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/auth">
                Register Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Search Header */}
      <MapSearchHeader
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        totalResults={merchants.length}
        isLoading={isLoading}
      />

      {/* Main Content */}
      <div className="flex-1 relative">
        <ResizablePanelGroup direction="horizontal">
          {/* Sidebar */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
            <MerchantListSidebar
              merchants={merchants}
              selectedMerchantId={selectedMerchantId}
              onMerchantSelect={handleMerchantSelect}
              isLoading={isLoading}
            />
          </ResizablePanel>

          <ResizableHandle />

          {/* Map */}
          <ResizablePanel defaultSize={70}>
            <MerchantMap
              merchants={merchants}
              onBoundsChange={handleBoundsChange}
              selectedMerchantId={selectedMerchantId}
              onMerchantSelect={handleMerchantSelect}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}