import { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"
import { Store, Users } from "lucide-react"

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
          Sign in to your account to continue
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
            Choose your account type
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* CUSTOMER OPTION */}
        <Link
          href="/browse"
          className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary hover:bg-primary/5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Continue as Customer</h3>
              <p className="text-sm text-muted-foreground">Browse and order food</p>
            </div>
          </div>
        </Link>

        {/* Merchant Option */}
        <Link
          href="/merchant-signup"
          className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary hover:bg-primary/5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Merchant Dashboard</h3>
              <p className="text-sm text-muted-foreground">Manage your business</p>
            </div>
          </div>
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Note: Merchant accounts require registration and approval
      </p>
    </div>
  )
}