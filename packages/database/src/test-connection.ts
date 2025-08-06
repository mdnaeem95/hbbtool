import { db } from "./client"

async function testConnection() {
  try {
    const merchantCount = await db.merchant.count()
    console.log(`✅ Database connected! Found ${merchantCount} merchants.`)
    
    const merchant = await db.merchant.findFirst({
      include: {
        categories: {
          include: {
            products: true
          }
        }
      }
    })
    
    console.log("Sample merchant:", merchant?.businessName)
    console.log("Categories:", merchant?.categories.length)
  } catch (error) {
    console.error("❌ Database connection failed:", error)
  } finally {
    await db.$disconnect()
  }
}

testConnection()