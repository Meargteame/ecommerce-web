'use client'

import { CheckCircle } from 'lucide-react'

const soldProducts = [
  { name: 'Apple AirPods Pro (2nd Gen)', soldPrice: 199.99, timeAgo: '2 min ago' },
  { name: 'Vintage Leather Messenger Bag', soldPrice: 129.00, timeAgo: '5 min ago' },
  { name: 'Instant Pot Duo 7-in-1', soldPrice: 89.99, timeAgo: '8 min ago' },
  { name: 'Harry Potter Book Collection', soldPrice: 79.99, timeAgo: '12 min ago' },
  { name: 'Adjustable Dumbbell Set', soldPrice: 299.00, timeAgo: '15 min ago' },
  { name: 'Smart Watch with Heart Rate', soldPrice: 149.99, timeAgo: '18 min ago' },
]

export default function RecentlySoldSection() {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Recently Sold</h2>
            <p className="text-gray-500 text-sm mt-0.5">Items flying off the shelves right now</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {soldProducts.map((p) => (
            <div key={p.name} className="bg-white border border-gray-200 rounded-2xl overflow-hidden opacity-80">
              <div className="relative aspect-square bg-gray-100 flex items-center justify-center">
                <div className="w-full h-full bg-gray-200" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="bg-white/90 rounded-lg px-2 py-1 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-xs font-bold text-gray-800">SOLD</span>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold text-gray-700 line-clamp-2 leading-snug mb-1">{p.name}</p>
                <p className="text-sm font-bold text-gray-900">${p.soldPrice.toFixed(2)}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{p.timeAgo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
