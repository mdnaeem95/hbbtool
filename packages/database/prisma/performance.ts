import { PrismaClient } from '@prisma/client'
import { performance } from 'perf_hooks'

const prisma = new PrismaClient()

interface TestResult {
  name: string
  duration: number
  recordCount: number
  status: 'pass' | 'fail'
  threshold: number
}

async function timeQuery<T>(name: string, queryFn: () => Promise<T>, threshold = 1000): Promise<TestResult> {
  console.log(`🔍 Testing: ${name}...`)
  
  const start = performance.now()
  try {
    const result = await queryFn()
    const end = performance.now()
    const duration = Math.round(end - start)
    
    const recordCount = Array.isArray(result) ? result.length : 1
    const status = duration <= threshold ? 'pass' : 'fail'
    
    console.log(`  ⏱️  ${duration}ms (${recordCount} records) - ${status}`)
    
    return { name, duration, recordCount, status, threshold }
  } catch (error) {
    console.log(`  ❌ Error: ${error}`)
    return { name, duration: -1, recordCount: 0, status: 'fail', threshold }
  }
}

async function main() {
  console.log('🚀 Starting HomeJiak Performance Tests...\n')
  
  const results: TestResult[] = []

  // 1. Basic Count Queries
  console.log('📊 BASIC COUNTS')
  results.push(await timeQuery('Count merchants', () => prisma.merchant.count()))
  results.push(await timeQuery('Count products', () => prisma.product.count()))
  results.push(await timeQuery('Count customers', () => prisma.customer.count()))
  results.push(await timeQuery('Count orders', () => prisma.order.count()))
  results.push(await timeQuery('Count reviews', () => prisma.review.count()))

  // 2. Simple Queries
  console.log('\n🔍 SIMPLE QUERIES')
  results.push(await timeQuery(
    'Get active merchants',
    () => prisma.merchant.findMany({
      where: { status: 'ACTIVE' },
      take: 20
    }),
    500
  ))

  results.push(await timeQuery(
    'Get products by category',
    () => prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: { category: true },
      take: 50
    }),
    800
  ))

  results.push(await timeQuery(
    'Get customer orders',
    async () => {
      const customer = await prisma.customer.findFirst()
      if (!customer) throw new Error('No customers found')
      
      return prisma.order.findMany({
        where: { customerId: customer.id },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    },
    600
  ))

  // 3. Complex Queries (Merchant Dashboard)
  console.log('\n📊 COMPLEX QUERIES (Merchant Dashboard)')
  results.push(await timeQuery(
    'Merchant dashboard data',
    async () => {
      const merchant = await prisma.merchant.findFirst({ where: { status: 'ACTIVE' } })
      if (!merchant) throw new Error('No active merchants found')

      return prisma.merchant.findUnique({
        where: { id: merchant.id },
        include: {
          _count: {
            select: {
              orders: { where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
              products: { where: { status: 'ACTIVE' } },
              reviews: true
            }
          },
          orders: {
            where: { 
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
              status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
            },
            include: { items: { include: { product: true } }, customer: true },
            orderBy: { createdAt: 'desc' },
            take: 20
          }
        }
      })
    },
    1500
  ))

  results.push(await timeQuery(
    'Order analytics (last 30 days)',
    () => prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      _count: { _all: true },
      _sum: { total: true },
      _avg: { total: true }
    }),
    800
  ))

  results.push(await timeQuery(
    'Top products by orders',
    () => prisma.product.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ orderCount: 'desc' }, { popularityScore: 'desc' }],
      include: { 
        category: { select: { name: true } },
        merchant: { select: { businessName: true } }
      },
      take: 20
    }),
    600
  ))

  // 4. Search Queries
  console.log('\n🔎 SEARCH QUERIES')
  results.push(await timeQuery(
    'Search products by name',
    () => prisma.product.findMany({
      where: {
        AND: [
          { status: 'ACTIVE' },
          {
            OR: [
              { name: { contains: 'chicken', mode: 'insensitive' } },
              { description: { contains: 'chicken', mode: 'insensitive' } }
            ]
          }
        ]
      },
      include: { category: true, merchant: { select: { businessName: true, averageRating: true } } },
      take: 20
    }),
    800
  ))

  results.push(await timeQuery(
    'Search merchants by cuisine',
    () => prisma.merchant.findMany({
      where: {
        status: 'ACTIVE',
        cuisineType: { has: 'Chinese' }
      },
      include: {
        _count: { select: { products: { where: { status: 'ACTIVE' } } } }
      },
      take: 20
    }),
    500
  ))

  // 5. Aggregation Queries
  console.log('\n🧮 AGGREGATION QUERIES')
  results.push(await timeQuery(
    'Daily order summary (last 7 days)',
    () => prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as order_date,
        COUNT(*)::int as total_orders,
        SUM("total")::float as total_revenue,
        AVG("total")::float as avg_order_value
      FROM "Order"
      WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY DATE("createdAt")
      ORDER BY order_date DESC
    `,
    1200
  ))

  results.push(await timeQuery(
    'Merchant performance summary',
    () => prisma.$queryRaw`
      SELECT 
        m."businessName",
        m."averageRating"::float,
        COUNT(DISTINCT o.id)::int as total_orders,
        SUM(o.total)::float as total_revenue,
        AVG(o.total)::float as avg_order_value,
        COUNT(DISTINCT r.id)::int as total_reviews
      FROM "Merchant" m
      LEFT JOIN "Order" o ON m.id = o."merchantId" AND o."createdAt" >= NOW() - INTERVAL '30 days'
      LEFT JOIN "Review" r ON m.id = r."merchantId"
      WHERE m.status = 'ACTIVE'
      GROUP BY m.id, m."businessName", m."averageRating"
      ORDER BY total_revenue DESC NULLS LAST
      LIMIT 10
    `,
    1500
  ))

  // 6. Real-time Query Simulation (Order Stream)
  console.log('\n⚡ REAL-TIME QUERIES (Order Stream)')
  results.push(await timeQuery(
    'New orders (last 5 minutes)',
    () => prisma.order.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }
      },
      include: {
        items: { include: { product: true } },
        customer: { select: { name: true, phone: true } },
        merchant: { select: { businessName: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    400
  ))

  results.push(await timeQuery(
    'Updated orders (last 5 minutes)',
    () => prisma.order.findMany({
      where: {
        AND: [
          { updatedAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
          { createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } } // Not new orders
        ]
      },
      include: {
        items: { include: { product: true } },
        customer: { select: { name: true, phone: true } }
      }
    }),
    400
  ))

  // 7. Customer App Queries
  console.log('\n📱 CUSTOMER APP QUERIES')
  results.push(await timeQuery(
    'Merchant storefront (products + info)',
    async () => {
      const merchant = await prisma.merchant.findFirst({ where: { status: 'ACTIVE' } })
      if (!merchant) throw new Error('No merchants found')

      const [merchantData, categories, products] = await Promise.all([
        prisma.merchant.findUnique({
          where: { id: merchant.id },
          select: {
            id: true,
            businessName: true,
            description: true,
            logoUrl: true,
            bannerUrl: true,
            cuisineType: true,
            averageRating: true,
            totalReviews: true,
            deliveryEnabled: true,
            pickupEnabled: true,
            deliveryFee: true,
            minimumOrder: true,
            preparationTime: true,
            operatingHours: true
          }
        }),
        prisma.category.findMany({
          where: { merchantId: merchant.id, isActive: true },
          orderBy: { sortOrder: 'asc' }
        }),
        prisma.product.findMany({
          where: { merchantId: merchant.id, status: 'ACTIVE' },
          include: { variants: true },
          orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
          take: 50
        })
      ])

      return { merchant: merchantData, categories, products }
    },
    1000
  ))

  results.push(await timeQuery(
    'Customer order history',
    async () => {
      const customer = await prisma.customer.findFirst()
      if (!customer) throw new Error('No customers found')

      return prisma.order.findMany({
        where: { customerId: customer.id },
        include: {
          items: { include: { product: { select: { name: true, images: true } } } },
          merchant: { select: { businessName: true, logoUrl: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    },
    800
  ))

  // 8. Database Connection Pool Test
  console.log('\n🔄 CONNECTION POOL TEST')
  results.push(await timeQuery(
    'Concurrent simple queries (10x)',
    async () => {
      const promises = Array.from({ length: 10 }, () => 
        prisma.merchant.count({ where: { status: 'ACTIVE' } })
      )
      return Promise.all(promises)
    },
    2000
  ))

  // Generate Performance Report
  console.log('\n' + '='.repeat(60))
  console.log('📋 PERFORMANCE TEST RESULTS')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const totalTime = results.reduce((sum, r) => sum + (r.duration > 0 ? r.duration : 0), 0)

  console.log(`\n📊 Summary:`)
  console.log(`• Total Tests: ${results.length}`)
  console.log(`• Passed: ${passed} ✅`)
  console.log(`• Failed: ${failed} ${failed > 0 ? '❌' : '✅'}`)
  console.log(`• Total Time: ${totalTime}ms`)
  console.log(`• Average Time: ${Math.round(totalTime / results.length)}ms\n`)

  // Detailed Results
  results.forEach((result, index) => {
    const status = result.status === 'pass' ? '✅' : '❌'
    const duration = result.duration > 0 ? `${result.duration}ms` : 'ERROR'
    console.log(`${status} ${(index + 1).toString().padStart(2, '0')}. ${result.name.padEnd(35)} ${duration.padStart(8)} (threshold: ${result.threshold}ms)`)
  })

  // Performance Recommendations
  console.log('\n💡 PERFORMANCE RECOMMENDATIONS:')
  
  const slowQueries = results.filter(r => r.duration > r.threshold && r.duration > 0)
  if (slowQueries.length > 0) {
    console.log('\n⚠️  Slow Queries Found:')
    slowQueries.forEach(q => {
      console.log(`   • ${q.name}: ${q.duration}ms (threshold: ${q.threshold}ms)`)
    })
    
    console.log('\n🔧 Suggested Optimizations:')
    console.log('   • Add database indexes for frequently queried columns')
    console.log('   • Consider query optimization for complex joins')
    console.log('   • Implement caching for dashboard data')
    console.log('   • Use database connection pooling')
    console.log('   • Consider read replicas for heavy read workloads')
  } else {
    console.log('✅ All queries are within acceptable performance thresholds!')
  }

  // Database Health Check
  console.log('\n🏥 DATABASE HEALTH CHECK:')
  const dbStats = await prisma.$queryRaw`
    SELECT schemaname, tablename, attname, n_distinct, correlation
    FROM pg_stats 
    WHERE schemaname = 'public'
    AND tablename IN ('Merchant', 'Product', 'Order', 'Customer')
    LIMIT 10
  ` as any[]

  if (dbStats.length > 0) {
    console.log('✅ Database statistics available')
    console.log(`📊 Analyzed ${dbStats.length} table columns`)
  }

  // Index Recommendations
  console.log('\n📚 RECOMMENDED INDEXES (if not already present):')
  console.log('   CREATE INDEX CONCURRENTLY idx_order_merchant_created ON "Order"("merchantId", "createdAt");')
  console.log('   CREATE INDEX CONCURRENTLY idx_order_customer_created ON "Order"("customerId", "createdAt");')
  console.log('   CREATE INDEX CONCURRENTLY idx_product_merchant_status ON "Product"("merchantId", "status");')
  console.log('   CREATE INDEX CONCURRENTLY idx_product_name_gin ON "Product" USING gin(to_tsvector(\'english\', name));')
  console.log('   CREATE INDEX CONCURRENTLY idx_merchant_cuisine ON "Merchant" USING gin("cuisineType");')
  console.log('   CREATE INDEX CONCURRENTLY idx_analytics_merchant_created ON "Analytics"("merchantId", "createdAt");')

  if (failed === 0) {
    console.log('\n🎉 All performance tests passed! Your database is ready for production.')
  } else {
    console.log('\n⚠️  Some tests failed. Consider optimizing slow queries before going to production.')
  }
}

main()
  .catch((e) => {
    console.error('❌ Performance test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })