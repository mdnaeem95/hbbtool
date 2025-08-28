'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Button, 
  Card, 
  useToast 
} from '@kitchencloud/ui'
import { 
  ArrowLeft, 
  ArrowRight, 
  ShoppingBag,
} from 'lucide-react'
import { useCart, useCartTotal } from '@/stores/cart-store'
import { CheckoutSteps, DeliverySection, ContactForm, PaymentSection, OrderSummary } from "@/components/checkout"
import { useCheckoutStore } from '@/stores/checkout-store'
import { api } from '@/lib/trpc/client'

type CheckoutStep = 'delivery' | 'contact' | 'payment'

export default function CheckoutPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { items, merchantId, merchantName, clearCart } = useCart()
  const { subtotal } = useCartTotal()
  const createSession = api.checkout.createSession.useMutation()
  
  const {
    sessionId,
    deliveryMethod,
    deliveryAddress,
    contactInfo,
    setSessionId,
    reset: resetCheckout,
  } = useCheckoutStore()
  
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('delivery')
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [sessionData, setSessionData] = useState<any>(null)

  // Create checkout session on mount
  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart')
      return
    }

    if (!sessionId) {
      createCheckoutSession()
    }
  }, [])

  const createCheckoutSession = async () => {
    if (!merchantId) return
    
    // Clear any existing session first
    if (sessionId) {
      resetCheckout()
    }
    
    setIsCreatingSession(true)

    try {
      const session = await createSession.mutateAsync({
        merchantId,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          variant: item.variant ? JSON.stringify(item.variant): undefined,
          notes: item.notes,
        })),
      })
      
      setSessionId(session.sessionId)
      setSessionData(session)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      })
      router.push('/cart')
    } finally {
      setIsCreatingSession(false)
    }
  }

  // Get session details
  const { data: session, isLoading: isLoadingSession } = api.checkout.getSession.useQuery(
    { sessionId: sessionId || '' },
    { 
      enabled: !!sessionId,
      refetchOnWindowFocus: false,
    }
  )

  const handleNext = () => {
    if (currentStep === 'delivery') {
      if (!deliveryMethod) {
        toast({
          title: "Please select a delivery method",
          variant: "destructive",
        })
        return
      }
      if (deliveryMethod === 'DELIVERY' && (!deliveryAddress || !deliveryAddress.postalCode)) {
        toast({
          title: "Please enter your delivery address",
          variant: "destructive",
        })
        return
      }
      setCurrentStep('contact')
    } else if (currentStep === 'contact') {
      if (!contactInfo?.name || !contactInfo?.email || !contactInfo?.phone) {
        toast({
          title: "Please fill in all contact information",
          variant: "destructive",
        })
        return
      }
      setCurrentStep('payment')
    }
  }

  const handleBack = () => {
    if (currentStep === 'contact') {
      setCurrentStep('delivery')
    } else if (currentStep === 'payment') {
      setCurrentStep('contact')
    }
  }

  // Calculate fees
  const deliveryFee = deliveryMethod === 'DELIVERY' 
    ? (sessionData?.deliveryFee || session?.merchant?.deliveryFee || 0)
    : 0
  const total = subtotal + deliveryFee

  if (items.length === 0) {
    return null // Will redirect in useEffect
  }

  if (isCreatingSession || isLoadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Setting up checkout...</p>
        </div>
      </div>
    )
  }

  if (!session && !sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Session expired</p>
          <Button onClick={() => router.push('/cart')}>
            Return to Cart
          </Button>
        </div>
      </div>
    )
  }

  const currentSessionData = session || sessionData

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-6xl py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/cart')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cart
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Checkout</h1>
              <p className="text-muted-foreground mt-1">
                Complete your order from {merchantName}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingBag className="h-4 w-4" />
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </div>
          </div>
        </div>

        {/* Checkout Steps */}
        <CheckoutSteps currentStep={currentStep} />

        {/* Main Content */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="space-y-8">
                {/* Delivery Section */}
                {currentStep === 'delivery' && (
                  <DeliverySection 
                    merchantId={merchantId!}
                    merchantAddress={currentSessionData.merchant?.address}
                  />
                )}

                {/* Contact Form */}
                {currentStep === 'contact' && <ContactForm />}

                {/* Payment Section */}
                {currentStep === 'payment' && (
                  <PaymentSection
                    sessionId={sessionId!}
                    paymentReference={currentSessionData.paymentReference}
                    amount={total}
                    merchant={{
                      businessName: currentSessionData.merchant.businessName,
                      paynowNumber: currentSessionData.merchant.paynowNumber,
                      paynowQrCode: currentSessionData.merchant.paynowQrCode,
                    }}
                    contactInfo={contactInfo!}
                    deliveryAddress={deliveryAddress}
                    deliveryMethod={deliveryMethod!}
                    onSuccess={(orderId: string, orderNumber: string) => {
                      // 🔧 Store customer phone for order confirmation page
                      if (contactInfo?.phone) {
                        localStorage.setItem('checkout_customer_phone', contactInfo.phone)
                      }
                      
                      clearCart()
                      resetCheckout()
                      router.push(`/checkout/confirmation?orderId=${orderId}&orderNumber=${orderNumber}`)
                    }}
                  />
                )}

                {/* Navigation */}
                {currentStep !== 'payment' && (
                  <div className="mt-8 flex justify-between">
                    {currentStep !== 'delivery' && (
                      <Button
                        variant="outline"
                        onClick={handleBack}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                    )}

                    <Button
                      onClick={handleNext}
                      className="ml-auto"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <OrderSummary
                items={items}
                subtotal={subtotal}
                deliveryFee={deliveryFee}
                total={total}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}