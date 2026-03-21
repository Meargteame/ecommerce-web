'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import api from '@/lib/api'
import { ArrowLeft, Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Category {
  id: string
  name: string
  slug: string
}

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]/40 bg-white transition-all'

export default function EditProductPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [existingImages, setExistingImages] = useState<{ id: string; url: string; isPrimary: boolean }[]>([])
  const [newImages, setNewImages] = useState<{ url: string; uploading?: boolean }[]>([])
  const [form, setForm] = useState({
    name: '', description: '', price: '', base_price: '',
    stock_quantity: '', categoryId: '', sku: '', status: 'published', brand: '',
  })

  useEffect(() => {
    Promise.all([
      api.get('/categories'),
      api.get(`/products/${id}`),
    ]).then(([catRes, prodRes]) => {
      setCategories(catRes.data.data || [])
      const p = prodRes.data.data
      if (p) {
        setForm({
          name: p.name || '',
          description: p.description || '',
          price: String(p.price || p.basePrice || ''),
          base_price: String(p.basePrice || ''),
          stock_quantity: String(p.stockQuantity ?? p.stock_quantity ?? 0),
          categoryId: p.categoryId || p.category_id || '',
          sku: p.sku || '',
          status: p.status || 'published',
          brand: p.brand || '',
        })
        if (p.images) {
          setExistingImages(p.images.map((img: any) => ({
            id: img.id,
            url: img.imageUrl || img.url,
            isPrimary: img.isPrimary || img.is_primary,
          })))
        }
      }
    }).finally(() => setLoading(false))
  }, [id])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setNewImages(prev => [...prev, { url: '', uploading: true }])

      try {
        const formData = new FormData()
        formData.append('image', file)
        const { data } = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const url = data.data?.url || data.url
        setNewImages(prev => {
          const idx = prev.findIndex(img => img.uploading && img.url === '')
          if (idx === -1) return prev
          const updated = [...prev]
          updated[idx] = { url, uploading: false }
          return updated
        })

        // Attach immediately to product
        try {
          await api.post(`/products/${id}/images`, {
            url,
            altText: form.name,
            displayOrder: existingImages.length + i,
            isPrimary: existingImages.length === 0 && i === 0,
          })
        } catch {}
      } catch {
        setNewImages(prev => prev.filter(img => !(img.uploading && img.url === '')))
        setError('Failed to upload image')
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.put(`/seller/products/${id}`, {
        name: form.name,
        description: form.description || undefined,
        basePrice: parseFloat(form.price),
        price: parseFloat(form.base_price || form.price),
        stock_quantity: parseInt(form.stock_quantity),
        categoryId: form.categoryId || undefined,
        sku: form.sku || undefined,
        status: form.status,
        brand: form.brand || undefined,
      })
      router.push('/seller/products')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error || 'Failed to update product')
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/seller/products" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Edit Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
            <button type="button" onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name *</label>
          <input value={form.name} onChange={set('name')} required className={inputCls} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea value={form.description} onChange={set('description')} rows={4}
            className={`${inputCls} resize-none`} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Price ($) *</label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={set('price')} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Compare-at Price ($)</label>
            <input type="number" min="0" step="0.01" value={form.base_price} onChange={set('base_price')} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Stock Quantity *</label>
            <input type="number" min="0" value={form.stock_quantity} onChange={set('stock_quantity')} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">SKU</label>
            <input value={form.sku} onChange={set('sku')} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <select value={form.categoryId} onChange={set('categoryId')} className={inputCls}>
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select value={form.status} onChange={set('status')} className={inputCls}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand</label>
          <input value={form.brand} onChange={set('brand')} placeholder="e.g. Sony" className={inputCls} />
        </div>

        {/* Product Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Images</label>
          <div className="space-y-3">
            {(existingImages.length > 0 || newImages.length > 0) && (
              <div className="flex flex-wrap gap-3">
                {existingImages.map((img, idx) => (
                  <div key={img.id} className="relative w-24 h-24 rounded-lg border border-gray-200 overflow-hidden">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    {img.isPrimary && (
                      <span className="absolute bottom-0 left-0 right-0 bg-[#7C3AED] text-white text-[9px] font-bold text-center py-0.5">PRIMARY</span>
                    )}
                  </div>
                ))}
                {newImages.map((img, idx) => (
                  <div key={`new-${idx}`} className="relative w-24 h-24 rounded-lg border border-gray-200 overflow-hidden">
                    {img.uploading ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <div className="w-5 h-5 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-[#7C3AED]/40 transition-colors"
            >
              <Upload className="h-6 w-6 mx-auto mb-1 text-gray-300" />
              <p className="text-sm text-gray-500 font-medium">Click to upload more images</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageUpload} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/seller/products"
            className="flex-1 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 text-center transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 text-white rounded-lg text-sm font-semibold disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: saving ? undefined : '#7C3AED' }}>
            {saving ? 'Saving...' : <><CheckCircle className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  )
}
