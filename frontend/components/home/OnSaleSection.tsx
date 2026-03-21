'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Star, ArrowRight, Clock } from 'lucide-react'

const saleProducts = [
  {
    name: '4K Smart TV 55" HDR Dolby Vision',
    originalPrice: 799.99,
    salePrice: 649.99,
    discount: 19,
    rating: 4.7,
    reviews: 1243,
    category: 'Electronics',
    badge: 'Best Seller',
    badgeColor: 'bg-blue-100 text-blue-700',
    bg: 'bg-blue-50',
    href: '/products?category=electronics',
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20 text-blue-300">
        <rect x="8" y="16" width="64" height="40" rx="4" stroke="currentColor" strokeWidth="3" />
        <path d="M24 56l-4 8h40l-4-8" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <rect x="16" y="24" width="48" height="24" rx="2" fill="currentColor" opacity="0.15" />
        <circle cx="40" cy="36" r="8" stroke="currentColor" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    name: 'Designer Winter Coat — Premium Wool',
    originalPrice: 299.99,
    salePrice: 199.99,
    discount: 33,
    rating: 4.5,
    reviews: 387,
    category: 'Fashion',
    badge: 'Limited',
    badgeColor: 'bg-pink-100 text-pink-700',
    bg: 'bg-pink-50',
    href: '/products?category=fashion',
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20 text-pink-300">
        <path d="M28 12l-16 12v8h12v36h32V32h12v-8L52 12" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d="M28 12c0 6.627 5.373 12 12 12s12-5.373 12-12" stroke="currentColor" strokeWidth="3" />
      </svg>
    ),
  },
  {
    name: 'Robot Vacuum with Smart Mapping',
    originalPrice: 449.99,
    salePrice: 329.99,
    discount: 27,
    rating: 4.6,
    reviews: 892,
    category: 'Home & Living',
    badge: 'Top Rated',
    badgeColor: 'bg-green-100 text-green-700',
    bg: 'bg-green-50',
    href: '/products?category=home-living',
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20 text-green-300">
        <circle cx="40" cy="44" r="24" stroke="currentColor" strokeWidth="3" />
        <circle cx="40" cy="44" r="12" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="40" cy="44" r="4" fill="currentColor" opacity="0.4" />
        <path d="M40 20v-8M56 28l6-6M60 44h8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Professional Camera Kit + Lenses',
    originalPrice: 1299.99,
    salePrice: 999.99,
    discount: 23,
    rating: 4.8,
    reviews: 214,
    category: 'Electronics',
    badge: 'Pro Pick',
    badgeColor: 'bg-gray-100 text-gray-700',
    bg: 'bg-gray-50',
    href: '/products?category=electronics',
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20 text-gray-400">
        <rect x="8" y="24" width="64" height="40" rx="4" stroke="currentColor" strokeWidth="3" />
        <path d="M28 24l4-10h16l4 10" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="40" cy="44" r="12" stroke="currentColor" strokeWidth="3" />
        <circle cx="40" cy="44" r="5" fill="currentColor" opacity="0.3" />
        <circle cx="60" cy="32" r="3" fill="currentColor" opacity="0.4" />
      </svg>
    ),
  },
  {
    name: 'Luxury Bedding Set — Egyptian Cotton',
    originalPrice: 249.99,
    salePrice: 179.99,
    discount: 28,
    rating: 4.4,
    reviews: 631,
    category: 'Home & Living',
    badge: 'Popular',
    badgeColor: 'bg-amber-100 text-amber-700',
    bg: 'bg-amber-50',
    href: '/products?category=home-living',
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20 text-amber-300">
        <rect x="8" y="36" width="64" height="28" rx="4" stroke="currentColor" strokeWidth="3" />
        <path d="M8 44h64" stroke="currentColor" strokeWidth="2.5" />
        <rect x="16" y="20" width="20" height="16" rx="8" stroke="currentColor" strokeWidth="3" />
        <rect x="44" y="20" width="20" height="16" rx="8" stroke="currentColor" strokeWidth="3" />
      </svg>
    ),
  },
  {
    name: 'Mountain Bike — 21 Speed Aluminum',
    originalPrice: 599.99,
    salePrice: 449.99,
    discount: 25,
    rating: 4.5,
    reviews: 178,
    category: 'Sports',
    badge: 'New',
    badgeColor: 'bg-purple-50 text-[#7C3AED]',
    bg: 'bg-gray-50',
    href: '/products?category=sports',
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20 text-gray-400">
        <circle cx="20" cy="52" r="14" stroke="currentColor" strokeWidth="3" />
        <circle cx="60" cy="52" r="14" stroke="currentColor" strokeWidth="3" />
        <path d="M20 52l16-24h8l8 24" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d="M44 28l8 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M36 20h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
]

function getDealDeadline() {
  const deadline = new Date()
  deadline.setHours(23, 59, 59, 999)

  if (deadline.getTime() <= Date.now()) {
    deadline.setDate(deadline.getDate() + 1)
  }

  return deadline
}

function getTimeLeft(target: Date) {
  const totalSeconds = Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { totalSeconds, hours, minutes, seconds }
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export default function OnSaleSection() {
  const [dealDeadline, setDealDeadline] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState({ totalSeconds: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    setDealDeadline(getDealDeadline())
  }, [])

  useEffect(() => {
    if (!dealDeadline) return

    const tick = () => {
      const nextTime = getTimeLeft(dealDeadline)

      if (nextTime.totalSeconds <= 0) {
        const nextDeadline = getDealDeadline()
        setDealDeadline(nextDeadline)
        setTimeLeft(getTimeLeft(nextDeadline))
        return
      }

      setTimeLeft(nextTime)
    }

    tick()
    const timer = setInterval(tick, 1000)

    return () => clearInterval(timer)
  }, [dealDeadline])

  return (
    <section className="py-20 bg-gray-50/50 relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-red-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-primary/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm shadow-red-200">
                <Clock className="h-3 w-3" /> Limited Time Deals
              </span>
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-none mb-4">
              On Sale <span className="text-red-500">Flash Deals</span>
            </h2>
            <p className="text-gray-500 font-medium max-w-lg">Exclusive price drops on our most popular items. Grab them before the clock runs out.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              {[
                { label: 'Hours', value: pad(timeLeft.hours) },
                { label: 'Mins', value: pad(timeLeft.minutes) },
                { label: 'Secs', value: pad(timeLeft.seconds) },
              ].map((item) => (
                <div key={item.label} className="glass border-red-100 rounded-2xl px-4 py-3 min-w-[70px] text-center shadow-sm">
                  <p className="text-2xl font-black text-red-600 leading-none tracking-tighter">{item.value}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{item.label}</p>
                </div>
              ))}
            </div>

            <Link href="/products?sale=true" className="group flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-red-600 transition-all ml-2">
              Explore All <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {saleProducts.map((product) => (
            <Link
              key={product.name}
              href={product.href}
              className="group bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 flex flex-col hover:-translate-y-2"
            >
              <div className={`relative aspect-[4/3] ${product.bg} flex items-center justify-center overflow-hidden`}>
                <div className="group-hover:scale-110 transition-transform duration-700 ease-out">
                  {product.icon}
                </div>
                
                <div className="absolute top-6 left-6 bg-red-600 text-white text-[11px] font-black px-3 py-1.5 rounded-xl shadow-lg shadow-red-200 uppercase tracking-tighter">
                  -{product.discount}% OFF
                </div>
                
                <div className={`absolute top-6 right-6 text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider backdrop-blur-md shadow-sm border border-white/20 ${product.badgeColor}`}>
                  {product.badge}
                </div>

                <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <div className="p-4">
                    <button className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-2xl transition-all shadow-xl shadow-black/20">
                      <ShoppingCart className="h-4 w-4" /> Quick Shop
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-8 flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{product.category}</span>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-3 w-3 ${s <= Math.round(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gray-400">{product.rating} <span className="font-medium">({product.reviews.toLocaleString()})</span></span>
                </div>

                <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-50">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-black text-gray-900 tracking-tighter">${product.salePrice.toFixed(2)}</span>
                    <span className="text-sm font-medium text-gray-300 line-through tracking-tight">${product.originalPrice.toFixed(2)}</span>
                  </div>
                  <div className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-tighter">
                    Save {Math.round(product.originalPrice - product.salePrice)}$
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
