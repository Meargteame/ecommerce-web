'use client'


export const dynamic = 'force-dynamic';
import { useState } from 'react'
import Header from '@/components/layout/HeaderWrapper'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import api from '@/lib/api'
import { Search, Package, Truck, CheckCircle, Clock, XCircle, MapPin } from 'lucide-react'

interface OrderTracking {
  id: string
  status: string
  total_amount?: number
  totalAmount?: number
  created_at?: string
  createdAt?: string
  shipping_address?: any
  shippingAddress?: any
  items?: { name?: string; productName?: string; quantity: number; price?: number; unitPrice?: number }[]
  tracking_number?: string
  trackingNumber?: string
  carrier?: string
}

const steps = [
  { key: 'placed', label: 'Order Placed', icon: <Clock className="h-5 w-5" /> },
  { key: 'payment_confirmed', label: 'Payment Confirmed', icon: <CheckCircle className="h-5 w-5" /> },
  { key: 'processing', label: 'Processing', icon: <Package className="h-5 w-5" /> },
  { key: 'shipped', label: 'Shipped', icon: <Truck className="h-5 w-5" /> },
  { key: 'delivered', label: 'Delivered', icon: <CheckCircle className="h-5 w-5" /> },
]
const stepIndex: Record<string, number> = { placed: 0, pending: 0, payment_confirmed: 1, processing: 2, shipped: 3, delivered: 4 }

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('')
  const [order, setOrder] = useState<OrderTracking | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderId.trim()) return
    setLoading(true); setError(''); setOrder(null)
    try {
      const { data } = await api.get(`/orders/${orderId.trim()}`)
      setOrder(data.data)
    } catch {
      setError('Order not found. Please check your order ID and try again.')
    }
    setLoading(false)
  }

  const currentStep = order ? (stepIndex[order.status] ?? -1) : -1
  const isCancelled = order?.status === 'cancelled'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 pb-8 border-b border-gray-100">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Track Your Order</h1>
            <p className="text-gray-500">Enter your order ID to get real-time updates on your shipment.</p>
          </div>

          <form onSubmit={handleTrack} className="flex gap-3 mb-8">
            <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)}
              placeholder="e.g. ORD-12345"
              className="flex-1 px-5 py-3.5 bg-white border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] shadow-sm transition-all" />
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-8 py-3.5 bg-[#111111] hover:bg-black disabled:bg-gray-300 text-white font-bold rounded-lg transition-colors shadow-sm">
              <Search className="h-4 w-4" />
              {loading ? 'Searching...' : 'Track'}
            </button>
          </form>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-8 shadow-sm">
              <XCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {order && (
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              {/* Header */}
              <div className="bg-gray-50 p-6 border-b border-gray-200 flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Order ID</p>
                  <p className="font-mono font-bold text-gray-900">{order.id}</p>
                  <p className="text-xs font-medium text-gray-500 mt-1">Placed {new Date(order.created_at || order.createdAt || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Total</p>
                  <p className="font-bold text-gray-900 text-lg">${Number(order.total_amount || order.totalAmount || 0).toFixed(2)}</p>
                </div>
              </div>

              {/* Progress */}
              <div className="p-8 border-b border-gray-100">
                {isCancelled ? (
                  <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-100 text-red-700">
                    <XCircle className="h-6 w-6 shrink-0" />
                    <div>
                      <p className="font-semibold">Order Cancelled</p>
                      <p className="text-sm text-red-600 mt-0.5">This order has been cancelled and will not be shipped.</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex justify-between relative z-10">
                      {steps.map((step, i) => {
                        const done = i <= currentStep
                        const active = i === currentStep
                        return (
                          <div key={step.key} className="flex flex-col items-center gap-3 flex-1">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-4 border-white shadow-sm ${done ? 'bg-[#17B26A] text-white' : 'bg-gray-100 text-gray-400'} ${active ? 'ring-4 ring-[#ABEFC6]' : ''}`}>
                              {step.icon}
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wider text-center ${done ? 'text-[#17B26A]' : 'text-gray-400'}`}>{step.label}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="absolute top-6 left-[10%] right-[10%] h-1 bg-gray-100 -z-0 rounded-full">
                      <div className="h-full bg-[#17B26A] transition-all duration-700 rounded-full"
                        style={{ width: currentStep >= 0 ? `${(currentStep / (steps.length - 1)) * 100}%` : '0%' }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                {/* Shipping address */}
                {(order.shipping_address || order.shippingAddress) && (() => {
                  const a = order.shipping_address || order.shippingAddress
                  return (
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4 text-[#7C3AED]">
                      <MapPin className="h-5 w-5" />
                      <p className="text-sm font-bold uppercase tracking-wider text-gray-900">Shipping To</p>
                    </div>
                    <div className="text-sm font-medium text-gray-600 space-y-1 pl-7">
                      {(a.fullName || a.full_name) && <p className="font-bold text-gray-900 text-base mb-1">{a.fullName || a.full_name}</p>}
                      {(a.addressLine1 || a.address_line1) && <p>{a.addressLine1 || a.address_line1}</p>}
                      <p>{[a.city, a.state, a.country].filter(Boolean).join(', ')}</p>
                    </div>
                  </div>
                  )
                })()}

                {/* Tracking number */}
                {(order.tracking_number || order.trackingNumber) && (
                  <div className="p-6">
                    <p className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4">Tracking Information</p>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-1">Tracking Number</p>
                      <p className="font-mono font-bold text-gray-900 text-lg tracking-wider">{order.tracking_number || order.trackingNumber}</p>
                      {order.carrier && <p className="text-sm font-medium text-gray-600 mt-2 flex items-center gap-1.5"><Truck className="h-4 w-4" /> via {order.carrier}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
