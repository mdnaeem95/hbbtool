import { createClient } from '@/lib/supabase/server'

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get optional user session
  const supabase = createClient()
  let user = null
  
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user = authUser
  } catch (error) {
    // User is not authenticated, which is fine for customer routes
    console.log('No authenticated user')
  }

  // Check if we're on the home page (map view)
  // The home page will handle its own layout
  return <>{children}</>
}