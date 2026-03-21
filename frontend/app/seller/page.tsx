'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Package, ShoppingBag, DollarSign, TrendingUp, Plus, ArrowRight, AlertCircle, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const STATUS_STYLES: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700',
  payment_confirmed: 'bg-purple-50 text-[#7C3AED]',
  processing: 'bg-yellow-100 text-yellow-700',
  packed: 'bg-purple-100 text-[#7C3AED]',
  shipped: 'bg-purple-50 text-[#7C3AED]',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function SellerDashboard() {
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/seller/dashboard').then(r => setStats(r.data.data)),
      api.get('/seller/profile').then(r => setProfile(r.data.data)),
      api.get('/seller/orders', { params: { limit: 5, offset: 0 } }).then(r => setRecentOrders(r.data.data?.orders || [])),
      api.get('/seller/inventory').then(r => setInventory(r.data.data || [])),
    ])
      .catch((e) => {
        if (e?.response?.status === 403) {
          setError('Your account role needs to be updated. Please sign out and sign back in.')
        } else {
          setError('Failed to load dashboard data.')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 flex items-start gap-3 max-w-lg">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" style={{color:'#7C3AED'}} />
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Access issue</p>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const lowStock = inventory.filter(p => p.stock_quantity <= 5 && p.stock_quantity > 0)
  const outOfStock = inventory.filter(p => p.stock_quantity === 0)

  const cards = [
    { label: 'Total Products', value: loading ? '—' : (stats?.totalProducts ?? 0), icon: Package, href: '/seller/products', color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Orders', value: loading ? '—' : (stats?.totalOrders ?? 0), icon: ShoppingBag, href: '/seller/orders', color: 'bg-green-50 text-green-600' },
    { label: 'Revenue', value: loading ? '—' : `$${Number(stats?.totalRevenue ?? 0).toFixed(2)}`, icon: DollarSign, href: '/seller/analytics', color: 'bg-purple-50 text-[#7C3AED]' },
    { label: 'Store Rating', value: loading ? '—' : (profile?.rating ? `${Number(profile.rating).toFixed(1)} ★` : 'N/A'), icon: TrendingUp, href: '/seller/settings', color: 'bg-purple-50 text-[#7C3AED]' },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {loading ? 'Loading...' : `Welcome back, ${profile?.storeName || user?.first_name || 'Seller'}`}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Here's what's happening with your store today.</p>
        </div>
        <Link href="/seller/products/new"
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors"
          style={{backgroundColor:'#7C3AED'}}>
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-purple-200 hover:shadow-sm transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#7C3AED] transition-colors" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
          </Link>
        ))}
      </div>

      {/* Alerts */}
      {!loading && (outOfStock.length > 0 || lowStock.length > 0) && (
        <div className="space-y-2 mb-6">
          {outOfStock.length > 0 && (
            <Link href="/seller/inventory" className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 hover:bg-red-100 transition-colors">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 font-medium flex-1">
                {outOfStock.length} product{outOfStock.length > 1 ? 's' : ''} out of stock
              </p>
              <ArrowRight className="h-4 w-4 text-red-400" />
            </Link>
          )}
          {lowStock.length > 0 && (
            <Link href="/seller/inventory" className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 hover:bg-yellow-100 transition-colors">
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
              <p className="text-sm text-yellow-700 font-medium flex-1">
                {lowStock.length} product{lowStock.length > 1 ? 's' : ''} running low (≤5 units)
              </p>
              <ArrowRight className="h-4 w-4 text-yellow-400" />
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/seller/orders" className="text-xs font-medium flex items-center gap-1 hover:underline" style={{color:'#7C3AED'}}>
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#7C3AED', borderTopColor:'transparent'}} />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingBag className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No orders yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{o.order_number || o.id?.slice(0, 8)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-600'}`}>
                      {o.status?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">${Number(o.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products by Stock */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Product Overview</h2>
            <Link href="/seller/products" className="text-xs font-medium flex items-center gap-1 hover:underline" style={{color:'#7C3AED'}}>
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#7C3AED', borderTopColor:'transparent'}} />
            </div>
          ) : inventory.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No products yet</p>
              <Link href="/seller/products/new" className="text-xs font-medium mt-2 inline-block hover:underline" style={{color:'#7C3AED'}}>
                Add your first product
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {inventory.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-gray-100 shrink-0" />
                  ) : (
                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">${Number(p.price || p.base_price || 0).toFixed(2)}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                    p.stock_quantity === 0 ? 'bg-red-100 text-red-700'
                    : p.stock_quantity <= 5 ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
                  }`}>
                    {p.stock_quantity} in stock
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Store info */}
      {!loading && profile && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Store Profile</h2>
            <Link href="/seller/settings" className="text-xs font-medium flex items-center gap-1 hover:underline" style={{color:'#7C3AED'}}>
              Edit <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Store Name</p>
              <p className="text-sm font-medium text-gray-900">{profile.storeName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Contact Email</p>
              <p className="text-sm font-medium text-gray-900">{profile.contactEmail || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Verification</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                profile.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {profile.isVerified ? '✓ Verified' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
