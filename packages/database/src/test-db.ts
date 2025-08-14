/* eslint-disable no-console */
import { db } from "./client"
import { cache, cacheKeys, cachedCompute } from "./cache"
import {
  Prisma,
  ProductStatus,
  DeliveryMethod,
  PaymentMethod,
  MerchantStatus
} from "@prisma/client"

type MerchantSummary = {
  id: string
  slug: string
  businessName: string
  status: MerchantStatus
}

const slug = "test-merchant-e2e"
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`❌ ${msg}`)
  console.log(`✅ ${msg}`)
}

async function main() {
  console.log("---- DB E2E smoke test starting ----")

  // 0) Clean any prior runs
  await db.order.deleteMany({ where: { merchant: { slug } } })
  await db.product.deleteMany({ where: { merchant: { slug } } })
  await db.category.deleteMany({ where: { merchant: { slug } } })
  await db.customer.deleteMany({ where: { orders: { some: { merchant: { slug } } } } })
  await db.merchant.deleteMany({ where: { slug } })

  // 1) Create a merchant + categories + products
  const merchant = await db.merchant.create({
    data: {
      email: "e2e@example.com",
      phone: "99999999",
      businessName: "E2E Test Merchant",
      slug,
      password: "not-a-real-password",
      status: "ACTIVE",
      categories: {
        create: [
          { name: "Mains", slug: "mains" },
          { name: "Sides", slug: "sides" },
        ],
      },
      products: {
        create: [
          {
            name: "Activated Nasi Lemak",
            slug: "activated-nasi-lemak",
            price: new Prisma.Decimal(8.5),
            status: ProductStatus.ACTIVE,
            dietaryInfo: ["halal"],
          },
          {
            name: "Draft Rendang",
            slug: "draft-rendang",
            price: new Prisma.Decimal(12.0),
            status: ProductStatus.DRAFT,
            dietaryInfo: ["halal"],
          },
        ],
      },
    },
    include: { categories: true, products: true },
  })

  assert(merchant.products.length === 2, "Created merchant with 2 products")

  // 2) Active product query (implicit soft-delete filter applies to reads)
  const activeProducts = await db.product.findMany({
    where: { merchantId: merchant.id, status: ProductStatus.ACTIVE, deletedAt: null },
  })
  assert(
    activeProducts.length === 1 &&
      activeProducts[0]?.name === "Activated Nasi Lemak",
    "Active product filter returns only ACTIVE product"
  )

  // 3) Soft delete + restore
  const toDelete = activeProducts[0]
  await db.product.softDelete({ id: toDelete?.id })
  const afterDelete = await db.product.findMany({ where: { merchantId: merchant.id } })
  assert(
    afterDelete.every((p) => p.id !== toDelete?.id),
    "Soft-deleted product is excluded from default reads"
  )
  await db.product.restore({ id: toDelete?.id })
  const afterRestore = await db.product.findMany({ where: { merchantId: merchant.id } })
  assert(afterRestore.some((p) => p.id === toDelete?.id), "Restore brings product back")

  // 4) Simple transaction (order + payment + item snapshot)
  const phone = `93${Date.now().toString().slice(-6)}`
  const customer = await db.customer.create({
    data: { name: "E2E Customer", phone },
  })
  const createdOrder = await db.$transaction(async (tx) => {
    const productSnapshot = await tx.product.findFirstOrThrow({
      where: { merchantId: merchant.id, status: ProductStatus.ACTIVE },
      select: { id: true, name: true, price: true, images: true, sku: true },
    })

    const order = await tx.order.create({
      data: {
        orderNumber: `E2E-${Date.now()}`,
        merchantId: merchant.id,
        customerId: customer.id,
        deliveryMethod: DeliveryMethod.PICKUP,
        deliveryFee: new Prisma.Decimal(0),
        subtotal: productSnapshot.price,
        total: productSnapshot.price,
        items: {
          create: [
            {
              productId: productSnapshot.id,
              productName: productSnapshot.name,
              productSku: productSnapshot.sku,
              productPrice: productSnapshot.price,
              productImage: productSnapshot.images?.[0] ?? null,
              quantity: 1,
              price: productSnapshot.price,
              total: productSnapshot.price,
            },
          ],
        },
      },
      include: { items: true },
    })

    await tx.payment.create({
      data: {
        orderId: order.id,
        amount: order.total,
        method: PaymentMethod.CASH,
        status: "COMPLETED",
      },
    })

    return order
  })

  assert(!!createdOrder.id, "Created order inside transaction")
  assert(createdOrder.items.length === 1, "Order has 1 item with snapshot")

  // 5) Cache: compute, read, invalidate via tag
  const mKey = cacheKeys.merchant(merchant.id)
  const mTag = `merchant:${merchant.id}`

  // Ensure no prior value
  await cache.del(mKey)

  const firstRead = await cachedCompute<MerchantSummary>(
    mKey,
    () =>
      db.merchant.findFirstOrThrow({
        where: { id: merchant.id },
        select: { id: true, slug: true, businessName: true, status: true },
      }),
    { ttl: 60, tag: mTag }
  )

  assert(firstRead.slug === slug, "cachedCompute stored the merchant")

  // Confirm value is cached (no DB write in between)
  const cachedAgain = await cachedCompute<MerchantSummary>(
    mKey,
    async () => {
      throw new Error("Should not recompute when cached")
    },
    { ttl: 60, tag: mTag }
  )
  assert(cachedAgain.id === merchant.id, "cachedCompute hit the cache")

  // Invalidate the tag and ensure recompute works
  await cache.invalidateTag(mTag)
  let recomputed = false
  await cachedCompute(
    mKey,
    async () => {
      recomputed = true
      // tiny delay to ensure new timestamp
      await sleep(10)
      return db.merchant.findFirstOrThrow({
        where: { id: merchant.id },
        select: { id: true, slug: true, businessName: true, status: true },
      })
    },
    { ttl: 60, tag: mTag }
  )
  assert(recomputed, "Tag invalidation forced recompute")

  console.log("---- DB E2E smoke test passed ✅ ----")
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n---- DB E2E smoke test failed ❌ ----")
    console.error(err)
    process.exit(1)
  })
