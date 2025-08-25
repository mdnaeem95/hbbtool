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
    <div className="flex items-center gap-3">
      <Badge 
        variant={isConnected ? "default" : "secondary"}
        className={`
          relative gap-2 px-3 py-1.5 text-xs font-medium transition-all duration-200
          ${isConnected 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'bg-gray-100 text-gray-600 border border-gray-200'
          }
        `}
      >
        {/* Pulsing dot for live connection */}
        {isConnected && (
          <div className="relative">
            <div className="absolute -left-0.5 -top-0.5 h-2 w-2 rounded-full bg-green-300 animate-ping" />
            <div className="h-1 w-1 rounded-full bg-white" />
          </div>
        )}
        
        {/* Connection icon */}
        <div className="flex items-center">
          {isConnected ? (
            <Wifi className="h-3.5 w-3.5" />
          ) : (
            <WifiOff className="h-3.5 w-3.5" />
          )}
        </div>
        
        {/* Status text */}
        <span className="font-medium">
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </Badge>
      
      {/* Last update timestamp */}
      {lastUpdate && isConnected && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span className="text-gray-400">•</span>
          <span>
            Updated {lastUpdate.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            })}
          </span>
        </div>
      )}
    </div>
  )
}