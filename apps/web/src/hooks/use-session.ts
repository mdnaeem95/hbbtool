// apps/web/src/hooks/use-session.ts
export type SessionUser = {
  id: string
  name?: string | null
  email?: string | null
  phone?: string | null
}

export function useSession() {
  // TODO: wire up to your real auth later (cookies/NextAuth/etc.)
  return { user: null as SessionUser | null }
}
