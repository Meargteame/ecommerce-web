'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { ArrowLeft, Upload } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = [
  'electronics', 'fashion', 'home-living', 'sports', 'beauty', 'books',
  'gaming', 'toys', 'automotive', 'health', 'food', 'other',
]

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white'

export default function NewProductPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', description: '', price: '', base_price: '',
    stock_quantity: '', category: '', sku: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.price || !form.stock_quantity) {
      setError('Name, price, and stock are required'); return
    }
    setSaving(true); setError('')
    try {
      await api.post('/seller/products', {
        name: form.name,
        description: form.description || undefined,
        price: parseFloat(form.price),
        base_price: form.base_price ? parseFloat(form.base_price) : undefined,
        stock_quantity: parseInt(form.stock_quantity),
        category_name: form.category || undefined,
        sku: form.sku || undefined,
        is_active: true,
      })
      router.push('/seller/products')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error || 'Failed to create product')
    }
    setSaving(false)
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/seller/products" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Add New Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name *</label>
          <input value={form.name} onChange={set('name')} required
            placeholder="e.g. Wireless Headphones Pro" className={inputCls} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea value={form.description} onChange={set('description')} rows={4}
            placeholder="Describe your product..."
            className={`${inputCls} resize-none`} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Price ($) *</label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={set('price')} required
              placeholder="0.00" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Original Price ($)</label>
            <input type="number" min="0" step="0.01" value={form.base_price} onChange={set('base_price')}
              placeholder="For showing discount" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Stock Quantity *</label>
            <input type="number" min="0" value={form.stock_quantity} onChange={set('stock_quantity')} required
              placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">SKU</label>
            <input value={form.sku} onChange={set('sku')} placeholder="e.g. WH-PRO-001" className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
          <select value={form.category} onChange={set('category')} className={inputCls}>
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>
            ))}
          </select>
        </div>

        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500">Image upload coming soon</p>
          <p className="text-xs text-gray-400 mt-1">You can add images after creating the product</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/seller/products"
            className="flex-1 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 text-center transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 text-white rounded-lg text-sm font-semibold disabled:bg-gray-300 transition-colors"
            style={{backgroundColor: saving ? undefined : '#7C3AED'}}>
            {saving ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}
