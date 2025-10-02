import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { db } from '@homejiak/database'
import { getAuthSession, createServerSupabaseClient } from '@homejiak/auth/server'

// Import AuthSession from central types if it's there,
// or keep importing from auth if that's where it lives
import type { AuthSession } from '@homejiak/types'
import type { Merchant as PrismaMerchant } from '@homejiak/types'
// Or: import type { AuthSession } from '@homejiak/auth'

import type { SupabaseClient } from '@supabase/supabase-js'

// This Context is API-specific, so it stays here
export interface Context {
  db: typeof db
  session: AuthSession | null
  supabase: SupabaseClient
  merchant?: PrismaMerchant
  req: Request
  resHeaders: Headers
  ip?: string
  edge: {
    geo: {
      country: string
      region?: string | null
      city?: string | null
    }
    runtime: 'edge' | 'nodejs'
    requestId: string
  }
}

// Your createTRPCContext function stays exactly the same
export async function createTRPCContext(
  opts: FetchCreateContextFnOptions
): Promise<Context> {
  const { req, resHeaders } = opts

  const supabase = await createServerSupabaseClient()
  const session = await getAuthSession()

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    undefined

  const edge = {
    geo: {
      country: req.headers.get('x-vercel-ip-country') || 'SG',
      region: req.headers.get('x-vercel-ip-country-region'),
      city: req.headers.get('x-vercel-ip-city'),
    },
    runtime: ((globalThis as any).EdgeRuntime ? 'edge' : 'nodejs') as
      | 'edge'
      | 'nodejs',
    requestId: req.headers.get('x-edge-request-id') || crypto.randomUUID(),
  }

  return {
    db,
    session,
    supabase,
    merchant: session?.user?.merchant,
    req,
    resHeaders,
    ip,
    edge,
  }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>