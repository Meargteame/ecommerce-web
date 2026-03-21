'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { Package, ChevronRight, Truck, CheckCircle, Clock } from 'lucide-react'

interface Order { id: string; status: string; total_amount: number; created_at: string; item_count: number }

const statusConfig: Record<string, { icon: React.ReactNode, color: string, label: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, color: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Processing' },
  processing: { icon: <Package className="h-4 w-4" />, color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Preparing Ship' },
  shipped: { icon: <Truck className="h-4 w-4" />, color: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'In Transit' },
  delivered: { icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-50 text-green-700 border-green-200', label: 'Delivered' },
  cancelled: { icon: null, color: 'bg-gray-50 text-gray-600 border-gray-200', label: 'Cancelled' },
}

export default function OrdersPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    api.get('/orders')
      .then(({ data }) => setOrders(data.data?.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, router])

  if (!user) return null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-gray-100 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Order History</h1>
            <p className="text-sm text-gray-500 mt-2">Check the status of recent orders, manage returns, and discover similar products.</p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-[#7C3AED] hover:text-purple-800 transition-colors">
            Continue Shopping →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4 max-w-5xl">
            {[1,2,3].map((i) => <div key={i} className="h-32 bg-gray-50 rounded-xl border border-gray-100 animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-32">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="h-10 w-10 text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders found</h2>
            <p className="text-gray-500 max-w-sm mx-auto text-lg mb-8">Looks like you haven't made your first purchase yet. Check out our latest arrivals!</p>
            <Link href="/products" className="px-8 py-4 bg-[#7C3AED] text-white font-bold rounded-full hover:bg-purple-800 transition-colors shadow-sm text-lg">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="max-w-6xl flex flex-col gap-6">
            {orders.map((order) => {
              const conf = statusConfig[order.status] || statusConfig.cancelled
              return (
                <div key={order.id} className="border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition-colors shadow-sm bg-white">
                  {/* Order Header */}
                  <div className="bg-gray-50 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 gap-4">
                    <div className="flex items-center gap-8">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Placed</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">${Number(order.total_amount).toFixed(2)}</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">{order.item_count}</p>
                      </div>
                    </div>
                    <div className="flex flex-col md:items-end">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order #</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5 font-mono">{order.id.slice(0, 10).toUpperCase()}</p>
                    </div>
                  </div>
                  
                  {/* Order Body */}
                  <div className="px-6 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 ${conf.color}`}>
                        {conf.icon}
                        {conf.label}
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        {order.status === 'delivered' ? 'Your items have arrived safely.' : 'We are working on your items.'}
                      </span>
                    </div>
                    <Link href={`/account/orders/${order.id}`} className="shrink-0 px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm flex items-center gap-2">
                      View Order Details <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
