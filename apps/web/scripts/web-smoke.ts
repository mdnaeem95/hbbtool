/* eslint-disable no-console */
import 'dotenv/config'
import superjson from 'superjson'
import { httpBatchLink, createTRPCClient } from '@trpc/client'
import type { AppRouter } from '@kitchencloud/api'
import { db } from '@kitchencloud/database'

// Import the Next route handlers directly
import { POST as trpcPOST, GET as trpcGET } from '../src/app/api/trpc/[trpc]/route'

// Satisfies FetchEsque (compatible with typeof fetch)
const localFetch: typeof fetch = async (input, init) => {
  // Normalize to a URL string
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as Request).url

  const req = new Request(url.startsWith('http') ? url : `http://local${url}`, init)

  // Our route file exports GET/POST handlers
  if (req.method === 'GET') return trpcGET(req)
  return trpcPOST(req)
}

async function main() {
  // Build a tRPC client that talks to the in-memory handler
  const client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        transformer: superjson,
        fetch: localFetch,
      }),
    ],
  })

  // 1) health
  const health = await client.health.query()
  console.log('health:', health)

  // 2) try a public merchant endpoint if one exists
  const m = await db.merchant.findFirst({
    where: { status: 'ACTIVE', deletedAt: null },
    select: { slug: true },
  })

  if (!m) {
    console.log('no ACTIVE merchants found — web smoke OK (route handler reachable).')
    return
  }

  const merchant = await client.public.getMerchant.query({ slug: m.slug })
  console.log('merchant:', { slug: merchant.slug, products: merchant._count.products })

  const products = await client.public.listProducts.query({
    merchantSlug: m.slug,
    page: 1,
    limit: 5,
  })
  console.log('products.items:', products.items.length)

  console.log('\n✅ web route smoke complete.')
}

main().catch((err) => {
  console.error('❌ web route smoke failed:')
  console.error(err)
  process.exit(1)
})
