import { create } from 'zustand'
import api from '@/lib/api'

export interface ShoppingList {
  id: string
  name: string
  description?: string
  is_default: boolean
  is_public: boolean
  share_token?: string
  item_count: number
  preview_items?: Array<{
    id: string
    name: string
    slug: string
    base_price: number
    image?: string
  }>
}

export interface ShoppingListItem {
  id: string
  product_id: string
  variant_id?: string
  quantity: number
  notes?: string
  priority: number
  product_name: string
  slug: string
  current_price: number
  variant_name?: string
  variant_current_price?: number
  image?: string
  in_stock?: boolean
  variant_attributes?: Array<{
    attribute_name: string
    value: string
  }>
}

interface ShoppingListState {
  lists: ShoppingList[]
  currentList: ShoppingList | null
  currentItems: ShoppingListItem[]
  loading: boolean
  error: string | null
  
  fetchLists: () => Promise<void>
  fetchList: (id: string) => Promise<void>
  createList: (data: { name: string; description?: string; isPublic?: boolean }) => Promise<void>
  updateList: (id: string, data: Partial<ShoppingList>) => Promise<void>
  deleteList: (id: string) => Promise<void>
  addItem: (listId: string, data: { productId: string; variantId?: string; quantity?: number; notes?: string; priority?: number }) => Promise<void>
  removeItem: (listId: string, itemId: string) => Promise<void>
  moveItem: (listId: string, itemId: string, targetListId: string) => Promise<void>
  copyPublicList: (token: string) => Promise<void>
}

export const useShoppingListStore = create<ShoppingListState>((set, get) => ({
  lists: [],
  currentList: null,
  currentItems: [],
  loading: false,
  error: null,

  fetchLists: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get('/shopping-lists')
      set({ lists: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch lists', loading: false })
    }
  },

  fetchList: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/shopping-lists/${id}`)
      set({ 
        currentList: data.data, 
        currentItems: data.data.items || [],
        loading: false 
      })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch list', loading: false })
    }
  },

  createList: async (data) => {
    set({ loading: true, error: null })
    try {
      const { data: response } = await api.post('/shopping-lists', data)
      set(state => ({ 
        lists: [response.data, ...state.lists],
        loading: false 
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to create list', loading: false })
      throw err
    }
  },

  updateList: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const { data: response } = await api.put(`/shopping-lists/${id}`, data)
      set(state => ({
        lists: state.lists.map(l => l.id === id ? response.data : l),
        currentList: state.currentList?.id === id ? response.data : state.currentList,
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to update list', loading: false })
    }
  },

  deleteList: async (id) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/shopping-lists/${id}`)
      set(state => ({
        lists: state.lists.filter(l => l.id !== id),
        currentList: state.currentList?.id === id ? null : state.currentList,
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to delete list', loading: false })
    }
  },

  addItem: async (listId, data) => {
    try {
      await api.post(`/shopping-lists/${listId}/items`, data)
      await get().fetchList(listId)
    } catch (err: any) {
      throw err
    }
  },

  removeItem: async (listId, itemId) => {
    try {
      await api.delete(`/shopping-lists/${listId}/items/${itemId}`)
      set(state => ({
        currentItems: state.currentItems.filter(i => i.id !== itemId)
      }))
    } catch (err: any) {
      throw err
    }
  },

  moveItem: async (listId, itemId, targetListId) => {
    try {
      await api.post(`/shopping-lists/${listId}/items/${itemId}/move`, { targetListId })
      set(state => ({
        currentItems: state.currentItems.filter(i => i.id !== itemId)
      }))
    } catch (err: any) {
      throw err
    }
  },

  copyPublicList: async (token) => {
    try {
      const { data } = await api.post(`/shopping-lists/public/${token}/copy`)
      set(state => ({
        lists: [data.data, ...state.lists]
      }))
    } catch (err: any) {
      throw err
    }
  }
}))
