'use client'

import Link from 'next/link'
import { ArrowRight, Search, Sliders, Star } from 'lucide-react'

const quickLinks = [
  { label: 'Under $25', href: '/products?max_price=25', color: 'bg-green-50 text-green-700 border-green-200' },
  { label: 'Top Rated', href: '/products?sort=rating', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'New Arrivals', href: '/products?sort=newest', color: 'bg-purple-50 text-[#7C3AED] border-purple-200' },
  { label: 'On Sale', href: '/products?sale=true', color: 'bg-red-50 text-red-700 border-red-200' },
]

export default function PCFinder() {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left */}
            <div className="p-10 lg:p-12 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full w-fit mb-5">
                <Search className="h-3.5 w-3.5" /> SMART SEARCH
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">Find exactly what<br />you're looking for</h2>
              <p className="text-gray-500 text-sm mb-7 leading-relaxed">
                Browse by category, filter by price, or search across 2 million+ products from verified sellers worldwide.
              </p>
              <div className="flex flex-wrap gap-2 mb-7">
                {quickLinks.map((l) => (
                  <Link key={l.label} href={l.href} className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors hover:opacity-80 ${l.color}`}>
                    {l.label}
                  </Link>
                ))}
              </div>
              <Link href="/products" className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-6 py-3 rounded-xl transition-colors w-fit text-sm">
                Browse All Products <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Right — visual stats */}
            <div className="hidden lg:flex items-center justify-center p-12">
              <div className="space-y-3 w-full max-w-xs">
                {[
                  { icon: <Search className="h-4 w-4 text-gray-600" />, label: '2M+ Products', sub: 'Across all categories', bg: 'bg-white' },
                  { icon: <Sliders className="h-4 w-4" style={{color:'#7C3AED'}} />, label: 'Advanced Filters', sub: 'Price, rating, category & more', bg: 'bg-white' },
                  { icon: <Star className="h-4 w-4 text-amber-500" />, label: 'Verified Reviews', sub: 'Real buyers, honest ratings', bg: 'bg-white' },
                ].map((item) => (
                  <div key={item.label} className={`${item.bg} rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4 shadow-sm`}>
                    <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">{item.icon}</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.sub}</p>
                    </div>
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
