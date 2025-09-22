'use client'

import { useState, useEffect, useRef } from 'react'
import { Button, Card, Label, Input, useToast } from '@homejiak/ui'
import { Upload, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '../../lib/trpc/client'
import Image from 'next/image'

interface PaymentSectionProps {
  sessionId: string
  paymentReference?: string
  amount: number
  merchant: {
    businessName: string
    paynowNumber?: string
    paynowQrCode?: string
  }
  contactInfo: any
  deliveryAddress: any
  deliveryMethod: string
  onSuccess: (orderId: string, orderNumber: string) => void
}

export function PaymentSection({
  sessionId,
  amount,
  merchant,
  onSuccess,
  ...props
}: PaymentSectionProps) {
  const { toast } = useToast()
  const [orderId, setOrderId] = useState<string>()
  const [orderNumber, setOrderNumber] = useState<string>()
  const [qrCode, setQrCode] = useState<string>()
  const [proofUrl, setProofUrl] = useState<string>()
  const [transactionId, setTransactionId] = useState('')
  const [isCompleting, setIsCompleting] = useState(false)
  const [completionError, setCompletionError] = useState<string>()
  const initRef = useRef(false)
  
  const generateQR = api.payment.generateQR.useMutation()
  const uploadProof = api.payment.uploadProof.useMutation()
  const completeOrder = api.checkout.complete.useMutation({
    // Handle errors properly
    onError: (error) => {
      console.error('Complete order error:', error)
      setCompletionError(error.message || 'Failed to complete order')
      setIsCompleting(false)
    }
  })
  
  // Initialize order creation
  useEffect(() => {
    // Prevent double initialization in development mode
    if (initRef.current) return
    initRef.current = true
    
    // Only auto-complete if we haven't already created an order
    if (!orderId && !completionError) {
      handleCompleteOrder()
    }
  }, [sessionId]) // Add sessionId as dependency
  
  const handleCompleteOrder = async () => {
    if (isCompleting || orderId) return // Prevent duplicate calls
    
    setIsCompleting(true)
    setCompletionError(undefined)
    
    try {
      // Build complete order data
      const completeData = {
        sessionId,
        contactInfo: {
          name: props.contactInfo.name,
          phone: props.contactInfo.phone,
          email: props.contactInfo.email || undefined
        },
        deliveryMethod: props.deliveryMethod as 'DELIVERY' | 'PICKUP',
        // Only include delivery address for delivery orders
        ...(props.deliveryMethod === 'DELIVERY' && props.deliveryAddress ? {
          deliveryAddress: {
            line1: props.deliveryAddress.line1,
            line2: props.deliveryAddress.line2 || undefined,
            postalCode: props.deliveryAddress.postalCode,
            latitude: props.deliveryAddress.latitude || undefined,
            longitude: props.deliveryAddress.longitude || undefined
          }
        } : {})
      }
      
      console.log('Completing order with data:', completeData)
      
      const result = await completeOrder.mutateAsync(completeData)
      
      if (result.orderId && result.orderNumber) {
        setOrderId(result.orderId)
        setOrderNumber(result.orderNumber)
        
        // Try to generate QR code if merchant has PayNow
        if (merchant.paynowNumber || merchant.paynowQrCode) {
          try {
            const qrResult = await generateQR.mutateAsync({
              orderId: result.orderId
            })
            
            if (qrResult.qrCode) {
              setQrCode(qrResult.qrCode)
            }
          } catch (err) {
            console.error('QR generation failed (non-critical):', err)
            // Don't fail the whole process if QR generation fails
          }
        }
        
        toast({
          title: 'Order created!',
          description: `Order #${result.orderNumber} has been created successfully.`
        })
      }
    } catch (error: any) {
      console.error('Order completion error:', error)
      
      // Check for specific error types
      if (error.message?.includes('Session not found') || error.message?.includes('expired')) {
        setCompletionError('Your checkout session has expired. Please return to cart and try again.')
      } else {
        setCompletionError(error.message || 'Failed to create order. Please try again.')
      }
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to create order',
        variant: 'destructive'
      })
    } finally {
      setIsCompleting(false)
    }
  }
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !orderId) return
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive'
      })
      return
    }
    
    // Create data URL for preview
    const reader = new FileReader()
    reader.onloadend = async () => {
      const dataUrl = reader.result as string
      setProofUrl(dataUrl)
      
      try {
        await uploadProof.mutateAsync({
          orderId,
          proofUrl: dataUrl,
          transactionId: transactionId || undefined
        })
        
        toast({
          title: 'Payment proof uploaded',
          description: 'The merchant will verify your payment shortly.'
        })
      } catch (error) {
        console.error('Upload error:', error)
        toast({
          title: 'Upload failed',
          description: 'Please try uploading again.',
          variant: 'destructive'
        })
        setProofUrl(undefined) // Clear preview on error
      }
    }
    reader.readAsDataURL(file)
  }
  
  const handleCopyPayNow = () => {
    if (merchant.paynowNumber) {
      navigator.clipboard.writeText(merchant.paynowNumber)
      toast({
        title: 'Copied!',
        description: 'PayNow number copied to clipboard',
        duration: 2000
      })
    }
  }
  
  const handleComplete = () => {
    if (!orderId || !orderNumber) {
      toast({
        title: 'Order not ready',
        description: 'Please wait for the order to be created',
        variant: 'destructive'
      })
      return
    }
    
    // Call the parent's onSuccess callback
    onSuccess(orderId, orderNumber)
  }

  // Loading state while creating order
  if (isCompleting) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Creating your order...</p>
        <p className="text-sm text-muted-foreground mt-2">Please do not refresh the page</p>
      </div>
    )
  }

  // Error state with better messaging
  if (completionError) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <div>
            <h3 className="font-semibold text-lg mb-2">Unable to complete order</h3>
            <p className="text-sm text-muted-foreground mb-4">{completionError}</p>
          </div>
          <div className="space-y-2">
            <Button 
              onClick={handleCompleteOrder} 
              variant="default"
              className="w-full"
              disabled={isCompleting}
            >
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.href = '/cart'} 
              variant="outline"
              className="w-full"
            >
              Return to Cart
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  // Success state - show payment instructions
  if (orderId && orderNumber) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Complete Payment</h2>
          
          {/* Order confirmation */}
          <Card className="p-4 mb-4 bg-green-50 border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Order #{orderNumber} created!</p>
                <p className="text-sm text-green-700 mt-1">
                  Please complete payment to confirm your order
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              {/* Amount to pay */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Amount to Pay</h3>
                <p className="text-3xl font-bold">S${amount.toFixed(2)}</p>
              </div>

              {/* PayNow details */}
              {merchant.paynowNumber && (
                <>
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-3">PayNow Transfer</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm text-muted-foreground">PayNow Number/UEN</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={merchant.paynowNumber}
                            readOnly
                            className="font-mono text-lg"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleCopyPayNow}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <p>• Transfer S${amount.toFixed(2)} to the PayNow number above</p>
                        <p>• Include order #{orderNumber} in the reference (if possible)</p>
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  {(qrCode || merchant.paynowQrCode) && (
                    <div className="border-t pt-4">
                      <h3 className="font-medium mb-3">Or Scan QR Code</h3>
                      <div className="bg-white p-4 rounded-lg inline-block border">
                        <Image
                          src={qrCode || merchant.paynowQrCode!}
                          alt="PayNow QR Code"
                          width={200}
                          height={200}
                          className="max-w-full h-auto"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Upload proof section */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Upload Payment Proof</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="transactionId" className="text-sm">
                      Transaction Reference (Optional)
                    </Label>
                    <Input
                      id="transactionId"
                      value={transactionId}
                      onChange={(e: any) => setTransactionId(e.target.value)}
                      placeholder="e.g., TXN123456"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Payment Screenshot</Label>
                    <div className="mt-2">
                      <label
                        htmlFor="proof"
                        className={`flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                          proofUrl 
                            ? 'border-green-500 bg-green-50 hover:bg-green-100' 
                            : 'hover:border-primary hover:bg-slate-50'
                        }`}
                      >
                        {proofUrl ? (
                          <div className="text-center">
                            <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" />
                            <p className="text-sm font-medium text-green-700">Payment proof uploaded</p>
                            <p className="text-xs text-green-600 mt-1">Click to replace</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Click to upload payment screenshot
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Max size: 5MB (JPG, PNG)
                            </p>
                          </div>
                        )}
                      </label>
                      <input
                        id="proof"
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Complete button */}
              <div className="border-t pt-4">
                <Button
                  onClick={handleComplete}
                  className="w-full"
                  size="lg"
                >
                  Complete Order
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  You can upload payment proof later from your order tracking page
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Fallback - this shouldn't normally show
  return null
}