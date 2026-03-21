'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { DollarSign, TrendingUp, ShoppingBag, Percent } from 'lucide-react'

export default function SellerEarningsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/seller/earnings')
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const s = data?.summary
  const fmt = (n: any) => `$${Number(n || 0).toFixed(2)}`

  const cards = [
    { label: 'Gross Revenue', value: fmt(s?.grossRevenue), icon: DollarSign, color: 'bg-purple-50 text-[#7C3AED]', desc: 'Before platform fee' },
    { label: 'Net Earnings', value: fmt(s?.netRevenue), icon: TrendingUp, color: 'bg-green-50 text-green-700', desc: `After ${s?.commissionRate || 10}% platform fee` },
    { label: 'Platform Fee', value: fmt(s?.platformFee), icon: Percent, color: 'bg-orange-50 text-orange-600', desc: `${s?.commissionRate || 10}% commission` },
    { label: 'Total Orders', value: s?.totalOrders ?? 0, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600', desc: 'Completed orders' },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Earnings & Payouts</h1>
        <p className="text-sm text-gray-500 mt-1">Track your revenue and commission breakdown</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#7C3AED', borderTopColor:'transparent'}} />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map(({ label, value, icon: Icon, color, desc }) => (
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

          {/* Monthly breakdown */}
          {data?.monthly?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">Monthly Earnings (Last 6 Months)</h2>
              <div className="space-y-3">
                {data.monthly.map((m: any) => {
                  const month = new Date(m.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  const maxRevenue = Math.max(...data.monthly.map((x: any) => Number(x.net_revenue)))
                  const pct = maxRevenue > 0 ? (Number(m.net_revenue) / maxRevenue) * 100 : 0
                  return (
                    <div key={m.month} className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 w-32 shrink-0">{month}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="rounded-full h-2 transition-all"
                          style={{ width: `${pct}%`, backgroundColor: '#7C3AED' }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-24 text-right">
                        {fmt(m.netRevenue)}
                      </span>
                      <span className="text-xs text-gray-400 w-16 text-right">
                        {m.orders} orders
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent transactions */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
            </div>
            {!data?.recentPayouts?.length ? (
              <div className="p-8 text-center text-sm text-gray-400">No transactions yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fee</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recentPayouts.map((t: any) => (
                    <tr key={t.orderNumber} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5 font-medium text-gray-900">{t.orderNumber || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">
                        {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.status === 'delivered' ? 'bg-green-100 text-green-700'
                          : t.status === 'shipped' ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-red-500 text-xs">-{fmt(t.fee)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-green-700">{fmt(t.netAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
