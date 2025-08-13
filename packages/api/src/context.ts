import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { getServerSession, createServerSupabaseClient } from '@kitchencloud/auth/server'
import { db } from '@kitchencloud/database'
import type { Context } from './types'

/**
 * Create context for tRPC in App Router
 * This is called for every tRPC request
 */
export async function createContext(
  opts: FetchCreateContextFnOptions
): Promise<Context> {
  // Get auth session
  const session = await getServerSession()
  const supabase = createServerSupabaseClient()
  
  // Extract headers from the request
  const headers = opts.req.headers
  
  // Helper to get header values
  const getHeader = (name: string): string | undefined => {
    return headers.get(name) ?? undefined
  }
  
  // Extract IP address
  const ip = 
    getHeader('x-forwarded-for')?.split(',')[0]?.trim() ||
    getHeader('x-real-ip') ||
    undefined

  return {
    db,
    session,
    supabase,
    req: opts.req,
    res: undefined, // Not available in App Router
    ip,
    header: getHeader,
  }
}