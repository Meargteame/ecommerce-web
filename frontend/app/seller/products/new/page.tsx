'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { ArrowLeft, Upload, X, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Category {
  id: string
  name: string
  slug: string
}

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]/40 bg-white transition-all'

export default function NewProductPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [uploadedImages, setUploadedImages] = useState<{ url: string; uploading?: boolean }[]>([])
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    base_price: '',
    stock_quantity: '',
    categoryId: '',
    sku: '',
    brand: '',
  })

  useEffect(() => {
    api.get('/categories')
      .then(({ data }) => {
        setCategories(data.data || [])
      })
      .catch(() => setError('Failed to load categories'))
      .finally(() => setLoadingCategories(false))
  }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() + '-' + Date.now().toString(36)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const placeholder = { url: '', uploading: true }
      setUploadedImages(prev => [...prev, placeholder])

      try {
        const formData = new FormData()
        formData.append('image', file)
        const { data } = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const url = data.data?.url || data.url
        setUploadedImages(prev => {
          const idx = prev.findIndex(img => img.uploading && img.url === '')
          if (idx === -1) return prev
          const updated = [...prev]
          updated[idx] = { url, uploading: false }
          return updated
        })
      } catch {
        setUploadedImages(prev => prev.filter(img => !(img.uploading && img.url === '')))
        setError('Failed to upload image')
      }
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (idx: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.price || !form.stock_quantity) {
      setError('Name, price, and stock are required')
      return
    }
    if (!form.categoryId) {
      setError('Please select a category')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Create the product with properly mapped fields
      const { data } = await api.post('/seller/products', {
        name: form.name,
        slug: generateSlug(form.name),
        description: form.description || undefined,
        basePrice: parseFloat(form.price),
        price: parseFloat(form.base_price || form.price),
        stock_quantity: parseInt(form.stock_quantity),
        categoryId: form.categoryId,
        sku: form.sku || undefined,
        brand: form.brand || undefined,
        status: 'published',
      })

      const productId = data.data?.id

      // Attach images if any were uploaded
      if (productId && uploadedImages.length > 0) {
        for (let i = 0; i < uploadedImages.length; i++) {
          const img = uploadedImages[i]
          if (!img.url) continue
          try {
            await api.post(`/products/${productId}/images`, {
              url: img.url,
              altText: form.name,
              displayOrder: i,
              isPrimary: i === 0,
            })
          } catch {
            // Image attachment failed, but product was created
            console.error('Failed to attach image to product')
          }
        }
      }

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
        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
            <button type="button" onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Compare-at Price ($)</label>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
            {loadingCategories ? (
              <div className={`${inputCls} flex items-center text-gray-400`}>Loading categories...</div>
            ) : (
              <select value={form.categoryId} onChange={set('categoryId')} className={inputCls} required>
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand</label>
            <input value={form.brand} onChange={set('brand')} placeholder="e.g. Sony" className={inputCls} />
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Images</label>
          <div className="space-y-3">
            {uploadedImages.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {uploadedImages.map((img, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-lg border border-gray-200 overflow-hidden group">
                    {img.uploading ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <div className="w-5 h-5 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <>
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute bottom-0 left-0 right-0 bg-[#7C3AED] text-white text-[9px] font-bold text-center py-0.5">PRIMARY</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-[#7C3AED]/40 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500 font-medium">Click to upload images</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP up to 5MB — first image becomes the primary</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleImageUpload}
            />
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
            {saving ? 'Creating...' : <><CheckCircle className="w-4 h-4" /> Create Product</>}
          </button>
        </div>
      </form>
    </div>
  )
}
