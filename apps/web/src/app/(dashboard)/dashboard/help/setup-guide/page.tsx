import { Metadata } from "next"
import { redirect } from "next/navigation"
import { SetupGuide } from "../../../../../components/merchant/guide/setup-guide"
import { getMerchantSession } from "@homejiak/auth/server"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Setup Guide - KitchenCloud",
  description: "Complete guide to setting up your home-based food business on KitchenCloud",
}

export default async function SetupGuidePage() {
  // Check authentication
  const session = await getMerchantSession()
  
  if (!session) {
    redirect("/auth?redirect=/dashboard/guide/setup")
  }

  return (
    <div className="flex flex-1 flex-col">
      <SetupGuide />
    </div>
  )
}