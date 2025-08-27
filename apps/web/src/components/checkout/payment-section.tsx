'use client'

import { useState, useEffect } from 'react'
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
  const [qrCode, setQrCode] = useState<string>()
  const [proofUrl, setProofUrl] = useState<string>()
  const [transactionId, setTransactionId] = useState('')
  const [isCompleting, setIsCompleting] = useState(false)
  
  const generateQR = api.payment.generateQR.useMutation()
  const uploadProof = api.payment.uploadProof.useMutation()
  const completeOrder = api.checkout.complete.useMutation()
  
  // Complete the order first
  useEffect(() => {
    if (!orderId) {
      handleCompleteOrder()
    }
  }, [])
  
  const handleCompleteOrder = async () => {
    setIsCompleting(true)
    try {
      const result = await completeOrder.mutateAsync({
        sessionId,
        contactInfo: props.contactInfo,
        deliveryAddress: props.deliveryAddress,
        deliveryMethod: props.deliveryMethod as any
      })
      
      setOrderId(result.orderId)
      
      // Generate QR code
      const qrResult = await generateQR.mutateAsync({
        orderId: result.orderId
      })
      
      setQrCode(qrResult.qrCode!)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process order',
        variant: 'destructive'
      })
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
      
      // Redirect after a delay
      setTimeout(() => {
        if (orderId) {
          onSuccess(orderId, 'ORDER-' + orderId.slice(-6))
        }
      }, 2000)
    }
    reader.readAsDataURL(file)
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied!',
      duration: 2000
    })
  }
  
  if (isCompleting) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p>Processing your order...</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Complete Payment</h3>
      
      {/* Step 1: PayNow */}
      <Card className="p-6">
        <h4 className="font-medium mb-4">Step 1: Make PayNow Transfer</h4>
        
        {qrCode ? (
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg border inline-block">
              <Image
                src={qrCode}
                alt="PayNow QR"
                width={200}
                height={200}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Scan with your banking app
            </p>
          </div>
        ) : merchant.paynowNumber && (
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-muted rounded">
              <span>PayNow to:</span>
              <div className="flex items-center gap-2">
                <strong>{merchant.paynowNumber}</strong>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(merchant.paynowNumber!)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between p-3 bg-muted rounded">
              <span>Amount:</span>
              <div className="flex items-center gap-2">
                <strong>SGD ${amount.toFixed(2)}</strong>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(amount.toFixed(2))}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
      
      {/* Step 2: Upload Proof */}
      <Card className="p-6">
        <h4 className="font-medium mb-4">Step 2: Upload Payment Proof</h4>
        
        {!proofUrl ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="txn">Transaction Reference (Optional)</Label>
              <Input
                id="txn"
                placeholder="e.g., REF123456"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="proof">Payment Screenshot</Label>
              <label htmlFor="proof" className="block mt-2">
                <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm">Click to upload screenshot</p>
                </div>
              </label>
              <input
                id="proof"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>Payment proof uploaded successfully!</span>
          </div>
        )}
      </Card>
    </div>
  )
}