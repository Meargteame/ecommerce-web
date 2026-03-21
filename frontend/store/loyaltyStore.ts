import { create } from 'zustand'
import api from '@/lib/api'

export interface LoyaltyPoints {
  user_id: string
  total_points: number
  available_points: number
  pending_points: number
  lifetime_points: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  tier_updated_at?: string
  benefits: {
    discount: number
    freeShippingThreshold: number
    pointsMultiplier: number
  }
  nextTier?: string
  pointsToNextTier: number
  pointsValue: number
  recentTransactions: LoyaltyTransaction[]
}

export interface LoyaltyTransaction {
  id: string
  type: 'earn' | 'redeem' | 'expire' | 'adjustment' | 'bonus'
  points: number
  order_id?: string
  order_number?: string
  description?: string
  created_at: string
}

interface LoyaltyState {
  points: LoyaltyPoints | null
  loading: boolean
  error: string | null
  
  fetchPoints: () => Promise<void>
  redeemPoints: (points: number) => Promise<void>
  fetchTransactions: (limit?: number) => Promise<LoyaltyTransaction[]>
}

export const useLoyaltyStore = create<LoyaltyState>((set, get) => ({
  points: null,
  loading: false,
  error: null,

  fetchPoints: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get('/loyalty/points')
      set({ points: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch points', loading: false })
    }
  },

  redeemPoints: async (points) => {
    set({ loading: true, error: null })
    try {
      await api.post('/loyalty/redeem', { points })
      await get().fetchPoints()
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to redeem points', loading: false })
      throw err
    }
  },

  fetchTransactions: async (limit = 50) => {
    try {
      const { data } = await api.get(`/loyalty/transactions?limit=${limit}`)
      return data.data
    } catch (err: any) {
      return []
    }
  }
}))
