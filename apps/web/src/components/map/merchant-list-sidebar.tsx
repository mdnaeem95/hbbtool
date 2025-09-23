'use client'

import { Card, Spinner } from '@homejiak/ui'
import { Clock, MapPin, DollarSign, Star } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { MerchantMapMarker } from '../../types/merchant'
import { useState } from 'react'

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
  const [loadingMerchantId, setLoadingMerchantId] = useState<string | null>(null)
  const [loadingMerchantName, setLoadingMerchantName] = useState<string>('')

  // Loading overlay for desktop
  const LoadingOverlay = () => {
    if (!loadingMerchantId) return null

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-sm">
        <div className="text-center">
          <div className="mb-4 relative">
            <Spinner className="h-12 w-12 text-orange-500 mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-orange-100 animate-ping" />
            </div>
          </div>
          <p className="text-xl font-semibold text-gray-800">
            Directing to {loadingMerchantName}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Loading storefront...
          </p>
        </div>
      </div>
    )
  }

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
    <>
      <LoadingOverlay />
      <div className="divide-y divide-border">
        {merchants.map((merchant) => (
          <div
            key={merchant.id}
            className={`
              block hover:bg-muted/50 transition-colors cursor-pointer
              ${selectedMerchantId === merchant.id ? 'bg-muted' : ''}
            `}
            onClick={() => {
              onMerchantSelect?.(merchant.id)
              setLoadingMerchantId(merchant.id)
              setLoadingMerchantName(merchant.businessName)
            }}
          >
            <Link href={`/merchant/${merchant.slug}/products`}>
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
                          {merchant.rating ? (
                          <>
                            <span className="font-medium">{merchant.rating}</span>
                            <span className="text-muted-foreground">({merchant.reviewCount || 0})</span>
                          </>
                          ) : (
                            <span className="text-muted-foreground text-xs">No reviews</span>
                          )}
                        </div>
                      )}
                      
                      {merchant.preparationTime && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{merchant.preparationTime}</span>
                        </div>
                      )}
                      
                      {merchant.minimumOrder && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>{Number(merchant.minimumOrder).toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {merchant.address}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </>
  )
}