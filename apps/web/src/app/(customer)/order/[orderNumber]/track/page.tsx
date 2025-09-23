'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card, Alert, AlertDescription, Badge, Separator, Progress } from '@homejiak/ui'
import { CheckCircle, Clock, Package, Truck, Home, Copy, Phone, MapPin, ChefHat, Bell, RefreshCw, MessageSquare } from 'lucide-react'
import confetti from 'canvas-confetti'
import { api } from '../../../../../lib/trpc/client'
import { format, formatDistanceToNow } from 'date-fns'

enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY = "READY",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED"
}

enum DeliveryMethod {
  PICKUP = "PICKUP",
  DELIVERY = "DELIVERY",
  DINE_IN = "DINE_IN"
}

// Add this helper function at the top of the component
const parseVariant = (variant: any): { name?: string; value?: string } | null => {
  if (!variant) return null
  
  // If it's already an object, return it
  if (typeof variant === 'object' && !Array.isArray(variant)) {
    return variant as { name?: string; value?: string }
  }
  
  // If it's a string, try to parse it
  if (typeof variant === 'string') {
    try {
      return JSON.parse(variant)
    } catch (e) {
      console.error('Failed to parse variant:', e)
      return null
    }
  }
  
  return null
}

// Order status configuration
const ORDER_STATUSES: Record<OrderStatus, {
  label: string
  icon: typeof Clock
  color: string
  bgColor: string
  description: string
}> = {
  [OrderStatus.PENDING]: {
    label: 'Pending Payment',
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    description: 'Waiting for payment confirmation'
  },
  [OrderStatus.CONFIRMED]: {
    label: 'Order Confirmed',
    icon: CheckCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Payment received, order confirmed'
  },
  [OrderStatus.PREPARING]: {
    label: 'Preparing',
    icon: ChefHat,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    description: 'Your order is being prepared with love'
  },
  [OrderStatus.READY]: {
    label: 'Ready',
    icon: Package,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Your order is ready'
  },
  [OrderStatus.OUT_FOR_DELIVERY]: {  // Changed from DELIVERING
    label: 'Out for Delivery',
    icon: Truck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: 'Your order is on the way'
  },
  [OrderStatus.DELIVERED]: {
    label: 'Delivered',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Order has been delivered'
  },
  [OrderStatus.COMPLETED]: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Order completed successfully'
  },
  [OrderStatus.CANCELLED]: {
    label: 'Cancelled',
    icon: Clock,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    description: 'Order has been cancelled'
  },
  [OrderStatus.REFUNDED]: {  // Added REFUNDED status
    label: 'Refunded',
    icon: RefreshCw,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    description: 'Order has been refunded'
  }
}

// Timeline steps for different delivery methods
const getTimelineSteps = (deliveryMethod: DeliveryMethod): OrderStatus[] => {
  if (deliveryMethod === 'DELIVERY') {
    return [
      OrderStatus.PENDING, 
      OrderStatus.CONFIRMED, 
      OrderStatus.PREPARING, 
      OrderStatus.READY, 
      OrderStatus.OUT_FOR_DELIVERY,  // Changed from 'DELIVERING'
      OrderStatus.DELIVERED
    ]
  } else {
    return [
      OrderStatus.PENDING, 
      OrderStatus.CONFIRMED, 
      OrderStatus.PREPARING, 
      OrderStatus.READY, 
      OrderStatus.COMPLETED
    ]
  }
}

export default function OrderTrackingPage() {
  const params = useParams()
  const router = useRouter()
  const orderNumber = params.orderNumber as string
  
  const [customerPhone, setCustomerPhone] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Get phone from localStorage
  useEffect(() => {
    const savedPhone = localStorage.getItem('last_order_phone')
    if (savedPhone) {
      setCustomerPhone(savedPhone)
      setIsVerified(true)
    } else {
      // Check if we just came from checkout
      const checkoutPhone = localStorage.getItem('checkout_customer_phone')
      if (checkoutPhone) {
        setCustomerPhone(checkoutPhone)
        setIsVerified(true)
      }
    }
  }, [])
  
  // Fetch order data
  const { 
    data: order, 
    isLoading, 
    error,
    refetch 
  } = api.public.trackOrder.useQuery(
    { 
      orderNumber: orderNumber || '', 
      phone: customerPhone 
    },
    { 
      enabled: !!(orderNumber && customerPhone && isVerified),
      refetchInterval: 30000, // Auto-refresh every 30 seconds
    }
  )
  
  // Trigger confetti for completed orders
  useEffect(() => {
    if (order?.status === 'DELIVERED' || order?.status === 'COMPLETED') {
      const hasShownConfetti = sessionStorage.getItem(`confetti_${orderNumber}`)
      if (!hasShownConfetti) {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          })
          sessionStorage.setItem(`confetti_${orderNumber}`, 'true')
        }, 500)
      }
    }
  }, [order?.status, orderNumber])
  
  const handleVerifyPhone = () => {
    const cleanPhone = phoneInput.replace(/\D/g, '')
    if (cleanPhone.length >= 8) {
      setCustomerPhone(cleanPhone)
      setIsVerified(true)
      localStorage.setItem('last_order_phone', cleanPhone)
    }
  }
  
  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(orderNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setTimeout(() => setIsRefreshing(false), 500)
  }
  
  // Phone verification screen
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Phone className="h-8 w-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Track Your Order</h1>
            <p className="text-muted-foreground">
              Enter your phone number to track order #{orderNumber}
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Phone Number</label>
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPhone()}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            <Button 
              onClick={handleVerifyPhone}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600"
            >
              Track Order
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    )
  }
  
  // Error or order not found
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find an order with this number and phone combination.
          </p>
          <div className="space-y-2">
            <Button onClick={() => setIsVerified(false)} className="w-full">
              Try Different Phone
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Return Home
            </Button>
          </div>
        </div>
      </div>
    )
  }
  
  const status = ORDER_STATUSES[order.status as OrderStatus]
  const StatusIcon = status.icon
  const isDelivery = order.deliveryMethod === 'DELIVERY'
  const timelineSteps = getTimelineSteps(order.deliveryMethod as DeliveryMethod)
  const currentStepIndex = timelineSteps.indexOf(order.status as OrderStatus)
  const progressPercentage = ((currentStepIndex + 1) / timelineSteps.length) * 100
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="container max-w-4xl py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/')}
            className="mb-6 hover:bg-orange-100 transition-colors"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Store
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                Track Your Order
              </h1>
              <p className="text-gray-600">
                Real-time updates for your order
              </p>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              className={`border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all ${
                isRefreshing ? 'animate-spin' : 'hover:rotate-180'
              }`}
            >
              <RefreshCw className="h-4 w-4 text-orange-600" />
            </Button>
          </div>
        </div>
        
        {/* Status Card */}
        <Card className="mb-8 overflow-hidden shadow-xl border-0 bg-white/95 backdrop-blur">
          <div className={`p-6 bg-gradient-to-r ${
            order.status === 'PENDING' ? 'from-yellow-400 to-orange-400' :
            order.status === 'CONFIRMED' ? 'from-blue-400 to-indigo-400' :
            order.status === 'PREPARING' ? 'from-orange-400 to-red-400' :
            order.status === 'READY' ? 'from-green-400 to-emerald-400' :
            order.status === 'COMPLETED' ? 'from-green-500 to-green-600' :
            'from-gray-400 to-gray-500'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/30 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg">
                  <StatusIcon className="h-8 w-8 text-white" />
                </div>
                <div className="text-white">
                  <h2 className="text-2xl font-bold">{status.label}</h2>
                  <p className="text-white/90">{status.description}</p>
                  {order.updatedAt && (
                    <p className="text-sm text-white/75 mt-1">
                      Updated {formatDistanceToNow(new Date(order.updatedAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
              
              <Badge className="bg-white/20 backdrop-blur text-white border-white/30 text-sm font-semibold">
                #{order.orderNumber}
              </Badge>
            </div>
          </div>
          
          <div className="p-6">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="relative">
                <Progress 
                  value={progressPercentage} 
                  className="h-3 bg-gray-100" 
                />
                <div 
                  className="absolute top-0 left-0 h-3 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-700 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium">
                <span>Order Placed</span>
                <span>{isDelivery ? 'Delivered' : 'Picked Up'}</span>
              </div>
            </div>
            
            {/* Timeline */}
            <div className="space-y-0">
              {timelineSteps.map((step, index) => {
                const stepStatus = ORDER_STATUSES[step as OrderStatus]
                const StepIcon = stepStatus.icon
                const isPast = index <= currentStepIndex
                const isCurrent = index === currentStepIndex
                
                return (
                  <div key={step} className="flex items-start gap-4 relative">
                    <div className="flex flex-col items-center">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                        ${isPast 
                          ? 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/25' 
                          : 'bg-gray-100 border-2 border-gray-200'
                        }
                        ${isCurrent ? 'ring-4 ring-orange-200 animate-pulse' : ''}
                      `}>
                        <StepIcon className={`h-5 w-5 ${
                          isPast ? 'text-white' : 'text-gray-400'
                        }`} />
                      </div>
                      {index < timelineSteps.length - 1 && (
                        <div className={`w-0.5 h-16 transition-all duration-500 ${
                          isPast ? 'bg-orange-400' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                    
                    <div className="flex-1 pb-8 pt-1">
                      <p className={`font-semibold text-base ${
                        isPast ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {stepStatus.label}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {stepStatus.description}
                      </p>
                      {isCurrent && order.estimatedReady && (
                        <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                          <Clock className="h-3 w-3" />
                          Estimated: {format(new Date(order.estimatedReady), 'h:mm a')}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
        
        {/* Order Details */}
        <Card className="mb-6 shadow-lg border-0 bg-white/95 backdrop-blur overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
            <h3 className="text-lg font-bold text-gray-800">Order Details</h3>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Items */}
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Items</p>
              <div className="space-y-3">
                {order.items.map((item) => {
                  const variant = parseVariant(item.variant)
                  
                  return (
                    <div key={item.id} className="flex justify-between items-start p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{item.productName}</p>
                        {variant && variant.name && variant.value && (
                          <p className="text-sm text-gray-600 mt-1">
                            {variant.name}: {variant.value}
                          </p>
                        )}
                        {item.specialRequest && (
                          <div className="flex items-start gap-1 mt-2">
                            <MessageSquare className="h-3 w-3 text-orange-500 mt-0.5" />
                            <p className="text-sm text-gray-600 italic">
                              {item.specialRequest}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-gray-900">${Number(item.total).toFixed(2)}</p>
                        <p className="text-sm text-gray-500">×{item.quantity}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <Separator className="bg-gray-200" />
            
            {/* Delivery/Pickup Info */}
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {isDelivery ? 'Delivery Information' : 'Pickup Information'}
              </p>
              <div className="p-4 bg-orange-50 rounded-xl">
                {isDelivery && order.deliveryAddress ? (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{order.deliveryAddress.line1}</p>
                      {order.deliveryAddress.line2 && (
                        <p className="text-gray-600">{order.deliveryAddress.line2}</p>
                      )}
                      <p className="text-gray-600">Singapore {order.deliveryAddress.postalCode}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Home className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{order.merchant.businessName}</p>
                      <p className="text-gray-600">Self pickup</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <Separator className="bg-gray-200" />
            
            {/* Pricing */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">${Number(order.subtotal).toFixed(2)}</span>
              </div>
              {isDelivery && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-medium">${Number(order.deliveryFee).toFixed(2)}</span>
                </div>
              )}
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Discount</span>
                  <span className="font-medium text-green-600">-${Number(order.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="pt-3 border-t-2 border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                    ${Number(order.total).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* SMS Alert */}
        <Alert className="mb-6 border-0 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <AlertDescription className="text-gray-700">
              <span className="font-semibold text-gray-900 block mb-1">SMS Updates Enabled</span>
              You'll receive SMS notifications when your order status changes.
            </AlertDescription>
          </div>
        </Alert>
        
        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <Button
            variant="outline"
            onClick={handleCopyOrderNumber}
            className="flex-1 border-gray-300 hover:border-orange-400 hover:bg-orange-50 transition-all group"
          >
            <Copy className="h-4 w-4 mr-2 group-hover:text-orange-600" />
            <span className="group-hover:text-orange-600">
              {copied ? 'Copied!' : 'Copy Order Number'}
            </span>
          </Button>
          
          {order.merchant.phone && (
            <Button
              onClick={() => {
                const message = `Hi, I'd like to check on my order #${order.orderNumber}`
                const whatsappUrl = `https://wa.me/${order.merchant.phone}?text=${encodeURIComponent(message)}`
                window.open(whatsappUrl, '_blank')
              }}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact via WhatsApp
            </Button>
          )}
        </div>
        
        {/* Help Footer */}
        <div className="text-center p-6 bg-gray-50 rounded-xl">
          <p className="text-gray-600 mb-1">
            Have questions about your order?
          </p>
          <p className="text-gray-700">
            Contact <span className="font-semibold">{order.merchant.businessName}</span> at{' '}
            <a 
              href={`tel:${order.merchant.phone}`} 
              className="text-orange-600 font-semibold hover:text-orange-700 transition-colors"
            >
              {order.merchant.phone}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}