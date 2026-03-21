'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { DollarSign, ShoppingBag, Package, TrendingUp, Star } from 'lucide-react'

export default function SellerAnalyticsPage() {
  const [stats, setStats] = useState<any>(null)
  const [earnings, setEarnings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/seller/dashboard').then(r => setStats(r.data.data)),
      api.get('/seller/earnings').then(r => setEarnings(r.data.data)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n: any) => `$${Number(n || 0).toFixed(2)}`

  const metrics = [
    { label: 'Gross Revenue', value: loading ? '—' : fmt(earnings?.summary?.grossRevenue), icon: DollarSign, color: 'bg-purple-50 text-[#7C3AED]', desc: 'All time' },
    { label: 'Net Earnings', value: loading ? '—' : fmt(earnings?.summary?.netRevenue), icon: TrendingUp, color: 'bg-green-50 text-green-700', desc: 'After fees' },
    { label: 'Total Orders', value: loading ? '—' : (stats?.totalOrders ?? 0), icon: ShoppingBag, color: 'bg-blue-50 text-blue-600', desc: 'Completed' },
    { label: 'Products Listed', value: loading ? '—' : (stats?.totalProducts ?? 0), icon: Package, color: 'bg-purple-50 text-[#7C3AED]', desc: 'Active listings' },
  ]

  const monthly = earnings?.monthly || []
  const maxRevenue = monthly.length > 0 ? Math.max(...monthly.map((m: any) => Number(m.netRevenue))) : 1

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Track your store performance over time</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map(({ label, value, icon: Icon, color, desc }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
            <p className="text-sm font-medium text-gray-700">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-5">Revenue — Last 6 Months</h2>
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#7C3AED', borderTopColor:'transparent'}} />
          </div>
        ) : monthly.length === 0 ? (
          <div className="h-40 flex items-center justify-center">
            <p className="text-sm text-gray-400">No data yet — revenue will appear once you get orders</p>
          </div>
        ) : (
          <div className="flex items-end gap-3 h-40">
            {[...monthly].reverse().map((m: any) => {
              const height = maxRevenue > 0 ? Math.max((Number(m.netRevenue) / maxRevenue) * 100, 4) : 4
              const month = new Date(m.month).toLocaleDateString('en-US', { month: 'short' })
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="relative w-full flex items-end justify-center" style={{ height: '120px' }}>
                    <div
                      className="w-full rounded-t-lg transition-colors cursor-default"
                      style={{ height: `${height}%`, backgroundColor: '#7C3AED' }}
                      title={`${fmt(m.netRevenue)} · ${m.orders} orders`}
                    />
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {fmt(m.netRevenue)}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{month}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Avg order value */}
      {!loading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4" style={{color:'#7C3AED'}} />
              <p className="text-sm font-medium text-gray-700">Avg. Order Value</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalOrders > 0
                ? fmt(stats.totalRevenue / stats.totalOrders)
                : '$0.00'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <p className="text-sm font-medium text-gray-700">Platform Fee Rate</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{earnings?.summary?.commissionRate || 10}%</p>
            <p className="text-xs text-gray-400 mt-1">Per transaction</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-gray-700">Revenue per Product</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalProducts > 0
                ? fmt(stats.totalRevenue / stats.totalProducts)
                : '$0.00'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
