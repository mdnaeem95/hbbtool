'use client'

import { useState, useCallback } from 'react'
import { MerchantMap } from '@/components/map/merchant-map'
import { MapSearchHeader, FilterState } from '@/components/map/map-search-header'
import { MerchantListSidebar } from '@/components/map/merchant-list-sidebar'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@kitchencloud/ui'
import { api } from '@/lib/trpc/client'
import type { LngLatBounds } from 'react-map-gl/mapbox'

export default function HomePage() {
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({})
  const [mapBounds, setMapBounds] = useState<LngLatBounds | null>(null)

  // Fetch merchants with filters
  const { data, isLoading } = api.merchant.searchNearby.useQuery({
    query: searchQuery,
    filters: {
      ...filters,
      bounds: mapBounds ? {
        north: mapBounds.getNorth(),
        south: mapBounds.getSouth(),
        east: mapBounds.getEast(),
        west: mapBounds.getWest()
      } : undefined
    }
  }, {
    keepPreviousData: true,
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
      {/* Search Header */}
      <MapSearchHeader
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        totalResults={merchants.length}
        isLoading={isLoading}
      />

      {/* Map and List */}
      <div className="flex-1 relative">
        <ResizablePanelGroup direction="horizontal">
          {/* Merchant List Sidebar */}
          <ResizablePanel
            defaultSize={30}
            minSize={20}
            maxSize={40}
            className="hidden md:block"
          >
            <div className="h-full overflow-y-auto">
              <MerchantListSidebar
                merchants={merchants}
                selectedMerchantId={selectedMerchantId}
                onMerchantSelect={handleMerchantSelect}
                isLoading={isLoading}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle className="hidden md:block" />

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

        {/* Mobile Merchant List - Bottom Sheet */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 bg-background max-h-[40vh] overflow-y-auto rounded-t-xl shadow-lg border-t">
          <MerchantListSidebar
            merchants={merchants}
            selectedMerchantId={selectedMerchantId}
            onMerchantSelect={handleMerchantSelect}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}