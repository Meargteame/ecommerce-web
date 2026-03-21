import { create } from 'zustand'
import api from '@/lib/api'

export interface Warehouse {
  id: string
  name: string
  code: string
  is_default: boolean
  is_active: boolean
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
  country: string
  phone?: string
  email?: string
  contact_name?: string
  handling_time: number
  cutoff_time: string
  operates_weekends: boolean
  operates_holidays: boolean
  product_count: number
  low_stock_count: number
  created_at: string
  updated_at: string
}

export interface WarehouseInventory {
  id: string
  warehouse_id: string
  product_id: string
  variant_id?: string
  quantity_available: number
  reorder_point: number
  reorder_quantity: number
  location_code?: string
  product_name: string
  slug: string
  product_sku?: string
  variant_name?: string
  variant_sku?: string
  image?: string
}

export interface BulkUploadJob {
  id: string
  job_id: string
  type: 'products' | 'inventory' | 'prices'
  file_name: string
  file_url?: string
  total_rows: number
  processed_rows: number
  successful_rows: number
  failed_rows: number
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed'
  started_at?: string
  completed_at?: string
  error_log?: any[]
  result_summary?: any
}

interface SellerPortalState {
  warehouses: Warehouse[]
  currentWarehouse: Warehouse | null
  warehouseInventory: WarehouseInventory[]
  lowStockItems: WarehouseInventory[]
  uploadJobs: BulkUploadJob[]
  loading: boolean
  error: string | null
  
  // Warehouses
  fetchWarehouses: () => Promise<void>
  fetchWarehouse: (id: string) => Promise<void>
  createWarehouse: (data: Partial<Warehouse>) => Promise<void>
  updateWarehouse: (id: string, data: Partial<Warehouse>) => Promise<void>
  deleteWarehouse: (id: string) => Promise<void>
  
  // Inventory
  fetchWarehouseInventory: (warehouseId: string) => Promise<void>
  fetchLowStock: (warehouseId: string) => Promise<void>
  updateInventory: (warehouseId: string, productId: string, data: {
    variantId?: string
    quantity: number
    reorderPoint?: number
    reorderQuantity?: number
    locationCode?: string
  }) => Promise<void>
  transferInventory: (warehouseId: string, targetWarehouseId: string, items: Array<{
    productId: string
    variantId?: string
    quantity: number
  }>) => Promise<void>
  
  // Bulk Upload
  fetchUploadJobs: () => Promise<void>
  createProductUpload: (fileUrl: string, products: any[]) => Promise<void>
  createInventoryUpload: (fileUrl: string, updates: any[]) => Promise<void>
  createPriceUpload: (fileUrl: string, updates: any[]) => Promise<void>
  getUploadStatus: (jobId: string) => Promise<BulkUploadJob | null>
  getUploadErrors: (jobId: string) => Promise<any>
}

export const useSellerPortalStore = create<SellerPortalState>((set, get) => ({
  warehouses: [],
  currentWarehouse: null,
  warehouseInventory: [],
  lowStockItems: [],
  uploadJobs: [],
  loading: false,
  error: null,

  // Warehouses
  fetchWarehouses: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get('/seller/warehouses')
      set({ warehouses: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch warehouses', loading: false })
    }
  },

  fetchWarehouse: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/seller/warehouses/${id}`)
      set({ 
        currentWarehouse: data.data,
        warehouseInventory: data.data.inventory || [],
        loading: false 
      })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch warehouse', loading: false })
    }
  },

  createWarehouse: async (data) => {
    set({ loading: true, error: null })
    try {
      const { data: response } = await api.post('/seller/warehouses', data)
      set(state => ({
        warehouses: [response.data, ...state.warehouses],
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to create warehouse', loading: false })
      throw err
    }
  },

  updateWarehouse: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const { data: response } = await api.put(`/seller/warehouses/${id}`, data)
      set(state => ({
        warehouses: state.warehouses.map(w => w.id === id ? response.data : w),
        currentWarehouse: state.currentWarehouse?.id === id ? response.data : state.currentWarehouse,
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to update warehouse', loading: false })
      throw err
    }
  },

  deleteWarehouse: async (id) => {
    try {
      await api.delete(`/seller/warehouses/${id}`)
      set(state => ({
        warehouses: state.warehouses.filter(w => w.id !== id),
        currentWarehouse: state.currentWarehouse?.id === id ? null : state.currentWarehouse
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to delete warehouse' })
      throw err
    }
  },

  // Inventory
  fetchWarehouseInventory: async (warehouseId) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/seller/warehouses/${warehouseId}`)
      set({ 
        warehouseInventory: data.data.inventory || [],
        loading: false 
      })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch inventory', loading: false })
    }
  },

  fetchLowStock: async (warehouseId) => {
    try {
      const { data } = await api.get(`/seller/warehouses/${warehouseId}/inventory/low-stock`)
      set({ lowStockItems: data.data })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch low stock items' })
    }
  },

  updateInventory: async (warehouseId, productId, data) => {
    try {
      await api.put(`/seller/warehouses/${warehouseId}/inventory/${productId}`, data)
      await get().fetchWarehouseInventory(warehouseId)
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to update inventory' })
      throw err
    }
  },

  transferInventory: async (warehouseId, targetWarehouseId, items) => {
    try {
      await api.post(`/seller/warehouses/${warehouseId}/transfer`, {
        targetWarehouseId,
        items
      })
      await get().fetchWarehouseInventory(warehouseId)
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to transfer inventory' })
      throw err
    }
  },

  // Bulk Upload
  fetchUploadJobs: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get('/seller/bulk-uploads')
      set({ uploadJobs: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch upload jobs', loading: false })
    }
  },

  createProductUpload: async (fileUrl, products) => {
    try {
      await api.post('/seller/bulk-uploads/products', { fileUrl, products })
      await get().fetchUploadJobs()
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to start product upload' })
      throw err
    }
  },

  createInventoryUpload: async (fileUrl, updates) => {
    try {
      await api.post('/seller/bulk-uploads/inventory', { fileUrl, inventoryUpdates: updates })
      await get().fetchUploadJobs()
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to start inventory upload' })
      throw err
    }
  },

  createPriceUpload: async (fileUrl, updates) => {
    try {
      await api.post('/seller/bulk-uploads/prices', { fileUrl, priceUpdates: updates })
      await get().fetchUploadJobs()
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to start price upload' })
      throw err
    }
  },

  getUploadStatus: async (jobId) => {
    try {
      const { data } = await api.get(`/seller/bulk-uploads/${jobId}`)
      return data.data
    } catch (err: any) {
      return null
    }
  },

  getUploadErrors: async (jobId) => {
    try {
      const { data } = await api.get(`/seller/bulk-uploads/${jobId}/errors`)
      return data
    } catch (err: any) {
      return { errors: [], summary: {} }
    }
  }
}))
