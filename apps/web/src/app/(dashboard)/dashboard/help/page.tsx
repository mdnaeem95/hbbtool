import { Metadata } from "next"
import { redirect } from "next/navigation"
import { MerchantHelpCenter } from "../../../../components/merchant/help/help-center"
import { getMerchantSession } from "@homejiak/auth/server"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Help Center - KitchenCloud",
  description: "Get support and answers for your home-based food business",
}

export default async function HelpPage() {
  // Check authentication
  const session = await getMerchantSession()
  
  if (!session) {
    redirect("/auth?redirect=/dashboard/help")
  }

  return (
    <div className="flex flex-1 flex-col">
      <MerchantHelpCenter />
    </div>
  )
}