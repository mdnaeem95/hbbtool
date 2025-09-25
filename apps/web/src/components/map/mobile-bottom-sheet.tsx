'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronUp, MapPin, Star, ShoppingBag, Clock } from 'lucide-react'
import { Badge, Button, Skeleton } from '@homejiak/ui'
import Image from 'next/image'
import { motion, useAnimation, PanInfo } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { api } from '../../lib/trpc/client'

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

// Merchant Card Component
function MerchantCard({ 
  merchant, 
  isSelected = false
}: { 
  merchant: any
  isSelected?: boolean
}) {
  const router = useRouter()
  const utils = api.useUtils()
  const [isClicked, setIsClicked] = useState(false)
  const [isPrefetching, setIsPrefetching] = useState(false)
  
  // Prefetch merchant data on hover/touch
  const handlePrefetch = () => {
    if (isPrefetching) return
    setIsPrefetching(true)
    
    // Prefetch merchant details
    utils.public.getMerchant.prefetch(
      { slug: merchant.slug },
      { staleTime: 5 * 60 * 1000 }
    )
    
    // Prefetch products
    utils.public.listProducts.prefetch(
      { 
        merchantSlug: merchant.slug,
        limit: 20,
        page: 1 
      },
      { staleTime: 2 * 60 * 1000 }
    )

    // Preload the page
    router.prefetch(`/merchant/${merchant.slug}/products`)
  }

  const handleClick = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    
    // Set clicked state immediately
    setIsClicked(true)
    
    // Haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(10) // Short 10ms vibration
    }
    
    // Add a tiny delay to show the animation before navigation
    setTimeout(() => {
      router.push(`/merchant/${merchant.slug}/products`)
    }, 100)
  }

  return (
    <motion.div
      initial={false}
      animate={{
        scale: isClicked ? 0.97 : 1,
        backgroundColor: isClicked ? 'rgb(251, 146, 60, 0.1)' : 'white',
      }}
      transition={{
        scale: { duration: 0.15, ease: 'easeOut' },
        backgroundColor: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative bg-white rounded-lg border transition-all cursor-pointer
        ${isSelected ? 'border-orange-500 shadow-md' : 'border-gray-200'}
        ${isClicked ? 'opacity-90' : 'hover:border-gray-300 hover:shadow-sm'}
        active:scale-[0.98] active:transition-transform active:duration-75
      `}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
      onClick={handleClick}
      onTouchEnd={handleClick}
    >
      {/* Loading Overlay */}
      {isClicked && (
        <div className="absolute inset-0 bg-white/60 rounded-lg z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-600 font-medium">Loading...</span>
          </div>
        </div>
      )}

      {/* Card Content */}
      <div className="flex gap-3 p-3">
        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          {merchant.imageUrl || merchant.logoUrl ? (
            <Image
              src={merchant.imageUrl || merchant.logoUrl || ''}
              alt={merchant.businessName}
              fill
              className="object-cover"
              sizes="80px"
              priority={isSelected}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-gray-400" />
            </div>
          )}
          
          {/* Status Badge */}
          {merchant.isOpen !== undefined && (
            <div className="absolute top-1 left-1">
              <Badge 
                className="text-xs px-1.5 py-0.5"
              >
                {merchant.isOpen ? 'Open' : 'Closed'}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate">
              {merchant.businessName}
            </h3>
            {merchant.rating && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-medium">{merchant.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Cuisine Tags */}
          {merchant.cuisineType && merchant.cuisineType.length > 0 && (
            <div className="flex gap-1 mb-1.5 flex-wrap">
              {merchant.cuisineType.slice(0, 2).map((cuisine: string) => (
                <Badge key={cuisine} variant="secondary" className="text-xs px-1.5 py-0">
                  {cuisine}
                </Badge>
              ))}
              {merchant.cuisineType.length > 2 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  +{merchant.cuisineType.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Info Row */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {merchant.estimatedDeliveryTime && (
              <div className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                <span>{merchant.estimatedDeliveryTime}</span>
              </div>
            )}
            
            {merchant.distance && (
              <div className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                <span>{merchant.distance < 1 ? `${(merchant.distance * 1000).toFixed(0)}m` : `${merchant.distance.toFixed(1)}km`}</span>
              </div>
            )}

            {merchant.minimumOrder && (
              <span className="text-gray-400">
                Min ${typeof merchant.minimumOrder === 'object' ? merchant.minimumOrder.toString() : merchant.minimumOrder}
              </span>
            )}
          </div>

          {/* Description */}
          {merchant.description && (
            <p className="text-xs text-gray-600 mt-1.5 line-clamp-1">
              {merchant.description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
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