import { createClient, SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { z } from 'zod'

// Validation schemas
export const ImageUploadSchema = z.object({
  file: z.instanceof(File).or(z.instanceof(Buffer)),
  maxSizeInMB: z.number().default(5),
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/webp']),
})

export const ImageVariant = z.object({
  width: z.number(),
  height: z.number().optional(),
  quality: z.number().default(85),
  suffix: z.string(),
  format: z.enum(['jpeg', 'webp', 'png']).default('jpeg'),
})

// Types
export type ImageUploadOptions = z.infer<typeof ImageUploadSchema>
export type ImageVariantConfig = z.infer<typeof ImageVariant>

export interface StorageConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceKey?: string
}

export interface UploadResult {
  url: string
  path: string
  variants?: Record<string, string>
  size: number
  mimeType: string
}

// Main Storage Service
export class SupabaseStorageService {
  private supabase: SupabaseClient
  private serviceSupabase?: SupabaseClient

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
    
    // Convert to buffer if needed
    const buffer = await this.fileToBuffer(file)
    
    // Optimize main image
    const optimized = await this.optimizeImage(buffer, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 85,
      format: 'jpeg',
    })
    
    // Generate unique filename
    const timestamp = Date.now()
    const uuid = crypto.randomUUID().slice(0, 8)
    const filename = `${timestamp}-${uuid}.jpg`
    const path = `products/${merchantId}/${productId}/${filename}`
    
    // Upload main image
    const { data, error } = await this.supabase.storage
      .from('public')
      .upload(path, optimized.buffer, {
        contentType: 'image/jpeg',
        cacheControl: '31536000, immutable', // 1 year cache
        upsert: false,
      })
    
    if (error) throw new Error(`Upload failed: ${error.message} for ${data}`)
    
    // Generate variants
    const variants = await this.generateProductVariants(
      buffer,
      merchantId,
      productId,
      filename
    )
    
    // Get public URL
    const { data: { publicUrl } } = this.supabase.storage
      .from('public')
      .getPublicUrl(path)
    
    return {
      url: publicUrl,
      path,
      variants,
      size: optimized.size,
      mimeType: 'image/jpeg',
    }
  }

  async uploadMerchantLogo(
    file: File | Buffer,
    merchantId: string
  ): Promise<UploadResult> {
    const buffer = await this.fileToBuffer(file)
    
    // Optimize logo - smaller size, maintain quality
    const optimized = await this.optimizeImage(buffer, {
      maxWidth: 512,
      maxHeight: 512,
      quality: 90,
      format: 'webp',
    })
    
    const filename = `logo-${Date.now()}.webp`
    const path = `merchants/${merchantId}/${filename}`
    
    const { data, error } = await this.supabase.storage
      .from('public')
      .upload(path, optimized.buffer, {
        contentType: 'image/webp',
        cacheControl: '604800', // 1 week cache
        upsert: true, // Allow overwriting logo
      })
    
    if (error) throw new Error(`Logo upload failed: ${error.message} for ${data}`)
    
    const { data: { publicUrl } } = this.supabase.storage
      .from('public')
      .getPublicUrl(path)
    
    return {
      url: publicUrl,
      path,
      size: optimized.size,
      mimeType: 'image/webp',
    }
  }

  async uploadCategoryImage(
    file: File | Buffer,
    categoryId: string
  ): Promise<UploadResult> {
    const buffer = await this.fileToBuffer(file)
    
    const optimized = await this.optimizeImage(buffer, {
      maxWidth: 800,
      maxHeight: 600,
      quality: 85,
      format: 'jpeg',
    })
    
    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`
    const path = `categories/${categoryId}/${filename}`
    
    const { data, error } = await this.supabase.storage
      .from('public')
      .upload(path, optimized.buffer, {
        contentType: 'image/jpeg',
        cacheControl: '2592000', // 30 days cache
        upsert: false,
      })
    
    if (error) throw new Error(`Category image upload failed: ${error.message} for ${data}`)
    
    const { data: { publicUrl } } = this.supabase.storage
      .from('public')
      .getPublicUrl(path)
    
    return {
      url: publicUrl,
      path,
      size: optimized.size,
      mimeType: 'image/jpeg',
    }
  }

  // ============= PRIVATE UPLOADS =============

  async uploadPaymentProof(
    file: File | Buffer,
    orderId: string,
    customerId?: string
  ): Promise<UploadResult> {
    console.log('Uploading payment proof for order:', orderId, 'customer:', customerId)
    const buffer = await this.fileToBuffer(file)
    
    // For payment proofs, maintain quality but limit size
    const optimized = await this.optimizeImage(buffer, {
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 90,
      format: 'jpeg',
    })
    
    const timestamp = Date.now()
    const hash = crypto.randomUUID().slice(0, 8)
    const filename = `${timestamp}-${hash}.jpg`
    const path = `payments/${orderId}/${filename}`
    
    // Use service role client if available for private uploads
    const client = this.serviceSupabase || this.supabase
    
    const { data, error } = await client.storage
      .from('private')
      .upload(path, optimized.buffer, {
        contentType: 'image/jpeg',
      })
    
    if (error) throw new Error(`Payment proof upload failed: ${error.message} for ${data}`)
    
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
      size: optimized.size,
      mimeType: 'image/jpeg',
    }
  }

  async uploadPayNowQR(
    file: File | Buffer,
    merchantId: string
  ): Promise<UploadResult> {
    const buffer = await this.fileToBuffer(file)
    
    // QR codes need to maintain clarity
    const optimized = await this.optimizeImage(buffer, {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 95,
      format: 'png', // PNG for QR codes
    })
    
    const filename = `paynow-qr-${Date.now()}.png`
    const path = `merchants/${merchantId}/payment/${filename}`
    
    const { data, error } = await this.supabase.storage
      .from('public')
      .upload(path, optimized.buffer, {
        contentType: 'image/png',
        cacheControl: '86400', // 1 day cache
        upsert: true, // Allow updating QR code
      })
    
    if (error) throw new Error(`PayNow QR upload failed: ${error.message} for ${data}`)
    
    const { data: { publicUrl } } = this.supabase.storage
      .from('public')
      .getPublicUrl(path)
    
    return {
      url: publicUrl,
      path,
      size: optimized.size,
      mimeType: 'image/png',
    }
  }

  // ============= DELETE OPERATIONS =============

  async deleteImage(bucket: 'public' | 'private', path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path])
    
    if (error) throw new Error(`Delete failed: ${error.message}`)
  }

  async deleteProductImages(merchantId: string, productId: string): Promise<void> {
    const { data, error } = await this.supabase.storage
      .from('public')
      .list(`products/${merchantId}/${productId}`)
    
    if (error) throw new Error(`List failed: ${error.message}`)
    
    if (data && data.length > 0) {
      const paths = data.map(file => `products/${merchantId}/${productId}/${file.name}`)
      const { error: deleteError } = await this.supabase.storage
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
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
    
    if (error || !data) throw new Error(`Failed to generate signed URL: ${error?.message}`)
    
    return data.signedUrl
  }

  async refreshPaymentProofUrl(existingPath: string): Promise<string> {
    return this.getSignedUrl('private', existingPath, 604800) // 7 days
  }

  // ============= HELPER METHODS =============

  private async fileToBuffer(file: File | Buffer): Promise<Buffer> {
    if (Buffer.isBuffer(file)) {
      return file
    }
    
    const arrayBuffer = await file.arrayBuffer()
    return Buffer.from(arrayBuffer)
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

  private async optimizeImage(
    buffer: Buffer,
    options: {
      maxWidth?: number
      maxHeight?: number
      quality?: number
      format?: 'jpeg' | 'webp' | 'png'
    }
  ): Promise<{ buffer: Buffer; size: number }> {
    let pipeline = sharp(buffer)
    
    // Resize if needed
    if (options.maxWidth || options.maxHeight) {
      pipeline = pipeline.resize(options.maxWidth, options.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    }
    
    // Convert format and compress
    switch (options.format) {
      case 'webp':
        pipeline = pipeline.webp({ quality: options.quality || 85 })
        break
      case 'png':
        pipeline = pipeline.png({ quality: options.quality || 95 })
        break
      case 'jpeg':
      default:
        pipeline = pipeline.jpeg({ 
          quality: options.quality || 85,
          progressive: true,
        })
    }
    
    const optimized = await pipeline.toBuffer()
    
    return {
      buffer: optimized,
      size: optimized.length,
    }
  }

  private async generateProductVariants(
    originalBuffer: Buffer,
    merchantId: string,
    productId: string,
    originalFilename: string
  ): Promise<Record<string, string>> {
    const variants: ImageVariantConfig[] = [
      { width: 150, height: 150, suffix: 'thumb', quality: 80, format: 'jpeg' },
      { width: 400, suffix: 'small', quality: 85, format: 'jpeg' },
      { width: 800, suffix: 'medium', quality: 85, format: 'jpeg' },
    ]
    
    const variantUrls: Record<string, string> = {}
    
    for (const variant of variants) {
      const optimized = await sharp(originalBuffer)
        .resize(variant.width, variant.height, {
          fit: variant.height ? 'cover' : 'inside',
          position: 'center',
        })
        .jpeg({ quality: variant.quality, progressive: true })
        .toBuffer()
      
      const variantFilename = `${variant.suffix}-${originalFilename}`
      const variantPath = `products/${merchantId}/${productId}/${variantFilename}`
      
      await this.supabase.storage
        .from('public')
        .upload(variantPath, optimized, {
          contentType: 'image/jpeg',
          cacheControl: '31536000, immutable',
        })
      
      const { data: { publicUrl } } = this.supabase.storage
        .from('public')
        .getPublicUrl(variantPath)
      
      variantUrls[variant.suffix] = publicUrl
    }
    
    return variantUrls
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
    const { data: { publicUrl } } = this.supabase.storage
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
}