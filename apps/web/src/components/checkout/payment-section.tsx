'use client'

import { useState, useEffect, useRef } from 'react'
import { Button, Card, Label, Input, useToast } from '@kitchencloud/ui'
import { Upload, Copy, CheckCircle } from 'lucide-react'
import { api } from '@/lib/trpc/client'
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
  const hasCompletedRef = useRef(false)
  
  const generateQR = api.payment.generateQR.useMutation()
  const uploadProof = api.payment.uploadProof.useMutation()
  const completeOrder = api.checkout.complete.useMutation()
  
  // Complete the order when component mounts
  useEffect(() => {
    // Prevent double execution and only run on client
    if (!hasCompletedRef.current && !orderId && typeof window !== 'undefined') {
      hasCompletedRef.current = true
      handleCompleteOrder()
    }
  }, []) // Empty deps array - only run once
  
  const handleCompleteOrder = async () => {
    if (isCompleting || orderId) return // Prevent duplicate calls
    
    setIsCompleting(true)
    try {
      // Only include delivery address if delivery method is DELIVERY
      const completeData: any = {
        sessionId,
        contactInfo: props.contactInfo,
        deliveryMethod: props.deliveryMethod as any
      }
      
      // Only add delivery address for delivery orders
      if (props.deliveryMethod === 'DELIVERY') {
        completeData.deliveryAddress = props.deliveryAddress
      }
      
      const result = await completeOrder.mutateAsync(completeData)
      
      setOrderId(result.orderId)
      setOrderNumber(result.orderNumber)
      
      // Generate QR code if merchant has PayNow
      if (merchant.paynowNumber || merchant.paynowQrCode) {
        try {
          const qrResult = await generateQR.mutateAsync({
            orderId: result.orderId
          })
          
          setQrCode(qrResult.qrCode || undefined)
        } catch (err) {
          console.error('Failed to generate QR code:', err)
        }
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast({
        title: 'Error',
        description: 'Failed to process order. Please try again.',
        variant: 'destructive'
      })
      // Optionally navigate back
      // router.push('/checkout')
    } finally {
      setIsCompleting(false)
    }
  }
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !orderId) return
    
    // For now, create a simple data URL
    const reader = new FileReader()
    reader.onloadend = async () => {
      const dataUrl = reader.result as string
      setProofUrl(dataUrl)
      
      try {
        // Upload proof
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
        toast({
          title: 'Upload failed',
          description: 'Please try uploading again.',
          variant: 'destructive'
        })
      }
    }
    reader.readAsDataURL(file)
  }
  
  const handleCopyPayNow = () => {
    if (merchant.paynowNumber) {
      navigator.clipboard.writeText(merchant.paynowNumber)
      toast({
        title: 'Copied!',
        description: 'PayNow number copied to clipboard'
      })
    }
  }
  
  const handleComplete = () => {
    if (!orderId || !orderNumber) return
    
    // Call the parent's onSuccess callback
    onSuccess(orderId, orderNumber)
  }

  // Loading state while creating order
  if (isCompleting) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Creating your order...</p>
      </div>
    )
  }

  // Error state
  if (!orderId && !isCompleting) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">Failed to create order</p>
        <Button onClick={handleCompleteOrder} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Payment</h2>
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Order Total</h3>
              <p className="text-2xl font-bold">S${amount.toFixed(2)}</p>
            </div>

            {merchant.paynowNumber && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">PayNow Details</h3>
                  <div className="flex items-center gap-2">
                    <Input
                      value={merchant.paynowNumber}
                      readOnly
                      className="font-mono"
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

                {qrCode && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Scan to Pay</h3>
                    <div className="bg-white p-4 rounded-lg inline-block">
                      <Image
                        src={qrCode}
                        alt="PayNow QR Code"
                        width={200}
                        height={200}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Upload Payment Proof</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="transactionId">Transaction ID (Optional)</Label>
                  <Input
                    id="transactionId"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction reference"
                  />
                </div>

                <div>
                  <Label htmlFor="proof">Payment Screenshot</Label>
                  <div className="mt-2">
                    <label
                      htmlFor="proof"
                      className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary"
                    >
                      {proofUrl ? (
                        <div className="text-center">
                          <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                          <p className="text-sm text-green-600">Proof uploaded</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload payment proof
                          </p>
                        </div>
                      )}
                    </label>
                    <input
                      id="proof"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Button
                onClick={handleComplete}
                className="w-full"
                size="lg"
              >
                Complete Order
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                You can upload payment proof later from your order page
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}