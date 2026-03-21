import { create } from 'zustand'
import api from '@/lib/api'

export interface SavedItem {
  id: string
  product_id: string
  variant_id?: string
  quantity: number
  price_at_save: number
  saved_at: string
  product_name: string
  slug: string
  current_price: number
  average_rating: number
  review_count: number
  variant_name?: string
  variant_current_price?: number
  variant_sku?: string
  image?: string
  variant_attributes?: Array<{
    attribute_name: string
    value: string
  }>
  price_status: 'price_dropped' | 'price_increased' | 'same_price'
}

interface SaveForLaterState {
  items: SavedItem[]
  loading: boolean
  error: string | null
  
  fetchItems: () => Promise<void>
  addItem: (productId: string, variantId?: string, quantity?: number) => Promise<void>
  moveToCart: (itemId: string) => Promise<void>
  moveAllToCart: () => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  fetchPriceChanges: () => Promise<Array<SavedItem & { price_difference: number; percentage_change: number }>>
}

export const useSaveForLaterStore = create<SaveForLaterState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get('/saved-for-later')
      set({ items: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch saved items', loading: false })
    }
  },

  addItem: async (productId, variantId, quantity = 1) => {
    try {
      await api.post('/saved-for-later', { productId, variantId, quantity })
      await get().fetchItems()
    } catch (err: any) {
      throw err
    }
  },

  moveToCart: async (itemId) => {
    try {
      await api.post(`/saved-for-later/${itemId}/move-to-cart`)
      set(state => ({ items: state.items.filter(i => i.id !== itemId) }))
    } catch (err: any) {
      throw err
    }
  },

  moveAllToCart: async () => {
    try {
      await api.post('/saved-for-later/move-all-to-cart')
      set({ items: [] })
    } catch (err: any) {
      throw err
    }
  },

  removeItem: async (itemId) => {
    try {
      await api.delete(`/saved-for-later/${itemId}`)
      set(state => ({ items: state.items.filter(i => i.id !== itemId) }))
    } catch (err: any) {
      throw err
    }
  },

  fetchPriceChanges: async () => {
    try {
      const { data } = await api.get('/saved-for-later/price-changes')
      return data.data
    } catch (err: any) {
      return []
    }
  }
}))
