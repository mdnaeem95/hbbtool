'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronUp, Clock, MapPin, Star, Bike, ShoppingBag } from 'lucide-react'
import { Badge, Button, Skeleton } from '@kitchencloud/ui'
import Image from 'next/image'
import { motion, useAnimation, PanInfo } from 'framer-motion'

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
}

export function MobileBottomSheet({
  merchants,
  selectedMerchantId,
  onMerchantSelect,
  isLoading,
  isListView = false,
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
              <MerchantCard merchant={selectedMerchant} isSelected />
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
                  <MerchantCard
                    key={merchant.id}
                    merchant={merchant}
                    onSelect={() => onMerchantSelect(merchant.id)}
                  />
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

// Merchant Card Component
function MerchantCard({ 
  merchant, 
  isSelected = false,
  onSelect 
}: { 
  merchant: Merchant
  isSelected?: boolean
  onSelect?: () => void
}) {
  return (
    <Link
      href={`/merchant/${merchant.slug}`}
      onClick={(e: any) => {
        if (onSelect) {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`block ${onSelect ? 'cursor-pointer' : ''}`}
    >
      <div className={`
        bg-white rounded-lg border transition-all
        ${isSelected ? 'border-orange-500 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}
      `}>
        <div className="flex gap-3 p-3">
          {/* Image */}
          <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {merchant.imageUrl ? (
              <Image
                src={merchant.imageUrl}
                alt={merchant.businessName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <ShoppingBag className="h-8 w-8" />
              </div>
            )}
            {!merchant.isOpen && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-xs font-medium">Closed</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-sm truncate pr-2">
                {merchant.businessName}
              </h3>
              {merchant.rating && (
                <div className="flex items-center gap-1 text-xs">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{merchant.rating.toFixed(1)}</span>
                  <span className="text-gray-500">({merchant.reviewCount})</span>
                </div>
              )}
            </div>

            {/* Cuisine Badges */}
            {merchant.cuisineType && merchant.cuisineType.length > 0 && (
              <div className="flex gap-1 mb-1">
                {merchant.cuisineType.slice(0, 2).map(cuisine => (
                  <Badge 
                    key={cuisine} 
                    variant="secondary" 
                    className="text-[10px] py-0 px-1 bg-gray-100"
                  >
                    {cuisine}
                  </Badge>
                ))}
              </div>
            )}

            {/* Description */}
            {merchant.description && (
              <p className="text-xs text-gray-600 line-clamp-1 mb-1">
                {merchant.description}
              </p>
            )}

            {/* Meta Info */}
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              {merchant.estimatedDeliveryTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{merchant.estimatedDeliveryTime}</span>
                </div>
              )}
              {merchant.minimumOrder && (
                <span>Min ${Number(merchant.minimumOrder)}</span>
              )}
              {merchant.deliveryFee !== undefined && (
                <div className="flex items-center gap-1">
                  <Bike className="h-3 w-3" />
                  <span>{Number(merchant.deliveryFee) === 0 ? 'Free' : `$${Number(merchant.deliveryFee)}`}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// Skeleton Loading State
function MerchantCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex gap-3">
        <Skeleton className="w-20 h-20 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}