import { create } from 'zustand'
import api from '@/lib/api'

export interface ReturnRequest {
  id: string
  return_number: string
  order_id: string
  order_number: string
  status: 'pending' | 'approved' | 'rejected' | 'received' | 'refunded' | 'closed' | 'cancelled'
  reason: string
  reason_details?: string
  return_method: string
  refund_method: string
  total_items: number
  total_refund_amount: number
  tracking_number?: string
  shipping_label_url?: string
  received_at?: string
  inspected_at?: string
  refund_processed_at?: string
  created_at: string
  updated_at: string
  order?: {
    id: string
    order_number: string
    total: number
    created_at: string
  }
  items?: ReturnItem[]
}

export interface ReturnItem {
  id: string
  order_item_id: string
  product_id: string
  product_name: string
  product_image?: string
  variant_name?: string
  sku?: string
  quantity: number
  refund_amount: number
  condition_received?: string
  restocking_fee?: number
  notes?: string
}

interface ReturnsState {
  returns: ReturnRequest[]
  currentReturn: ReturnRequest | null
  loading: boolean
  error: string | null
  
  fetchReturns: (status?: string) => Promise<void>
  fetchReturn: (id: string) => Promise<void>
  initiateReturn: (data: {
    orderId: string
    reason: string
    reasonDetails?: string
    returnMethod?: string
    items: Array<{
      orderItemId: string
      quantity: number
    }>
  }) => Promise<void>
  cancelReturn: (id: string) => Promise<void>
}

export const useReturnsStore = create<ReturnsState>((set, get) => ({
  returns: [],
  currentReturn: null,
  loading: false,
  error: null,

  fetchReturns: async (status) => {
    set({ loading: true, error: null })
    try {
      const params = status ? `?status=${status}` : ''
      const { data } = await api.get(`/returns${params}`)
      set({ returns: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch returns', loading: false })
    }
  },

  fetchReturn: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/returns/${id}`)
      set({ currentReturn: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch return', loading: false })
    }
  },

  initiateReturn: async (returnData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/returns', returnData)
      set(state => ({
        returns: [data.data, ...state.returns],
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to initiate return', loading: false })
      throw err
    }
  },

  cancelReturn: async (id) => {
    try {
      await api.post(`/returns/${id}/cancel`)
      set(state => ({
        returns: state.returns.map(r => r.id === id ? { ...r, status: 'cancelled' } : r),
        currentReturn: state.currentReturn?.id === id 
          ? { ...state.currentReturn, status: 'cancelled' } 
          : state.currentReturn
      }))
    } catch (err: any) {
      throw err
    }
  }
}))

// Gift Card Store
export interface GiftCard {
  id: string
  code: string
  type: 'digital' | 'physical'
  initial_balance: number
  current_balance: number
  currency: string
  status: 'active' | 'redeemed' | 'expired' | 'cancelled'
  sender_id?: string
  recipient_id?: string
  recipient_email?: string
  recipient_name?: string
  message?: string
  expires_at?: string
  purchased_at: string
  redeemed_at?: string
  sender_first_name?: string
  sender_last_name?: string
}

interface GiftCardState {
  received: GiftCard[]
  sent: GiftCard[]
  loading: boolean
  error: string | null
  
  fetchCards: () => Promise<void>
  purchaseCard: (data: {
    amount: number
    recipientEmail: string
    recipientName?: string
    message?: string
    type?: 'digital' | 'physical'
  }) => Promise<void>
  redeemCard: (code: string) => Promise<void>
  checkBalance: (code: string) => Promise<{ balance: number; expiresAt?: string }>
}

export const useGiftCardStore = create<GiftCardState>((set, get) => ({
  received: [],
  sent: [],
  loading: false,
  error: null,

  fetchCards: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get('/gift-cards/my-cards')
      set({ 
        received: data.data.received,
        sent: data.data.sent,
        loading: false 
      })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch gift cards', loading: false })
    }
  },

  purchaseCard: async (cardData) => {
    set({ loading: true, error: null })
    try {
      await api.post('/gift-cards', cardData)
      await get().fetchCards()
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to purchase gift card', loading: false })
      throw err
    }
  },

  redeemCard: async (code) => {
    set({ loading: true, error: null })
    try {
      await api.post('/gift-cards/redeem', { code })
      await get().fetchCards()
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to redeem gift card', loading: false })
      throw err
    }
  },

  checkBalance: async (code) => {
    try {
      const { data } = await api.get(`/gift-cards/check-balance?code=${encodeURIComponent(code)}`)
      return data.data
    } catch (err: any) {
      throw err
    }
  }
}))

// Price Alert Store
export interface PriceAlert {
  id: string
  product_id: string
  target_price: number
  is_active: boolean
  triggered_at?: string
  triggered_price?: number
  created_at: string
  product_name: string
  slug: string
  current_price: number
  image?: string
  alert_status: 'target_reached' | 'waiting'
}

interface PriceAlertState {
  alerts: PriceAlert[]
  loading: boolean
  error: string | null
  
  fetchAlerts: () => Promise<void>
  createAlert: (productId: string, targetPrice: number) => Promise<void>
  deleteAlert: (id: string) => Promise<void>
}

export const usePriceAlertStore = create<PriceAlertState>((set, get) => ({
  alerts: [],
  loading: false,
  error: null,

  fetchAlerts: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get('/price-alerts')
      set({ alerts: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch alerts', loading: false })
    }
  },

  createAlert: async (productId, targetPrice) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/price-alerts', { productId, targetPrice })
      set(state => ({
        alerts: [data.data, ...state.alerts],
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to create alert', loading: false })
      throw err
    }
  },

  deleteAlert: async (id) => {
    try {
      await api.delete(`/price-alerts/${id}`)
      set(state => ({
        alerts: state.alerts.filter(a => a.id !== id)
      }))
    } catch (err: any) {
      throw err
    }
  }
}))
