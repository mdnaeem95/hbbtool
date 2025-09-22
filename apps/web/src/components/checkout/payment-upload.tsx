import { useRef } from 'react'
import { Button, Card } from '@homejiak/ui'
import { Upload, Camera, X, CheckCircle, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface PaymentUploadProps {
  onUpload: (fileUrl: string) => void
  isUploading: boolean
  setIsUploading: (value: boolean) => void
  uploadedUrl?: string
}

export function PaymentUpload({ 
  onUpload, 
  isUploading, 
  setIsUploading,
  uploadedUrl 
}: PaymentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }
    
    setIsUploading(true)
    
    try {
      // TODO: Implement actual file upload to Supabase Storage
      // For now, using a placeholder
      const mockUrl = URL.createObjectURL(file)
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      onUpload(mockUrl)
    } catch (error) {
      alert('Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }
  
  const removeUpload = () => {
    onUpload('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  if (uploadedUrl) {
    return (
      <Card className="relative overflow-hidden">
        <div className="aspect-video relative bg-gray-50">
          <Image
            src={uploadedUrl}
            alt="Payment proof"
            fill
            className="object-contain"
          />
          <Button
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2"
            onClick={removeUpload}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 bg-green-50 border-t border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Payment proof uploaded</span>
          </div>
        </div>
      </Card>
    )
  }
  
  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
      
      <Card 
        className="border-2 border-dashed cursor-pointer hover:border-primary transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="p-8 text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              <p className="text-sm font-medium">Uploading...</p>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">Click to upload payment screenshot</p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG or WebP • Max 5MB
              </p>
            </>
          )}
        </div>
      </Card>
      
      <div className="mt-3 flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          Choose from Gallery
        </Button>
      </div>
    </div>
  )
}