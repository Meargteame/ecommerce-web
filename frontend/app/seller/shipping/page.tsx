'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import {
  Truck, Plus, Trash2, Edit2, CheckCircle, AlertCircle, Globe, Package,
  Clock, DollarSign, X, Save, ChevronDown
} from 'lucide-react'

interface ShippingTemplate {
  id: string
  name: string
  is_default: boolean
  processing_time: number
  domestic_free_shipping: boolean
  domestic_free_shipping_threshold?: number
  domestic_flat_rate?: number
  ships_internationally: boolean
  international_flat_rate?: number
  created_at: string
  updated_at: string
}

interface TemplateForm {
  name: string
  processingTime: number
  domesticFreeShipping: boolean
  domesticFreeShippingThreshold: string
  domesticFlatRate: string
  shipsInternationally: boolean
  internationalFlatRate: string
  isDefault: boolean
}

const emptyForm: TemplateForm = {
  name: '',
  processingTime: 1,
  domesticFreeShipping: false,
  domesticFreeShippingThreshold: '',
  domesticFlatRate: '',
  shipsInternationally: false,
  internationalFlatRate: '',
  isDefault: false,
}

export default function SellerShippingPage() {
  const [templates, setTemplates] = useState<ShippingTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TemplateForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const { data } = await api.get('/seller/shipping')
      setTemplates(data.data || [])
    } catch (err) {
      console.error('Failed to fetch shipping templates:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Template name is required'); return }
    setSaving(true)
    setError('')
    setMessage('')

    const payload = {
      name: form.name,
      processingTime: form.processingTime,
      domesticFreeShipping: form.domesticFreeShipping,
      domesticFreeShippingThreshold: form.domesticFreeShippingThreshold ? parseFloat(form.domesticFreeShippingThreshold) : null,
      domesticFlatRate: form.domesticFlatRate ? parseFloat(form.domesticFlatRate) : null,
      shipsInternationally: form.shipsInternationally,
      internationalFlatRate: form.internationalFlatRate ? parseFloat(form.internationalFlatRate) : null,
      isDefault: form.isDefault,
    }

    try {
      if (editingId) {
        const { data } = await api.put(`/seller/shipping/${editingId}`, payload)
        setTemplates(prev => prev.map(t => t.id === editingId ? data.data : t))
        setMessage('Template updated successfully')
      } else {
        const { data } = await api.post('/seller/shipping', payload)
        setTemplates(prev => [data.data, ...prev])
        setMessage('Template created successfully')
      }
      resetForm()
      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (t: ShippingTemplate) => {
    setEditingId(t.id)
    setForm({
      name: t.name,
      processingTime: t.processing_time,
      domesticFreeShipping: t.domestic_free_shipping,
      domesticFreeShippingThreshold: t.domestic_free_shipping_threshold?.toString() || '',
      domesticFlatRate: t.domestic_flat_rate?.toString() || '',
      shipsInternationally: t.ships_internationally,
      internationalFlatRate: t.international_flat_rate?.toString() || '',
      isDefault: t.is_default,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this shipping template?')) return
    try {
      await api.delete(`/seller/shipping/${id}`)
      setTemplates(prev => prev.filter(t => t.id !== id))
      setMessage('Template deleted')
      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to delete template')
    }
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading shipping templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#7C3AED]/10 rounded-xl flex items-center justify-center">
            <Truck className="w-5 h-5 text-[#7C3AED]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shipping Management</h1>
            <p className="text-sm text-gray-500">Create and manage shipping templates for your products</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-bold rounded-xl shadow-lg shadow-[#7C3AED]/20 transition-all hover:scale-[1.02]"
          style={{ backgroundColor: '#7C3AED' }}
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {/* Status Messages */}
      {message && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-xl mb-5">
          <CheckCircle className="h-4 w-4 shrink-0" /> {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl mb-5">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Form Modal/Inline */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">
              {editingId ? 'Edit Shipping Template' : 'Create Shipping Template'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Name & Processing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Template Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Standard Domestic"
                  required
                  className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" /> Processing Time (days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={form.processingTime}
                  onChange={e => setForm(f => ({ ...f, processingTime: parseInt(e.target.value) || 1 }))}
                  className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                />
              </div>
            </div>

            {/* Domestic Shipping */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#7C3AED]" /> Domestic Shipping
              </h4>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.domesticFreeShipping}
                    onChange={e => setForm(f => ({ ...f, domesticFreeShipping: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 accent-[#7C3AED]"
                  />
                  <span className="text-sm font-medium text-gray-700">Offer free domestic shipping</span>
                </label>

                {form.domesticFreeShipping && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Free Shipping Threshold ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.domesticFreeShippingThreshold}
                      onChange={e => setForm(f => ({ ...f, domesticFreeShippingThreshold: e.target.value }))}
                      placeholder="e.g. 50.00 (leave blank for always free)"
                      className="w-full h-10 px-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 bg-white"
                    />
                  </div>
                )}

                {!form.domesticFreeShipping && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Flat Rate ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.domesticFlatRate}
                      onChange={e => setForm(f => ({ ...f, domesticFlatRate: e.target.value }))}
                      placeholder="e.g. 5.99"
                      className="w-full h-10 px-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 bg-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* International Shipping */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#7C3AED]" /> International Shipping
              </h4>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.shipsInternationally}
                    onChange={e => setForm(f => ({ ...f, shipsInternationally: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 accent-[#7C3AED]"
                  />
                  <span className="text-sm font-medium text-gray-700">Ship internationally</span>
                </label>

                {form.shipsInternationally && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> International Flat Rate ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.internationalFlatRate}
                      onChange={e => setForm(f => ({ ...f, internationalFlatRate: e.target.value }))}
                      placeholder="e.g. 15.99"
                      className="w-full h-10 px-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 bg-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Default */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 accent-[#7C3AED]"
              />
              <span className="text-sm font-medium text-gray-700">Set as default template for new products</span>
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-[#7C3AED]/20"
                style={{ backgroundColor: '#7C3AED' }}
              >
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4" /> {editingId ? 'Update Template' : 'Create Template'}</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Truck className="w-8 h-8 text-gray-200" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No Shipping Templates</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
            Create your first shipping template to define rates and processing times for your products.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-bold text-[#7C3AED] hover:underline"
          >
            + Create your first template
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div
              key={t.id}
              className={`bg-white rounded-2xl border p-5 transition-all hover:shadow-sm ${
                t.is_default ? 'border-[#7C3AED]/30 bg-[#7C3AED]/[0.02]' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    t.is_default ? 'bg-[#7C3AED]/10' : 'bg-gray-100'
                  }`}>
                    <Truck className={`w-5 h-5 ${t.is_default ? 'text-[#7C3AED]' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">{t.name}</h3>
                      {t.is_default && (
                        <span className="px-2 py-0.5 bg-[#7C3AED]/10 text-[#7C3AED] text-[10px] font-bold rounded-full border border-[#7C3AED]/20">
                          DEFAULT
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2">
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" /> {t.processing_time} day{t.processing_time > 1 ? 's' : ''} processing
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                        <Package className="w-3.5 h-3.5" />
                        {t.domestic_free_shipping
                          ? t.domestic_free_shipping_threshold
                            ? `Free over $${Number(t.domestic_free_shipping_threshold).toFixed(2)}`
                            : 'Free shipping'
                          : t.domestic_flat_rate
                            ? `$${Number(t.domestic_flat_rate).toFixed(2)} flat rate`
                            : 'No rate set'
                        }
                      </span>
                      {t.ships_internationally && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                          <Globe className="w-3.5 h-3.5" />
                          {t.international_flat_rate
                            ? `Intl: $${Number(t.international_flat_rate).toFixed(2)}`
                            : 'International enabled'
                          }
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(t)}
                    className="p-2 text-gray-400 hover:text-[#7C3AED] hover:bg-[#7C3AED]/5 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-50/60 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">How Shipping Templates Work</p>
          <p className="text-xs text-blue-600 mt-1 leading-relaxed">
            Shipping templates define the rates and processing times for your products. You can assign templates to individual products
            or set a default template that applies to all new listings. Processing time is measured in business days.
          </p>
        </div>
      </div>
    </div>
  )
}
