'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Plus, Edit, Trash2, Search, Package } from 'lucide-react'

export default function SellerProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const limit = 20

  const fetchProducts = async (offset = 0) => {
    setLoading(true)
    try {
      const { data } = await api.get('/seller/products', { params: { limit, offset } })
      setProducts(data.data.products || [])
      setTotal(data.data.total || 0)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts(page * limit) }, [page])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    try {
      await api.delete(`/seller/products/${id}`)
      fetchProducts(page * limit)
    } catch {
      alert('Failed to delete product')
    }
  }

  const filtered = search
    ? products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
    : products

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total products</p>
        </div>
        <Link href="/seller/products/new"
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors"
          style={{backgroundColor:'#7C3AED'}}>
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full max-w-sm h-10 pl-9 pr-4 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
          style={{outlineColor:'#7C3AED'}}
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{borderColor:'#7C3AED', borderTopColor:'transparent'}} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium mb-1">No products yet</p>
          <p className="text-gray-400 text-xs mb-4">Start by adding your first product to the store</p>
          <Link href="/seller/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors"
            style={{backgroundColor:'#7C3AED'}}>
            <Plus className="h-4 w-4" />
            Add your first product
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3.5 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name}
                        className="w-10 h-10 object-cover rounded-lg border border-gray-100 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 line-clamp-1">{p.name}</p>
                      {p.categoryName && (
                        <p className="text-xs text-gray-400 mt-0.5">{p.categoryName}</p>
                      )}
                    </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-700 font-medium">
                    ${Number(p.basePrice || p.price || 0).toFixed(2)}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      (p.stockQuantity || 0) > 10 ? 'bg-green-100 text-green-700'
                      : (p.stockQuantity || 0) > 0 ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                    }`}>
                      {p.stockQuantity ?? 0} in stock
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === 'published' ? 'bg-green-100 text-green-700'
                      : p.status === 'draft' ? 'bg-gray-100 text-gray-600'
                      : 'bg-red-100 text-red-700'
                    }`}>
                      {p.status || 'draft'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/seller/products/${p.id}/edit`}
                        className="p-1.5 text-gray-400 hover:bg-purple-50 rounded-lg transition-colors"
                        onMouseEnter={e => (e.currentTarget.style.color = '#7C3AED')}
                        onMouseLeave={e => (e.currentTarget.style.color = '')}>
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {total > limit && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-500">
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors">
                  Previous
                </button>
                <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
