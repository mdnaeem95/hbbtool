import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter, createTRPCContext } from '@homejiak/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ error, path, type }) {
      console.error(`[tRPC ${type}] ${path ?? '<root>'}:`, error.message)
      console.error('Error code:', error.code)
    },
  })

export { handler as GET, handler as POST }