import Link from "next/link"
import { ChefHat } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold">
              <ChefHat className="h-5 w-5 text-primary" />
              HomeJiak
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Singapore&apos;s platform for home-based food businesses
            </p>
          </div>

          {/* Customer Links */}
          <div>
            <h3 className="font-semibold">For Customers</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/browse" className="text-muted-foreground hover:text-foreground">
                  Browse Merchants
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground">
                  How it Works
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-muted-foreground hover:text-foreground">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Merchant Links */}
          <div>
            <h3 className="font-semibold">For Merchants</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a 
                  href={process.env.NEXT_PUBLIC_MERCHANT_URL || "http://localhost:3001"}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Merchant Dashboard
                </a>
              </li>
              <li>
                <Link href="/merchants/pricing" className="text-muted-foreground hover:text-foreground">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/merchants/resources" className="text-muted-foreground hover:text-foreground">
                  Resources
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} HomeJiak. All rights reserved.
        </div>
      </div>
    </footer>
  )
}