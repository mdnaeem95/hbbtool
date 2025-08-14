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
import { api } from '@/app/api/trpc/client'

const num = (v: unknown) =>
  typeof v === "number" ? v : v ? Number(v as any) : 0

export default function OrderConfirmationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const orderNumber = searchParams.get('orderNumber')
  
  const [copied, setCopied] = useState(false)
  
  // Fetch order details
  const { data: order, isLoading } = api.order.get.useQuery(
    { id: orderId || '' },
    { enabled: !!(orderId || orderNumber) }
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
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber)
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
  
  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Order not found</p>
          <Button onClick={() => router.push('/')}>
            Return Home
          </Button>
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
        
        {/* Order Number */}
        <Card className="mb-6">
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Order Number</p>
            <div className="flex items-center justify-center gap-3">
              <p className="text-2xl font-mono font-bold">{order.orderNumber}</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyOrderNumber}
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Save this number to track your order
            </p>
          </div>
        </Card>
        
        {/* Payment Status Alert */}
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Payment Verification Pending</strong>
            <p className="mt-1">
              The merchant will verify your payment shortly. You'll receive a confirmation 
              once your payment is verified and your order is confirmed.
            </p>
          </AlertDescription>
        </Alert>
        
        {/* Order Details */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Delivery/Pickup Information */}
          <Card>
            <div className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                {isDelivery ? (
                  <>
                    <Truck className="h-5 w-5" />
                    Delivery Information
                  </>
                ) : (
                  <>
                    <Package className="h-5 w-5" />
                    Pickup Information
                  </>
                )}
              </h3>
              
              <div className="space-y-3">
                {isDelivery && order.deliveryAddress ? (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery Address</p>
                      <p className="font-medium">{order.deliveryAddress.line1}</p>
                      {order.deliveryAddress.line2 && (
                        <p className="font-medium">{order.deliveryAddress.line2}</p>
                      )}
                      <p className="font-medium">Singapore {order.deliveryAddress.postalCode}</p>
                    </div>
                    {order.deliveryNotes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Delivery Notes</p>
                        <p className="font-medium">{order.deliveryNotes}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground">Pickup Location</p>
                    <p className="font-medium">Please check your order confirmation email for pickup details</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      The merchant will contact you when your order is ready
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
          
          {/* Contact Information */}
          <Card>
            <div className="p-6">
              <h3 className="font-semibold mb-4">Contact Information</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{order.customerPhone}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{order.customerEmail}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Order Summary */}
        <Card className="mt-6">
          <div className="p-6">
            <h3 className="font-semibold mb-4">Order Summary</h3>
            
            {/* Order Items */}
            <div className="space-y-3 mb-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity} × ${num(item.price).toFixed(2)}
                    </p>
                  </div>
                  <p className="font-medium">
                    ${(num(item.price) * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${num(order.subtotal).toFixed(2)}</span>
              </div>
              {isDelivery && (
                <div className="flex justify-between text-sm">
                  <span>Delivery Fee</span>
                  <span>${num(order.deliveryFee).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg pt-2">
                <span>Total Paid</span>
                <span className="text-primary">${num(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Next Steps */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <div className="p-6">
            <h3 className="font-semibold mb-3 text-blue-900">What's Next?</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>The merchant will verify your PayNow payment</li>
              <li>You'll receive a confirmation once payment is verified</li>
              <li>The merchant will start preparing your order</li>
              <li>You'll get updates via SMS/WhatsApp when ready</li>
              {isDelivery ? (
                <li>Your order will be delivered to your address</li>
              ) : (
                <li>Collect your order from the pickup location</li>
              )}
            </ol>
          </div>
        </Card>
        
        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => router.push('/orders')}
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            View My Orders
          </Button>
          <Button onClick={() => router.push('/')}>
            <Home className="mr-2 h-4 w-4" />
            Continue Shopping
          </Button>
        </div>
      </div>
    </div>
  )
}