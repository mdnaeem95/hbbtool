import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter, createTRPCContext } from '@kitchencloud/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: (opts) => createTRPCContext(opts), // forward req, resHeaders, info
    onError({ error, path, type }) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[tRPC ${type}] ${path ?? '<root>'}:`, error)
      }
    },
  })

export { handler as GET, handler as POST }
