'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import { useAuthStore } from '@/store/authStore'
import { CreditCard, Plus } from 'lucide-react'

export default function BillingPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) router.push('/')
  }, [user, router])

  if (!user) return null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-gray-100 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Payment Methods</h1>
            <p className="text-sm text-gray-500 mt-2">Manage your saved credit cards, bank accounts, and billing addresses.</p>
          </div>
          <button className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-[#111111] hover:bg-black text-white text-sm font-bold rounded-lg transition-colors shadow-sm opacity-50 cursor-not-allowed" title="Coming soon">
            <Plus className="h-4 w-4" /> Add Payment Method
          </button>
        </div>

        <div className="text-center py-32 max-w-3xl mx-auto">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="h-10 w-10 text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No payment methods saved</h2>
          <p className="text-gray-500 text-lg mb-8">You haven't saved any payment methods yet. When you check out, you can choose to save your payment information for a faster experience next time.</p>
          <div className="px-6 py-4 bg-blue-50 text-blue-800 text-sm font-medium rounded-xl border border-blue-100 text-left">
            <strong>Note:</strong> We do not store your full credit card number. All transactions are securely processed by Stripe.
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
