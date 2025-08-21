import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { db } from '@kitchencloud/database'
import { getAuthSession, createServerSupabaseClient } from '@kitchencloud/auth/server'
import type { AuthSession } from '@kitchencloud/auth'

export interface Context {
  db: typeof db
  session: AuthSession | null
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
  req: Request
  resHeaders: Headers
  ip?: string
}

/**
 * Create tRPC context with unified auth
 */
export async function createTRPCContext(
  opts: FetchCreateContextFnOptions
): Promise<Context> {
  const { req, resHeaders } = opts

  // Get auth session (handles both merchant and customer auth)
  const session = await getAuthSession(req)
  
  // Create Supabase client
  const supabase = await createServerSupabaseClient()

  // Extract IP address
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    undefined

  return {
    db,
    session,
    supabase,
    req,
    resHeaders,
    ip,
  }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>