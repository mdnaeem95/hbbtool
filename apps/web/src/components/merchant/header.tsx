"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Bell,
  ChevronRight,
  LogOut,
  Settings,
  HelpCircle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kitchencloud/ui"
import { Avatar, AvatarFallback, AvatarImage, Button } from "@kitchencloud/ui"
import { createClient } from "@/lib/supabase/client"
import { RouterOutputs } from "@/lib/trpc/types"

type MerchantDashboardData = RouterOutputs["merchant"]["getDashboard"]

interface MerchantHeaderProps {
  dashboardData: MerchantDashboardData
}

export function MerchantHeader({ dashboardData }: MerchantHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Generate breadcrumbs
  const pathSegments = pathname.split("/").filter(Boolean)
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/")
    const label = segment.charAt(0).toUpperCase() + segment.slice(1)
    return { href, label }
  })

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b transition-all",
        isScrolled
          ? "bg-white/95 shadow-sm backdrop-blur-md"
          : "bg-white"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
              <Link
                href={crumb.href}
                className={cn(
                  index === breadcrumbs.length - 1
                    ? "font-medium text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {crumb.label}
              </Link>
            </div>
          ))}
        </nav>

        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-orange-500" />
          </Button>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-auto p-0 hover:bg-transparent"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={dashboardData.merchant.logoUrl || undefined} />
                  <AvatarFallback>
                    {dashboardData.merchant.businessName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {dashboardData.merchant.businessName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    Merchant Account
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/help">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help & Support
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}