/* eslint-disable no-console */
import 'dotenv/config'
import { nanoid } from 'nanoid'
import { randomUUID } from 'node:crypto'

// --- API layer ---
import { appRouter } from './index'

// --- DB (real client) ---
import { db } from '@kitchencloud/database'
import { Context, Session, SupabaseLike } from './types'

// ---------- tiny helpers ----------
function header(): string | undefined {
  return undefined
}

// 🔑 generate unique bits per run
const uid = randomUUID()
const unique = nanoid(8)
const email = `merchant+${unique}@example.com`
const phone = `+65${(80_000_000 + Math.floor(Math.random() * 20_000_000)).toString()}` // 8-digit SG

function makeSupabaseMock(userId: string, email: string): SupabaseLike {
  return {
    auth: {
      async signUp() {
        return {
          data: {
            user: { id: userId, email, user_metadata: { userType: 'merchant' } },
            session: {} as any,
          },
          error: null,
        }
      },
      async signInWithPassword({ email: e }) {
        return {
          data: {
            user: { id: userId, email: e, user_metadata: { userType: 'merchant' } },
            session: {} as any,
          },
          error: null,
        }
      },
      async signOut() {
        return { error: null }
      },
    },
  }
}

function makeCtx(partial?: Partial<Context<Session, SupabaseLike>>): Context<Session, SupabaseLike> {
  const base: Context<Session, SupabaseLike> = {
    db,
    session: null,
    supabase: { auth: {} as any },
    req: new Request('http://localhost/api-smoke'),
    resHeaders: new Headers(),
    header,
  }
  return { ...base, ...(partial || {}) }
}

async function main() {
  const unique = nanoid(8)
  const password = 'StrongPassword!1'
  const businessName = `Test Kitchen ${unique}`

  // 1) Public caller (no session)
  const publicCtx = makeCtx({ supabase: makeSupabaseMock(uid, email) })
  const publicCaller = appRouter.createCaller(publicCtx)

  // 2) Merchant sign-up (creates Merchant row)
  console.log('→ auth.merchantSignUp')
  const {
    user: supaUser,
    merchant,
  } = await publicCaller.auth.merchantSignUp({
    email,
    password,
    businessName,
    phone,
  })
  console.log('   ✓ signed up:', supaUser?.id, merchant?.slug)

  // 3) Switch to authed merchant ctx
  const session: Session = {
    user: { id: supaUser!.id, email: email, userType: 'merchant' },
  }
  // Give the merchant some basic payments/shipping config
  await db.merchant.update({
    where: { id: merchant!.id },
    data: {
      deliveryEnabled: true,
      status: 'ACTIVE',
      pickupEnabled: true,
      deliveryFee: 2,
      minimumOrder: 0,
      paynowNumber: '81234567',
    },
  })

  const authedCtx = makeCtx({
    session,
    supabase: makeSupabaseMock(supaUser!.id, email),
  })
  const caller = appRouter.createCaller(authedCtx)

  // 4) Create a product
  console.log('→ product.create')
  const product = await caller.product.create({
    name: `Laksa Bowl ${unique}`,
    price: 9.9,
    images: [],
    status: 'ACTIVE',
    trackInventory: true,
    inventory: 50,
  })
  console.log('   ✓ product id:', product.id)

  // 5) Public: load merchant storefront
  console.log('→ public.getMerchant')
  const store = await publicCaller.public.getMerchant({ slug: merchant!.slug })
  console.log('   ✓ storefront products:', store._count.products)

  // 6) Public: list products
  console.log('→ public.listProducts')
  const list = await publicCaller.public.listProducts({
    merchantSlug: merchant!.slug,
    page: 1,
    limit: 10,
  })
  console.log('   ✓ list count:', list.items.length)

  // 7) Checkout session (router/checkout)
  console.log('→ checkout.createSession')
  const sessionCreate = await publicCaller.checkout.createSession({
    merchantId: merchant!.id,
    items: [{ productId: product.id, quantity: 2 }],
  })
  console.log('   ✓ session:', sessionCreate.sessionId, 'subtotal:', sessionCreate.subtotal)

  // 8) Complete order (pickup to avoid address)
  console.log('→ checkout.complete')
  const completion = await publicCaller.checkout.complete({
    sessionId: sessionCreate.sessionId,
    contactInfo: { name: 'Alice', email: `alice+${unique}@example.com`, phone: '+6588888888' },
    // no deliveryAddress → becomes PICKUP
  })
  console.log('   ✓ order id:', completion.orderId, 'number:', completion.orderNumber)

  // 9) Verify payment (merchant)
  console.log('→ payment.verifyPayment')
  await caller.payment.verifyPayment({
    orderId: completion.orderId,
    amount: 19.8,
    transactionId: `TX-${unique}`,
  })
  console.log('   ✓ payment verified')

  // 10) Fetch order (merchant)
  console.log('→ order.get')
  const order = await caller.order.get({ id: completion.orderId })
  console.log(
    '   ✓ order status:',
    order.status,
    'payment:',
    order.paymentStatus,
    'items:',
    order.items?.length,
  )

  // 11) Public tracker
  console.log('→ public.trackOrder')
  const tracked = await publicCaller.public.trackOrder({
    orderNumber: order.orderNumber,
    phone: order.customerPhone!,
  })
  console.log('   ✓ tracked order:', tracked.id)

  console.log('\n✅ API smoke test complete.')
}

main().catch((err) => {
  console.error('❌ Smoke test failed:')
  console.error(err)
  process.exit(1)
})
