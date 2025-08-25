"use client"

import { useOrderStream } from '@/providers/order-stream-provider'
import { Alert, AlertDescription, Badge } from '@kitchencloud/ui'
import { Wifi, WifiOff, Bell, RefreshCw, ChevronDown, Activity } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function OrderNotification() {
  const { isConnected, lastUpdate } = useOrderStream()
  const [showDetails, setShowDetails] = useState(false)

  // Disconnected state with refined design
  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <Alert className="border-amber-200 bg-amber-50/80 backdrop-blur-sm shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <WifiOff className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-amber-900">
                  Reconnecting to live updates...
                </p>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                  <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                  Connecting
                </Badge>
              </div>
              <AlertDescription className="text-amber-800/90 text-xs">
                Orders will still appear, but you may need to refresh to see the latest updates.
              </AlertDescription>
            </div>
          </div>
        </Alert>
      </motion.div>
    )
  }

  // Connected state with enhanced UX
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Alert 
        className="border-emerald-200 bg-emerald-50/80 backdrop-blur-sm cursor-pointer transition-all duration-200 hover:bg-emerald-100/80 hover:shadow-sm group shadow-sm"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-start gap-3">
          {/* Icon with pulse animation */}
          <div className="mt-0.5 relative">
            <Bell className="h-4 w-4 text-emerald-600" />
            <motion.div
              className="absolute -inset-1 bg-emerald-400 rounded-full opacity-20"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-emerald-900">
                  Live notifications active
                </p>
                <motion.div
                  className="w-2 h-2 bg-emerald-500 rounded-full"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              
              {/* Status badges */}
              <div className="flex items-center gap-2">
                {lastUpdate && (
                  <span className="text-xs text-emerald-700/80 font-mono">
                    {lastUpdate.toLocaleTimeString('en-SG', { 
                      hour12: false, 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                )}
                <Badge className="bg-emerald-600 text-white border-0 shadow-sm">
                  <Wifi className="h-3 w-3 mr-1.5" />
                  Live
                </Badge>
                <motion.div
                  animate={{ rotate: showDetails ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-emerald-600 group-hover:text-emerald-700 transition-colors" />
                </motion.div>
              </div>
            </div>

            {/* Description */}
            <AlertDescription className="text-emerald-800/90 text-xs leading-relaxed">
              You'll receive instant notifications for new orders and updates.
            </AlertDescription>

            {/* Expandable details */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 border-t border-emerald-200/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {[
                        { icon: Activity, text: "Real-time order updates" },
                        { icon: Bell, text: "Desktop notifications" },
                        { icon: RefreshCw, text: "Auto-sync across devices" },
                        { icon: Wifi, text: "Smart reconnection" }
                      ].map((feature, index) => (
                        <motion.div
                          key={feature.text}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-2 text-emerald-700"
                        >
                          <feature.icon className="h-3 w-3 text-emerald-600/80" />
                          <span>{feature.text}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Alert>
    </motion.div>
  )
}

// Enhanced Connection Status Badge for Header
export function ConnectionStatusBadge() {
  const { isConnected, lastUpdate } = useOrderStream()
  
  return (
    <div className="flex items-center gap-2">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Badge 
          variant={isConnected ? "default" : "secondary"}
          className={`
            relative gap-2 px-2.5 py-1 text-xs font-medium transition-all duration-200 border-0
            ${isConnected 
              ? "bg-emerald-600 text-white shadow-sm" 
              : "bg-amber-100 text-amber-700"
            }
          `}
        >
          {/* Status icon with animation */}
          {isConnected ? (
            <motion.div className="relative">
              <Wifi className="h-3 w-3" />
              <motion.div
                className="absolute -inset-0.5 bg-white/20 rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          ) : (
            <RefreshCw className="h-3 w-3 animate-spin" />
          )}
          
          {/* Status text */}
          <span>{isConnected ? "Live" : "Connecting"}</span>
          
          {/* Pulse indicator */}
          {isConnected && (
            <motion.div
              className="w-1.5 h-1.5 bg-white rounded-full"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </Badge>
      </motion.div>
      
      {/* Last update timestamp for connected state */}
      {isConnected && lastUpdate && (
        <span className="text-xs text-muted-foreground font-mono hidden sm:block">
          {lastUpdate.toLocaleTimeString('en-SG', { 
            hour12: false,
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      )}
    </div>
  )
}