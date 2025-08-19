import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import authHeroImage from '../../../public/images/auth-hero.jpg'

export const metadata: Metadata = {
  title: "KitchenCloud - Sign In",
  description: "Order delicious home-cooked meals from local home-based businesses",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold text-primary">KitchenCloud</h1>
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Singapore's home-based F&B platform
            </p>
          </div>
          {children}
        </div>
      </div>

      {/* Right side - Hero image */}
      <div className="hidden lg:block lg:flex-1 relative bg-muted">
        <Image
          src={authHeroImage}
          alt="Delicious home-cooked food"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  )
}