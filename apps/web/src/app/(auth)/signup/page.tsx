import { Metadata } from "next"
import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"
import { Store } from "lucide-react"

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your KitchenCloud account",
}

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Create an account</h2>
        <p className="mt-2 text-muted-foreground">
          Start ordering from your favorite home cooks
        </p>
      </div>

      <SignupForm />

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
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

      <Link
        href="/merchant-signup"
        className="group flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary hover:bg-primary/5"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20">
          <Store className="h-5 w-5 text-primary" />
        </div>
        <div className="text-left">
          <p className="font-medium">Register as a Merchant</p>
          <p className="text-sm text-muted-foreground">
            Start selling your home-cooked meals
          </p>
        </div>
      </Link>
    </div>
  )
}