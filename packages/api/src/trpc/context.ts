import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { db } from '@kitchencloud/database'
import { createServerSupabaseClient, getServerSession } from '@kitchencloud/auth'
import type {
  Context as BaseContext,
  Session as AppSession,
  SupabaseLike,
  SupabaseAuthAPI,
} from '../types'

type HeadersLike = Headers | (Record<string, string> & { get?: never })

function makeHeaderReader(h?: HeadersLike) {
  return (name: string): string | undefined => {
    if (!h) return undefined
    if (h instanceof Headers) return h.get(name) ?? undefined
    const key = Object.keys(h).find(k => k.toLowerCase() === name.toLowerCase())
    return key ? (h as Record<string, string>)[key] : undefined
  }
}

// Minimal Supabase stub for environments without Next request scope (tests/smoke)
function makeSupabaseStub(): SupabaseLike {
  const auth: SupabaseAuthAPI = {
    async signUp() {
      return { data: { user: null, session: null }, error: null }
    },
    async signInWithPassword() {
      // Return a benign response; callers will handle null session.
      return { data: { user: null, session: null }, error: null }
    },
    async signOut() {
      return { error: null }
    },
  }
  return { auth }
}

/**
 * Create tRPC context for the Fetch adapter (Next.js App Router).
 * Falls back to a no-auth stub if Next request scope isn't available
 * (e.g. when invoked by an in-memory smoke script).
 */
export async function createTRPCContext(
  opts: FetchCreateContextFnOptions
): Promise<BaseContext<AppSession, SupabaseLike>> {
  const { req, resHeaders } = opts

  let supabase: SupabaseLike
  let session: AppSession | null = null

  try {
    // This will throw if called outside a Next request scope
    const sb = createServerSupabaseClient()
    supabase = sb as unknown as SupabaseLike
    session = (await getServerSession()) as AppSession | null
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[context] Falling back to Supabase stub (likely running outside Next request scope):',
        (err as Error)?.message
      )
    }
    supabase = makeSupabaseStub()
    session = null
  }

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
    header: makeHeaderReader(req.headers),
  }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>
