'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card } from '@homejiak/ui'
import { MapPin, Clock, DollarSign, Star } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import 'mapbox-gl/dist/mapbox-gl.css'
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox'
import { MerchantMapMarker } from '../../types/merchant'
import { SINGAPORE_CENTER, SINGAPORE_BOUNDS } from '../../lib/constants/map'

interface MerchantMapProps {
  merchants: MerchantMapMarker[]
  onBoundsChange?: (bounds: mapboxgl.LngLatBounds) => void
  selectedMerchantId?: string | null
  onMerchantSelect?: (merchantId: string | null) => void
  showPopup?: boolean
  userLocation?: { lat: number; lng: number }
}

export function MerchantMap({
  merchants,
  onBoundsChange,
  selectedMerchantId,
  onMerchantSelect,
  showPopup = true,
  userLocation 
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

  // trigger initial bounds on map load
  const handleMapLoad = useCallback(() => {
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

  useEffect(() => {
    if (userLocation && mapRef.current) {
      // Only fly to user location once when it's first obtained
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 13,
        duration: 1500
      })
    }
  }, [userLocation?.lat, userLocation?.lng])

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
      onLoad={handleMapLoad}
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

      {/* User location marker */}
      {userLocation && (
        <Marker
          latitude={userLocation.lat}
          longitude={userLocation.lng}
          anchor="bottom"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75" />
            <div className="relative w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg" />
          </div>
        </Marker>
      )}

      {/* Merchant Markers */}
      {merchants.map((merchant) => (
        <Marker
          key={merchant.id}
          longitude={merchant.longitude!}
          latitude={merchant.latitude!}
          anchor="center"
          onClick={(e: any) => {
            e.originalEvent.stopPropagation()
            handleMarkerClick(merchant)
          }}
        >
          <div 
            className="relative cursor-pointer"
            style={{
              // Use fixed size container to prevent shifts
              width: '40px',
              height: '40px',
              // Center the marker visually
              marginTop: '-20px'
            }}
          >
            {/* Pulse animation for selected (underneath) */}
            {selectedMerchantId === merchant.id && (
              <div 
                className="absolute inset-0 rounded-full bg-primary/30 animate-ping"
                style={{
                  // Ensure ping doesn't affect marker position
                  pointerEvents: 'none'
                }}
              />
            )}
            
            {/* Custom marker */}
            <div 
              className={`
                absolute inset-0 flex items-center justify-center rounded-full shadow-lg
                transition-all duration-200
                ${merchant.isOpen ? 'bg-primary' : 'bg-gray-400'}
              `}
              style={{
                // Use transform-origin to scale from center
                transformOrigin: 'center center',
                transform: selectedMerchantId === merchant.id ? 'scale(1.25)' : 'scale(1)',
              }}
              onMouseEnter={(e: any) => {
                e.currentTarget.style.transform = selectedMerchantId === merchant.id ? 'scale(1.35)' : 'scale(1.1)'
              }}
              onMouseLeave={(e: any) => {
                e.currentTarget.style.transform = selectedMerchantId === merchant.id ? 'scale(1.25)' : 'scale(1)'
              }}
            >
              <MapPin className="h-6 w-6 text-white" />
            </div>
            
            {/* Invisible click target (larger for better UX) */}
            <div 
              className="absolute inset-0"
              style={{
                // Make click target larger than visual marker
                margin: '-10px',
                width: '60px',
                height: '60px'
              }}
            />
          </div>
        </Marker>
      ))}

      {/* Popup */}
      {popupMerchant && showPopup && (
        <Popup
          longitude={popupMerchant.longitude!}
          latitude={popupMerchant.latitude!}
          anchor="top"
          offset={25}
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
            <Link href={`/merchant/${popupMerchant.slug}/products`}>
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
                    {popupMerchant && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {popupMerchant.rating ? (
                        <>
                          <span className="font-medium">{popupMerchant.rating}</span>
                          <span className="text-muted-foreground">({popupMerchant.reviewCount || 0})</span>
                        </>
                        ) : (
                          <span className="text-muted-foreground text-xs">No reviews</span>
                        )}
                      </div>
                    )}
                    
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