import { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your KitchenCloud account",
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Welcome back</h2>
        <p className="mt-2 text-muted-foreground">
          Sign in to your account to continue ordering
        </p>
      </div>

      <LoginForm />

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Don&apos;t have an account? </span>
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Are you a merchant?
          </span>
        </div>
      </div>

      <div className="text-center">
        <Link 
          href={"http://localhost:3000/dashboard"}
          className="text-sm text-primary hover:underline"
        >
          Go to Merchant Dashboard
        </Link>
      </div>
    </div>
  )
}