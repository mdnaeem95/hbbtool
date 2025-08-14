import { useState } from 'react'
import { 
  Button, 
  Card, 
  Alert, 
  AlertDescription,
  Separator,
  useToast,
} from '@kitchencloud/ui'
import { 
  Copy, 
  CheckCircle, 
  Info,
  Smartphone,
  Loader2
} from 'lucide-react'
import { PaynowQR, PaymentUpload, PaymentInstructionsDialog } from "@/components/checkout"
import { api } from '@/components/providers/trpc-provider'

interface PaymentSectionProps {
  sessionId: string
  paymentReference: string
  amount: number
  merchant: {
    businessName: string
    paynowNumber?: string
    paynowQrCode?: string
  }
  contactInfo: {
    name: string
    email: string
    phone: string
  }
  deliveryAddress?: any
  deliveryMethod: 'DELIVERY' | 'PICKUP'
  onSuccess: (orderId: string, orderNumber: string) => void
}

export function PaymentSection({ 
  sessionId,
  paymentReference,
  amount,
  merchant,
  contactInfo,
  deliveryAddress,
  deliveryMethod,
  onSuccess
}: PaymentSectionProps) {
  const { toast } = useToast()
  const [paymentProof, setPaymentProof] = useState<string>()
  const [isUploading, setIsUploading] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  
  const completeCheckout = api.checkout.complete.useMutation({
    onSuccess: async (data) => {
      // Upload payment proof if available
      if (paymentProof) {
        try {
          await api.payment.uploadProof.mutate({
            orderId: data.orderId,
            fileUrl: paymentProof,
            fileName: 'payment-proof.jpg',
            fileSize: 1024 * 1024, // Estimate
            mimeType: 'image/jpeg',
          })
        } catch (error) {
          console.error('Failed to upload payment proof:', error)
        }
      }
      
      toast({
        title: "Order placed successfully!",
        description: `Your order ${data.orderNumber} has been received.`,
      })
      
      onSuccess(data.orderId, data.orderNumber)
    },
    onError: (error) => {
      toast({
        title: "Failed to place order",
        description: error.message,
        variant: "destructive",
      })
      setIsCompleting(false)
    }
  })
  
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    })
  }
  
  const handleProofUpload = (fileUrl: string) => {
    setPaymentProof(fileUrl)
  }
  
  const handleCompleteOrder = async () => {
    if (!paymentProof) {
      toast({
        title: "Payment proof required",
        description: "Please upload a screenshot of your payment",
        variant: "destructive",
      })
      return
    }
    
    setIsCompleting(true)
    
    const deliveryAddressData = deliveryMethod === 'DELIVERY' && deliveryAddress ? {
      line1: deliveryAddress.line1,
      line2: deliveryAddress.line2,
      postalCode: deliveryAddress.postalCode,
      notes: deliveryAddress.notes,
    } : undefined
    
    completeCheckout.mutate({
      sessionId,
      contactInfo,
      deliveryAddress: deliveryAddressData,
      deliveryNotes: deliveryAddress?.notes,
    })
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Payment via PayNow</h2>
        <p className="text-sm text-muted-foreground">
          Secure, instant, and free payment method
        </p>
      </div>
      
      {/* Payment Amount */}
      <Card className="bg-primary/5 border-primary/20">
        <div className="p-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
            <p className="text-3xl font-bold text-primary">${amount.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">Singapore Dollars</p>
          </div>
        </div>
      </Card>
      
      {/* PayNow Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="space-y-3">
          <p className="font-medium">How to pay:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Open your banking app or PayNow</li>
            <li>Scan the QR code below or enter the PayNow number</li>
            <li>
              Enter the exact amount: <span className="font-semibold">${amount.toFixed(2)}</span>
            </li>
            <li>
              Include this reference in payment description:{' '}
              <span className="font-mono font-semibold">{paymentReference}</span>
            </li>
            <li>Complete the payment and take a screenshot</li>
            <li>Upload the screenshot below</li>
          </ol>
        </AlertDescription>
      </Alert>
      
      {/* PayNow Details */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* QR Code */}
        {merchant.paynowQrCode && (
          <Card>
            <div className="p-6">
              <h3 className="font-medium mb-4 text-center">Scan QR Code</h3>
              <PaynowQR qrCode={merchant.paynowQrCode} />
            </div>
          </Card>
        )}
        
        {/* PayNow Number */}
        {merchant.paynowNumber && (
          <Card>
            <div className="p-6">
              <h3 className="font-medium mb-4">PayNow Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">PayNow Number</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-medium">{merchant.paynowNumber}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(merchant.paynowNumber!, 'PayNow number')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Payment Reference</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-medium text-sm">{paymentReference}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(paymentReference, 'Payment reference')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
      
      {/* Upload Payment Proof */}
      <div>
        <h3 className="font-medium mb-3">Upload Payment Proof</h3>
        <PaymentUpload
          onUpload={handleProofUpload}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
          uploadedUrl={paymentProof}
        />
      </div>
      
      {/* Help Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="link"
          onClick={() => setShowInstructions(true)}
          className="text-sm"
        >
          Need help with payment?
        </Button>
      </div>
      
      {/* Complete Order Button */}
      <Button
        size="lg"
        className="w-full"
        onClick={handleCompleteOrder}
        disabled={!paymentProof || isCompleting}
      >
        {isCompleting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Placing Order...
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Complete Order
          </>
        )}
      </Button>
      
      {/* Payment Instructions Dialog */}
      <PaymentInstructionsDialog
        open={showInstructions}
        onOpenChange={setShowInstructions}
      />
    </div>
  )
}