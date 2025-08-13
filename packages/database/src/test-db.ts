// packages/database/src/test-features.ts
import { db, cache, cacheKeys } from './index'

async function testFeatures() {
  console.log('🧪 Testing database features...\n')

  // 1. Test soft delete
  console.log('1️⃣ Testing soft delete:')
  const products = await db.product.findMany()
  console.log(`   Active products: ${products.length}`)
  
  // 2. Test custom methods
  console.log('\n2️⃣ Testing custom methods:')
  const activeProducts = await db.product.findManyActive({
    where: { featured: true }
  })
  console.log(`   Featured products: ${activeProducts.length}`)
  
  // 3. Test includes
  console.log('\n3️⃣ Testing complex queries:')
  const merchantWithDetails = await db.merchant.findFirst({
    include: {
      categories: {
        include: {
          _count: {
            select: { products: true }
          }
        }
      },
      _count: {
        select: {
          products: true,
          orders: true,
          reviews: true
        }
      }
    }
  })
  
  if (merchantWithDetails) {
    console.log(`   ${merchantWithDetails.businessName}:`)
    console.log(`   - Total products: ${merchantWithDetails._count.products}`)
    console.log(`   - Total orders: ${merchantWithDetails._count.orders}`)
    console.log(`   - Categories: ${merchantWithDetails.categories.map(c => `${c.name} (${c._count.products} products)`).join(', ')}`)
  }
  
  // 4. Test transactions
  console.log('\n4️⃣ Testing transactions:')
  try {
    await db.$transaction(async (tx) => {
      // Create a test category
      const category = await tx.category.create({
        data: {
          merchantId: merchantWithDetails!.id,
          name: 'Test Category',
          slug: 'test-category',
          sortOrder: 99
        }
      })
      console.log(`   ✅ Created category: ${category.name}`)
      
      // Soft delete it
      await tx.category.softDelete({ id: category.id })
      console.log(`   ✅ Soft deleted category`)
      
      return category
    })
  } catch (error) {
    console.log('   ❌ Transaction test failed:', error)
  }
  
  // 5. Test caching (if Redis is configured)
  console.log('\n5️⃣ Testing cache:')
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const testKey = cacheKeys.merchant('test')
      await cache.set(testKey, { test: true }, 60)
      const cached = await cache.get(testKey)
      console.log(`   ✅ Cache working: ${JSON.stringify(cached)}`)
    } catch (error) {
      console.log('   ⚠️  Cache not configured or not working')
    }
  } else {
    console.log('   ⚠️  Redis not configured (UPSTASH_REDIS_REST_URL missing)')
  }
  
  // 6. Show summary
  console.log('\n📊 Database Summary:')
  const [merchantCount, productCount, categoryCount, customerCount] = await Promise.all([
    db.merchant.count(),
    db.product.count(),
    db.category.count({ where: { deletedAt: null } }),
    db.customer.count()
  ])
  
  console.log(`   Merchants: ${merchantCount}`)
  console.log(`   Products: ${productCount}`)
  console.log(`   Categories: ${categoryCount} (active)`)
  console.log(`   Customers: ${customerCount}`)
  
  console.log('\n✅ All tests completed!')
}

testFeatures()
  .catch(console.error)
  .finally(() => db.$disconnect())