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
import { api } from '@/lib/tprc/client'

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
  const uploadProof = api.payment.uploadProof.useMutation()
  
  const completeCheckout = api.checkout.complete.useMutation({
    onSuccess: async (data) => {
      // Upload payment proof if available
      if (paymentProof) {
        try {
          await uploadProof.mutateAsync({
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
    
    completeCheckout.mutate({
      sessionId,
      contactInfo,
      deliveryAddress: deliveryMethod === 'DELIVERY' ? deliveryAddress : undefined,
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
              <span className="font-mono font-semibold bg-gray-100 px-1 rounded">
                {paymentReference}
              </span>
            </li>
            <li>Complete the payment and take a screenshot</li>
            <li>Upload the screenshot below</li>
          </ol>
        </AlertDescription>
      </Alert>
      
      {/* Show detailed instructions button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowInstructions(true)}
        className="w-full"
      >
        <Smartphone className="mr-2 h-4 w-4" />
        View Step-by-Step Instructions
      </Button>
      
      {/* PayNow QR Code */}
      {merchant.paynowQrCode && (
        <div className="space-y-4">
          <PaynowQR
            qrCodeUrl={merchant.paynowQrCode}
            amount={amount}
            reference={paymentReference}
            merchantName={merchant.businessName}
          />
        </div>
      )}
      
      {/* Manual PayNow Details */}
      <Card>
        <div className="p-4 space-y-3">
          <h3 className="font-medium text-sm">Manual Payment Details</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">PayNow Number:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">
                  {merchant.paynowNumber || 'Not available'}
                </span>
                {merchant.paynowNumber && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy(merchant.paynowNumber!, 'PayNow number')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Payment Reference:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold bg-yellow-100 px-2 py-1 rounded">
                  {paymentReference}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopy(paymentReference, 'Payment reference')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <Alert className="mt-3">
            <AlertDescription className="text-xs">
              <strong>Important:</strong> Please include the payment reference in your transfer description. 
              This helps the merchant identify your payment quickly.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
      
      {/* Payment Proof Upload */}
      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-2">Upload Payment Proof</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Take a screenshot after completing your PayNow transfer
          </p>
        </div>
        
        <PaymentUpload
          onUpload={handleProofUpload}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
          uploadedUrl={paymentProof}
        />
        
        {paymentProof && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Payment proof uploaded successfully. You can now complete your order.
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      {/* Complete Order Button */}
      <Button
        size="lg"
        className="w-full"
        onClick={handleCompleteOrder}
        disabled={!paymentProof || isCompleting || isUploading}
      >
        {isCompleting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Placing Order...
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-5 w-5" />
            Complete Order
          </>
        )}
      </Button>
      
      {/* Security Note */}
      <p className="text-xs text-center text-muted-foreground">
        Your payment information is secure. The merchant will verify your payment 
        and confirm your order shortly.
      </p>
      
      {/* Instructions Dialog */}
      <PaymentInstructionsDialog 
        open={showInstructions}
        onOpenChange={setShowInstructions}
      />
    </div>
  )
}