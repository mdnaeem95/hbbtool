import type { SupabaseClient, AuthResponse, SignInWithPasswordCredentials } from '@supabase/supabase-js'
import type { SupabaseLike, SupabaseSession, SupabaseUser } from '@kitchencloud/api'

function mapUser(u: any): SupabaseUser | null {
  if (!u) return null
  return {
    id: u.id,
    email: u.email ?? undefined,
    user_metadata: u.user_metadata ?? {},
  }
}

function mapResp(resp: AuthResponse) {
  return {
    data: {
      user: mapUser(resp.data.user),
      // keep loose to satisfy SupabaseSession’s index signature
      session: (resp.data.session ?? null) as unknown as SupabaseSession | null,
    },
    error: resp.error ? { message: resp.error.message } : null,
  }
}

export function makeSupabaseLike(client: SupabaseClient): SupabaseLike {
  return {
    auth: {
      async signUp(args: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
        const resp = await client.auth.signUp(args as any)
        return mapResp(resp)
      },
      async signInWithPassword(args: { email: string; password: string }) {
        const resp = await client.auth.signInWithPassword(args as SignInWithPasswordCredentials)
        return mapResp(resp)
      },
      async signOut() {
        const { error } = await client.auth.signOut()
        return { error: error ? { message: error.message } : null }
      },
    },
  }
}
