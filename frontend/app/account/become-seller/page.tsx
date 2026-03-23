'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/HeaderWrapper'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'
import { TrendingUp, Globe, Shield, Store, Check, Target } from 'lucide-react'

export default function BecomeSellerPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  
  const [storeForm, setStoreForm] = useState({ store_name: '', store_description: '' })
  const [registering, setRegistering] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) router.push('/')
  }, [user, router])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setRegistering(true)
    try {
      const { data } = await api.post('/users/become-seller', { 
        storeName: storeForm.store_name, 
        description: storeForm.store_description 
      })
      useAuthStore.getState().setUser(data.data) // Update role to seller in global state
      setSuccess(true)
      setTimeout(() => router.push('/seller'), 3000)
    } catch {}
    setRegistering(false)
  }

  if (!user) return null
  if (user.role === 'seller') {
    router.push('/seller')
    return null
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-[#111111] text-white py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
            <span className="text-[#7C3AED] font-bold tracking-wider uppercase text-sm mb-4 block">Seller Program</span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Reach Millions of Customers. <br />Grow Your Business.</h1>
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">Join our trusted marketplace and start selling your products to a global audience with powerful analytics and fulfillment tools.</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            
            {/* Features */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-10">Why sell on our platform?</h2>
              
              <div className="space-y-10">
                <div className="flex gap-5">
                  <div className="bg-[#F9F5FF] text-[#7C3AED] w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-[#E9D7FE] shadow-sm">
                    <Globe className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Global Audience</h3>
                    <p className="text-gray-600 leading-relaxed">Instantly reach millions of active shoppers across the globe without spending a dime on marketing.</p>
                  </div>
                </div>
                <div className="flex gap-5">
                  <div className="bg-[#F9F5FF] text-[#7C3AED] w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-[#E9D7FE] shadow-sm">
                    <TrendingUp className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Powerful Analytics</h3>
                    <p className="text-gray-600 leading-relaxed">Gain deep insights into your sales, customer demographics, and product performance with our real-time dashboard.</p>
                  </div>
                </div>
                <div className="flex gap-5">
                  <div className="bg-[#F9F5FF] text-[#7C3AED] w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-[#E9D7FE] shadow-sm">
                    <Shield className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Secure Payments</h3>
                    <p className="text-gray-600 leading-relaxed">Get paid fast and securely. We handle all fraud detection and payment processing so you can focus on building your brand.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Form */}
            <div className="bg-white border border-gray-200 rounded-3xl p-8 lg:p-10 shadow-xl shadow-gray-200/50">
              <div className="flex items-center gap-3 mb-8">
                <Store className="h-8 w-8 text-[#7C3AED]" />
                <h2 className="text-2xl font-bold text-gray-900">Register Your Store</h2>
              </div>
              
              {success ? (
                <div className="text-center py-10">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Store Created!</h3>
                  <p className="text-gray-600">Redirecting you to your new seller dashboard...</p>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-6">
                  <Input label="Store Name" placeholder="My Awesome Brand" value={storeForm.store_name} onChange={(e) => setStoreForm((f) => ({...f, store_name: e.target.value}))} required />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Store Description</label>
                    <textarea rows={4} placeholder="What kind of products do you sell? Tell your story..." required value={storeForm.store_description} onChange={(e) => setStoreForm((f) => ({...f, store_description: e.target.value}))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] resize-none shadow-sm" />
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mt-6">
                    <div className="flex items-start gap-3">
                      <Target className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-600">By creating a store, you agree to our <a href="#" className="font-bold text-[#7C3AED] hover:underline">Seller Terms of Service</a> and our fee structure (10% flat fee on commercial sales).</p>
                    </div>
                  </div>

                  <button type="submit" disabled={registering} className="w-full py-4 bg-[#7C3AED] hover:bg-purple-800 text-white font-bold rounded-xl disabled:opacity-50 transition-colors shadow-md shadow-purple-200 flex justify-center items-center gap-2 group text-lg mt-4">
                    {registering ? 'Processing...' : 'Launch Your Store'} <TrendingUp className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              )}
            </div>
            
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
