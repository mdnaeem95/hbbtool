import { useEffect, useState } from "react"

export function DeliveryMap({ routes, selectedRoute, onMarkerClick, trafficLayer, heatmapLayer }) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [activeMarker, setActiveMarker] = useState<string | null>(null)
  
  const selectedRouteData = routes.find((r: any) => r.id === selectedRoute)
  
  // Singapore-specific map config
  const mapOptions = {
    center: { lat: 1.3521, lng: 103.8198 }, // Singapore center
    zoom: 11,
    mapTypeControl: false,
    styles: [
      // Custom map styling for better visibility
      {
        featureType: "poi.business",
        stylers: [{ visibility: "off" }]
      }
    ],
    restriction: {
      // Restrict map to Singapore bounds
      latLngBounds: {
        north: 1.4784,
        south: 1.1496,
        east: 104.0945,
        west: 103.5947
      },
      strictBounds: true
    }
  }
  
  // Calculate and display route
  useEffect(() => {
    if (selectedRouteData && map) {
      const directionsService = new google.maps.DirectionsService()
      
      const waypoints = selectedRouteData.stops.slice(1, -1).map((stop: any) => ({
        location: { 
          lat: stop.coordinates.lat, 
          lng: stop.coordinates.lng 
        },
        stopover: true
      }))
      
      directionsService.route({
        origin: selectedRouteData.stops[0].coordinates,
        destination: selectedRouteData.stops[selectedRouteData.stops.length - 1].coordinates,
        waypoints,
        optimizeWaypoints: false, // We already optimized server-side
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(selectedRouteData.startTime),
          trafficModel: google.maps.TrafficModel.BEST_GUESS
        },
        avoidTolls: selectedRouteData.avoidTolls,
        avoidHighways: false
      }, (result, status) => {
        if (status === "OK") {
          setDirections(result)
        }
      })
    }
  }, [selectedRouteData, map])
  
  return (
    <GoogleMap
      mapContainerClassName="w-full h-full"
      options={mapOptions}
      onLoad={setMap}
    >
      {/* Render all routes with different colors */}
      {routes.map((route, index) => (
        <DirectionsRenderer
          key={route.id}
          directions={directions}
          options={{
            polylineOptions: {
              strokeColor: route.id === selectedRoute ? "#FF6B35" : getRouteColor(index),
              strokeOpacity: route.id === selectedRoute ? 1 : 0.5,
              strokeWeight: route.id === selectedRoute ? 5 : 3
            },
            suppressMarkers: true // We'll add custom markers
          }}
        />
      ))}
      
      {/* Custom markers for each stop */}
      {selectedRouteData?.stops.map((stop: any, index: any) => (
        <Marker
          key={stop.id}
          position={stop.coordinates}
          label={{
            text: String(index + 1),
            color: "white",
            fontWeight: "bold"
          }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: stop.priority === "urgent" ? "#EF4444" : "#FF6B35",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 2
          }}
          onClick={() => setActiveMarker(stop.id)}
        />
      ))}
      
      {/* Info Window for selected marker */}
      {activeMarker && (
        <InfoWindow
          position={selectedRouteData?.stops.find(s => s.id === activeMarker)?.coordinates}
          onCloseClick={() => setActiveMarker(null)}
        >
          <DeliveryStopInfo 
            stop={selectedRouteData?.stops.find(s => s.id === activeMarker)}
            onNavigate={() => openInGoogleMaps(stop)}
            onCall={() => callCustomer(stop.customer.phone)}
          />
        </InfoWindow>
      )}
      
      {/* Traffic Layer */}
      {trafficLayer && <TrafficLayer />}
      
      {/* Heat Map for delivery density */}
      {heatmapLayer && (
        <HeatmapLayer
          data={generateHeatmapData(routes)}
          options={{
            radius: 20,
            opacity: 0.6
          }}
        />
      )}
    </GoogleMap>
  )
}