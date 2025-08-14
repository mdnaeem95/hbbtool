import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@kitchencloud/api'
import { createContextFromRequest } from '@kitchencloud/api/context'
import { getServerSession, createServerSupabaseClient } from '@kitchencloud/auth/server'
import { makeSupabaseLike } from '@/lib/supabase-like'

const deps = {
  async getSession() {
    return getServerSession()
  },
  getSupabase() {
    const real = createServerSupabaseClient()
    return makeSupabaseLike(real)
  },
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: ({ req, resHeaders }) => createContextFromRequest(req, deps, resHeaders),
  })

export { handler as GET, handler as POST }