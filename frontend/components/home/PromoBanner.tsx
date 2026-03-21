import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Flame, Sparkles, Gift } from 'lucide-react'

const banners = [
  {
    label: 'Mega Deal',
    title: 'Up to 60% Off Electronics',
    sub: 'Laptops, phones, audio and more',
    href: '/products?sale=true&category=electronics',
    image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=500&q=75',
    icon: Flame,
    layout: 'md:col-span-2 md:row-span-2 min-h-[260px] md:min-h-[340px]',
  },
  {
    label: 'New Season',
    title: 'Fashion Arrivals',
    sub: 'Latest trends from top sellers',
    href: '/products?sort=newest&category=fashion',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&q=75',
    icon: Sparkles,
    layout: 'md:col-span-2 min-h-[160px]',
  },
  {
    label: 'Home Deals',
    title: 'Refresh Your Space',
    sub: 'Furniture, decor & more',
    href: '/products?category=home-living',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=75',
    icon: Gift,
    layout: 'md:col-span-2 min-h-[160px]',
  },
]

export default function PromoBanner() {
  return (
    <section className="max-w-[1920px] mx-auto px-6 lg:px-12 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 h-[700px] md:h-[600px]">
        {banners.map((b) => (
          <Link key={b.title} href={b.href}
            className={`overflow-hidden relative group rounded-[2.5rem] shadow-xl shadow-gray-200/50 ${b.layout}`}>
            <Image src={b.image} alt={b.title} fill
              className="object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" />
            
            {/* Glassmorphism Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
            
            <div className="relative z-10 p-10 flex flex-col justify-between h-full">
              <div>
                <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] text-white px-4 py-2 rounded-full mb-6">
                  <b.icon className="h-3 w-3" /> {b.label}
                </span>
                <h3 className="text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight mb-4 group-hover:text-primary transition-colors duration-300">
                  {b.title}
                </h3>
                <p className="text-base text-gray-300 font-medium max-w-[80%]">{b.sub}</p>
              </div>
              
              <div className="flex items-center gap-3 text-white text-sm font-bold mt-8 group-hover:gap-5 transition-all duration-300">
                <span className="h-px w-8 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                Shop Now <ArrowRight className="h-5 w-5 text-primary" />
              </div>
            </div>

            {/* Shine Effect */}
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent z-20 pointer-events-none" />
          </Link>
        ))}
      </div>
    </section>
  )
}
