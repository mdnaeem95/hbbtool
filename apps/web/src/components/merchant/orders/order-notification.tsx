"use client"

import { useOrderStream } from '@/providers/order-stream-provider'
import { Alert, AlertDescription, Badge } from '@kitchencloud/ui'
import { Wifi, WifiOff, Bell, RefreshCw } from 'lucide-react'
import { useState } from 'react'

export function OrderNotification() {
  const { isConnected, lastUpdate } = useOrderStream()
  const [showDetails, setShowDetails] = useState(false)

  // Show connection status in UI
  if (!isConnected) {
    return (
      <Alert className="mb-4 border-yellow-200 bg-yellow-50">
        <WifiOff className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800 flex items-center justify-between">
          <span>
            Real-time notifications are reconnecting... Orders will still appear, but you may need to refresh to see updates.
          </span>
          <Badge variant="secondary" className="ml-2">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Connecting
          </Badge>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert 
      className="mb-4 border-green-200 bg-green-50 cursor-pointer transition-all hover:bg-green-100"
      onClick={() => setShowDetails(!showDetails)}
    >
      <Bell className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800">
        <div className="flex items-center justify-between">
          <span>
            ✅ Real-time notifications active. You'll be notified instantly of new orders.
          </span>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-xs text-green-600">
                Last update: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <Badge variant="default" className="bg-green-600">
              <Wifi className="h-3 w-3 mr-1" />
              Live
            </Badge>
          </div>
        </div>
        
        {showDetails && (
          <div className="mt-2 pt-2 border-t border-green-200 text-sm">
            <ul className="list-disc ml-4 space-y-1">
              <li>New orders will appear automatically</li>
              <li>Status updates sync in real-time</li>
              <li>Desktop notifications when window is inactive</li>
              <li>Automatic fallback to polling if connection drops</li>
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}

// BONUS: Connection Status Badge for Header
export function ConnectionStatusBadge() {
  const { isConnected, lastUpdate } = useOrderStream()
  
  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={isConnected ? "default" : "secondary"}
        className={`gap-1 p-1 ${isConnected ? 'bg-green-600' : 'bg-gray-400'}`}
      >
        {isConnected ? (
          <>
            <Wifi className="h-3 w-3" />
            Live
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Offline
          </>
        )}
      </Badge>
      
      {lastUpdate && isConnected && (
        <span className="text-xs text-gray-500">
          {lastUpdate.toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}