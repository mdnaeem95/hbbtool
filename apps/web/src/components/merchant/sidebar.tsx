"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  BarChart3,
  Settings,
  HelpCircle,
  Store,
} from "lucide-react"
import { RouterOutputs } from "@/lib/trpc/types"


type MerchantDashboardData = RouterOutputs["merchant"]["getDashboard"]

interface MerchantSidebarProps {
  dashboardData: MerchantDashboardData
  className?: string
}

export function MerchantSidebar({ dashboardData, className }: MerchantSidebarProps) {
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
    <aside className={cn("flex h-full flex-col bg-white shadow-lg", className)}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Store className="h-8 w-8 text-orange-500" />
          <span className="text-xl font-bold">KitchenCloud</span>
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
            <p className="text-sm text-muted-foreground">Merchant Dashboard</p>
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
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
        >
          <HelpCircle className="h-5 w-5" />
          <span>Help & Support</span>
        </Link>
      </div>
    </aside>
  )
}