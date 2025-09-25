'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronUp, MapPin } from 'lucide-react'
import { Button } from '@homejiak/ui'
import { motion, useAnimation, PanInfo } from 'framer-motion'
import { MerchantCard, MerchantCardSkeleton } from './merchant-card'

interface Merchant {
  id: string
  slug: string
  businessName: string
  description?: string | null
  cuisineType?: string[] | null
  rating?: number | null
  reviewCount?: number
  imageUrl?: string | null
  address?: string | null
  estimatedDeliveryTime?: string | null
  minimumOrder?: any // Accepting Decimal type
  deliveryFee?: any // Accepting Decimal type
  isOpen?: boolean
  hasDelivery?: boolean | null
  hasPickup?: boolean | null
  nextOpenTime?: Date | null
  distance?: number | null
  [key: string]: any // Allow additional properties
}

interface MobileBottomSheetProps {
  merchants: Merchant[]
  selectedMerchantId: string | null
  onMerchantSelect: (id: string | null) => void
  isLoading: boolean
  isListView?: boolean
  isFullScreen?: boolean
  hasInitiallyLoaded?: boolean
}

export function MobileBottomSheet({
  merchants,
  selectedMerchantId,
  onMerchantSelect,
  isLoading,
  isListView = false,
  isFullScreen = false,
  hasInitiallyLoaded = false,
}: MobileBottomSheetProps) {
  const [sheetHeight, setSheetHeight] = useState(120) // Start with peek height
  const [isDragging, setIsDragging] = useState(false)
  const controls = useAnimation()
  const constraintsRef = useRef<HTMLDivElement>(null)

  const snapPoints = [120, window.innerHeight * 0.5, window.innerHeight * 0.85]
  
  const handleDragEnd = (event: any, info: PanInfo) => {
    console.log(event)
    setIsDragging(false)
    const currentY = sheetHeight - info.offset.y
    
    // Find closest snap point
    const closestSnapPoint = snapPoints.reduce((prev, curr) =>
      Math.abs(curr - currentY) < Math.abs(prev - currentY) ? curr : prev
    )
    
    setSheetHeight(closestSnapPoint)
    controls.start({ y: window.innerHeight - closestSnapPoint })
  }

  useEffect(() => {
    if (isListView) {
      setSheetHeight(window.innerHeight * 0.85)
      controls.start({ y: window.innerHeight * 0.15 })
    } else {
      controls.start({ y: window.innerHeight - sheetHeight })
    }
  }, [isListView, sheetHeight, controls])

  // Show selected merchant when one is selected on the map
  useEffect(() => {
    if (selectedMerchantId && sheetHeight === 120) {
      setSheetHeight(window.innerHeight * 0.5)
    }
  }, [selectedMerchantId, sheetHeight])

  const selectedMerchant = merchants.find(m => m.id === selectedMerchantId)

  // Full-screen list view mode (no dragging)
  if (isFullScreen) {
    return (
      <div 
        className="bg-white"
        style={{
          marginTop: '8px',
          minHeight: 'auto',
        }}
      >
        {/* Content without drag handle */}
        <div className="px-4 pb-20">
          {/* List Header */}
          <div className="mb-4">
            <h2 className="font-semibold">All Merchants</h2>
            <p className="text-sm text-gray-500">
              {isLoading ? 'Loading...' : `${merchants.length} available`}
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <MerchantCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Merchant List */}
          {!isLoading && merchants.length > 0 && (
            <div className="space-y-3">
              {merchants.map(merchant => (
                <Link
                  key={merchant.id}
                  href={`/merchant/${merchant.slug}/products`}
                  prefetch={true}
                  onClick={() => onMerchantSelect(merchant.id)}
                >
                  <MerchantCard
                    merchant={merchant}
                    isSelected={merchant.id === selectedMerchantId}
                  />
                </Link>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && hasInitiallyLoaded && merchants.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 font-medium text-lg">No merchants found</p>
              <p className="text-sm text-gray-500 mt-2">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Backdrop when sheet is expanded */}
      {sheetHeight > 200 && (
        <div 
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => {
            setSheetHeight(120)
            onMerchantSelect(null)
          }}
        />
      )}

      <motion.div
        ref={constraintsRef}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-40"
        initial={{ y: window.innerHeight - 120 }}
        animate={controls}
        drag="y"
        dragElastic={0.2}
        dragConstraints={{
          top: window.innerHeight * 0.15,
          bottom: window.innerHeight - 120,
        }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{
          height: '90vh',
          touchAction: 'none',
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-2 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm">
                {selectedMerchant ? 'Selected Merchant' : isListView ? 'All Merchants' : 'Nearby Merchants'}
              </h2>
              <p className="text-xs text-gray-500">
                {isLoading ? 'Loading...' : `${merchants.length} available`}
              </p>
            </div>
            {sheetHeight > 200 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (sheetHeight === snapPoints[2]) {
                    setSheetHeight(snapPoints[1]!)
                  } else {
                    setSheetHeight(snapPoints[2]!)
                  }
                }}
                className="h-8 w-8"
              >
                <ChevronUp className={`h-4 w-4 transition-transform ${
                  sheetHeight === snapPoints[2] ? 'rotate-180' : ''
                }`} />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div 
          className="overflow-y-auto px-4 pb-4"
          style={{ 
            height: `calc(${sheetHeight}px - 80px)`,
            pointerEvents: isDragging ? 'none' : 'auto'
          }}
        >
          {/* Selected Merchant Card */}
          {selectedMerchant && sheetHeight > 200 && (
            <div className="mb-4 pb-4 border-b">
              <Link 
                href={`/merchant/${selectedMerchant.slug}/products`}
                prefetch={true}
              >
                <MerchantCard 
                  merchant={selectedMerchant} 
                  isSelected 
                />
              </Link>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4 pt-2">
              {[...Array(3)].map((_, i) => (
                <MerchantCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Merchant List */}
          {!isLoading && merchants.length > 0 && (
            <div className="space-y-3 pt-2">
              {merchants
                .filter(m => m.id !== selectedMerchantId)
                .map(merchant => (
                  <Link 
                    key={merchant.id}
                    href={`/merchant/${merchant.slug}/products`}
                    prefetch={true}
                    onClick={() => onMerchantSelect(merchant.id)}
                  >
                    <MerchantCard
                      merchant={merchant}
                      isSelected={false}
                    />
                  </Link>
                ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && merchants.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-8 w-8 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 font-medium">No merchants found</p>
              <p className="text-sm text-gray-500 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}