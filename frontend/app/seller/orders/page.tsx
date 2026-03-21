'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { ShoppingBag, ChevronDown, Truck } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700',
  payment_confirmed: 'bg-purple-50 text-[#7C3AED]',
  processing: 'bg-yellow-100 text-yellow-700',
  packed: 'bg-purple-100 text-[#7C3AED]',
  shipped: 'bg-purple-50 text-[#7C3AED]',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const SELLER_STATUSES = ['processing', 'packed', 'shipped', 'delivered']

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [updating, setUpdating] = useState<string | null>(null)
  const [trackingModal, setTrackingModal] = useState<{ id: string; current: string } | null>(null)
  const [trackingInput, setTrackingInput] = useState('')
  const limit = 20

  const fetchOrders = async (offset = 0) => {
    setLoading(true)
    try {
      const { data } = await api.get('/seller/orders', { params: { limit, offset } })
      setOrders(data.data.orders || [])
      setTotal(data.data.total || 0)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders(page * limit) }, [page])

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId)
    try {
      await api.put(`/seller/orders/${orderId}/status`, { status })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    } catch {
      alert('Failed to update status')
    } finally {
      setUpdating(null)
    }
  }

  const saveTracking = async () => {
    if (!trackingModal) return
    setUpdating(trackingModal.id)
    try {
      await api.put(`/seller/orders/${trackingModal.id}/status`, {
        status: 'shipped',
        trackingNumber: trackingInput,
      })
      setOrders(prev => prev.map(o =>
        o.id === trackingModal.id ? { ...o, status: 'shipped', tracking_number: trackingInput } : o
      ))
      setTrackingModal(null)
      setTrackingInput('')
    } catch {
      alert('Failed to update tracking')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-1">{total} total orders</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{borderColor:'#7C3AED', borderTopColor:'transparent'}} />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">No orders yet</p>
          <p className="text-gray-400 text-xs mt-1">Orders will appear here once customers start buying</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order #</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900">
                    {o.order_number || o.id?.slice(0, 8)}
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-xs">{o.customer_email}</td>
                  <td className="px-5 py-4 font-semibold text-gray-900">
                    ${Number(o.total_amount || 0).toFixed(2)}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-600'
                    }`}>
                      {o.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    {new Date(o.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {o.status !== 'delivered' && o.status !== 'cancelled' && (
                        <div className="relative">
                          <select
                            value={o.status}
                            disabled={updating === o.id}
                            onChange={e => {
                              if (e.target.value === 'shipped') {
                                setTrackingModal({ id: o.id, current: o.tracking_number || '' })
                                setTrackingInput(o.tracking_number || '')
                              } else {
                                updateStatus(o.id, e.target.value)
                              }
                            }}
                            className="appearance-none text-xs border border-gray-200 rounded-lg px-3 py-1.5 pr-7 bg-white focus:outline-none cursor-pointer disabled:opacity-50"
                            style={{outlineColor:'#7C3AED'}}
                          >
                            {SELLER_STATUSES.map(s => (
                              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                        </div>
                      )}
                      {o.status === 'shipped' && (
                        <button
                          onClick={() => { setTrackingModal({ id: o.id, current: o.tracking_number || '' }); setTrackingInput(o.tracking_number || '') }}
                          className="p-1.5 text-gray-400 hover:bg-purple-50 rounded-lg transition-colors"
                          style={{color: undefined}}
                          onMouseEnter={e => (e.currentTarget.style.color = '#7C3AED')}
                          onMouseLeave={e => (e.currentTarget.style.color = '')}
                          title="Update tracking">
                          <Truck className="h-4 w-4" />
                        </button>
                      )}
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

      {/* Tracking modal */}
      {trackingModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-1">Add Tracking Number</h3>
            <p className="text-sm text-gray-500 mb-4">This will mark the order as shipped</p>
            <input
              type="text"
              value={trackingInput}
              onChange={e => setTrackingInput(e.target.value)}
              placeholder="e.g. 1Z999AA10123456784"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none mb-4"
              style={{outlineColor:'#7C3AED'}}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setTrackingModal(null); setTrackingInput('') }}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={saveTracking}
                disabled={updating !== null}
                className="flex-1 py-2.5 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{backgroundColor:'#7C3AED'}}>
                {updating ? 'Saving...' : 'Mark Shipped'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
