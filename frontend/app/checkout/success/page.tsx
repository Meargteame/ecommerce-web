'use client'


export const dynamic = 'force-dynamic';
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/HeaderWrapper'
import Footer from '@/components/layout/Footer'
import api from '@/lib/api'
import { CheckCircle2, Package, ShoppingBag, ArrowRight, Star, ExternalLink, Download } from 'lucide-react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('id')
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) {
      api.get(`/orders/${orderId}`)
        .then(res => setOrder(res.data.data))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [orderId])

  return (
    <main className="flex-grow w-full max-w-4xl mx-auto px-6 py-10 lg:py-14">
      {/* Premium Visual Confirmation */}
      <div className="text-center relative mb-8">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-[80px] animate-pulse" />
         
        <div className="relative inline-flex items-center justify-center w-20 h-20 bg-white rounded-[2rem] shadow-2xl shadow-primary/20 mb-6 group">
           <div className="absolute inset-x-0 inset-y-0 premium-gradient opacity-0 group-hover:opacity-10 transition-opacity rounded-[2rem]" />
           <CheckCircle2 className="w-10 h-10 text-emerald-500 stroke-[1.5] animate-in zoom-in duration-500" />
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2">Transaction Authorized</p>
        <h1 className="text-4xl lg:text-5xl font-black text-gray-950 tracking-tighter mb-3">Order Manifested.</h1>
        <p className="text-base text-gray-400 font-medium max-w-lg mx-auto leading-relaxed">Your selection is now being prepared in our global fulfillment network.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Details Card */}
        <div className="bg-white rounded-[2rem] p-6 shadow-2xl shadow-gray-200/50 border border-gray-50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Entry UID</p>
                  <p className="text-sm font-black text-gray-950 uppercase">#{orderId?.slice(0, 12)}</p>
               </div>
               <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-gray-300" />
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex justify-between items-center group">
                  <p className="text-xs font-bold text-gray-400 group-hover:text-gray-950 transition-colors">Manifest Status</p>
                  <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">Processing</span>
               </div>
               <div className="flex justify-between items-center group">
                  <p className="text-xs font-bold text-gray-400 group-hover:text-gray-950 transition-colors">Digital Receipt</p>
                  <button className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
                     <Download className="h-3 w-3" /> Export PDF
                  </button>
               </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-50">
             <Link href="/account/orders" className="w-full flex items-center justify-center gap-3 py-4 bg-gray-950 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10">
                Tracking Center <ExternalLink className="h-3 w-3" />
             </Link>
          </div>
        </div>

        {/* Community & Rewards */}
        <div className="bg-gray-950 rounded-[2rem] p-6 text-white relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 transition-transform group-hover:scale-125 duration-700">
             <Star className="w-32 h-32" />
          </div>
          
          <div>
            <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2">The Inner Circle</h3>
            <p className="text-gray-400 text-sm font-medium mb-4 leading-relaxed">You've just earned <span className="text-primary font-black">250 Hub Points</span>. Use them to unlock exclusive previews and priority shipping.</p>
            
            <div className="space-y-4">
               {['Early Access to Drops', 'Zero-Fee Global Shipping', 'VIP Concierge'].map(perk => (
                 <div key={perk} className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{perk}</p>
                 </div>
               ))}
            </div>
          </div>

          <div className="mt-6">
             <Link href="/products" className="group flex items-center gap-4 text-xs font-black uppercase tracking-widest text-white">
                Continue Exploration <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-2 transition-transform" />
             </Link>
          </div>
        </div>
      </div>

      {/* Trust Signal Footer */}
      <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-14 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700 cursor-crosshair">
         <div className="flex items-center gap-3">
            <ShoppingBag className="h-6 w-6" />
            <p className="text-[10px] font-black uppercase tracking-widest">Global Marketplace</p>
         </div>
         <div className="flex items-center gap-3 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-950">Verified Purchase</p>
         </div>
         <div className="flex items-center gap-3">
            <Package className="h-6 w-6" />
            <p className="text-[10px] font-black uppercase tracking-widest">Premium Packing</p>
         </div>
      </div>
    </main>
  )
}

export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50/20 flex flex-col">
      <Header />
      <Suspense fallback={
        <div className="flex-grow flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <SuccessContent />
      </Suspense>
      <Footer />
    </div>
  )
}
