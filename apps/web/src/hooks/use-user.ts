// TODO: wire this to your real auth later
export type AppUser = {
  id: string
  email: string
  role: 'CUSTOMER' | 'MERCHANT'
  name?: string | null
  phone?: string | null
}

export function useUser() {
  // Return { user, loading } shape
  return { user: null as AppUser | null, loading: false }
}
