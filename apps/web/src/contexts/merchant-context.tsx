'use client'

import * as React from 'react'

interface MerchantData {
  id: string
  businessName: string
  slug: string
  minimumOrder: number
  deliveryEnabled: boolean
  pickupEnabled: boolean
  deliveryFee: number
  preparationTime?: string  // optional string
  logoUrl?: string          // optional string
  description?: string      // optional string
}

interface MerchantContextType {
  merchant: MerchantData | null
  setMerchant: (merchant: MerchantData | null) => void
}

const MerchantContext = React.createContext<MerchantContextType | undefined>(undefined)

export function MerchantProvider({ children }: { children: React.ReactNode }) {
  const [merchant, setMerchant] = React.useState<MerchantData | null>(null)

  return (
    <MerchantContext.Provider value={{ merchant, setMerchant }}>
      {children}
    </MerchantContext.Provider>
  )
}

export function useMerchant() {
  const context = React.useContext(MerchantContext)
  if (context === undefined) {
    throw new Error('useMerchant must be used within a MerchantProvider')
  }
  return context
}