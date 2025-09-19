'use client'

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@kitchencloud/ui'
import { MerchantMap } from './merchant-map'
import { MapSearchHeader } from './map-search-header'
import { MerchantListSidebar } from './merchant-list-sidebar'
import { Store } from 'lucide-react'
import Link from 'next/link'
import { LngLatBounds } from 'react-map-gl/mapbox'

interface DesktopLayoutProps {
  merchants: any[]
  selectedMerchantId: string | null
  onMerchantSelect: (id: string | null) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  filters: any
  setFilters: (filters: any) => void
  isLoading: boolean
  onBoundsChange: (bounds: LngLatBounds) => void
}

export function DesktopLayout({
  merchants,
  selectedMerchantId,
  onMerchantSelect,
  setSearchQuery,
  setFilters,
  isLoading,
  onBoundsChange,
}: DesktopLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Desktop Header with Search */}
        <MapSearchHeader
        onSearch={setSearchQuery}
        onFilterChange={setFilters}
        totalResults={merchants.length}
        isLoading={isLoading}
        />

      {/* Merchant CTA Banner for Desktop */}
      {merchants.length === 0 && !isLoading && (
        <div className="bg-gradient-to-r from-orange-50 via-purple-50 to-orange-50 border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Store className="h-5 w-5 text-orange-500" />
                <p className="text-sm font-medium">
                  Are you a home-based food business? Join KitchenCloud today!
                </p>
              </div>
              <Link
                href="/merchant/signup"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Register Now
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1"
      >
        {/* Merchant List Sidebar */}
        <ResizablePanel
          defaultSize={30}
          minSize={25}
          maxSize={40}
          className="border-r"
        >
          <MerchantListSidebar
            merchants={merchants}
            selectedMerchantId={selectedMerchantId}
            onMerchantSelect={onMerchantSelect}
            isLoading={isLoading}
          />
        </ResizablePanel>

        <ResizableHandle className="w-2 bg-gray-100 hover:bg-gray-200 transition-colors" />

        {/* Map */}
        <ResizablePanel defaultSize={70}>
          <div className="relative h-full">
            <MerchantMap
              merchants={merchants}
              selectedMerchantId={selectedMerchantId}
              onMerchantSelect={onMerchantSelect}
              onBoundsChange={onBoundsChange}
            />

            {/* Empty State Overlay */}
            {merchants.length === 0 && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8 m-4 max-w-md pointer-events-auto">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                      <Store className="h-8 w-8 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      No merchants found in this area
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Try adjusting your search, changing filters, or exploring a different area on the map.
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => setFilters({})}
                        className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
                      >
                        Clear All Filters
                      </button>
                      <Link
                        href="/merchant/signup"
                        className="block w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors"
                      >
                        Register as a Merchant
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}