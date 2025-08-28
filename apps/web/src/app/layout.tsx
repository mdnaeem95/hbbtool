import "./globals.css"

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@kitchencloud/ui"
import { TRPCProvider } from "@/lib/trpc/client"
import { AuthProvider } from "@kitchencloud/auth/provider"
import { NotificationToast } from "@/components/notifications/notification-toast"
import { MerchantProvider } from "@/contexts/merchant-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "KitchenCloud - Home-Based Food Ordering",
    template: "%s | KitchenCloud"
  },
  description: "Order delicious home-cooked meals from local home-based businesses in Singapore",
  keywords: ["home food", "Singapore", "food delivery", "home-based business"],
  authors: [{ name: "KitchenCloud" }],
  openGraph: {
    type: "website",
    locale: "en_SG",
    url: "https://kitchencloud.sg",
    siteName: "KitchenCloud",
    title: "KitchenCloud - Home-Based Food Ordering",
    description: "Order delicious home-cooked meals from local home-based businesses",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KitchenCloud",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KitchenCloud - Home-Based Food Ordering",
    description: "Order delicious home-cooked meals from local home-based businesses",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <TRPCProvider>
            <MerchantProvider>
              {children}
              <div id="portal-root"></div>
            </MerchantProvider>
            <NotificationToast />
            <Toaster />
          </TRPCProvider>
        </AuthProvider>
      </body>
    </html>
  )
}