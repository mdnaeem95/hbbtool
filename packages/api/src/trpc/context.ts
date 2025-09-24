import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { db } from '@homejiak/database'
import { getAuthSession } from '@homejiak/auth/server'
import type { AuthSession } from '@homejiak/auth'

export interface Context {
  db: typeof db
  session: AuthSession | null
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

  // Use lightweight auth check only once
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
    req,
    resHeaders,
    ip,
    edge,
  }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>
