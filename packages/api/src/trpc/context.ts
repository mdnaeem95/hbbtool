import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { db } from '@homejiak/database'
import { getAuthSession, createServerSupabaseClient } from '@homejiak/auth/server'
import type { AuthSession } from '@homejiak/auth'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface Context {
  db: typeof db
  session: AuthSession | null
  supabase: SupabaseClient // Add Supabase client to context
  merchant?: AuthSession['user']['merchant'] // Optional merchant for convenience
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

export async function createTRPCContext(
  opts: FetchCreateContextFnOptions
): Promise<Context> {
  const { req, resHeaders } = opts

  // Create Supabase client for this request
  const supabase = await createServerSupabaseClient()
  
  // Get auth session using the Supabase client
  const session = await getAuthSession()

  // Extract IP
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    undefined

  // Edge info
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
    supabase, // Include Supabase client in context
    merchant: session?.user?.merchant, // Optional convenience field
    req,
    resHeaders,
    ip,
    edge,
  }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>