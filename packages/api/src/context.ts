import type { CreateNextContextOptions } from '@trpc/server/adapters/next'
import { getServerSession, createServerSupabaseClient } from '@kitchencloud/auth/server'
import { db } from '@kitchencloud/database'
import type { Context } from './types'

function makeHeaderGetter(req: any) {
  const h = req?.headers
  if (!h) return (_: string) => undefined
  // Next 13/14 App Router (Request/Headers)
  if (typeof h.get === 'function') {
    return (name: string) => (h.get(name) ?? undefined) as string | undefined
  }
  // Pages Router (NextApiRequest)
  return (name: string) => {
    const v = h[String(name).toLowerCase()]
    return Array.isArray(v) ? v[0] : (v as string | undefined)
  }
}

function extractIp(req: any): string | undefined {
  const getter = makeHeaderGetter(req)
  return (
    getter('x-forwarded-for')?.split(',')[0]?.trim() ||
    getter('x-real-ip') ||
    req?.ip ||
    req?.socket?.remoteAddress ||
    undefined
  )
}

export async function createContext(
  opts: CreateNextContextOptions
): Promise<Context> {
  const session = await getServerSession()
  const supabase = createServerSupabaseClient()
  return {
    db,
    session,
    supabase,
    req: opts.req, // still available if you ever need to narrow locally
    res: opts.res,
    ip: extractIp(opts.req),
    header: makeHeaderGetter(opts.req),
  }
}
