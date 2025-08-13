import { Metadata } from "next"
import Link from "next/link"
import { Store, ArrowLeft } from "lucide-react"
import { Card } from "@kitchencloud/ui"
import { MerchantLoginForm } from "@/components/auth/merchant-login-form"

export const metadata: Metadata = {
  title: "Merchant Login",
  description: "Sign in to your KitchenCloud merchant dashboard",
}

export default function MerchantLoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to home
        </Link>

        <Card className="p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Merchant Portal</h2>
                <p className="text-sm text-muted-foreground">
                  Sign in to manage your business
                </p>
              </div>
            </div>

            <MerchantLoginForm />

            <div className="space-y-3 pt-4 border-t">
              <div className="text-center text-sm">
                <span className="text-muted-foreground">Don&apos;t have a merchant account? </span>
                <Link href="/merchant-signup" className="font-medium text-primary hover:underline">
                  Register your business
                </Link>
              </div>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Looking to order food? </span>
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Customer login
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Need help? Contact{" "}
          <a href="mailto:merchant-support@kitchencloud.sg" className="underline hover:text-foreground">
            merchant support
          </a>
        </p>
      </div>
    </div>
  )
}