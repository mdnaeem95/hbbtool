import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Types
export interface CartItem {
  id: string // Unique cart item ID
  productId: string
  merchantId: string
  merchantName: string
  name: string
  price: number
  quantity: number
  image?: string
  variant?: {
    label?: string;      // e.g. "Large, Spicy"
    options?: Record<string, string>; // { size: "L", spice: "Hot" }
  } | null;
  customizations?: CartItemCustomization[] // Add this
  customizationPrice?: number // Total price adjustment from customizations
  maxQuantity?: number
  notes?: string
}

export interface CartItemCustomization {
  groupId: string
  groupName: string
  selections: Array<{
    modifierId: string
    modifierName: string
    priceAdjustment: number
    priceType: 'FIXED' | 'PERCENTAGE'
    quantity: number
  }>
}

export interface CartStore {
  // State
  items: CartItem[]
  merchantId: string | null
  merchantName: string | null
  
  // Actions
  addItem: (item: Omit<CartItem, 'id' | 'quantity'> & { quantity?: number }) => void
  updateQuantity: (itemId: string, quantity: number) => void
  removeItem: (itemId: string) => void
  clearCart: () => void
  setMerchantInfo: (merchantId: string, merchantName: string) => void

  // Computed values
  getItemCount: () => number
  getSubtotal: () => number
  getTotalItemPrice: (item: CartItem) => number
  getCartByMerchant: () => Map<string, CartItem[]>
  canAddItem: (merchantId: string) => boolean
  findItem: (productId: string) => CartItem | undefined
  findSimilarItem: (productId: string, customizations?: CartItemCustomization[]) => CartItem | undefined
}

// Helper to generate unique cart item IDs
const generateCartItemId = () => `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Helper to generate a hash for customization combinations
const generateCustomizationHash = (customizations?: CartItemCustomization[]): string => {
  if (!customizations || customizations.length === 0) {
    return 'no-customization'
  }
  
  // Sort and stringify customizations for consistent hashing
  const sorted = customizations
    .map(group => ({
      groupId: group.groupId,
      selections: group.selections
        .map(s => `${s.modifierId}:${s.quantity}`)
        .sort()
        .join(',')
    }))
    .sort((a, b) => a.groupId.localeCompare(b.groupId))
    .map(g => `${g.groupId}:${g.selections}`)
    .join('|')
  
  return sorted
}

// Calculate total customization price
const calculateCustomizationPrice = (
  basePrice: number,
  customizations?: CartItemCustomization[]
): number => {
  if (!customizations || customizations.length === 0) {
    return 0
  }
  
  let totalAdjustment = 0
  
  customizations.forEach(group => {
    group.selections.forEach(selection => {
      const adjustment = selection.priceType === 'FIXED'
        ? selection.priceAdjustment * selection.quantity
        : (basePrice * selection.priceAdjustment / 100) * selection.quantity
      
      totalAdjustment += adjustment
    })
  })
  
  return totalAdjustment
}

// Create the store
export const useCartStore = create<CartStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      items: [],
      merchantId: null,
      merchantName: null,
      
      // Add item to cart
      addItem: (newItem) => {
        const state = get()
        const { merchantId: newMerchantId, merchantName: newMerchantName } = newItem
        
        // Check if we can add items from this merchant
        if (!state.canAddItem(newMerchantId)) {
          throw new Error('Cannot add items from different merchants')
        }

        // Calculate customization price
        const customizationPrice = calculateCustomizationPrice(
          newItem.price, 
          newItem.customizations
        )
        
        // Check if item already exists
        const existingItem = state.findSimilarItem(newItem.productId, newItem.customizations)
        
        if (existingItem) {
          // Update quantity of existing item
          const newQuantity = existingItem.quantity + (newItem.quantity || 1)
          state.updateQuantity(existingItem.id, newQuantity)
          return
        }
        
        // Add new item
        set((state) => ({
          items: [
            ...state.items,
            {
              ...newItem,
              id: generateCartItemId(),
              quantity: newItem.quantity || 1,
              customizationPrice,
            },
          ],
          merchantId: newMerchantId,
          merchantName: newMerchantName,
        }))
      },
      
      // Update item quantity
      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId)
          return
        }
        
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? { 
                  ...item, 
                  quantity: item.maxQuantity 
                    ? Math.min(quantity, item.maxQuantity) 
                    : quantity 
                }
              : item
          ),
        }))
      },
      
      // Remove item from cart
      removeItem: (itemId) => {
        set((state) => {
          const newItems = state.items.filter((item) => item.id !== itemId)
          
          // Clear merchant info if cart is empty
          if (newItems.length === 0) {
            return {
              items: [],
              merchantId: null,
              merchantName: null,
            }
          }
          
          return { items: newItems }
        })
      },
      
      // Clear entire cart
      clearCart: () => {
        set({
          items: [],
          merchantId: null,
          merchantName: null,
        })
      },
      
      // Get total item count
      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },
      
      // Calculate subtotal (including customizations)
      getSubtotal: () => {
        return get().items.reduce(
          (total, item) => {
            const itemTotal = get().getTotalItemPrice(item) * item.quantity
            return total + itemTotal
          },
          0
        )
      },

      // Get total price for a single item (including customizations)
      getTotalItemPrice: (item) => {
        return item.price + (item.customizationPrice || 0)
      },
      
      // Group items by merchant (for future multi-merchant support)
      getCartByMerchant: () => {
        const items = get().items
        const merchantMap = new Map<string, CartItem[]>()
        
        items.forEach((item) => {
          const merchantItems = merchantMap.get(item.merchantId) || []
          merchantItems.push(item)
          merchantMap.set(item.merchantId, merchantItems)
        })
        
        return merchantMap
      },
      
      // Check if we can add items from a merchant
      canAddItem: (merchantId) => {
        const state = get()
        return state.items.length === 0 || state.merchantId === merchantId
      },
      
      // Find item by product ID
      findItem: (productId) => {
        return get().items.find((item) => item.productId === productId)
      },

      // Find item with same product and customizations
      findSimilarItem: (productId, customizations) => {
        const hash = generateCustomizationHash(customizations)
        return get().items.find((item) => {
          const itemHash = generateCustomizationHash(item.customizations)
          return item.productId === productId && itemHash === hash
        })
      },

      // set merchant info
      setMerchantInfo: (merchantId: string, merchantName: string) => {
        set((state) => ({
          ...state,
          merchantId,
          merchantName,
        }))
      },
    }),
    {
      name: 'cart-store',
    }
  )
)

// Hooks for specific cart functionality
export const useCart = () => {
  const store = useCartStore()
  return {
    items: store.items,
    merchantId: store.merchantId,
    merchantName: store.merchantName,
    addItem: store.addItem,
    updateQuantity: store.updateQuantity,
    removeItem: store.removeItem,
    clearCart: store.clearCart,
    canAddItem: store.canAddItem,
    findItem: store.findItem,
    findSimilarItem: store.findSimilarItem,
    getItemCount: store.getItemCount,
    getSubtotal: store.getSubtotal,
    getTotalItemPrice: store.getTotalItemPrice,
    setMerchantInfo: store.setMerchantInfo
  }
}

export const useCartItems = () => {
  return useCartStore((state) => state.items)
}

export const useCartCount = () => {
  return useCartStore((state) => state.getItemCount())
}

export const useCartTotal = () => {
  const subtotal = useCartStore((state) => state.getSubtotal())
  const merchantId = useCartStore((state) => state.merchantId)
  
  // TODO: Fetch delivery fee from merchant data
  const deliveryFee = merchantId ? 5.00 : 0
  const total = subtotal + deliveryFee
  
  return {
    subtotal,
    deliveryFee,
    total,
  }
}

// Selector for checking if product is in cart
export const useIsInCart = (productId: string) => {
  return useCartStore((state) => state.findItem(productId) !== undefined)
}

// Selector for getting product quantity in cart
export const useCartItemQuantity = (productId: string) => {
  return useCartStore((state) => {
    const item = state.findItem(productId)
    return item?.quantity || 0
  })
}

export const formatCustomizations = (customizations?: CartItemCustomization[]): string => {
  if (!customizations || customizations.length === 0) {
    return ''
  }
  
  const parts: string[] = []
  
  customizations.forEach(group => {
    const selections = group.selections.map(s => {
      const qty = s.quantity > 1 ? ` x${s.quantity}` : ''
      return s.modifierName + qty
    }).join(', ')
    
    parts.push(`${group.groupName}: ${selections}`)
  })
  
  return parts.join(' • ')
}