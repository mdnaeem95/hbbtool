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
  const session = await getSession(opts.req)

  return createInnerTRPCContext({
    headers: opts.req.headers,
    resHeaders,
    session,
  })
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

/**
 * Get session from request
 * This is a placeholder - implement your actual session logic here
 */
async function getSession(req: Request): Promise<Session | null> {
  // TODO: Implement actual session retrieval from cookies/headers
  // For now, return null (unauthenticated)
  return null
}