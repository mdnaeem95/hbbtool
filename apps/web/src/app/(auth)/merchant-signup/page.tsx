import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Store } from "lucide-react"
import { MerchantSignupForm } from "@/components/auth/merchant-signup-form"

export const metadata: Metadata = {
  title: "Merchant Registration",
  description: "Register your home-based food business on KitchenCloud",
}

export default function MerchantSignupPage() {
  return (
    <div className="space-y-6">
      <Link 
        href="/login" 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to login
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Store className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Start selling on KitchenCloud</h2>
          <p className="mt-1 text-muted-foreground">
            Join Singapore&apos;s fastest growing home-based F&B platform
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
        <h3 className="font-medium text-orange-900">What you&apos;ll get:</h3>
        <ul className="mt-2 space-y-1 text-sm text-orange-800">
          <li>• Digital storefront for your business</li>
          <li>• Order management dashboard</li>
          <li>• Zero commission fees - only pay transaction fees</li>
          <li>• WhatsApp integration for customer communication</li>
          <li>• Analytics to grow your business</li>
        </ul>
      </div>

      <MerchantSignupForm />

      <div className="text-center text-xs text-muted-foreground">
        By registering, you agree to our{" "}
        <Link href="/merchant-terms" className="underline hover:text-foreground">
          Merchant Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
      </div>
    </div>
  )
}