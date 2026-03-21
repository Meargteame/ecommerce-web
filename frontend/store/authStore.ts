import { create } from 'zustand'
import api from '@/lib/api'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  avatarUrl?: string
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (data: RegisterData) => Promise<User>
  logout: () => Promise<void>
  loadUser: () => void
  fetchUser: () => Promise<void>
  setUser: (user: User) => void
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: 'customer' | 'seller'
}

// Merge guest cart items into the authenticated backend cart.
// Called after a successful login/register.
async function mergeGuestCart(guestItems: any[]): Promise<void> {
  if (!guestItems || guestItems.length === 0) return
  for (const item of guestItems) {
    try {
      await api.post('/cart/items', {
        productId: item.productId || item.product_id,
        quantity: item.quantity,
        variantId: item.variantId || item.variant_id || undefined,
      })
    } catch {
      // Ignore individual item errors (e.g. out of stock) — best-effort merge
    }
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,

  loadUser: () => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      try {
        set({ token, user: JSON.parse(userStr) })
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
  },

  fetchUser: async () => {
    try {
      const { data } = await api.get('/users/profile')
      const raw = data.data
      const user: User = {
        id: raw.id,
        email: raw.email,
        first_name: raw.firstName || raw.first_name || '',
        last_name: raw.lastName || raw.last_name || '',
        phone: raw.phone || '',
        avatarUrl: raw.avatarUrl || raw.avatar_url || '',
        role: raw.role,
      }
      localStorage.setItem('user', JSON.stringify(user))
      set({ user })
    } catch (err) {
      console.error('Failed to fetch user', err)
    }
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      // Snapshot guest cart before login clears it
      let guestItems: any[] = []
      try {
        const { useCartStore } = await import('./cartStore')
        guestItems = useCartStore.getState().items
      } catch {}

      const { data } = await api.post('/auth/login', { email, password })
      const token = data.data.accessToken || data.data.token
      const raw = data.data.user
      const user: User = {
        id: raw.id,
        email: raw.email,
        first_name: raw.firstName || raw.first_name || '',
        last_name: raw.lastName || raw.last_name || '',
        phone: raw.phone || '',
        avatarUrl: raw.avatarUrl || raw.avatar_url || '',
        role: raw.role,
      }

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ user, token, loading: false })

      // Merge guest cart into backend cart, then refresh cart state
      await mergeGuestCart(guestItems)
      try {
        const { useCartStore } = await import('./cartStore')
        await useCartStore.getState().fetchCart()
      } catch {}

      return user
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  register: async (registerData) => {
    set({ loading: true })
    try {
      let guestItems: any[] = []
      try {
        const { useCartStore } = await import('./cartStore')
        guestItems = useCartStore.getState().items
      } catch {}

      const { data } = await api.post('/auth/register', registerData)
      const token = data.data.accessToken
      const raw = data.data.user
      const user: User = {
        id: raw.id,
        email: raw.email,
        first_name: raw.firstName || raw.first_name || '',
        last_name: raw.lastName || raw.last_name || '',
        phone: raw.phone || '',
        avatarUrl: raw.avatarUrl || raw.avatar_url || '',
        role: raw.role,
      }

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ user, token, loading: false })

      await mergeGuestCart(guestItems)
      try {
        const { useCartStore } = await import('./cartStore')
        await useCartStore.getState().fetchCart()
      } catch {}

      return user
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.clear() // Extra safety to clear any other stale auth keys
    // Clear cart state on logout
    try {
      const { useCartStore } = await import('./cartStore')
      useCartStore.getState().clearCart()
    } catch {}
    set({ user: null, token: null })
  },

  setUser: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },
}))
