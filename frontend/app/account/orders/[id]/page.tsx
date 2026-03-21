'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { ChevronRight, Package, Truck, CheckCircle, Clock, XCircle } from 'lucide-react'

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  image_url?: string
  slug?: string
}

interface OrderDetail {
  id: string
  status: string
  total_amount: number
  subtotal?: number
  shipping_cost?: number
  created_at: string
  updated_at: string
  payment_method?: string
  shipping_address?: {
    first_name?: string
    last_name?: string
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }
  items: OrderItem[]
  tracking_number?: string
}

const STATUS_STEPS = ['pending', 'processing', 'shipped', 'delivered']

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock className="h-5 w-5" />,
  processing: <Package className="h-5 w-5" />,
  shipped: <Truck className="h-5 w-5" />,
  delivered: <CheckCircle className="h-5 w-5" />,
  cancelled: <XCircle className="h-5 w-5" />,
}

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-gray-100 text-gray-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('success') === '1') {
        setIsSuccess(true)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return }
    api.get(`/orders/${id}`)
      .then(({ data }) => { setOrder(data.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id, user, router])

  const handleCancelOrder = async () => {
    if (!order) return
    setCancelling(true)
    setCancelError('')
    try {
      await api.post(`/orders/${order.id}/cancel`)
      setOrder((o) => o ? { ...o, status: 'cancelled' } : o)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setCancelError(e.response?.data?.error || 'Failed to cancel order')
    }
    setCancelling(false)
  }

  if (loading) return (
    <>
      <Header /><CartDrawer />
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">Loading order...</div>
      <Footer />
    </>
  )

  if (!order) return (
    <>
      <Header /><CartDrawer />
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-lg font-medium text-gray-700">Order not found</p>
        <Link href="/account" className="text-blue-600 hover:underline mt-2 inline-block">Back to account</Link>
      </div>
      <Footer />
    </>
  )

  const currentStep = STATUS_STEPS.indexOf(order.status)
  const isCancelled = order.status === 'cancelled'
  const addr = order.shipping_address

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        {isSuccess && (
          <div className="bg-[#ECFDF3] border border-[#ABEFC6] rounded-xl p-5 mb-8 flex items-center gap-4">
            <CheckCircle className="h-8 w-8 text-[#17B26A] shrink-0" />
            <div>
              <p className="font-bold text-[#067647] text-lg">Order placed successfully!</p>
              <p className="text-sm text-[#067647] mt-0.5">Thank you for your purchase. We&apos;ll send you a confirmation email shortly.</p>
            </div>
          </div>
        )}

        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8 font-medium">
          <Link href="/account/profile" className="hover:text-gray-900 transition-colors">Account</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/account/orders" className="hover:text-gray-900 transition-colors">Orders</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</span>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-sm text-gray-500 mt-1">Placed on {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <span className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full capitalize ${statusColor[order.status] || 'bg-gray-100 text-gray-600'}`}>
            {statusIcon[order.status]}
            {order.status}
          </span>
        </div>

        {/* Progress tracker */}
        {!isCancelled && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-5 h-0.5 bg-gray-200 mx-10" />
              <div
                className="absolute left-0 top-5 h-0.5 bg-gray-900 mx-10 transition-all duration-500"
                style={{ width: currentStep >= 0 ? `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` : '0%' }}
              />
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex flex-col items-center gap-2 relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${i <= currentStep ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                    {statusIcon[step]}
                  </div>
                  <span className={`text-xs font-medium capitalize ${i <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}>{step}</span>
                </div>
              ))}
            </div>
            {order.tracking_number && (
              <p className="text-sm text-gray-600 mt-4 text-center">
                Tracking: <span className="font-mono font-medium text-gray-900">{order.tracking_number}</span>
              </p>
            )}
          </div>
        )}

        {/* Cancel order */}
        {(order.status === 'pending' || order.status === 'processing') && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Need to cancel?</p>
              <p className="text-xs text-gray-500 mt-0.5">You can cancel this order while it&apos;s still being processed.</p>
              {cancelError && <p className="text-xs text-red-600 mt-1">{cancelError}</p>}
            </div>
            <button onClick={handleCancelOrder} disabled={cancelling}
              className="shrink-0 px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-full hover:bg-red-100 disabled:opacity-50 transition-colors">
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Items ({order.items?.length || 0})</h2>
              <div className="space-y-4">
                {(order.items || []).map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.product_name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{item.product_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm shrink-0">
                      ${(item.unit_price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {addr && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Shipping Address</h2>
                <div className="text-sm text-gray-600 space-y-0.5">
                  <p className="font-medium text-gray-900">{addr.first_name} {addr.last_name}</p>
                  <p>{addr.street}</p>
                  <p>{addr.city}, {addr.state} {addr.zip}</p>
                  <p>{addr.country}</p>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm">
                {order.subtotal != null && (
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span><span>${Number(order.subtotal).toFixed(2)}</span>
                  </div>
                )}
                {order.shipping_cost != null && (
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className={order.shipping_cost === 0 ? 'text-green-600' : ''}>
                      {order.shipping_cost === 0 ? 'Free' : `${Number(order.shipping_cost).toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                  <span>Total</span><span>${Number(order.total_amount).toFixed(2)}</span>
                </div>
              </div>
              {order.payment_method && (
                <p className="text-xs text-gray-500 mt-3 capitalize">
                  Paid via {order.payment_method.replace(/_/g, ' ')}
                </p>
              )}
            </div>

            <Link
              href="/products"
              className="block w-full text-center py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
