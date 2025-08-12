import { type FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch"
import { db } from "@kitchencloud/database/client"

export interface Session {
  user: {
    id: string
    email: string
    role: "CUSTOMER" | "MERCHANT"
  }
}

/**
 * This helper generates the "internals" for a tRPC context.
 */
export const createInnerTRPCContext = (opts: {
  headers: Headers
  session: Session | null
  resHeaders?: Headers
}) => {
  return {
    db,
    session: opts.session,
    headers: opts.headers,
    resHeaders: opts.resHeaders ?? new Headers(),
  }
}

/**
 * This is the actual context you will use in your router.
 * @link https://trpc.io/docs/context
 */
export async function createTRPCContext (
  opts: FetchCreateContextFnOptions
) {
  const { resHeaders } = opts
  // Get the session from the headers/cookies
  const session = await getSessionFromHeaders(opts.req.headers)

  return createInnerTRPCContext({
    headers: opts.req.headers,
    resHeaders,
    session,
  })
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

/**
 * Get session from supabase using the Authorization header
 */
async function getSessionFromHeaders(headers: Headers): Promise<Session | null> {
  try {
    // check fr custom headers set by the app
    const userId = headers.get("x-user-id")
    const userEmail = headers.get("x-user-email")
    const userRole = headers.get("x-user-role") as "CUSTOMER" | "MERCHANT" | null
  
    if (!userId || !userRole) return null

    return {
      user: {
        id: userId,
        email: userEmail || '',
        role: userRole,
      }
    }
    } catch (error) {
      console.error("Error getting session from headers:", error)
      return null
    }
}
