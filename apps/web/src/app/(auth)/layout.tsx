import Link from "next/link"
import { ChefHat } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold">
            <ChefHat className="h-8 w-8 text-primary" />
            KitchenCloud
          </Link>
          <h1 className="mt-8 text-4xl font-bold">
            Order homemade meals from local cooks
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Join Singapore&apos;s largest community of home-based food businesses 
            and food lovers.
          </p>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden inline-flex items-center gap-2 text-xl font-bold mb-8">
            <ChefHat className="h-6 w-6 text-primary" />
            KitchenCloud
          </Link>
          {children}
        </div>
      </div>
    </div>
  )
}