import { useState, useCallback } from 'react'
import { SupabaseStorageService } from '@homejiak/storage'
import { useToast } from '@homejiak/ui' 

// Initialize storage service
let storageService: SupabaseStorageService | null = null

export function getStorageService() {
  if (!storageService) {
    storageService = new SupabaseStorageService({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    })
  }
  return storageService
}

// ============= HOOKS =============

export function useImageUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const storage = getStorageService()
  const { toast } = useToast()

  const uploadProductImage = useCallback(async (
    file: File,
    merchantId: string,
    productId: string
  ) => {
    setUploading(true)
    setProgress(0)
    
    try {
      // Simulate progress for UX (actual upload is single operation)
      setProgress(30)
      
      const result = await storage.uploadProductImage(file, merchantId, productId)
      
      setProgress(100)
      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      })
      
      return result
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Upload failed',
        variant: 'destructive',
      })
      throw error
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [storage])

  const uploadPaymentProof = useCallback(async (
    file: File,
    orderId: string,
    customerId?: string
  ) => {
    setUploading(true)
    
    try {
      const result = await storage.uploadPaymentProof(file, orderId, customerId)
      toast({
        title: 'Success',
        description: 'Payment proof uploaded',
      })
      return result
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload payment proof',
        variant: 'destructive',
      })
      throw error
    } finally {
      setUploading(false)
    }
  }, [storage])

  const uploadMerchantLogo = useCallback(async (
    file: File,
    merchantId: string
  ) => {
    setUploading(true)
    
    try {
      const result = await storage.uploadMerchantLogo(file, merchantId)
      toast({
        title: 'Success',
        description: 'Logo updated',
      })
      return result
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload logo',
        variant: 'destructive',
      })
      throw error
    } finally {
      setUploading(false)
    }
  }, [storage])

  const deleteImage = useCallback(async (
    bucket: 'public' | 'private',
    path: string
  ) => {
    try {
      await storage.deleteImage(bucket, path)
      toast({
        title: 'Success',
        description: 'Image deleted',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete image',
        variant: 'destructive',
      })
      throw error
    }
  }, [storage])

  return {
    uploadProductImage,
    uploadPaymentProof,
    uploadMerchantLogo,
    deleteImage,
    uploading,
    progress,
  }
}