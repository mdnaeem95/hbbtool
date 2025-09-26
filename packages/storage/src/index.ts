// packages/storage/src/index.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Validation schemas
export const ImageUploadSchema = z.object({
  file: z.instanceof(File).or(z.instanceof(Buffer)),
  maxSizeInMB: z.number().default(5),
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/webp']),
})

// Types
export type ImageUploadOptions = z.infer<typeof ImageUploadSchema>

export interface StorageConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceKey?: string
}

export interface UploadResult {
  url: string
  path: string
  size: number
  mimeType: string
}

// Main Storage Service (Browser & Server Compatible)
export class SupabaseStorageService {
  private supabase: SupabaseClient
  private serviceSupabase?: SupabaseClient

  private getClient(): SupabaseClient {
    return this.serviceSupabase || this.supabase
  }

  constructor(config: StorageConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey)
    
    if (config.supabaseServiceKey) {
      this.serviceSupabase = createClient(config.supabaseUrl, config.supabaseServiceKey)
    }
  }

  // ============= PUBLIC UPLOADS =============

  async uploadProductImage(
    file: File | Buffer,
    merchantId: string,
    productId: string,
    options?: Partial<ImageUploadOptions>
  ): Promise<UploadResult> {
    const validated = ImageUploadSchema.parse({ file, ...options })
    
    // Validate file size and type
    await this.validateFile(validated)
    
    // Convert to buffer/blob
    const data = await this.fileToData(file)
    
    // Generate unique filename
    const timestamp = Date.now()
    const uuid = this.generateUUID()
    const extension = this.getFileExtension(file)
    const filename = `${timestamp}-${uuid}.${extension}`
    const path = `products/${merchantId}/${productId}/${filename}`

    const client = this.getClient()
    
    // Upload image
    const { data: uploadData, error } = await client.storage
      .from('public')
      .upload(path, data, {
        contentType: this.getMimeType(file),
        cacheControl: '31536000, immutable', // 1 year cache
        upsert: false,
      })
    
    if (error) throw new Error(`Upload failed: ${error.message} for ${uploadData}`)
    
    // Get public URL
    const { data: { publicUrl } } = client.storage
      .from('public')
      .getPublicUrl(path)
    
    return {
      url: publicUrl,
      path,
      size: file instanceof File ? file.size : file.length,
      mimeType: this.getMimeType(file),
    }
  }

  async uploadMerchantLogo(
    file: File | Buffer,
    merchantId: string
  ): Promise<UploadResult> {
    const data = await this.fileToData(file)
    const extension = this.getFileExtension(file)
    const filename = `logo-${Date.now()}.${extension}`
    const path = `merchants/${merchantId}/${filename}`

    const client = this.getClient()
    
    const { data: uploadData, error } = await client.storage
      .from('public')
      .upload(path, data, {
        contentType: this.getMimeType(file),
        cacheControl: '604800', // 1 week cache
        upsert: true, // Allow overwriting logo
      })
    
    if (error) throw new Error(`Logo upload failed: ${error.message} for ${uploadData}`)
    
    const { data: { publicUrl } } = client.storage
      .from('public')
      .getPublicUrl(path)
    
    return {
      url: publicUrl,
      path,
      size: file instanceof File ? file.size : file.length,
      mimeType: this.getMimeType(file),
    }
  }

  async uploadCategoryImage(
    file: File | Buffer,
    categoryId: string
  ): Promise<UploadResult> {
    const data = await this.fileToData(file)
    const extension = this.getFileExtension(file)
    const filename = `${Date.now()}-${this.generateUUID()}.${extension}`
    const path = `categories/${categoryId}/${filename}`

    const client = this.getClient()
    
    const { data: uploadData, error } = await client.storage
      .from('public')
      .upload(path, data, {
        contentType: this.getMimeType(file),
        cacheControl: '2592000', // 30 days cache
        upsert: false,
      })
    
    if (error) throw new Error(`Category image upload failed: ${error.message} for ${uploadData}`)
    
    const { data: { publicUrl } } = client.storage
      .from('public')
      .getPublicUrl(path)
    
    return {
      url: publicUrl,
      path,
      size: file instanceof File ? file.size : file.length,
      mimeType: this.getMimeType(file),
    }
  }

  // ============= PRIVATE UPLOADS =============

  async uploadPaymentProof(
    file: File | Buffer,
    orderId: string,
    customerId?: string
  ): Promise<UploadResult> {
    console.log(customerId)
    const data = await this.fileToData(file)
    const timestamp = Date.now()
    const hash = this.generateUUID()
    const extension = this.getFileExtension(file)
    const filename = `${timestamp}-${hash}.${extension}`
    const path = `payments/${orderId}/${filename}`
    
    const client = this.getClient()
    
    const { data: uploadData, error } = await client.storage
      .from('private')
      .upload(path, data, {
        contentType: this.getMimeType(file),
      })
    
    if (error) throw new Error(`Payment proof upload failed: ${error.message} for ${uploadData}`)
    
    // Generate a signed URL (valid for 7 days)
    const { data: signedUrlData, error: urlError } = await client.storage
      .from('private')
      .createSignedUrl(path, 604800) // 7 days
    
    if (urlError || !signedUrlData) {
      throw new Error('Failed to generate signed URL')
    }
    
    return {
      url: signedUrlData.signedUrl,
      path,
      size: file instanceof File ? file.size : file.length,
      mimeType: this.getMimeType(file),
    }
  }

  async uploadPayNowQR(
    file: File | Buffer,
    merchantId: string
  ): Promise<UploadResult> {
    const data = await this.fileToData(file)
    const extension = this.getFileExtension(file)
    const filename = `paynow-qr-${Date.now()}.${extension}`
    const path = `merchants/${merchantId}/payment/${filename}`

    const client = this.getClient()
    
    const { data: uploadData, error } = await client.storage
      .from('public')
      .upload(path, data, {
        contentType: this.getMimeType(file),
        cacheControl: '86400', // 1 day cache
        upsert: true, // Allow updating QR code
      })
    
    if (error) throw new Error(`PayNow QR upload failed: ${error.message} for ${uploadData}`)
    
    const { data: { publicUrl } } = client.storage
      .from('public')
      .getPublicUrl(path)
    
    return {
      url: publicUrl,
      path,
      size: file instanceof File ? file.size : file.length,
      mimeType: this.getMimeType(file),
    }
  }

  // ============= DELETE OPERATIONS =============

  async deleteImage(bucket: 'public' | 'private', path: string): Promise<void> {
    const client = this.getClient()
    const { error } = await client.storage
      .from(bucket)
      .remove([path])
    
    if (error) throw new Error(`Delete failed: ${error.message}`)
  }

  async deleteProductImages(merchantId: string, productId: string): Promise<void> {
    const client = this.getClient()
    const { data, error } = await client.storage
      .from('public')
      .list(`products/${merchantId}/${productId}`)
    
    if (error) throw new Error(`List failed: ${error.message}`)
    
    if (data && data.length > 0) {
      const paths = data.map(file => `products/${merchantId}/${productId}/${file.name}`)
      const { error: deleteError } = await client.storage
        .from('public')
        .remove(paths)
      
      if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`)
    }
  }

  // ============= GET SIGNED URLS =============

  async getSignedUrl(
    bucket: 'public' | 'private',
    path: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const client = this.getClient()
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
    
    if (error || !data) throw new Error(`Failed to generate signed URL: ${error?.message}`)
    
    return data.signedUrl
  }

  async refreshPaymentProofUrl(existingPath: string): Promise<string> {
    return this.getSignedUrl('private', existingPath, 604800) // 7 days
  }

  // ============= BULK OPERATIONS =============

  async uploadMultipleProductImages(
    files: File[],
    merchantId: string,
    productId: string,
    maxConcurrent: number = 3
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = []
    
    // Process in batches to avoid overwhelming the server
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent)
      const batchResults = await Promise.all(
        batch.map(file => this.uploadProductImage(file, merchantId, productId))
      )
      results.push(...batchResults)
    }
    
    return results
  }

  // ============= URL UTILITIES =============

  getPublicUrl(path: string): string {
    const client = this.getClient()
    const { data: { publicUrl } } = client.storage
      .from('public')
      .getPublicUrl(path)
    
    return publicUrl
  }

  extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url)
      const match = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/(.+)/)
      return match ? match[1]! : null
    } catch {
      return null
    }
  }

  // ============= HELPER METHODS =============

  private async fileToData(file: File | Buffer): Promise<Blob | Buffer> {
    if (Buffer.isBuffer(file)) {
      return file
    }
    // File can be used directly as Blob in browser
    return file
  }

  private async validateFile(options: ImageUploadOptions): Promise<void> {
    if (options.file instanceof File) {
      // Check file size
      const sizeInMB = options.file.size / (1024 * 1024)
      if (sizeInMB > options.maxSizeInMB) {
        throw new Error(`File size exceeds ${options.maxSizeInMB}MB limit`)
      }
      
      // Check file type
      if (!options.allowedTypes.includes(options.file.type)) {
        throw new Error(`File type ${options.file.type} not allowed`)
      }
    }
  }

  private getMimeType(file: File | Buffer): string {
    if (file instanceof File) {
      return file.type
    }
    // Default to JPEG for buffers
    return 'image/jpeg'
  }

  private getFileExtension(file: File | Buffer): string {
    if (file instanceof File) {
      const parts = file.name.split('.')
      if (parts.length > 1) {
        return parts[parts.length - 1]!.toLowerCase()
      }
      // Fallback based on mime type
      const mimeExtMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
      }
      return mimeExtMap[file.type] || 'jpg'
    }
    // Default to jpg for buffers
    return 'jpg'
  }

  private generateUUID(): string {
    // Simple UUID generator that works in browser and Node
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().slice(0, 8)
    }
    // Fallback for older environments
    return Math.random().toString(36).substring(2, 10)
  }
}