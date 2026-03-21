import { create } from 'zustand'
import api from '@/lib/api'

interface WishlistItem {
  productId: string
}

interface ToastState {
  message: string
  type: 'success' | 'error' | 'info'
  visible: boolean
}

interface WishlistStore {
  items: WishlistItem[]
  loading: boolean
  toast: ToastState
  
  fetchWishlist: () => Promise<void>
  toggleWishlist: (productId: string, productName?: string) => Promise<void>
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  hideToast: () => void
}

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  items: [],
  loading: false,
  toast: { message: '', type: 'success', visible: false },

  fetchWishlist: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/wishlists')
      // Normalize both productId and product_id from backend
      const normalizedItems = (data.data || []).map((item: any) => ({
        productId: item.productId || item.product_id
      }))
      set({ items: normalizedItems })
    } catch (err) {
      console.error('Failed to fetch wishlist', err)
    } finally {
      set({ loading: false })
    }
  },

  toggleWishlist: async (productId: string, productName?: string) => {
    const { items, showToast } = get()
    const isWishlisted = items.some(item => item.productId === productId)

    try {
      if (isWishlisted) {
        await api.delete(`/wishlists/${productId}`)
        set({ items: items.filter(item => item.productId !== productId) })
        if (productName) showToast(`Removed ${productName} from wishlist`, 'info')
      } else {
        await api.post('/wishlists', { productId })
        set({ items: [...items, { productId }] })
        if (productName) showToast(`Added ${productName} to wishlist`, 'success')
      }
    } catch (err) {
      showToast('Unable to update wishlist. Please try again.', 'error')
    }
  },

  showToast: (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    set({ toast: { message, type, visible: true } })
    setTimeout(() => {
      set({ toast: { ...get().toast, visible: false } })
    }, 3000)
  },

  hideToast: () => {
    set({ toast: { ...get().toast, visible: false } })
  }
}))
