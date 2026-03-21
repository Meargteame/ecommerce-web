'use client'

import Link from 'next/link'
import { ArrowRight, TrendingUp, Shield, DollarSign } from 'lucide-react'

export default function SellGearBanner() {
  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl overflow-hidden bg-gray-900 text-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="p-10 lg:p-14 flex flex-col justify-center">
              <span className="inline-flex items-center gap-1.5 bg-white/10 text-gray-300 text-xs font-bold px-3 py-1.5 rounded-full w-fit mb-5">
                SELL ON SHOPHUB
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">Turn your items<br />into cash today</h2>
              <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                Join 50,000+ sellers on ShopHub. List anything — electronics, fashion, home goods — and reach millions of buyers.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { icon: <DollarSign className="h-4 w-4" />, label: 'Low fees', sub: 'Keep more profit' },
                  { icon: <TrendingUp className="h-4 w-4" />, label: 'Fast sales', sub: 'Avg. 3 days' },
                  { icon: <Shield className="h-4 w-4" />, label: 'Secure', sub: 'Seller protection' },
                ].map((f) => (
                  <div key={f.label} className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-gray-400 flex justify-center mb-1">{f.icon}</div>
                    <p className="text-xs font-semibold text-white">{f.label}</p>
                    <p className="text-[11px] text-gray-500">{f.sub}</p>
                  </div>
                ))}
              </div>
              <Link href="/sell" className="inline-flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-100 font-semibold px-6 py-3 rounded-xl transition-colors w-fit text-sm">
                Start Selling <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="hidden lg:flex items-center justify-center bg-white/5 p-14">
              <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                {[
                  { label: 'Total Sales', value: '$2.4M', sub: 'This month', color: 'bg-white/10 border-white/20' },
                  { label: 'Active Sellers', value: '50K+', sub: 'Worldwide', color: 'bg-[#7C3AED]/20 border-[#7C3AED]/30' },
                  { label: 'Avg. Sale Time', value: '3 days', sub: 'To first sale', color: 'bg-green-500/20 border-green-500/30' },
                  { label: 'Buyer Rating', value: '4.8★', sub: 'Avg. satisfaction', color: 'bg-amber-500/20 border-amber-500/30' },
                ].map((s) => (
                  <div key={s.label} className={`border rounded-2xl p-4 ${s.color}`}>
                    <p className="text-xl font-bold text-white">{s.value}</p>
                    <p className="text-xs font-semibold text-gray-300 mt-0.5">{s.label}</p>
                    <p className="text-[11px] text-gray-500">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
