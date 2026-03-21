'use client'

import Link from 'next/link'
import { ArrowRight, Zap, Sparkles, TrendingUp } from 'lucide-react'

const trendingItems = [
  { label: 'Wireless Earbuds', price: '$29.99', badge: '#1', href: '/products?category=electronics' },
  { label: 'Running Shoes', price: '$59.99', badge: 'Hot', href: '/products?category=sports' },
  { label: 'Smart Watch', price: '$89.99', badge: 'New', href: '/products?category=electronics' },
  { label: 'Sunglasses', price: '$24.99', badge: 'Sale', href: '/products?category=fashion' },
]

const newArrivalCategories = [
  { label: 'Electronics', sub: '1,200+ items', href: '/products?category=electronics&sort=newest', color: 'border-white/20 bg-white/10' },
  { label: 'Fashion', sub: '3,400+ items', href: '/products?category=fashion&sort=newest', color: 'border-white/20 bg-white/10' },
  { label: 'Home', sub: '890+ items', href: '/products?category=home-living&sort=newest', color: 'border-white/20 bg-white/10' },
  { label: 'Sports', sub: '560+ items', href: '/products?category=sports&sort=newest', color: 'border-white/20 bg-white/10' },
]

const hotDeals = [
  { label: 'Laptops', off: '30% OFF', color: 'bg-purple-50 text-[#7C3AED]', href: '/products?category=electronics' },
  { label: 'T-Shirts', off: '50% OFF', color: 'bg-pink-100 text-pink-700', href: '/products?category=fashion' },
  { label: 'Books', off: '25% OFF', color: 'bg-green-100 text-green-700', href: '/products?category=books' },
  { label: 'Home Decor', off: '40% OFF', color: 'bg-amber-100 text-amber-700', href: '/products?category=home-living' },
]

export default function FeaturedSections() {
  return (
    <section className="py-10 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Trending Now */}
          <div className="bg-gray-900 rounded-2xl p-6 text-white flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-bold">Trending Now</h3>
            </div>
            <p className="text-gray-400 text-sm mb-5">Most popular this week</p>
            <div className="space-y-2.5 flex-1">
              {trendingItems.map((item) => (
                <Link key={item.label} href={item.href} className="flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2.5 transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold bg-white/20 px-1.5 py-0.5 rounded-md">{item.badge}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">{item.price}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
            <Link href="/products?sort=newest" className="mt-5 flex items-center justify-center gap-2 py-2.5 bg-white text-gray-900 font-semibold text-sm rounded-xl hover:bg-gray-100 transition-colors">
              View All Trending <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* New Arrivals */}
          <div className="bg-gray-900 rounded-2xl p-6 text-white flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-yellow-400" />
              <h3 className="text-lg font-bold">New Arrivals</h3>
            </div>
            <p className="text-gray-400 text-sm mb-5">Fresh products added daily</p>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {newArrivalCategories.map((c) => (
                <Link key={c.label} href={c.href}
                  className={`border rounded-xl p-3 flex flex-col justify-between hover:brightness-110 transition-all ${c.color}`}>
                  <span className="text-sm font-semibold">{c.label}</span>
                  <span className="text-xs text-gray-400 mt-1">{c.sub}</span>
                </Link>
              ))}
            </div>
            <Link href="/products?sort=newest" className="mt-5 flex items-center justify-center gap-2 py-2.5 bg-white text-gray-900 font-semibold text-sm rounded-xl hover:bg-gray-100 transition-colors">
              Explore New Items <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Hot Deals */}
          <div className="bg-red-600 rounded-2xl p-6 text-white flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-5 w-5 text-yellow-300" />
              <h3 className="text-lg font-bold">Hot Deals</h3>
            </div>
            <p className="text-red-100 text-sm mb-5">Limited time — grab them fast</p>
            <div className="grid grid-cols-2 gap-3 flex-1">
              {hotDeals.map((d) => (
                <Link key={d.label} href={d.href}
                  className="bg-white rounded-xl p-3 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform gap-1.5">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${d.color}`}>{d.off}</span>
                  <span className="text-sm font-semibold text-gray-800">{d.label}</span>
                </Link>
              ))}
            </div>
            <Link href="/products?sale=true" className="mt-5 flex items-center justify-center gap-2 py-2.5 bg-white text-red-600 font-semibold text-sm rounded-xl hover:bg-red-50 transition-colors">
              All Deals <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  )
}
