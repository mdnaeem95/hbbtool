import { createBrowserClient } from '@supabase/ssr'

// Create browser client
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Sign in merchant
export async function signInMerchant(email: string, password: string) {
  const supabase = createBrowserSupabaseClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  
  // Verify user is a merchant
  if (data.user?.user_metadata.userType !== 'merchant') {
    await supabase.auth.signOut()
    throw new Error('Invalid merchant credentials')
  }
  
  return data
}

// Sign up merchant
export async function signUpMerchant({
  email,
  password,
  phone,
  businessName,
}: {
  email: string
  password: string
  phone: string
  businessName: string
}) {
  const supabase = createBrowserSupabaseClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        userType: 'merchant',
        phone,
        businessName,
      },
    },
  })
  
  if (error) throw error
  return data
}

// Sign out
export async function signOut() {
  const supabase = createBrowserSupabaseClient()
  await supabase.auth.signOut()
}

// Optional: Customer sign in (if they want to track orders)
export async function signInCustomer(email: string, password: string) {
  const supabase = createBrowserSupabaseClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  
  if (data.user?.user_metadata.userType !== 'customer') {
    await supabase.auth.signOut()
    throw new Error('Invalid customer credentials')
  }
  
  return data
}