import { NextRequest, NextResponse } from 'next/server'

// This ensures the route runs on Node.js runtime, not Edge
export const runtime = 'nodejs'
export const maxDuration = 30

// Only import Sharp in this isolated API route
async function getSharp() {
  const sharp = (await import('sharp')).default
  return sharp
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageBase64, operation, options } = body

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      )
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(
      imageBase64.replace(/^data:image\/\w+;base64,/, ''),
      'base64'
    )

    const sharp = await getSharp()

    switch (operation) {
      case 'optimize': {
        const optimized = await sharp(imageBuffer)
          .rotate() // Auto-rotate based on EXIF
          .resize(options?.maxWidth || 1200, options?.maxHeight || 1200, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({
            quality: options?.quality || 85,
            progressive: true,
            mozjpeg: true,
          })
          .toBuffer()

        return NextResponse.json({
          success: true,
          image: optimized.toString('base64'),
          mimeType: 'image/jpeg',
        })
      }

      case 'generateVariants': {
        const variants: Record<string, string> = {}

        // Thumbnail
        const thumb = await sharp(imageBuffer)
          .resize(150, 150, {
            fit: 'cover',
            position: 'center',
          })
          .jpeg({ quality: 80, progressive: true })
          .toBuffer()
        variants.thumb = thumb.toString('base64')

        // Small
        const small = await sharp(imageBuffer)
          .resize(400, 400, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer()
        variants.small = small.toString('base64')

        // Medium
        const medium = await sharp(imageBuffer)
          .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer()
        variants.medium = medium.toString('base64')

        return NextResponse.json({
          success: true,
          variants,
        })
      }

      case 'optimizeLogo': {
        const optimized = await sharp(imageBuffer)
          .resize(512, 512, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 90 })
          .toBuffer()

        return NextResponse.json({
          success: true,
          image: optimized.toString('base64'),
          mimeType: 'image/webp',
        })
      }

      case 'optimizePaymentProof': {
        const optimized = await sharp(imageBuffer)
          .resize(2048, 2048, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 90, progressive: true })
          .toBuffer()

        return NextResponse.json({
          success: true,
          image: optimized.toString('base64'),
          mimeType: 'image/jpeg',
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Image optimization error:', error)
    return NextResponse.json(
      { error: 'Failed to optimize image' },
      { status: 500 }
    )
  }
}