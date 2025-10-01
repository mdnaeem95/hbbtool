"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "../../../lib/utils"
import { Menu, LayoutDashboard, ShoppingBag, Package, BarChart3, Settings, HelpCircle, Store } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, Button } from "@homejiak/ui"
import { RouterOutputs } from "../../../lib/trpc/types"

type MerchantDashboardData = RouterOutputs["merchant"]["getDashboard"]

interface MerchantMobileNavProps {
  dashboardData: MerchantDashboardData
}

export function MerchantMobileNav({ dashboardData }: MerchantMobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Orders",
      href: "/orders",
      icon: ShoppingBag,
      badge: dashboardData.stats.pendingOrders,
    },
    {
      name: "Products",
      href: "/products",
      icon: Package,
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: BarChart3,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ]

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed bottom-4 left-4 z-40 h-14 w-14 rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2"
                onClick={() => setOpen(false)}
              >
                <Store className="h-8 w-8 text-orange-500" />
                <span className="text-xl font-bold">HomeJiak</span>
              </Link>
            </div>

            {/* Merchant info */}
            <div className="border-b p-4">
              <div className="flex items-center gap-3">
                {dashboardData.merchant.logoUrl && (
                  <img
                    src={dashboardData.merchant.logoUrl}
                    alt={dashboardData.merchant.businessName}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="truncate font-medium">{dashboardData.merchant.businessName}</p>
                  <p className="text-sm text-muted-foreground">
                    Merchant Dashboard
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4">
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-orange-50 text-orange-600"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge ? (
                      <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </nav>

            {/* Bottom section */}
            <div className="border-t p-4">
              <Link
                href="/help"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                <HelpCircle className="h-5 w-5" />
                <span>Help & Support</span>
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}