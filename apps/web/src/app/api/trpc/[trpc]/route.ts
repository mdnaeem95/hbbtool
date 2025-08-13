import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter, createContext } from "@kitchencloud/api"
import { NextRequest } from "next/server"

/**
 * This wraps the tRPC API handler, so we can extract the Next.js
 * request context properly
 */
async function handler(req: NextRequest) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async (opts) => {
      // Pass the full Next.js request to createContext
      // This allows extracting headers, cookies, etc.
      return createContext({
        ...opts,
        req: req,
      })
    },
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}:`,
              error.message
            )
          }
        : undefined,
  })
}

// Export named handlers for each HTTP method
export { handler as GET, handler as POST }