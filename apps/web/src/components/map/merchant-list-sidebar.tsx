'use client'

import { Card } from '@homejiak/ui'
import { Clock, MapPin, Star } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { MerchantMapMarker } from '../../types/merchant'

interface MerchantListSidebarProps {
  merchants: MerchantMapMarker[]
  selectedMerchantId?: string | null
  onMerchantSelect?: (merchantId: string) => void
  isLoading?: boolean
}

export function MerchantListSidebar({
  merchants,
  selectedMerchantId,
  onMerchantSelect,
  isLoading
}: MerchantListSidebarProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-muted rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (merchants.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">No merchants found</p>
        <p className="text-sm mt-2">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {merchants && merchants.map((merchant: any) => (
        <Link
          key={merchant.id}
          href={`/merchant/${merchant.slug}/products`}
          className={`
            block hover:bg-muted/50 transition-colors cursor-pointer
            ${selectedMerchantId === merchant.id ? 'bg-muted' : ''}
          `}
          onClick={() => onMerchantSelect?.(merchant.id)}
          prefetch={true}
        >
          <div className="p-4">
            <div className="flex gap-4">
              {/* Merchant Image */}
              <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                {merchant.logoUrl ? (
                  <Image
                    src={merchant.logoUrl}
                    alt={merchant.businessName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <MapPin className="h-8 w-8" />
                  </div>
                )}
                {!merchant.isOpen && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">Closed</span>
                  </div>
                )}
              </div>

              {/* Merchant Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{merchant.businessName}</h3>
                
                {merchant.cuisineType && merchant.cuisineType.length > 0 && (
                  <p className="text-sm text-muted-foreground truncate">
                    {merchant.cuisineType.join(' • ')}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-2 text-sm">
                  {merchant.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      {Number(merchant.rating)?.toFixed(1)}
                      <span className="text-muted-foreground">
                        ({merchant.reviewCount || 0})
                      </span>
                    </div>
                  )}

                  {merchant.preparationTime && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {merchant.preparationTime} mins
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  {merchant.minimumOrder && (
                    <span className="text-xs px-2 py-1 bg-muted rounded-full">
                      Min ${Number(merchant.minimumOrder).toFixed(0)}
                    </span>
                  )}
                  {merchant.deliveryFee !== undefined && (
                    <span className="text-xs px-2 py-1 bg-muted rounded-full">
                      Delivery ${Number(merchant.deliveryFee).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}