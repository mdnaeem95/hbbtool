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
  maxQuantity?: number
  notes?: string
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
  
  // Computed values
  getItemCount: () => number
  getSubtotal: () => number
  getCartByMerchant: () => Map<string, CartItem[]>
  canAddItem: (merchantId: string) => boolean
  findItem: (productId: string) => CartItem | undefined
}

// Helper to generate unique cart item IDs
const generateCartItemId = () => `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

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
        
        // Check if item already exists
        const existingItem = state.findItem(newItem.productId)
        
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
      
      // Calculate subtotal
      getSubtotal: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        )
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
    getItemCount: store.getItemCount,
    getSubtotal: store.getSubtotal
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