'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Package, AlertTriangle, CheckCircle, Edit2, X } from 'lucide-react'

export default function SellerInventoryPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchInventory = async () => {
    try {
      const { data } = await api.get('/seller/inventory')
      setProducts(data.data || [])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInventory() }, [])

  const startEdit = (id: string, current: number) => {
    setEditing(id)
    setEditValue(String(current))
  }

  const saveStock = async (id: string) => {
    const qty = parseInt(editValue)
    if (isNaN(qty) || qty < 0) return
    setSaving(true)
    try {
      await api.put(`/seller/inventory/${id}`, { stock_quantity: qty })
      setProducts(prev => prev.map(p => p.id === id ? { ...p, stock_quantity: qty } : p))
      setEditing(null)
    } catch {
      alert('Failed to update stock')
    } finally {
      setSaving(false)
    }
  }

  const lowStock = products.filter(p => p.stock_quantity <= 5 && p.stock_quantity > 0)
  const outOfStock = products.filter(p => p.stock_quantity === 0)

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500 mt-1">Manage stock levels for your products</p>
      </div>

      {/* Alert banners */}
      {outOfStock.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {outOfStock.length} product{outOfStock.length > 1 ? 's' : ''} out of stock
          </p>
        </div>
      )}
      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
          <p className="text-sm text-yellow-700 font-medium">
            {lowStock.length} product{lowStock.length > 1 ? 's' : ''} running low (≤5 units)
          </p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{borderColor:'#7C3AED', borderTopColor:'transparent'}} />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">No products to manage</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                <th className="px-5 py-3.5 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name}
                          className="w-9 h-9 object-cover rounded-lg border border-gray-100 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      <p className="font-medium text-gray-900 line-clamp-1">{p.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500 font-mono text-xs">{p.sku || '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.stock_quantity === 0 ? 'bg-red-100 text-red-700'
                      : p.stock_quantity <= 5 ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                    }`}>
                      {p.stock_quantity === 0 ? 'Out of stock'
                        : p.stock_quantity <= 5 ? 'Low stock'
                        : 'In stock'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {editing === p.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="w-20 h-8 px-2 border rounded-lg text-sm focus:outline-none"
                          style={{borderColor:'#7C3AED'}}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveStock(p.id); if (e.key === 'Escape') setEditing(null) }}
                        />
                        <button onClick={() => saveStock(p.id)} disabled={saving}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditing(null)}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-semibold text-gray-900">{p.stock_quantity ?? 0}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {editing !== p.id && (
                      <button onClick={() => startEdit(p.id, p.stock_quantity ?? 0)}
                        className="p-1.5 text-gray-400 hover:bg-purple-50 rounded-lg transition-colors"
                        onMouseEnter={e => (e.currentTarget.style.color = '#7C3AED')}
                        onMouseLeave={e => (e.currentTarget.style.color = '')}>
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
