import { Metadata } from "next"
import { PhoneLoginForm } from "@/components/auth/phone-login-form"

export const metadata: Metadata = {
  title: "Phone Login | KitchenCloud",
  description: "Sign in with your phone number",
}

export default function PhoneLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your phone number to continue
          </p>
        </div>
        
        <PhoneLoginForm />
      </div>
    </div>
  )
}