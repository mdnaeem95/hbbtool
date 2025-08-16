'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { MerchantMap } from '@/components/map/merchant-map'
import { MapSearchHeader, FilterState } from '@/components/map/map-search-header'
import { MerchantListSidebar } from '@/components/map/merchant-list-sidebar'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, Button } from '@kitchencloud/ui'
import { Store, ArrowRight } from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { LngLatBounds } from 'react-map-gl/mapbox'

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
            <div className="flex items-center gap-3 text-sm">
              <Store className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="font-medium text-primary">Are you a home-based food business?</span>
            </div>
            <Link href="/auth">
              <Button size="sm" variant="default" className="gap-2">
                Start Selling Today
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
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

      {/* Optional: Floating Merchant CTA for Mobile */}
      <Link href="/auth" className="md:hidden fixed bottom-4 right-4 z-20">
        <Button size="sm" className="shadow-lg gap-2">
          <Store className="h-4 w-4" />
          Sell on KitchenCloud
        </Button>
      </Link>
    </div>
  )
}