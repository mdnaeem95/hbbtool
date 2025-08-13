// packages/database/prisma/seed.ts
import { PrismaClient, MerchantStatus, ProductStatus } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting seed...")

  // Clean up existing data in dev
  if (process.env.NODE_ENV !== "production") {
    console.log("🧹 Cleaning up existing data...")
    
    // Delete in correct order to respect foreign keys
    await prisma.orderEvent.deleteMany()
    await prisma.orderItem.deleteMany()
    await prisma.paymentProof.deleteMany()
    await prisma.payment.deleteMany()
    await prisma.order.deleteMany()
    await prisma.productView.deleteMany()
    await prisma.productVariant.deleteMany()
    await prisma.review.deleteMany()
    await prisma.product.deleteMany()
    await prisma.category.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.analytics.deleteMany()
    await prisma.session.deleteMany()
    await prisma.checkoutSession.deleteMany()
    await prisma.address.deleteMany()
    await prisma.merchant.deleteMany()
    await prisma.customer.deleteMany()
    
    console.log("✅ Cleanup complete")
  }

  // Create test merchants
  // Note: These IDs should match users created in Supabase Auth
  const merchant1 = await prisma.merchant.create({
    data: {
      id: "0ba3cd7b-71f6-45c0-ae4e-86d17e40e4cc", // Replace with actual Supabase Auth user ID
      email: "merchant1@test.com",
      phone: "+6591234567",
      businessName: "Aunty Mary's Kitchen",
      slug: "aunty-marys-kitchen",
      description: "Authentic home-cooked Peranakan dishes since 2020",
      cuisineType: ["Peranakan", "Local"],
      halal: false,
      status: MerchantStatus.ACTIVE,
      verified: true,
      verifiedAt: new Date(),
      address: "Blk 123 Tampines Street 45",
      postalCode: "520123",
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryFee: 5.00,
      minimumOrder: 30.00,
      preparationTime: 45,
      operatingHours: {
        monday: { open: "10:00", close: "20:00" },
        tuesday: { open: "10:00", close: "20:00" },
        wednesday: { open: "10:00", close: "20:00" },
        thursday: { open: "10:00", close: "20:00" },
        friday: { open: "10:00", close: "21:00" },
        saturday: { open: "10:00", close: "21:00" },
        sunday: { closed: true }
      },
      categories: {
        create: [
          {
            name: "Signature Dishes",
            slug: "signature-dishes",
            sortOrder: 0,
            isActive: true,
            products: {
              create: [
                {
                  merchantId: "0ba3cd7b-71f6-45c0-ae4e-86d17e40e4cc", // Need to specify merchantId here
                  name: "Ayam Buah Keluak",
                  slug: "ayam-buah-keluak",
                  description: "Traditional Peranakan chicken stew with black nuts",
                  price: 18.80,
                  status: ProductStatus.ACTIVE,
                  featured: true,
                  images: ["/images/ayam-buah-keluak.jpg"],
                  trackQuantity: true,
                  quantity: 20,
                  tags: ["signature", "chicken", "traditional"],
                  preparationTime: "45-60 mins"
                },
                {
                  merchantId: "0ba3cd7b-71f6-45c0-ae4e-86d17e40e4cc",
                  name: "Babi Pongteh",
                  slug: "babi-pongteh",
                  description: "Slow-braised pork with fermented bean paste and potatoes",
                  price: 16.80,
                  status: ProductStatus.ACTIVE,
                  images: ["/images/babi-pongteh.jpg"],
                  trackQuantity: true,
                  quantity: 15,
                  tags: ["pork", "traditional"],
                  preparationTime: "60 mins"
                }
              ]
            }
          },
          {
            name: "Rice & Noodles",
            slug: "rice-noodles",
            sortOrder: 1,
            isActive: true,
            products: {
              create: [
                {
                  merchantId: "0ba3cd7b-71f6-45c0-ae4e-86d17e40e4cc",
                  name: "Nasi Lemak Istimewa",
                  slug: "nasi-lemak-istimewa",
                  description: "Coconut rice with fried chicken, sambal, egg, ikan bilis & peanuts",
                  price: 8.80,
                  comparePrice: 10.80,
                  status: ProductStatus.ACTIVE,
                  featured: true,
                  images: ["/images/nasi-lemak.jpg"],
                  trackQuantity: false,
                  tags: ["rice", "local-favorite"],
                  preparationTime: "20-30 mins"
                }
              ]
            }
          },
          {
            name: "Desserts",
            slug: "desserts",
            sortOrder: 2,
            isActive: true,
            products: {
              create: [
                {
                  merchantId: "0ba3cd7b-71f6-45c0-ae4e-86d17e40e4cc",
                  name: "Kueh Salat",
                  slug: "kueh-salat",
                  description: "Pandan custard on glutinous rice",
                  price: 3.50,
                  status: ProductStatus.ACTIVE,
                  images: ["/images/kueh-salat.jpg"],
                  trackQuantity: true,
                  quantity: 30,
                  tags: ["kueh", "dessert"],
                  preparationTime: "Ready stock"
                }
              ]
            }
          }
        ]
      }
    }
  })

  // Create test customers
  const customer1 = await prisma.customer.create({
    data: {
      id: "ac91da11-8276-45c5-ae33-bcee9a2e8f40", // Replace with actual Supabase Auth user ID
      email: "customer1@test.com",
      phone: "+6591111111",
      name: "John Doe",
      emailVerified: true,
      phoneVerified: false,
      marketingOptIn: true,
      addresses: {
        create: [
          {
            label: "Home",
            line1: "Blk 789 Woodlands Ave 6",
            line2: "#12-34",
            postalCode: "730789",
            isDefault: true,
            latitude: 1.4382,
            longitude: 103.7890
          },
          {
            label: "Office",
            line1: "1 Raffles Place",
            line2: "#20-01",
            postalCode: "048616",
            isDefault: false,
            latitude: 1.2844,
            longitude: 103.8510
          }
        ]
      }
    }
  })

  console.log("✅ Seed completed!")
  console.log({
    merchants: [
      { name: merchant1.businessName, id: merchant1.id },
    ],
    customers: [
      { name: customer1.name, id: customer1.id },
    ],
    categories: await prisma.category.count(),
    products: await prisma.product.count()
  })
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })