'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, useToast } from '@homejiak/ui'
import { ArrowLeft, ArrowRight, Shield, Info } from 'lucide-react'
import { useCart, useCartTotal } from '../../../stores/cart-store'
import { CheckoutSteps, DeliverySection, ContactForm, PaymentSection, OrderSummary } from "../../../components/checkout/index"
import { useCheckoutStore } from '../../../stores/checkout-store'
import { api } from '../../../lib/trpc/client'

type CheckoutStep = 'delivery' | 'contact' | 'payment'

export default function CheckoutPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { items, merchantId, clearCart } = useCart()
  const { subtotal } = useCartTotal()
  const createSession = api.checkout.createSession.useMutation()
  
  const {
    sessionId,
    deliveryMethod,
    deliveryAddress,
    contactInfo,
    setSessionId,
    setContactInfo,
    reset: resetCheckout,
  } = useCheckoutStore()
  
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('delivery')
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [sessionData, setSessionData] = useState<any>(null)
  const [rememberInfo, setRememberInfo] = useState(true)

  // Load saved contact info from localStorage (for convenience)
  useEffect(() => {
    const savedInfo = localStorage.getItem('checkout_contact_info')
    if (savedInfo && !contactInfo?.name) {
      try {
        const parsed = JSON.parse(savedInfo)
        setContactInfo(parsed)
      } catch (e) {
        console.error('Failed to parse saved contact info')
      }
    }
  }, [])

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
    
    if (sessionId) {
      resetCheckout()
    }
    
    setIsCreatingSession(true)

    try {
      const session = await createSession.mutateAsync({
        merchantId,
        items: items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          variant: item.variant ? JSON.stringify(item.variant): undefined,
          notes: item.notes,
        })),
        // No authentication needed!
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
      if (!contactInfo?.name || !contactInfo?.phone) {
        toast({
          title: "Please fill in your name and phone number",
          description: "We need this to contact you about your order",
          variant: "destructive",
        })
        return
      }
      
      // Save contact info if user wants
      if (rememberInfo) {
        localStorage.setItem('checkout_contact_info', JSON.stringify(contactInfo))
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
    return null
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

  const currentSessionData = session || sessionData

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/cart')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Cart</span>
            </Button>
            
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Secure Checkout</span>
            </div>
          </div>
        </div>
      </header>

      {/* No Account Notice */}
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">No account needed!</p>
            <p className="text-blue-700">Just enter your contact details and we'll send order updates to your phone.</p>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CheckoutSteps currentStep={currentStep} />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <Card className="rounded-2xl shadow-sm border-slate-100 overflow-hidden">
              <div className="p-6 sm:p-8">
                {currentStep === 'delivery' && (
                  <DeliverySection 
                    merchantId={currentSessionData.merchant?.id || merchantId!}
                    merchantAddress={currentSessionData.merchant?.address || undefined}
                  />
                )}

                {currentStep === 'contact' && (
                  <div className="space-y-6">
                    <ContactForm />
                    
                    {/* Remember info checkbox */}
                    <div className="flex items-center space-x-2 pt-4 border-t">
                      <input
                        type="checkbox"
                        id="remember"
                        checked={rememberInfo}
                        onChange={(e) => setRememberInfo(e.target.checked)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <label htmlFor="remember" className="text-sm text-gray-700">
                        Save my details for faster checkout next time (stored locally on this device)
                      </label>
                    </div>
                  </div>
                )}

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
                      // Store phone for order tracking (no auth needed!)
                      if (contactInfo?.phone) {
                        localStorage.setItem('last_order_phone', contactInfo.phone)
                        
                        // Store recent order for quick tracking
                        const recentOrders = JSON.parse(localStorage.getItem('recent_orders') || '[]')
                        recentOrders.unshift({
                          orderId,
                          orderNumber,
                          merchantName: currentSessionData.merchant.businessName,
                          date: new Date().toISOString(),
                          total,
                        })
                        // Keep only last 10 orders
                        localStorage.setItem('recent_orders', JSON.stringify(recentOrders.slice(0, 10)))
                      }
                      
                      clearCart()
                      resetCheckout()
                      router.push(`/order/${orderNumber}/track`)
                    }}
                  />
                )}

                {/* Navigation buttons */}
                {currentStep !== 'payment' && (
                  <div className="mt-8 flex justify-between">
                    {currentStep !== 'delivery' && (
                      <Button
                        variant="outline"
                        onClick={handleBack}
                        className="rounded-xl"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                    )}

                    <Button
                      onClick={handleNext}
                      className="ml-auto bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transform hover:-translate-y-0.5 transition-all"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Track Order Link */}
            {currentStep === 'contact' && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Already placed an order?{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-orange-600"
                    onClick={() => router.push('/track')}
                  >
                    Track it with your phone number
                  </Button>
                </p>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
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