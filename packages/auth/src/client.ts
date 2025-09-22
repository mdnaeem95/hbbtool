import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function signInMerchant(email: string, password: string) {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (data.user?.user_metadata?.userType !== 'merchant') {
    // Sign out to avoid a "stuck" non-merchant session
    await supabase.auth.signOut()
    throw new Error('Not a merchant account')
  }
  return { userId: data.user.id, email: data.user.email! }
}

export async function signUpMerchant(email: string, password: string) {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { userType: 'merchant' } },
  })
  if (error) throw error
  return { userId: data.user?.id ?? null, email: data.user?.email ?? email }
}

// MVP customer sign-in stub
export async function signInCustomer(phone: string) {
  return { phone, requiresOtp: true as const }
}

export async function signOut() {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/** Optional: force-refresh current session in the browser */
export async function refreshSession() {
  const supabase = createBrowserSupabaseClient()
  return supabase.auth.getSession()
}