import { create } from 'zustand'
import { OrderStatus } from '@homejiak/database'

interface OrderFilters {
  status: OrderStatus | null
  search: string
  dateFrom?: Date
  dateTo?: Date
}

interface OrderStore {
  // Selection
  selectedOrders: Set<string>
  toggleOrderSelection: (orderId: string) => void
  clearSelection: () => void
  
  // Filters
  filters: OrderFilters
  setFilters: (filters: Partial<OrderFilters>) => void
  
  // Real-time updates
  lastUpdate: Date | null
  setLastUpdate: (date: Date) => void
  
  // Optimistic updates
  optimisticUpdates: Map<string, Partial<{ status: OrderStatus }>>
  addOptimisticUpdate: (orderId: string, update: Partial<{ status: OrderStatus }>) => void
  removeOptimisticUpdate: (orderId: string) => void
}

export const useOrderStore = create<OrderStore>((set) => ({
  // Selection
  selectedOrders: new Set(),
  toggleOrderSelection: (orderId) => set((state) => {
    const newSelection = new Set(state.selectedOrders)
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId)
    } else {
      newSelection.add(orderId)
    }
    return { selectedOrders: newSelection }
  }),
  clearSelection: () => set({ selectedOrders: new Set() }),
  
  // Filters
  filters: {
    status: null,
    search: '',
    dateFrom: undefined,
    dateTo: undefined,
  },
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),
  
  // Real-time updates
  lastUpdate: null,
  setLastUpdate: (date) => set({ lastUpdate: date }),
  
  // Optimistic updates
  optimisticUpdates: new Map(),
  addOptimisticUpdate: (orderId, update) => set((state) => {
    const newUpdates = new Map(state.optimisticUpdates)
    newUpdates.set(orderId, update)
    return { optimisticUpdates: newUpdates }
  }),
  removeOptimisticUpdate: (orderId) => set((state) => {
    const newUpdates = new Map(state.optimisticUpdates)
    newUpdates.delete(orderId)
    return { optimisticUpdates: newUpdates }
  }),
}))