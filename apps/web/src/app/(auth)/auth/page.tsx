import { Suspense } from 'react'
import AuthPageContent from './auth-content'

// Loading fallback component
function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-purple-50">
      <div className="w-full max-w-md space-y-8 px-4">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">KitchenCloud</h1>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
        
        {/* Loading spinner */}
        <div className="bg-white rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main page component with Suspense wrapper
export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-purple-50 px-4">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary">KitchenCloud</h1>
            <p className="mt-2 text-muted-foreground">
              Order from your favorite home-based businesses
            </p>
          </div>

          {/* White card container */}
          <div className="bg-white rounded-xl p-6 shadow-xl">
            <AuthPageContent />
          </div>
        </div>
      </div>
    </Suspense>
  )
}