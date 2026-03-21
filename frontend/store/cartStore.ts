import { create } from 'zustand'
import api from '@/lib/api'

export interface CartItem {
  id: string
  product_id: string
  variant_id?: string
  name: string
  price: number
  quantity: number
  image_url?: string
  slug: string
}

interface CartState {
  items: CartItem[]
  loading: boolean
  open: boolean
  fetchCart: () => Promise<void>
  addItem: (productId: string, quantity: number, variantId?: string) => Promise<void>
  updateItem: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => void
  setOpen: (open: boolean) => void
  total: () => number
  count: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  loading: false,
  open: false,

  setOpen: (open) => set({ open }),

  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  fetchCart: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/cart')
      // Flatten the nested backend response (item.product.name -> item.name)
      const mappedItems = (data.data?.items || []).map((item: any) => ({
        id: item.id,
        product_id: item.productId,
        variant_id: item.variantId,
        name: item.product.name,
        price: item.unitPrice,
        quantity: item.quantity,
        image_url: item.product.imageUrl,
        slug: item.product.slug,
      }))
      set({ items: mappedItems, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  addItem: async (productId, quantity, variantId) => {
    try {
      // Use camelCase to match backend Zod schema
      await api.post('/cart/items', { productId, quantity, variantId })
      await get().fetchCart()
      set({ open: true })
    } catch (err) {
      throw err
    }
  },

  updateItem: async (itemId, quantity) => {
    try {
      await api.put(`/cart/items/${itemId}`, { quantity })
      await get().fetchCart()
    } catch (err) {
      throw err
    }
  },

  removeItem: async (itemId) => {
    try {
      await api.delete(`/cart/items/${itemId}`)
      await get().fetchCart()
    } catch (err) {
      throw err
    }
  },

  clearCart: () => set({ items: [] }),
}))
