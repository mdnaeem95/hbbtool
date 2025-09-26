import { useState } from 'react'
import { Button, Card } from '@homejiak/ui'
import { Upload, X, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { api } from '../../lib/trpc/client'

export function MerchantLogoUpload() {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  
  const utils = api.useUtils()
  const { data: merchant } = api.merchant.get.useQuery()
  
  const uploadLogo = api.storage.uploadMerchantLogo.useMutation({
    onSuccess: () => {
      utils.merchant.get.invalidate()
      setPreview(null)
    },
  })
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert('File size must be less than 2MB')
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
        await uploadLogo.mutateAsync({ base64 })
        alert('Logo uploaded successfully!')
      } catch (error) {
        alert('Failed to upload logo')
        setPreview(null)
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }
  
  const currentLogo = preview || merchant?.logoUrl
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Business Logo</h3>
      
      <div className="flex items-start gap-6">
        {currentLogo && (
          <div className="relative w-32 h-32">
            <Image
              src={currentLogo}
              alt="Business logo"
              fill
              className="object-cover rounded-lg"
            />
            {preview && (
              <Button
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2"
                onClick={() => {
                  URL.revokeObjectURL(preview)
                  setPreview(null)
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
        
        <div className="flex-1">
          <input
            type="file"
            id="logo-upload"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          
          <label
            htmlFor="logo-upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? 'Uploading...' : 'Upload Logo'}
          </label>
          
          <p className="text-sm text-muted-foreground mt-2">
            Recommended: Square image, at least 512x512px, max 2MB
          </p>
        </div>
      </div>
    </Card>
  )
}