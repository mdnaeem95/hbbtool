import { appRouter } from '@kitchencloud/api'
import { createContextFromRequest } from '@kitchencloud/api/context'
import { headers as nextHeaders } from 'next/headers'
import { getServerSession, createServerSupabaseClient } from '@kitchencloud/auth/server'
import { makeSupabaseLike } from '@/lib/supabase-like' // <-- the adapter above

const deps = {
  async getSession() {
    return getServerSession()
  },
  getSupabase() {
    const real = createServerSupabaseClient()
    return makeSupabaseLike(real) // <-- returns SupabaseLike
  },
}

export async function getServerCaller() {
  const h = await nextHeaders()
  const req = new Request('http://internal/caller', { headers: new Headers(h) })
  const ctx = await createContextFromRequest(req, deps, new Headers())
  return appRouter.createCaller(ctx) // ✅ now Context<Session, SupabaseLike>
}