import { create } from 'zustand'
import api from '@/lib/api'

export interface ComparisonProduct {
  id: string
  name: string
  slug: string
  base_price: number
  brand: string
  average_rating: number
  review_count: number
  description?: string
  category?: string
  specifications?: Record<string, any>
  image?: string
  images?: Array<{ url: string; alt?: string }>
  variants?: Array<{
    id: string
    variant_name: string
    price: number
    sku: string
    attributes: Array<{ name: string; value: string }>
  }>
  recent_reviews?: Array<{
    rating: number
    title: string
    content: string
  }>
}

export interface ComparisonSet {
  id: string
  name?: string
  user_id?: string
  session_id?: string
  expires_at?: string
  products: ComparisonProduct[]
  product_count: number
}

interface ComparisonState {
  sets: ComparisonSet[]
  currentComparison: {
    products: ComparisonProduct[]
    specifications: Array<{
      name: string
      values: Array<{ productId: string; value: any }>
    }>
    highlights: {
      lowestPrice: ComparisonProduct
      highestRated: ComparisonProduct
      mostReviewed: ComparisonProduct
    }
  } | null
  loading: boolean
  error: string | null
  guestSessionId: string | null
  
  fetchSets: () => Promise<void>
  fetchComparison: (id: string) => Promise<void>
  createSet: (productIds: string[], name?: string) => Promise<string>
  addToComparison: (setId: string, productId: string) => Promise<void>
  removeFromComparison: (setId: string, productId: string) => Promise<void>
  deleteSet: (id: string) => Promise<void>
  createGuestComparison: (productIds: string[]) => Promise<string>
  fetchGuestComparison: (sessionId: string) => Promise<void>
  clearCurrent: () => void
}

export const useComparisonStore = create<ComparisonState>((set, get) => ({
  sets: [],
  currentComparison: null,
  loading: false,
  error: null,
  guestSessionId: null,

  fetchSets: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get('/comparison')
      set({ sets: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch comparisons', loading: false })
    }
  },

  fetchComparison: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/comparison/${id}`)
      set({ currentComparison: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch comparison', loading: false })
    }
  },

  createSet: async (productIds, name) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/comparison', { productIds, name })
      set(state => ({
        sets: [data.data, ...state.sets],
        loading: false
      }))
      return data.data.id
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to create comparison', loading: false })
      throw err
    }
  },

  addToComparison: async (setId, productId) => {
    try {
      await api.post(`/comparison/${setId}/products`, { productId })
      await get().fetchComparison(setId)
    } catch (err: any) {
      throw err
    }
  },

  removeFromComparison: async (setId, productId) => {
    try {
      await api.delete(`/comparison/${setId}/products/${productId}`)
      set(state => ({
        currentComparison: state.currentComparison
          ? {
              ...state.currentComparison,
              products: state.currentComparison.products.filter(p => p.id !== productId)
            }
          : null
      }))
    } catch (err: any) {
      throw err
    }
  },

  deleteSet: async (id) => {
    try {
      await api.delete(`/comparison/${id}`)
      set(state => ({
        sets: state.sets.filter(s => s.id !== id),
        currentComparison: null
      }))
    } catch (err: any) {
      throw err
    }
  },

  createGuestComparison: async (productIds) => {
    try {
      const { data } = await api.post('/comparison/guest', { 
        productIds,
        sessionId: get().guestSessionId 
      })
      set({ guestSessionId: data.sessionId })
      return data.comparisonId
    } catch (err: any) {
      throw err
    }
  },

  fetchGuestComparison: async (sessionId) => {
    try {
      const { data } = await api.get(`/comparison/guest/${sessionId}`)
      set({ 
        currentComparison: {
          products: data.data,
          specifications: [],
          highlights: {
            lowestPrice: data.data.reduce((min: any, p: any) => p.base_price < min.base_price ? p : min, data.data[0]),
            highestRated: data.data.reduce((max: any, p: any) => (p.average_rating || 0) > (max.average_rating || 0) ? p : max, data.data[0]),
            mostReviewed: data.data.reduce((max: any, p: any) => (p.review_count || 0) > (max.review_count || 0) ? p : max, data.data[0])
          }
        },
        guestSessionId: sessionId
      })
    } catch (err: any) {
      throw err
    }
  },

  clearCurrent: () => set({ currentComparison: null })
}))
