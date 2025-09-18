import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@kitchencloud/ui"

interface PaymentInstructionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentInstructionsDialog({ 
  open, 
  onOpenChange 
}: PaymentInstructionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How to Pay with PayNow</DialogTitle>
          <DialogDescription>
            Step-by-step guide for different banking apps
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* DBS/POSB */}
          <div>
            <h3 className="font-semibold mb-2">DBS/POSB</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Open DBS/POSB digibank app</li>
              <li>Tap "Pay & Transfer" → "PayNow"</li>
              <li>Scan QR code or enter mobile number</li>
              <li>Enter the payment amount</li>
              <li>Add payment reference in "Comments"</li>
              <li>Review and tap "Pay Now"</li>
              <li>Take a screenshot of the confirmation</li>
            </ol>
          </div>
          
          {/* OCBC */}
          <div>
            <h3 className="font-semibold mb-2">OCBC</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Open OCBC Digital app</li>
              <li>Tap "Pay Anyone" → "PayNow"</li>
              <li>Scan QR or enter mobile number</li>
              <li>Enter amount and reference</li>
              <li>Confirm with your PIN/biometric</li>
              <li>Save the transaction receipt</li>
            </ol>
          </div>
          
          {/* UOB */}
          <div>
            <h3 className="font-semibold mb-2">UOB</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Open UOB TMRW app</li>
              <li>Select "Transfer" → "To Mobile Number"</li>
              <li>Enter mobile number or scan QR</li>
              <li>Input amount and reference</li>
              <li>Verify and confirm payment</li>
              <li>Screenshot the confirmation page</li>
            </ol>
          </div>
          
          {/* Important Notes */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-900 mb-2">Important Notes</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-amber-800">
              <li>Always include the payment reference for faster verification</li>
              <li>Ensure the payment amount matches exactly</li>
              <li>Upload a clear screenshot showing the transaction details</li>
              <li>Keep the original receipt for your records</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}