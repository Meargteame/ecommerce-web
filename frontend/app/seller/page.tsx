'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Package, ShoppingBag, DollarSign, TrendingUp, Plus, ArrowRight, AlertTriangle, Users, Target, Activity, Calendar } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const STATUS_STYLES: Record<string, string> = {
  placed: 'bg-blue-50 text-blue-600',
  payment_confirmed: 'bg-purple-50 text-secondary',
  processing: 'bg-orange-50 text-orange-600',
  packed: 'bg-indigo-50 text-indigo-600',
  shipped: 'bg-cyan-50 text-cyan-600',
  delivered: 'bg-green-50 text-green-600',
  cancelled: 'bg-red-50 text-red-600',
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
          setError('Access Denied: Please verify your seller role.')
        } else {
          setError('Failed to load portal data.')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-8 flex items-center justify-center">
        <div className="glass bg-white/80 p-8 rounded-[2rem] border border-red-100 shadow-2xl max-w-md text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Access Issue</h2>
          <p className="text-gray-500 font-medium mb-8">{error}</p>
          <button onClick={() => window.location.reload()} className="premium-gradient px-8 py-3 text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform">Retry Connection</button>
        </div>
      </div>
    )
  }

  const lowStock = inventory.filter(p => (p.stock_quantity ?? p.stockQuantity) <= 5 && (p.stock_quantity ?? p.stockQuantity) > 0)
  const outOfStock = inventory.filter(p => (p.stock_quantity ?? p.stockQuantity) === 0)

  const cards = [
    { label: 'Net Revenue', value: loading ? '—' : `$${Number(stats?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, trend: `${stats?.revenueTrend  > 0 ? '+' : ''}${stats?.revenueTrend ?? 0}%`, href: '/seller/analytics', color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
    { label: 'Active Orders', value: loading ? '—' : (stats?.totalOrders ?? 0), icon: ShoppingBag, trend: `${stats?.ordersTrend > 0 ? '+' : ''}${stats?.ordersTrend ?? 0} new`, href: '/seller/orders', color: 'text-blue-600', bg: 'bg-blue-50/50' },
    { label: 'Products', value: loading ? '—' : (stats?.totalProducts ?? 0), icon: Package, trend: 'Updated', href: '/seller/products', color: 'text-orange-600', bg: 'bg-orange-50/50' },
    { label: 'Satisfaction', value: loading ? '—' : (profile?.rating ? `${Number(profile.rating).toFixed(1)}` : '5.0'), icon: TrendingUp, trend: 'Top 5%', href: '/seller/settings', color: 'text-purple-600', bg: 'bg-purple-50/50' },
  ]

  return (
    <div className="min-h-screen bg-gray-50/30 p-4 md:p-8 lg:p-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl premium-gradient flex items-center justify-center shadow-lg shadow-primary/20">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Partner Dashboard</p>
              <h1 className="text-3xl font-black text-gray-950 tracking-tight">
                {loading ? 'Powering up...' : `Hi, ${profile?.storeName || user?.first_name || 'Seller'}`}
              </h1>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex flex-col items-end mr-4">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
              <Calendar className="h-3 w-3" />
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mt-1">Live Store Analytics</p>
          </div>
          <Link href="/seller/products/new"
            className="flex items-center gap-2 px-6 py-4 text-white text-sm font-black uppercase tracking-widest rounded-2xl transition-all hover:scale-105 active:scale-95 premium-gradient shadow-xl shadow-primary/25">
            <Plus className="h-4 w-4 stroke-[3]" />
            List Product
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {cards.map(({ label, value, icon: Icon, trend, href, color, bg }) => (
          <Link key={label} href={href}
            className="group bg-white rounded-[2rem] border border-gray-100 p-8 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 flex flex-col relative overflow-hidden">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${bg} opacity-50 blur-3xl transition-all group-hover:scale-150 group-hover:opacity-100`} />
            <div className="flex items-center justify-between mb-6 relative">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bg} ${color} transition-transform group-hover:scale-110`}>
                <Icon className="h-6 w-6" />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${bg} ${color}`}>{trend}</span>
            </div>
            <p className="text-3xl font-black text-gray-950 mb-1 tracking-tight relative">{value}</p>
            <p className="text-xs text-gray-400 font-black uppercase tracking-widest relative">{label}</p>
          </Link>
        ))}
      </div>

      {/* Critical Alerts */}
      {!loading && (outOfStock.length > 0 || lowStock.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
          {outOfStock.length > 0 && (
            <Link href="/seller/inventory" className="flex items-center gap-4 bg-red-50/50 border border-red-100 rounded-[1.5rem] px-6 py-4 hover:bg-red-50 transition-all border-l-[6px] border-l-red-500 group">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-red-700 uppercase tracking-widest leading-none mb-1">Stock Crisis</p>
                <p className="text-sm text-red-600 font-bold">
                  {outOfStock.length} product{outOfStock.length > 1 ? 's' : ''} out of stock. Customers cannot purchase these.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-red-300 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
          {lowStock.length > 0 && (
            <Link href="/seller/inventory" className="flex items-center gap-4 bg-orange-50/50 border border-orange-100 rounded-[1.5rem] px-6 py-4 hover:bg-orange-50 transition-all border-l-[6px] border-l-orange-500 group">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-orange-800 uppercase tracking-widest leading-none mb-1">Restock Warning</p>
                <p className="text-sm text-orange-700 font-bold">
                  {lowStock.length} product{lowStock.length > 1 ? 's' : ''} running low. (Under 5 units)
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-orange-300 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Recent Orders Hub */}
        <div className="xl:col-span-12 lg:col-span-12 xl:order-1 OrderHub">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-2xl shadow-gray-200/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-10 py-8 border-b border-gray-50 bg-gray-50/30">
              <div>
                <h2 className="text-2xl font-black text-gray-950 tracking-tight">Recent Fulfillment</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Manage your most recent customer orders</p>
              </div>
              <Link href="/seller/orders" className="mt-4 sm:mt-0 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm hover:shadow-md hover:border-primary/20 transition-all flex items-center gap-2">
                View Order History <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center text-gray-300">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">Sychronizing Orders...</p>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="h-10 w-10 text-gray-200" />
                </div>
                <h3 className="text-xl font-black text-gray-400 uppercase tracking-tighter">No Active Orders</h3>
                <p className="text-gray-400 mt-2 text-sm">Your orders will appear here once customers start buying.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-10 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Order Ref</th>
                      <th className="px-10 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-10 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                      <th className="px-10 py-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Value</th>
                      <th className="px-10 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="px-10 py-6">
                          <p className="text-sm font-black text-gray-900">#{o.orderNumber || o.id?.slice(0, 8).toUpperCase()}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Order</p>
                        </td>
                        <td className="px-10 py-6">
                          <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_STYLES[o.status] || 'bg-gray-50 text-gray-500'}`}>
                            {o.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-10 py-6">
                          <p className="text-sm font-bold text-gray-600 cursor-default">{new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </td>
                        <td className="px-10 py-6 text-right font-black text-gray-900">${Number(o.totalAmount || 0).toFixed(2)}</td>
                        <td className="px-10 py-6 text-right">
                          <Link href={`/seller/orders/${o.id}`} className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-primary transition-all inline-block">
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Growth Explorer */}
        <div className="xl:col-span-5 xl:order-2 space-y-8">
           <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-2xl shadow-gray-200/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Target className="w-32 h-32" />
              </div>
              <h2 className="text-xl font-black text-gray-950 tracking-tight mb-8">Growth Target</h2>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Monthly Revenue Goal</p>
                    <p className="text-lg font-black text-primary">$15,000</p>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full premium-gradient transition-all duration-1000" style={{ width: `${Math.min(100, (Number(stats?.totalRevenue || 0) / 15000) * 100)}%` }} />
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-3">Currently at {Math.round((Number(stats?.totalRevenue || 0) / 15000) * 100)}% of your target</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6">
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-center">
                    <Users className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Store Views</p>
                    <p className="text-lg font-black text-gray-900">{stats?.viewCount || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-center">
                    <TrendingUp className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Conversion</p>
                    <p className="text-lg font-black text-gray-900">{stats?.conversionRate || 0}%</p>
                  </div>
                </div>
              </div>
           </div>

           {/* Quick Actions */}
           <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-black/20">
              <h2 className="text-xl font-black tracking-tight mb-8">Fast Actions</h2>
              <div className="grid gap-4">
                {[
                  { label: 'Bulk Edit Inventory', icon: Package, href: '/seller/inventory' },
                  { label: 'Marketing Tools', icon: Target, href: '/seller/marketing' },
                  { label: 'Storefront Settings', icon: TrendingUp, href: '/seller/settings' },
                ].map((act) => (
                  <Link key={act.label} href={act.href} className="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-4 rounded-2xl transition-all border border-white/5 hover:border-white/10 group">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <act.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-bold flex-1">{act.label}</span>
                    <ArrowRight className="h-4 w-4 text-white/30 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ))}
              </div>
           </div>
        </div>

        {/* Product Pulse */}
        <div className="xl:col-span-7 xl:order-3">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-2xl shadow-gray-200/50">
            <div className="flex items-center justify-between px-10 py-8 border-b border-gray-50 bg-gray-50/30">
              <h2 className="text-2xl font-black text-gray-950 tracking-tight">Product Pulse</h2>
              <Link href="/seller/products" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline">Manage All</Link>
            </div>
            {inventory.length === 0 ? (
               <div className="p-20 text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Package className="h-10 w-10 text-gray-200" />
                  </div>
                  <h3 className="text-xl font-black text-gray-400 uppercase tracking-tighter">Inventory Empty</h3>
                  <Link href="/seller/products/new" className="mt-4 inline-block text-xs font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity">Add Your First Product →</Link>
               </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {inventory.slice(0, 6).map((p) => {
                  const pQty = p.stock_quantity ?? p.stockQuantity ?? 0
                  return (
                    <div key={p.id} className="flex items-center gap-6 px-10 py-6 hover:bg-gray-50/30 transition-all group">
                      <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-gray-100 shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-50 flex items-center justify-center font-bold text-gray-200">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-black text-gray-900 truncate tracking-tight">{p.name}</p>
                        <p className="text-xs font-bold text-primary mt-1">${Number(p.price || p.basePrice || 0).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          pQty === 0 ? 'bg-red-50 text-red-600'
                          : pQty <= 5 ? 'bg-orange-50 text-orange-600'
                          : 'bg-green-50 text-green-600'
                        }`}>
                          {pQty} Units
                        </span>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Available</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
