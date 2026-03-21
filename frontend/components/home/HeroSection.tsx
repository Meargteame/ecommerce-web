'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ShieldCheck, Truck, RotateCcw, Tag, ChevronLeft, ChevronRight } from 'lucide-react'

const slides = [
  {
    id: 1,
    badge: 'Flash Sale — Today Only',
    title: 'Up to 70% Off\nElectronics',
    sub: 'Headphones, laptops, cameras and more from top brands.',
    cta: { label: 'Shop Electronics', href: '/products?category=electronics&sale=true' },
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=900&q=80',
  },
  {
    id: 2,
    badge: 'New Season',
    title: 'Fresh Fashion\nArrivals',
    sub: 'Discover the latest trends from thousands of independent sellers.',
    cta: { label: 'Shop Fashion', href: '/products?category=fashion&sort=newest' },
    image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=900&q=80',
  },
  {
    id: 3,
    badge: 'Home & Living',
    title: 'Refresh Your\nSpace',
    sub: 'Furniture, decor, kitchen essentials — everything for your home.',
    cta: { label: 'Shop Home', href: '/products?category=home-living' },
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=80',
  },
]

const trust = [
  { icon: Truck, text: 'Free shipping over $50' },
  { icon: RotateCcw, text: '30-day free returns' },
  { icon: ShieldCheck, text: 'Buyer protection' },
  { icon: Tag, text: 'Best price guarantee' },
]

export default function HeroSection() {
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)

  const go = (idx: number) => {
    if (animating) return
    setAnimating(true)
    setCurrent((idx + slides.length) % slides.length)
    setTimeout(() => setAnimating(false), 500)
  }

  useEffect(() => {
    const t = setInterval(() => go(current + 1), 6000)
    return () => clearInterval(t)
  }, [current])

  const slide = slides[current]

  return (
    <section className="w-full pt-6 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main hero slider */}
          <div className="lg:col-span-3 rounded-[2rem] overflow-hidden relative min-h-[400px] sm:min-h-[500px] shadow-2xl shadow-primary/10 group">
            <div className={`absolute inset-0 transition-all duration-700 ease-out ${animating ? 'scale-110 opacity-0' : 'scale-100 opacity-100'}`}>
              <Image src={slide.image} alt={slide.title} fill className="object-cover transition-transform duration-[6000ms] group-hover:scale-110" priority />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            </div>

            <div className="relative z-10 h-full flex flex-col justify-center p-8 sm:p-16 min-h-[400px] sm:min-h-[500px]">
              <div className={animating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0 transition-all duration-500 delay-200'}>
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/20 backdrop-blur-md border border-primary/20 text-primary text-[11px] font-bold uppercase tracking-[0.2em] mb-6">
                  {slide.badge}
                </span>
                <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-[1.1] mb-6 whitespace-pre-line tracking-tight">
                  {slide.title}
                </h1>
                <p className="text-gray-300 text-lg mb-10 max-w-lg leading-relaxed font-medium">
                  {slide.sub}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href={slide.cta.href}
                    className="premium-gradient text-white px-8 py-4 rounded-2xl font-bold text-sm hover:shadow-xl hover:shadow-primary/40 transition-all hover:-translate-y-1 flex items-center gap-2">
                    {slide.cta.label} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/products"
                    className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-2xl font-bold text-sm hover:bg-white/20 transition-all flex items-center gap-2">
                    Browse All
                  </Link>
                </div>
              </div>

              {/* Slider Controls */}
              <div className="absolute bottom-8 right-8 flex items-center gap-4">
                <button onClick={() => go(current - 1)}
                  className="w-12 h-12 glass-dark rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex gap-2">
                  {slides.map((_, i) => (
                    <button key={i} onClick={() => go(i)}
                      className={`h-2 rounded-full transition-all duration-500 ${i === current ? 'w-8 premium-gradient' : 'w-2 bg-white/20 hover:bg-white/40'}`} />
                  ))}
                </div>
                <button onClick={() => go(current + 1)}
                  className="w-12 h-12 glass-dark rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Side Banners */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            <div className="flex-1 rounded-[2rem] overflow-hidden relative group">
              <Image src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80"
                alt="New arrivals" fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors" />
              <div className="relative z-10 p-8 h-full flex flex-col justify-end">
                <div>
                  <span className="text-[10px] font-bold text-primary-foreground/70 uppercase tracking-[0.2em]">New In</span>
                  <h3 className="text-2xl font-bold text-white mt-2">Just Dropped</h3>
                </div>
                <Link href="/products?sort=newest"
                  className="mt-4 text-sm font-bold text-white flex items-center gap-2 group/link">
                  Explore <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>

            <div className="flex-1 rounded-[2rem] overflow-hidden relative premium-gradient group">
              <Image src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80"
                alt="Sell on ShopHub" fill className="object-cover opacity-20 transition-transform duration-700 group-hover:scale-110" />
              <div className="relative z-10 p-8 h-full flex flex-col justify-end">
                <div>
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em]">Sell on ShopHub</span>
                  <h3 className="text-2xl font-bold text-white mt-2">Start Selling</h3>
                </div>
                <Link href="/sell"
                  className="mt-4 text-sm font-bold text-white flex items-center gap-2 group/link">
                  Open Store <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Trust Bar */}
        <div className="mt-12 glass rounded-3xl p-1 shadow-xl shadow-black/5">
          <div className="bg-white/50 rounded-[1.4rem] px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {trust.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-4 group cursor-default">
                  <div className="w-12 h-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0 group-hover:premium-gradient group-hover:text-white transition-all duration-300">
                    <Icon className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{text}</span>
                    <span className="text-[10px] text-gray-500 font-medium leading-none mt-1 uppercase tracking-wider">Verified Service</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
