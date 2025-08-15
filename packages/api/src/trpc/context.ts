import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { db } from '@kitchencloud/database'
import { createServerSupabaseClient, getServerSession } from '@kitchencloud/auth'
import type {
  Context as BaseContext,
  Session as AppSession,
  SupabaseLike,
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

/**
 * Create tRPC context for fetch adapter (works in Next.js App Router).
 * - Attaches Prisma client
 * - Hydrates Supabase server client
 * - Resolves current session (if any)
 * - Exposes request, resHeaders (for setting cookies), ip, and a header() helper
 */
export async function createTRPCContext(
  opts: FetchCreateContextFnOptions
): Promise<BaseContext<AppSession, SupabaseLike>> {
  const { req } = opts
  const resHeaders = new Headers()
  const supabase = createServerSupabaseClient()
  const session = await getServerSession() // -> { user } | null

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    undefined

  return {
    db,
    session: (session as AppSession | null),
    supabase: supabase as unknown as SupabaseLike,
    req,
    resHeaders,
    ip,
    header: makeHeaderReader(req.headers),
  }
}

/** Strongly-typed context type (no deprecated inferAsyncReturnType) */
export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>