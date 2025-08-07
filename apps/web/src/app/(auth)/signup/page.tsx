import { Metadata } from "next"
import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"

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

      <div className="text-center">
        <Link 
          href={process.env.NEXT_PUBLIC_MERCHANT_URL || "http://localhost:3001"}
          className="text-sm text-primary hover:underline"
        >
          Register as a Merchant
        </Link>
      </div>
    </div>
  )
}