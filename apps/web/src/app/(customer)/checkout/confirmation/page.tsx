'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Button, 
  Card, 
  Alert,
  AlertDescription,
  Separator,
} from '@kitchencloud/ui'
import { 
  CheckCircle, 
  Phone,
  Mail,
  Copy,
  Home,
  ShoppingBag,
  Info,
  Truck,
  Package
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { api } from '@/lib/trpc/client' // 🔧 Fixed import path

const num = (v: unknown) =>
  typeof v === "number" ? v : v ? Number(v as any) : 0

export default function OrderConfirmationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const orderNumber = searchParams.get('orderNumber')
  
  const [copied, setCopied] = useState(false)
  const [customerPhone, setCustomerPhone] = useState('')
  
  // Get phone from localStorage (set during checkout)
  useEffect(() => {
    const phone = localStorage.getItem('checkout_customer_phone')
    if (phone) {
      setCustomerPhone(phone)
    }
  }, [])
  
  // 🔧 Fixed: Use public.trackOrder instead of order.get
  const { data: order, isLoading, error } = api.public.trackOrder.useQuery(
    { 
      orderNumber: orderNumber || '', 
      phone: customerPhone 
    },
    { 
      enabled: !!(orderNumber && customerPhone),
      retry: 1, // Don't retry too many times if auth fails
    }
  )

  // Trigger confetti on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })
    }, 500)
    
    return () => clearTimeout(timer)
  }, [])
  
  const handleCopyOrderNumber = () => {
    if (orderNumber) {
      navigator.clipboard.writeText(orderNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  if (!orderId && !orderNumber) {
    router.push('/')
    return null
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    )
  }
  
  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Info className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Order Details Loading</h1>
          <p className="text-muted-foreground mb-4">
            We're preparing your order details. This may take a moment.
          </p>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your order <strong>{orderNumber}</strong> has been placed successfully. 
              We'll send you updates via SMS and email.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Button onClick={() => router.push('/')} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Return Home
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }
  
  const isDelivery = order.deliveryMethod === 'DELIVERY'
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-4xl py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Order Placed Successfully!</h1>
          <p className="text-lg text-muted-foreground">
            Thank you for your order. We've received your payment proof.
          </p>
        </div>

        {/* Order Summary Card */}
        <Card className="mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Order #{order.orderNumber}</h2>
              <p className="text-sm text-muted-foreground">
                {order.merchant.businessName}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyOrderNumber}
            >
              <Copy className="h-4 w-4 mr-2" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Order Details */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Order Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="capitalize font-medium">
                    {order.status.toLowerCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment:</span>
                  <span className="capitalize">
                    {order.paymentStatus.toLowerCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method:</span>
                  <span className="flex items-center">
                    {isDelivery ? <Truck className="h-4 w-4 mr-1" /> : <Package className="h-4 w-4 mr-1" />}
                    {isDelivery ? 'Delivery' : 'Pickup'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="font-semibold mb-3">Contact Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{order.customerPhone}</span>
                </div>
                {order.customerEmail && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{order.customerEmail}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          {isDelivery && order.deliveryAddress && (
            <div className="mt-6">
              <Separator className="mb-4" />
              <h3 className="font-semibold mb-2 flex items-center">
                <Truck className="h-4 w-4 mr-2" />
                Delivery Address
              </h3>
              <p className="text-sm text-muted-foreground">
                {order.deliveryAddress.line1}
                {order.deliveryAddress.line2 && `, ${order.deliveryAddress.line2}`}
                <br />
                Singapore {order.deliveryAddress.postalCode}
              </p>
            </div>
          )}
        </Card>

        {/* Order Items */}
        <Card className="mb-6 p-6">
          <h3 className="font-semibold mb-4">Order Items</h3>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex-1">
                  <p className="font-medium">{item.productName}</p>
                  {item.specialRequest && (
                    <p className="text-sm text-muted-foreground">
                      Note: {item.specialRequest}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {item.quantity} × ${num(item.price).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ${num(item.total).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${num(order.subtotal).toFixed(2)}</span>
            </div>
            {num(order.deliveryFee) > 0 && (
              <div className="flex justify-between">
                <span>Delivery Fee:</span>
                <span>${num(order.deliveryFee).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg">
              <span>Total:</span>
              <span>${num(order.total).toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* Next Steps */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">What's Next?</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-blue-600">1</span>
              </div>
              <div>
                <p className="font-medium">Payment Confirmation</p>
                <p className="text-muted-foreground">
                  The merchant will verify your PayNow payment and confirm your order.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-blue-600">2</span>
              </div>
              <div>
                <p className="font-medium">Order Preparation</p>
                <p className="text-muted-foreground">
                  Your order will be prepared fresh. You'll receive updates via SMS.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-blue-600">3</span>
              </div>
              <div>
                <p className="font-medium">
                  {isDelivery ? 'Delivery' : 'Pickup'}
                </p>
                <p className="text-muted-foreground">
                  {isDelivery 
                    ? "We'll deliver your order to your specified address."
                    : "You'll be notified when your order is ready for pickup."
                  }
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <Button onClick={() => router.push('/')} className="flex-1">
            <Home className="h-4 w-4 mr-2" />
            Continue Shopping
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push('/orders')}
            className="flex-1"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            View Orders
          </Button>
        </div>
      </div>
    </div>
  )
}