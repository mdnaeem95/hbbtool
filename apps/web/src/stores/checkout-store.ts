import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DeliveryAddress {
  line1: string
  line2?: string
  postalCode: string
  city?: string
  state?: string
  country?: string
  notes?: string
}

interface ContactInfo {
  name: string
  email: string
  phone: string
}

interface CheckoutState {
  // Session
  sessionId: string | null
  
  // Delivery
  deliveryMethod: 'DELIVERY' | 'PICKUP' | null
  deliveryAddress: DeliveryAddress
  pickupNotes?: string | null
  
  // Contact
  contactInfo: ContactInfo | null
  
  // Actions
  setSessionId: (id: string) => void
  setDeliveryMethod: (method: 'DELIVERY' | 'PICKUP') => void
  setDeliveryAddress: (patch: Partial<DeliveryAddress>) => void
  setPickupNotes: (notes: string) => void
  setContactInfo: (info: ContactInfo | null) => void
  reset: () => void
}

const initialAddress: DeliveryAddress = { line1: '', postalCode: '' }

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      // Initial state
      sessionId: null,
      deliveryMethod: null,
      deliveryAddress: initialAddress,
      pickupNotes: null,
      contactInfo: null,
      
      // Actions
      setSessionId: (id) => set({ sessionId: id }),
      setDeliveryMethod: (method) => set({ deliveryMethod: method }),
      setDeliveryAddress: (patch) => set((s) => ({ deliveryAddress: { ...s.deliveryAddress, ...patch } })),
      setPickupNotes: (notes) => set({ pickupNotes: notes }),
      setContactInfo: (info) => set({ contactInfo: info }),
      
      reset: () => set({
        sessionId: null,
        deliveryMethod: null,
        deliveryAddress: initialAddress,
        pickupNotes: null,
        contactInfo: null,
      }),
    }),
    {
      name: 'checkout-store',
      partialize: (state) => ({
        // Don't persist session ID
        deliveryMethod: state.deliveryMethod,
        contactInfo: state.contactInfo,
      }),
    }
  )
)