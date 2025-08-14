'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card } from '@kitchencloud/ui'
import { MapPin, Clock, DollarSign } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import 'mapbox-gl/dist/mapbox-gl.css'
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox'
import { MerchantMapMarker } from '@/types/merchant'
import { SINGAPORE_CENTER, SINGAPORE_BOUNDS } from '@/lib/constants/map'

interface MerchantMapProps {
  merchants: MerchantMapMarker[]
  onBoundsChange?: (bounds: mapboxgl.LngLatBounds) => void
  selectedMerchantId?: string | null
  onMerchantSelect?: (merchantId: string | null) => void
}

export function MerchantMap({
  merchants,
  onBoundsChange,
  selectedMerchantId,
  onMerchantSelect
}: MerchantMapProps) {
  const [viewState, setViewState] = useState({
    longitude: SINGAPORE_CENTER.lng,
    latitude: SINGAPORE_CENTER.lat,
    zoom: 11.5
  })
  const [popupMerchant, setPopupMerchant] = useState<MerchantMapMarker | null>(null)
  const mapRef = useRef<any>(null)

  // Handle bounds change
  const handleMoveEnd = useCallback(() => {
    if (mapRef.current && onBoundsChange) {
      const bounds = mapRef.current.getBounds()
      onBoundsChange(bounds)
    }
  }, [onBoundsChange])

  // Center on selected merchant
  useEffect(() => {
    if (selectedMerchantId && mapRef.current) {
      const merchant = merchants.find(m => m.id === selectedMerchantId)
      if (merchant) {
        mapRef.current.flyTo({
          center: [merchant.longitude, merchant.latitude],
          zoom: 14,
          duration: 1000
        })
        setPopupMerchant(merchant)
      }
    }
  }, [selectedMerchantId, merchants])

  const handleMarkerClick = (merchant: MerchantMapMarker) => {
    setPopupMerchant(merchant)
    onMerchantSelect?.(merchant.id)
  }

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={(evt: any) => setViewState(evt.viewState)}
      onMoveEnd={handleMoveEnd}
      mapStyle="mapbox://styles/mapbox/light-v11"
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
      maxBounds={[
        [SINGAPORE_BOUNDS.west, SINGAPORE_BOUNDS.south],
        [SINGAPORE_BOUNDS.east, SINGAPORE_BOUNDS.north]
      ]}
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" />
      <GeolocateControl
        position="top-right"
        trackUserLocation
        showUserHeading
      />

      {/* Merchant Markers */}
      {merchants.map((merchant) => (
        <Marker
          key={merchant.id}
          longitude={merchant.longitude!}
          latitude={merchant.latitude!}
          anchor="bottom"
          onClick={(e: any) => {
            e.originalEvent.stopPropagation()
            handleMarkerClick(merchant)
          }}
        >
          <div className="relative cursor-pointer">
            {/* Custom marker */}
            <div className={`
              flex items-center justify-center h-10 w-10 rounded-full shadow-lg transform transition-transform hover:scale-110
              ${merchant.isOpen ? 'bg-primary' : 'bg-gray-400'}
              ${selectedMerchantId === merchant.id ? 'scale-125' : ''}
            `}>
              <MapPin className="h-6 w-6 text-white" />
            </div>
            {/* Pulse animation for selected */}
            {selectedMerchantId === merchant.id && (
              <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
            )}
          </div>
        </Marker>
      ))}

      {/* Popup */}
      {popupMerchant && (
        <Popup
          longitude={popupMerchant.longitude!}
          latitude={popupMerchant.latitude!}
          anchor="bottom"
          onClose={() => {
            setPopupMerchant(null)
            onMerchantSelect?.(null)
          }}
          closeButton={true}
          closeOnClick={false}
          className="merchant-popup"
          maxWidth="320px"
        >
          <Card className="border-0 shadow-none">
            <Link href={`/merchant/${popupMerchant.slug}`}>
              <div className="space-y-3">
                {/* Header with image */}
                {popupMerchant.logoUrl && (
                  <div className="relative h-32 w-full overflow-hidden rounded-t-lg">
                    <Image
                      src={popupMerchant.logoUrl}
                      alt={popupMerchant.businessName}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                
                <div className="p-3 space-y-2">
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {popupMerchant.businessName}
                  </h3>
                  
                  {popupMerchant.cuisineType && popupMerchant.cuisineType.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {popupMerchant.cuisineType.join(' • ')}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm">
                    {/* {popupMerchant && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{popupMerchant.rating}</span>
                      </div>
                    )} */}
                    
                    {popupMerchant.preparationTime && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{popupMerchant.preparationTime}</span>
                      </div>
                    )}
                    
                    {popupMerchant.minimumOrder && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>Min ${Number(popupMerchant.minimumOrder).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {popupMerchant.address}
                  </p>
                  
                  {!popupMerchant.isOpen && (
                    <p className="text-sm font-medium text-destructive">
                      Currently Closed
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </Card>
        </Popup>
      )}
    </Map>
  )
}