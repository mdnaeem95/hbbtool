import { db } from '@kitchencloud/database'
import type { AuthDeps, Context } from './types'

export async function createContextFromRequest<S, SC>(
  req: Request,
  deps: AuthDeps<S, SC>,
  resHeaders?: Headers
): Promise<Context<S, SC>> {
  const session = await deps.getSession()
  const supabase = deps.getSupabase()

  const header = (name: string) => req.headers.get(name) ?? undefined
  const ip =
    header('x-forwarded-for')?.split(',')[0]?.trim() ||
    header('x-real-ip') ||
    undefined

  return {
    db,
    session,
    supabase,
    req,
    resHeaders, // keep what the fetch adapter gives you
    ip,
    header,
  }
}