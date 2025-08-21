import { getServerSession } from "@/lib/helpers/auth"
import { createUploadthing, type FileRouter } from "uploadthing/next"


const f = createUploadthing()

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Merchant logo upload
  merchantLogo: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      // Get the user session
      const session = await getServerSession()
      
      if (!session?.user || session.userType !== "merchant") {
        throw new Error("Unauthorized")
      }

      // Pass merchant ID to onUploadComplete
      return { merchantId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Merchant logo uploaded:", {
        merchantId: metadata.merchantId,
        fileUrl: file.url,
        fileName: file.name,
      })

      // Return data to be passed to clientside callback
      return { url: file.url }
    }),

  // Product images upload
  productImages: f({ image: { maxFileSize: "4MB", maxFileCount: 5 } })
    .middleware(async () => {
      const session = await getServerSession()
      
      if (!session?.user || session.userType !== "merchant") {
        throw new Error("Unauthorized")
      }

      return { merchantId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Product images uploaded:", {
        merchantId: metadata.merchantId,
        fileUrl: file.url,
      })

      return { url: file.url }
    }),

  // PayNow QR code upload
  paynowQR: f({ image: { maxFileSize: "1MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await getServerSession()
      
      if (!session?.user || session.userType !== "merchant") {
        throw new Error("Unauthorized")
      }

      return { merchantId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("PayNow QR uploaded:", {
        merchantId: metadata.merchantId,
        fileUrl: file.url,
      })

      return { url: file.url }
    }),

  // Category images
  categoryImage: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await getServerSession()
      
      if (!session?.user || session.userType !== "merchant") {
        throw new Error("Unauthorized")
      }

      return { merchantId: session.user.id }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter