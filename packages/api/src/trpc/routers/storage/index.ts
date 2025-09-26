import { z } from 'zod'
import sharp from 'sharp'
import { SupabaseStorageService } from '@homejiak/storage'
import { TRPCError } from '@trpc/server'
import { protectedProcedure, publicProcedure, router } from '../../core'

// Initialize storage service with service role key for server-side operations
const storage = new SupabaseStorageService({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
})

// ============= IMAGE OPTIMIZATION HELPERS =============

interface OptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'webp' | 'png'
}

async function optimizeImage(
  buffer: Buffer,
  options: OptimizationOptions = {}
): Promise<Buffer> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 85,
    format = 'jpeg'
  } = options

  let pipeline = sharp(buffer)

  // Auto-rotate based on EXIF data
  pipeline = pipeline.rotate()

  // Resize if needed
  if (maxWidth || maxHeight) {
    pipeline = pipeline.resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
  }

  // Convert format and compress
  switch (format) {
    case 'webp':
      pipeline = pipeline.webp({ quality })
      break
    case 'png':
      pipeline = pipeline.png({ quality })
      break
    case 'jpeg':
    default:
      pipeline = pipeline.jpeg({ 
        quality,
        progressive: true,
        mozjpeg: true // Better compression
      })
  }

  return pipeline.toBuffer()
}

async function generateImageVariants(
  buffer: Buffer,
  merchantId: string,
  productId: string
): Promise<Record<string, Buffer>> {
  console.log(merchantId, productId)
  const variants: Record<string, Buffer> = {}

  // Generate thumbnail
  variants.thumb = await sharp(buffer)
    .resize(150, 150, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer()

  // Generate small version for cards
  variants.small = await sharp(buffer)
    .resize(400, 400, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer()

  // Generate medium version for product pages
  variants.medium = await sharp(buffer)
    .resize(800, 800, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer()

  return variants
}

// Helper to convert base64 to Buffer
function base64ToBuffer(base64: string): Buffer {
  if (!base64) {
    throw new Error('Invalid base64 string: empty input')
  }
  
  // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
  const base64Data = base64.includes(',') 
    ? base64.substring(base64.indexOf(',') + 1)
    : base64
  
  // Validate we have actual data
  if (!base64Data || base64Data.length === 0) {
    throw new Error('Invalid base64 string: no data after processing')
  }
  
  return Buffer.from(base64Data, 'base64')
}

export const storageRouter = router({
  // ============= PRODUCT IMAGES =============
  
  uploadProductImage: protectedProcedure
    .input(z.object({
      productId: z.string().cuid(),
      base64: z.string(),
      position: z.number().optional(),
      skipOptimization: z.boolean().optional(), // Allow skipping for already optimized images
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify merchant owns the product
      const product = await ctx.db.product.findUnique({
        where: { 
          id: input.productId,
          merchantId: ctx.session!.user.id,
        },
      })
      
      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found or unauthorized',
        })
      }
      
      // Check image limit
      if (product.images.length >= 10) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Maximum 10 images per product',
        })
      }
      
      try {
        // Convert base64 to buffer
        const originalBuffer = base64ToBuffer(input.base64)
        
        // Optimize image unless explicitly skipped
        const optimizedBuffer = input.skipOptimization 
          ? originalBuffer 
          : await optimizeImage(originalBuffer, {
              maxWidth: 1200,
              maxHeight: 1200,
              quality: 85,
              format: 'jpeg'
            })
        
        // Upload main image
        const result = await storage.uploadProductImage(
          optimizedBuffer,
          ctx.session!.user.id,
          input.productId
        )
        
        // Generate and upload variants
        const variants = await generateImageVariants(
          originalBuffer,
          ctx.session!.user.id,
          input.productId
        )
        
        const variantUrls: Record<string, string> = {}
        
        for (const [suffix, variantBuffer] of Object.entries(variants)) {
          const timestamp = Date.now()
          const uuid = crypto.randomUUID().slice(0, 8)
          const variantResult = await storage.uploadProductImage(
            variantBuffer,
            ctx.session!.user.id,
            input.productId,
            { 
              // Custom path for variants
              customPath: `products/${ctx.session!.user.id}/${input.productId}/${suffix}-${timestamp}-${uuid}.jpg`
            } as any
          )
          variantUrls[suffix] = variantResult.url
        }
        
        // Update product with new image
        const updatedProduct = await ctx.db.product.update({
          where: { id: input.productId },
          data: {
            images: {
              push: result.url,
            },
            updatedAt: new Date(),
          },
        })
                
        return {
          success: true,
          url: result.url,
          variants: variantUrls,
          product: updatedProduct,
        }
      } catch (error) {
        console.error('Upload error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to upload image',
        })
      }
    }),

  uploadMultipleProductImages: protectedProcedure
    .input(z.object({
      productId: z.string().cuid(),
      images: z.array(z.object({
        base64: z.string(),
        position: z.number().optional(),
      })).max(5), // Max 5 at once
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const product = await ctx.db.product.findUnique({
        where: { 
          id: input.productId,
          merchantId: ctx.session!.user.id,
        },
      })
      
      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        })
      }
      
      // Process and upload images with optimization
      const uploadPromises = input.images.map(async (image) => {
        const originalBuffer = base64ToBuffer(image.base64)
        
        // Optimize each image
        const optimizedBuffer = await optimizeImage(originalBuffer, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 85,
          format: 'jpeg'
        })
        
        return storage.uploadProductImage(
          optimizedBuffer,
          ctx.session!.user.id,
          input.productId
        )
      })
      
      const results = await Promise.all(uploadPromises)
      
      // Update product with all new images
      const newImageUrls = results.map(r => r.url)
      const updatedProduct = await ctx.db.product.update({
        where: { id: input.productId },
        data: {
          images: {
            push: newImageUrls,
          },
        },
      })
      
      return {
        success: true,
        images: results,
        product: updatedProduct,
      }
    }),

  deleteProductImage: protectedProcedure
    .input(z.object({
      productId: z.string().cuid(),
      imageUrl: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const product = await ctx.db.product.findUnique({
        where: { 
          id: input.productId,
          merchantId: ctx.session!.user.id,
        },
      })
      
      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        })
      }
      
      // Extract path from URL
      const path = storage.extractPathFromUrl(input.imageUrl)
      if (!path) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid image URL',
        })
      }
      
      // Delete from storage
      await storage.deleteImage('public', path)
      
      // Remove from product
      const updatedImages = product.images.filter((img: any) => img !== input.imageUrl)
      const updatedProduct = await ctx.db.product.update({
        where: { id: input.productId },
        data: {
          images: updatedImages,
        },
      })
      
      return {
        success: true,
        product: updatedProduct,
      }
    }),

  reorderProductImages: protectedProcedure
    .input(z.object({
      productId: z.string().cuid(),
      imageUrls: z.array(z.string().url()),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership and that all images belong to product
      const product = await ctx.db.product.findUnique({
        where: { 
          id: input.productId,
          merchantId: ctx.session!.user.id,
        },
      })
      
      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        })
      }
      
      // Verify all images are valid
      const currentImageSet = new Set(product.images)
      const newImageSet = new Set(input.imageUrls)
      
      if (currentImageSet.size !== newImageSet.size) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Image count mismatch',
        })
      }
      
      // Update order
      const updatedProduct = await ctx.db.product.update({
        where: { id: input.productId },
        data: {
          images: input.imageUrls,
        },
      })
      
      return {
        success: true,
        product: updatedProduct,
      }
    }),

  // ============= MERCHANT ASSETS =============

  uploadMerchantLogo: protectedProcedure
    .input(z.object({
      base64: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const merchantId = ctx.session!.user.id
      
      try {
        // Get current logo to delete old one
        const merchant = await ctx.db.merchant.findUnique({
          where: { id: merchantId },
          select: { logoUrl: true },
        })
        
        // Convert and optimize logo
        const originalBuffer = base64ToBuffer(input.base64)
        const optimizedBuffer = await optimizeImage(originalBuffer, {
          maxWidth: 512,
          maxHeight: 512,
          quality: 90,
          format: 'webp' // WebP for logos
        })
        
        // Upload new logo
        const result = await storage.uploadMerchantLogo(optimizedBuffer, merchantId)
        
        // Delete old logo if exists
        if (merchant?.logoUrl) {
          const oldPath = storage.extractPathFromUrl(merchant.logoUrl)
          if (oldPath) {
            await storage.deleteImage('public', oldPath).catch(console.error)
          }
        }
        
        // Update merchant
        const updatedMerchant = await ctx.db.merchant.update({
          where: { id: merchantId },
          data: {
            logoUrl: result.url,
            updatedAt: new Date(),
          },
        })
        
        return {
          success: true,
          url: result.url,
          merchant: updatedMerchant,
        }
      } catch (error) {
        console.error('Logo upload error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to upload logo',
        })
      }
    }),

  uploadPayNowQR: protectedProcedure
    .input(z.object({
      base64: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const merchantId = ctx.session!.user.id
      
      try {
        const originalBuffer = base64ToBuffer(input.base64)
        
        // QR codes need minimal processing to maintain scannability
        const optimizedBuffer = await optimizeImage(originalBuffer, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 95, // High quality for QR codes
          format: 'png' // PNG preserves sharp edges better
        })
        
        const result = await storage.uploadPayNowQR(optimizedBuffer, merchantId)
        
        // Update merchant
        const updatedMerchant = await ctx.db.merchant.update({
          where: { id: merchantId },
          data: {
            paynowQrCode: result.url,
          },
        })
        
        return {
          success: true,
          url: result.url,
          merchant: updatedMerchant,
        }
      } catch (error) {
        console.error('QR upload error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to upload PayNow QR code',
        })
      }
    }),

  // ============= PAYMENT PROOFS =============

  uploadPaymentProof: publicProcedure
    .input(z.object({
      orderId: z.string().cuid(),
      base64: z.string(),
      transactionId: z.string().optional(),
      customerId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify order exists
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          paymentStatus: true,
          total: true,
          merchantId: true,
          orderNumber: true,
        },
      })
      
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        })
      }
      
      // Check if payment proof already uploaded
      if (order.paymentStatus === 'COMPLETED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Payment already completed',
        })
      }
      
      try {
        // Convert and optimize proof image (maintain readability)
        const originalBuffer = base64ToBuffer(input.base64)
        const optimizedBuffer = await optimizeImage(originalBuffer, {
          maxWidth: 2048,
          maxHeight: 2048,
          quality: 90, // Higher quality for payment proofs
          format: 'jpeg'
        })
        
        // Upload proof
        const result = await storage.uploadPaymentProof(
          optimizedBuffer,
          input.orderId,
          input.customerId
        )
        
        // Update order and payment records
        const [updatedOrder] = await ctx.db.$transaction([
          ctx.db.order.update({
            where: { id: input.orderId },
            data: {
              paymentProof: result.url,
              paymentStatus: 'PROCESSING',
            },
          }),
          ctx.db.payment.upsert({
            where: { orderId: input.orderId },
            create: {
              orderId: input.orderId,
              amount: order.total,
              method: 'PAYNOW',
              status: 'PROCESSING',
              transactionId: input.transactionId,
            },
            update: {
              status: 'PROCESSING',
              transactionId: input.transactionId,
              updatedAt: new Date(),
            },
          }),
        ])
        
        // Notify merchant
        await ctx.db.notification.create({
          data: {
            merchantId: order.merchantId,
            type: 'PAYMENT_RECEIVED',
            title: 'Payment Proof Received',
            message: `Payment proof uploaded for order #${order.orderNumber}`,
            data: {
              orderId: input.orderId,
              proofUrl: result.url,
            },
          },
        })
        
        return {
          success: true,
          url: result.url,
          order: updatedOrder,
        }
      } catch (error) {
        console.error('Payment proof upload error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to upload payment proof',
        })
      }
    }),

  getPaymentProofUrl: protectedProcedure
    .input(z.object({
      orderId: z.string().cuid(),
    }))
    .query(async ({ input, ctx }) => {
      // Verify merchant owns the order
      const order = await ctx.db.order.findFirst({
        where: {
          id: input.orderId,
          OR: [
            { merchantId: ctx.session!.user.id },
            { customerId: ctx.session!.user.id },
          ],
        },
        select: {
          paymentProof: true,
        },
      })
      
      if (!order || !order.paymentProof) {
        return null
      }
      
      // Extract path and generate fresh signed URL
      const path = storage.extractPathFromUrl(order.paymentProof)
      if (!path) return null
      
      try {
        const signedUrl = await storage.getSignedUrl('private', path, 3600) // 1 hour
        return signedUrl
      } catch {
        return null
      }
    }),

  // ============= CATEGORY IMAGES =============

  uploadCategoryImage: protectedProcedure
    .input(z.object({
      categoryId: z.string().cuid(),
      base64: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify merchant owns the category
      const category = await ctx.db.category.findUnique({
        where: {
          id: input.categoryId,
          merchantId: ctx.session!.user.id,
        },
      })
      
      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        })
      }
      
      try {
        const originalBuffer = base64ToBuffer(input.base64)
        
        // Optimize category image
        const optimizedBuffer = await optimizeImage(originalBuffer, {
          maxWidth: 800,
          maxHeight: 600,
          quality: 85,
          format: 'jpeg'
        })
        
        const result = await storage.uploadCategoryImage(optimizedBuffer, input.categoryId)
        
        // Delete old image if exists
        if (category.imageUrl) {
          const oldPath = storage.extractPathFromUrl(category.imageUrl)
          if (oldPath) {
            await storage.deleteImage('public', oldPath).catch(console.error)
          }
        }
        
        // Update category
        const updatedCategory = await ctx.db.category.update({
          where: { id: input.categoryId },
          data: {
            imageUrl: result.url,
          },
        })
        
        return {
          success: true,
          url: result.url,
          category: updatedCategory,
        }
      } catch (error) {
        console.error('Category image upload error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to upload category image',
        })
      }
    }),
})

// Export type for use in frontend
export type StorageRouter = typeof storageRouter