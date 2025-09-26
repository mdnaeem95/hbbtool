import { useState } from 'react'
import { Button, Card, Input } from '@homejiak/ui'
import { Upload, CheckCircle, Loader2, X } from 'lucide-react'
import Image from 'next/image'
import { api } from '../../lib/trpc/client'

interface PaymentProofUploadProps {
  orderId: string
  onSuccess?: () => void
}

export function PaymentProofUpload({ orderId, onSuccess }: PaymentProofUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState('')
  
  const uploadProof = api.storage.uploadPaymentProof.useMutation({
    onSuccess: () => {
      setUploaded(true)
      onSuccess?.()
    },
  })
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB')
      return
    }
    
    setUploading(true)
    
    // Create preview
    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)
    
    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = reader.result as string
      
      try {
        await uploadProof.mutateAsync({
          orderId,
          base64,
          transactionId: transactionId || undefined,
        })
      } catch (error) {
        alert('Failed to upload payment proof')
        setPreview(null)
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }
  
  if (uploaded) {
    return (
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-800">Payment proof uploaded</p>
            <p className="text-sm text-green-600 mt-1">
              We'll verify your payment and update the order status shortly.
            </p>
          </div>
        </div>
      </Card>
    )
  }
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Upload Payment Proof</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">
            Transaction Reference (Optional)
          </label>
          <Input
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="e.g., REF123456789"
            className="mt-1"
          />
        </div>
        
        {preview && (
          <div className="relative w-full aspect-video">
            <Image
              src={preview}
              alt="Payment proof preview"
              fill
              className="object-contain rounded-lg bg-gray-50"
            />
            <Button
              size="sm"
              variant="destructive"
              className="absolute top-2 right-2"
              onClick={() => {
                URL.revokeObjectURL(preview)
                setPreview(null)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <div>
          <input
            type="file"
            id="payment-proof"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          
          <label
            htmlFor="payment-proof"
            className={`flex items-center justify-center gap-2 w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'
            }`}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground" />
            )}
            <span>
              {uploading ? 'Uploading...' : 'Click to upload payment screenshot'}
            </span>
          </label>
          
          <p className="text-xs text-muted-foreground mt-2">
            JPEG, PNG or PDF • Max 10MB
          </p>
        </div>
      </div>
    </Card>
  )
}