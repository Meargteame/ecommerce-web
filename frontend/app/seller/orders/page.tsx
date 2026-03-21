'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { ShoppingBag, ChevronDown, Truck, Search, Filter, MoreHorizontal, Eye, X, CheckCircle2 } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  placed: 'bg-blue-50 text-blue-600',
  payment_confirmed: 'bg-purple-50 text-secondary',
  processing: 'bg-orange-50 text-orange-600',
  packed: 'bg-indigo-50 text-indigo-600',
  shipped: 'bg-cyan-50 text-cyan-600',
  delivered: 'bg-green-50 text-green-600',
  cancelled: 'bg-red-50 text-red-600',
}

const SELLER_STATUSES = ['processing', 'packed', 'shipped', 'delivered']

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
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
      // toast error would be good here
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
        o.id === trackingModal.id ? { ...o, status: 'shipped', trackingNumber: trackingInput } : o
      ))
      setTrackingModal(null)
      setTrackingInput('')
    } catch {
      // toast error would be good here
    } finally {
      setUpdating(null)
    }
  }

  const filteredOrders = orders.filter(o => 
    o.orderNumber?.toLowerCase().includes(search.toLowerCase()) || 
    o.customerEmail?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-8 lg:p-12 min-h-screen bg-gray-50/30">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Fulfillment Center</p>
          <h1 className="text-3xl font-black text-gray-950 tracking-tight">Orders & Shipments</h1>
          <p className="text-sm text-gray-400 font-medium">Manage your marketplace sales and tracking information.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search ref or customer..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
            />
          </div>
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all shadow-sm">
            <Filter className="h-3 w-3" />
            Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-[2.5rem] border border-gray-50 p-20 text-center shadow-xl shadow-gray-200/50">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-black uppercase tracking-widest text-gray-300">Synchronizing Logistics...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-gray-50 p-20 text-center shadow-xl shadow-gray-200/50">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="h-10 w-10 text-gray-200" />
          </div>
          <h3 className="text-xl font-black text-gray-400 uppercase tracking-tighter">No Orders Found</h3>
          <p className="text-gray-400 mt-2 text-sm italic">"Opportunity only knocks if you build a door." — Keep listing products!</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-50 overflow-hidden shadow-2xl shadow-gray-200/50">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-50">
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Order Reference</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Customer Details</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Order Value</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Created At</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-gray-950 tracking-tight">#{o.orderNumber || o.id?.slice(0, 8).toUpperCase()}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Priority Standard</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                        STATUS_STYLES[o.status] || 'bg-gray-50 text-gray-500'
                      }`}>
                        {o.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-gray-700">{o.customerEmail?.split('@')[0]}</p>
                      <p className="text-[10px] font-bold text-gray-400 lowercase truncate max-w-[150px]">{o.customerEmail}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-base font-black text-gray-950">${Number(o.totalAmount || 0).toFixed(2)}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center gap-3 justify-end">
                        {o.status !== 'delivered' && o.status !== 'cancelled' && (
                          <div className="relative group/sel">
                            <select
                              value={o.status}
                              disabled={updating === o.id}
                              onChange={e => {
                                if (e.target.value === 'shipped') {
                                  setTrackingModal({ id: o.id, current: o.trackingNumber || '' })
                                  setTrackingInput(o.trackingNumber || '')
                                } else {
                                  updateStatus(o.id, e.target.value)
                                }
                              }}
                              className="appearance-none text-[10px] font-black uppercase tracking-widest border border-gray-100 rounded-xl px-4 py-2.5 pr-9 bg-white focus:outline-none focus:ring-2 focus:ring-primary/10 cursor-pointer disabled:opacity-50 shadow-sm transition-all"
                            >
                              {SELLER_STATUSES.map(s => (
                                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none group-hover/sel:text-primary transition-colors" />
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {o.status === 'shipped' && (
                            <button
                              onClick={() => { setTrackingModal({ id: o.id, current: o.trackingNumber || '' }); setTrackingInput(o.trackingNumber || '') }}
                              className="p-2.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl transition-all shadow-sm group/btn"
                              title="Update tracking">
                              <Truck className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                            </button>
                          )}
                          <Link href={`/seller/orders/${o.id}`} className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all shadow-sm group/eye">
                            <MoreHorizontal className="h-5 w-5 group-hover/eye:scale-110 transition-transform" />
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(total > limit) && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-10 py-8 border-t border-gray-50 bg-gray-50/20 gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Displaying {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total} fulfillment entries
              </span>
              <div className="flex gap-4">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="px-6 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 disabled:opacity-30 hover:shadow-md transition-all shadow-sm">
                  Back
                </button>
                <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}
                  className="px-6 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 disabled:opacity-30 hover:shadow-md transition-all shadow-sm">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tracking modal */}
      {trackingModal && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 premium-gradient" />
            
            <button 
              onClick={() => { setTrackingModal(null); setTrackingInput('') }}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-900 hover:bg-gray-50 transition-all">
              <X className="h-5 w-5" />
            </button>

            <div className="mb-8">
              <div className="w-16 h-16 bg-cyan-50 rounded-[1.25rem] flex items-center justify-center mb-6">
                <Truck className="h-8 w-8 text-cyan-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-950 tracking-tight mb-2 uppercase">Logistics Entry</h3>
              <p className="text-sm text-gray-400 font-medium">Please enter the carrier tracking number to notify the customer of dispatch.</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 block">Carrier Tracking ID</label>
                <div className="relative">
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={e => setTrackingInput(e.target.value)}
                    placeholder="e.g. 1Z999AA101234..."
                    className="w-full h-14 px-5 bg-gray-50/50 border border-gray-100 rounded-[1rem] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/10 focus:bg-white transition-all"
                    autoFocus
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <CheckCircle2 className={`h-5 w-5 transition-colors ${trackingInput.length > 5 ? 'text-green-500' : 'text-gray-200'}`} />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => { setTrackingModal(null); setTrackingInput('') }}
                  className="flex-1 py-4 px-6 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button
                  onClick={saveTracking}
                  disabled={updating !== null || trackingInput.length < 3}
                  className="flex-1 py-4 px-6 bg-cyan-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cyan-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                  {updating ? 'Updating...' : 'Confirm Dispatch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
