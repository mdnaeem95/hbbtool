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
  console.log('\n=== createTRPCContext START ===')
  const { req, resHeaders } = opts
  
  // Log request details
  console.log('Request URL:', req.url)
  console.log('Cookie header:', req.headers.get('cookie') ? 'PRESENT' : 'MISSING')

  // IMPORTANT: In App Router API routes, we need to call getAuthSession
  // which will use cookies() internally. We can't pass the request.
  console.log('\nCalling getAuthSession...')
  const session = await getAuthSession()
  
  console.log('Session result:', session ? 'FOUND' : 'NULL')
  if (session) {
    console.log('  User ID:', session.user.id)
    console.log('  User Type:', session.user.userType)
    console.log('  User Email:', session.user.email)
  }
  
  // Create Supabase client
  console.log('\nCreating Supabase client...')
  const supabase = await createServerSupabaseClient()

  // Extract IP address
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    undefined

  const context = {
    db,
    session,
    supabase,
    req,
    resHeaders,
    ip,
  }
  
  console.log('\n=== createTRPCContext END ===')
  console.log('Context created with session:', context.session ? 'YES' : 'NO')
  
  return context
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>