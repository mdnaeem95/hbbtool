import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { db } from '@homejiak/database'
import { getAuthSession, createServerSupabaseClient } from '@homejiak/auth/server'
import type { AuthSession } from '@homejiak/auth'

export interface Context {
  db: typeof db
  session: AuthSession | null
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
  req: Request
  resHeaders: Headers
  ip?: string
  // Add edge runtime context
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

/**
 * Create tRPC context with merchant auth and edge runtime data
 */
export async function createTRPCContext(
  opts: FetchCreateContextFnOptions
): Promise<Context> {
  console.log('\n=== createTRPCContext START ===')
  const { req, resHeaders } = opts
  
  // Log request details
  console.log('Request URL:', req.url)
  console.log('Cookie header:', req.headers.get('cookie') ? 'PRESENT' : 'MISSING')

  // Get merchant session if authenticated
  console.log('\nCalling getAuthSession...')
  const session = await getAuthSession()
  
  console.log('Session result:', session ? 'FOUND' : 'NULL')
  if (session) {
    console.log('  Merchant ID:', session.user.id)
    console.log('  Merchant Email:', session.user.email)
  }
  
  // Create Supabase client
  console.log('\nCreating Supabase client...')
  const supabase = await createServerSupabaseClient()

  // Extract IP address (enhanced with more headers)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ?? // Cloudflare
    undefined

  // Extract edge runtime data from headers
  const edge = {
    geo: {
      country: req.headers.get('x-vercel-ip-country') || 
               req.headers.get('x-user-country') || // From your middleware
               'SG', // Default to Singapore
      region: req.headers.get('x-vercel-ip-country-region') ||
              req.headers.get('x-user-region'),
      city: req.headers.get('x-vercel-ip-city') ||
            req.headers.get('x-user-city'),
    },
    runtime: ((globalThis as any).EdgeRuntime ? 'edge' : 'nodejs') as 'edge' | 'nodejs', 
    requestId: req.headers.get('x-edge-request-id') || crypto.randomUUID(),
  }

  // Log edge context
  console.log('\nEdge context:', {
    country: edge.geo.country,
    runtime: edge.runtime,
    requestId: edge.requestId,
  })

  const context = {
    db,
    session,
    supabase,
    req,
    resHeaders,
    ip,
    edge, // Add edge data to context
  }
  
  console.log('\n=== createTRPCContext END ===')
  console.log('Context created with session:', context.session ? 'YES' : 'NO')
  console.log('Edge runtime:', context.edge.runtime)
  
  return context
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>