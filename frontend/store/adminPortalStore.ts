import { create } from 'zustand'
import api from '@/lib/api'

export interface CMSPage {
  id: string
  title: string
  slug: string
  content: any
  meta_title?: string
  meta_description?: string
  meta_keywords?: string[]
  template: string
  status: 'draft' | 'published' | 'archived'
  is_homepage: boolean
  show_in_header: boolean
  show_in_footer: boolean
  header_position?: number
  footer_position?: number
  target_audience: string
  target_markets?: string[]
  view_count: number
  author_id?: string
  published_by?: string
  published_at?: string
  created_at: string
  updated_at: string
  author_first_name?: string
  author_last_name?: string
  published_by_first_name?: string
  published_by_last_name?: string
}

export interface Banner {
  id: string
  name: string
  title?: string
  subtitle?: string
  image_url: string
  mobile_image_url?: string
  video_url?: string
  cta_text?: string
  cta_url?: string
  cta_style: string
  text_alignment: string
  text_color: string
  overlay_opacity: number
  position: string
  target_category_id?: string
  target_page?: string
  start_date: string
  end_date: string
  priority: number
  target_audience: string
  target_device: string
  target_markets?: string[]
  is_active: boolean
  impression_count: number
  click_count: number
  category_name?: string
  created_at: string
  updated_at: string
}

export interface TaxRule {
  id: string
  name: string
  description?: string
  rate: number
  type: string
  fixed_amount?: number
  apply_to: string
  product_types?: string[]
  customer_types?: string[]
  country_code?: string
  state_code?: string
  city?: string
  postal_code_pattern?: string
  min_order_amount?: number
  max_order_amount?: number
  is_active: boolean
  priority: number
  tax_category: string
  vat_number_required: boolean
  created_at: string
  updated_at: string
}

export interface FraudRule {
  id: string
  name: string
  description?: string
  type: string
  condition: any
  score_impact: number
  action: string
  is_active: boolean
  priority: number
  triggered_count: number
  false_positive_count: number
  created_at: string
  updated_at: string
}

export interface RiskScore {
  id: string
  entity_type: string
  entity_id: string
  total_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  factors: any[]
  recommendation: string
  decision: string
  decided_by?: string
  decided_at?: string
  decision_notes?: string
  created_at: string
}

interface AdminPortalState {
  // CMS
  pages: CMSPage[]
  currentPage: CMSPage | null
  banners: Banner[]
  
  // Tax & Fraud
  taxRules: TaxRule[]
  fraudRules: FraudRule[]
  riskScores: RiskScore[]
  
  // System
  settings: any
  
  loading: boolean
  error: string | null
  
  // CMS Actions
  fetchPages: (status?: string) => Promise<void>
  fetchPage: (id: string) => Promise<void>
  createPage: (data: Partial<CMSPage>) => Promise<void>
  updatePage: (id: string, data: Partial<CMSPage>) => Promise<void>
  deletePage: (id: string) => Promise<void>
  
  // Banner Actions
  fetchBanners: (filters?: { position?: string; isActive?: boolean }) => Promise<void>
  createBanner: (data: Partial<Banner>) => Promise<void>
  updateBanner: (id: string, data: Partial<Banner>) => Promise<void>
  deleteBanner: (id: string) => Promise<void>
  
  // Tax Actions
  fetchTaxRules: () => Promise<void>
  createTaxRule: (data: Partial<TaxRule>) => Promise<void>
  
  // Fraud Actions
  fetchFraudRules: () => Promise<void>
  createFraudRule: (data: Partial<FraudRule>) => Promise<void>
  fetchRiskScores: (level?: string) => Promise<void>
  
  // Settings
  fetchSettings: () => Promise<void>
}

export const useAdminPortalStore = create<AdminPortalState>((set, get) => ({
  pages: [],
  currentPage: null,
  banners: [],
  taxRules: [],
  fraudRules: [],
  riskScores: [],
  settings: null,
  loading: false,
  error: null,

  // CMS Actions
  fetchPages: async (status) => {
    set({ loading: true, error: null })
    try {
      const params = status ? `?status=${status}` : ''
      const { data } = await api.get(`/admin/cms/pages${params}`)
      set({ pages: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch pages', loading: false })
    }
  },

  fetchPage: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/admin/cms/pages/${id}`)
      set({ currentPage: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch page', loading: false })
    }
  },

  createPage: async (data) => {
    set({ loading: true, error: null })
    try {
      const { data: response } = await api.post('/admin/cms/pages', data)
      set(state => ({
        pages: [response.data, ...state.pages],
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to create page', loading: false })
      throw err
    }
  },

  updatePage: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const { data: response } = await api.put(`/admin/cms/pages/${id}`, data)
      set(state => ({
        pages: state.pages.map(p => p.id === id ? response.data : p),
        currentPage: state.currentPage?.id === id ? response.data : state.currentPage,
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to update page', loading: false })
      throw err
    }
  },

  deletePage: async (id) => {
    try {
      await api.delete(`/admin/cms/pages/${id}`)
      set(state => ({
        pages: state.pages.filter(p => p.id !== id),
        currentPage: state.currentPage?.id === id ? null : state.currentPage
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to delete page' })
      throw err
    }
  },

  // Banner Actions
  fetchBanners: async (filters) => {
    set({ loading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters?.position) params.append('position', filters.position)
      if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString())
      
      const { data } = await api.get(`/admin/banners?${params}`)
      set({ banners: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch banners', loading: false })
    }
  },

  createBanner: async (data) => {
    set({ loading: true, error: null })
    try {
      const { data: response } = await api.post('/admin/banners', data)
      set(state => ({
        banners: [response.data, ...state.banners],
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to create banner', loading: false })
      throw err
    }
  },

  updateBanner: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const { data: response } = await api.put(`/admin/banners/${id}`, data)
      set(state => ({
        banners: state.banners.map(b => b.id === id ? response.data : b),
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to update banner', loading: false })
      throw err
    }
  },

  deleteBanner: async (id) => {
    try {
      await api.delete(`/admin/banners/${id}`)
      set(state => ({
        banners: state.banners.filter(b => b.id !== id)
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to delete banner' })
      throw err
    }
  },

  // Tax Actions
  fetchTaxRules: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get('/admin/tax/rules')
      set({ taxRules: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch tax rules', loading: false })
    }
  },

  createTaxRule: async (data) => {
    set({ loading: true, error: null })
    try {
      const { data: response } = await api.post('/admin/tax/rules', data)
      set(state => ({
        taxRules: [response.data, ...state.taxRules],
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to create tax rule', loading: false })
      throw err
    }
  },

  // Fraud Actions
  fetchFraudRules: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get('/admin/fraud/rules')
      set({ fraudRules: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch fraud rules', loading: false })
    }
  },

  createFraudRule: async (data) => {
    set({ loading: true, error: null })
    try {
      const { data: response } = await api.post('/admin/fraud/rules', data)
      set(state => ({
        fraudRules: [response.data, ...state.fraudRules],
        loading: false
      }))
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to create fraud rule', loading: false })
      throw err
    }
  },

  fetchRiskScores: async (level) => {
    set({ loading: true, error: null })
    try {
      const params = level ? `?level=${level}` : ''
      const { data } = await api.get(`/admin/fraud/risk-scores${params}`)
      set({ riskScores: data.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch risk scores', loading: false })
    }
  },

  // Settings
  fetchSettings: async () => {
    try {
      const { data } = await api.get('/admin/settings')
      set({ settings: data.data })
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch settings' })
    }
  }
}))
