'use client'

import { Card } from '@homejiak/ui'
import { Clock, MapPin, Star, Truck, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@homejiak/ui'

interface MerchantCardProps {
  merchant: {
    id: string
    businessName: string
    slug: string
    logoUrl?: string | null
    cuisineType?: string[] | null
    rating?: number | null
    reviewCount?: number
    preparationTime?: number | null
    deliveryEnabled?: boolean
    pickupEnabled?: boolean
    deliveryFee?: number | null
    minimumOrder?: number | null
    distance?: number | null
    isOpen?: boolean
    address?: string | null
    description?: string | null
  }
  isSelected?: boolean
  variant?: 'default' | 'compact'
}

export function MerchantCard({ 
  merchant, 
  isSelected = false,
}: MerchantCardProps) {
  // Format distance
  const formatDistance = (meters: number | null | undefined) => {
    if (!meters) return null
    if (meters < 1000) {
      return `${Math.round(meters)}m`
    }
    return `${(meters / 1000).toFixed(1)}km`
  }

  return (
    <Card 
      className={cn(
        "p-4 transition-all hover:shadow-md cursor-pointer",
        isSelected && "ring-2 ring-primary shadow-lg",
        !merchant.isOpen && "opacity-75"
      )}
    >
      <div className="flex gap-4">
        {/* Merchant Logo/Image */}
        <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
          {merchant.logoUrl ? (
            <Image
              src={merchant.logoUrl}
              alt={merchant.businessName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <ShoppingBag className="h-8 w-8" />
            </div>
          )}
          
          {/* Closed Overlay */}
          {merchant.isOpen === false && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white text-xs font-medium px-2 py-1 bg-black/50 rounded">
                Closed
              </span>
            </div>
          )}
        </div>

        {/* Merchant Info */}
        <div className="flex-1 min-w-0">
          {/* Title and Distance */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {merchant.businessName}
            </h3>
            {merchant.distance && (
              <span className="text-sm text-gray-500 flex items-center gap-1 flex-shrink-0">
                <MapPin className="h-3 w-3" />
                {formatDistance(merchant.distance)}
              </span>
            )}
          </div>

          {/* Cuisine Type */}
          {merchant.cuisineType && merchant.cuisineType.length > 0 && (
            <p className="text-sm text-gray-600 truncate mt-1">
              {merchant.cuisineType.join(' • ')}
            </p>
          )}

          {/* Rating and Reviews */}
          <div className="flex items-center gap-3 mt-2">
            {merchant.rating ? (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{Number(merchant.rating).toFixed(1)}</span>
                {merchant.reviewCount !== undefined && (
                  <span className="text-sm text-gray-500">
                    ({merchant.reviewCount})
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-500">No ratings yet</span>
            )}

            {/* Preparation Time */}
            {merchant.preparationTime && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="h-3.5 w-3.5" />
                <span>{merchant.preparationTime} mins</span>
              </div>
            )}
          </div>

          {/* Delivery Options and Fees */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Delivery/Pickup Badges */}
            {merchant.deliveryEnabled && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full">
                <Truck className="h-3 w-3" />
                Delivery
              </span>
            )}
            {merchant.pickupEnabled && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                <ShoppingBag className="h-3 w-3" />
                Pickup
              </span>
            )}

            {/* Minimum Order */}
            {merchant.minimumOrder !== null && merchant.minimumOrder !== undefined && (
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                Min ${Number(merchant.minimumOrder).toFixed(0)}
              </span>
            )}

            {/* Delivery Fee */}
            {merchant.deliveryFee !== null && merchant.deliveryFee !== undefined && merchant.deliveryEnabled && (
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                Delivery ${Number(merchant.deliveryFee).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

// Skeleton Loading State
export function MerchantCardSkeleton() {
  return (
    <Card className="p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="w-20 h-20 bg-gray-200 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="flex gap-2 mt-2">
            <div className="h-6 bg-gray-200 rounded-full w-16" />
            <div className="h-6 bg-gray-200 rounded-full w-20" />
          </div>
          <div className="flex gap-2">
            <div className="h-6 bg-gray-200 rounded-full w-14" />
            <div className="h-6 bg-gray-200 rounded-full w-16" />
          </div>
        </div>
      </div>
    </Card>
  )
}

// Compact variant for map popups
export function MerchantCardCompact({ merchant }: { merchant: MerchantCardProps['merchant'] }) {
  return (
    <div className="space-y-2">
      {/* Header with image */}
      {merchant.logoUrl && (
        <div className="relative h-32 w-full overflow-hidden rounded-lg">
          <Image
            src={merchant.logoUrl}
            alt={merchant.businessName}
            fill
            className="object-cover"
          />
          {!merchant.isOpen && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white text-sm font-medium">Closed</span>
            </div>
          )}
        </div>
      )}
      
      <div className="space-y-2">
        <h3 className="font-semibold text-lg line-clamp-1">
          {merchant.businessName}
        </h3>
        
        {merchant.cuisineType && merchant.cuisineType.length > 0 && (
          <p className="text-sm text-gray-600">
            {merchant.cuisineType.join(' • ')}
          </p>
        )}
        
        <div className="flex items-center gap-4 text-sm">
          {merchant.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>{Number(merchant.rating).toFixed(1)}</span>
            </div>
          )}
          
          {merchant.preparationTime && (
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="h-3.5 w-3.5" />
              <span>{merchant.preparationTime} mins</span>
            </div>
          )}
        </div>

        {/* Quick info badges */}
        <div className="flex gap-2 flex-wrap">
          {merchant.deliveryEnabled && (
            <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">
              Delivery
            </span>
          )}
          {merchant.pickupEnabled && (
            <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
              Pickup
            </span>
          )}
          {merchant.minimumOrder && (
            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
              Min ${merchant.minimumOrder}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}