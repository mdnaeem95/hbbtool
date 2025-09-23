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
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-4xl py-8 px-4">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/')}
            className="mb-4"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Store
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">Track Your Order</h1>
              <p className="text-muted-foreground">
                Real-time updates for your order
              </p>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              className={isRefreshing ? 'animate-spin' : ''}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Status Card */}
        <Card className="mb-6 p-6 border-2 border-orange-100">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${status.bgColor} rounded-full flex items-center justify-center`}>
                <StatusIcon className={`h-6 w-6 ${status.color}`} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{status.label}</h2>
                <p className="text-sm text-muted-foreground">{status.description}</p>
                {order.updatedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Updated {formatDistanceToNow(new Date(order.updatedAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
            
            <Badge variant="outline" className="text-sm">
              #{order.orderNumber}
            </Badge>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <Progress value={progressPercentage} className="h-2 mb-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Order Placed</span>
              <span>{isDelivery ? 'Delivered' : 'Picked Up'}</span>
            </div>
          </div>
          
          {/* Timeline */}
          <div className="space-y-4">
            {timelineSteps.map((step, index) => {
              const stepStatus = ORDER_STATUSES[step as OrderStatus]
              const StepIcon = stepStatus.icon
              const isPast = index <= currentStepIndex
              const isCurrent = index === currentStepIndex
              
              return (
                <div key={step} className="flex items-start gap-3">
                  <div className="relative flex flex-col items-center">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      ${isPast ? stepStatus.bgColor : 'bg-gray-100'}
                      ${isCurrent ? 'ring-2 ring-orange-500 ring-offset-2' : ''}
                    `}>
                      <StepIcon className={`h-4 w-4 ${isPast ? stepStatus.color : 'text-gray-400'}`} />
                    </div>
                    {index < timelineSteps.length - 1 && (
                      <div className={`w-0.5 h-12 -mt-1 ${isPast ? 'bg-orange-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  
                  <div className="flex-1 pb-8">
                    <p className={`font-medium ${isPast ? '' : 'text-muted-foreground'}`}>
                      {stepStatus.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stepStatus.description}
                    </p>
                    {isCurrent && order.estimatedReady && (
                      <p className="text-sm text-orange-600 mt-1">
                        Estimated: {format(new Date(order.estimatedReady), 'h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
        
        {/* Order Details */}
        <Card className="mb-6 p-6">
          <h3 className="text-lg font-semibold mb-4">Order Details</h3>
          
          <div className="space-y-4">
            {/* Items */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Items</p>
              <div className="space-y-2">
                {order.items.map((item) => {
                const variant = parseVariant(item.variant)
                
                return (
                    <div key={item.id} className="flex justify-between">
                    <div>
                        <p className="font-medium">{item.productName}</p>
                        {variant && variant.name && variant.value && (
                        <p className="text-sm text-muted-foreground">
                            {variant.name}: {variant.value}
                        </p>
                        )}
                        {item.specialRequest && (
                        <p className="text-sm text-muted-foreground italic">Note: {item.specialRequest}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="font-medium">${Number(item.total).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                    </div>
                    </div>
                )
                })}
              </div>
            </div>
            
            <Separator />
            
            {/* Delivery/Pickup Info */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {isDelivery ? 'Delivery Information' : 'Pickup Information'}
              </p>
              {isDelivery && order.deliveryAddress ? (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p>{order.deliveryAddress.line1}</p>
                    {order.deliveryAddress.line2 && <p>{order.deliveryAddress.line2}</p>}
                    <p>Singapore {order.deliveryAddress.postalCode}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">{order.merchant.businessName}</p>
                    <p className="text-muted-foreground">Self pickup</p>
                  </div>
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Pricing */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${Number(order.subtotal).toFixed(2)}</span>
              </div>
              {isDelivery && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>${Number(order.deliveryFee).toFixed(2)}</span>
                </div>
              )}
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-${order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total</span>
                <span>${Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Notifications Alert */}
        <Alert className="mb-6">
          <Bell className="h-4 w-4" />
          <AlertDescription>
            <strong>SMS Updates Enabled</strong>
            <br />
            You'll receive SMS notifications when your order status changes.
          </AlertDescription>
        </Alert>
        
        {/* Actions */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handleCopyOrderNumber}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            {copied ? 'Copied!' : 'Copy Order Number'}
          </Button>
          
          {order.merchant.phone && (
            <Button
              variant="outline"
              onClick={() => {
                const message = `Hi, I'd like to check on my order #${order.orderNumber}`
                const whatsappUrl = `https://wa.me/${order.merchant.phone}?text=${encodeURIComponent(message)}`
                window.open(whatsappUrl, '_blank')
              }}
              className="flex-1"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Merchant
            </Button>
          )}
        </div>
        
        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Have questions about your order?
          </p>
          <p className="text-sm text-muted-foreground">
            Contact {order.merchant.businessName} at{' '}
            <a 
              href={`tel:${order.merchant.phone}`} 
              className="text-orange-600 hover:underline"
            >
              {order.merchant.phone}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}