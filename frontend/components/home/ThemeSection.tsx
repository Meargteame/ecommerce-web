'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const categories = [
  {
    name: 'Electronics',
    description: 'Phones, Laptops & Gadgets',
    count: '12,400+ products',
    slug: 'electronics',
    bg: 'bg-blue-600',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-600',
    icon: '💻',
    items: ['Smartphones', 'Laptops', 'Headphones', 'Cameras'],
  },
  {
    name: 'Fashion',
    description: 'Clothing & Accessories',
    count: '34,000+ products',
    slug: 'fashion',
    bg: 'bg-pink-600',
    lightBg: 'bg-pink-50',
    textColor: 'text-pink-600',
    icon: '👗',
    items: ['Dresses', 'Sneakers', 'Bags', 'Watches'],
  },
  {
    name: 'Home & Living',
    description: 'Furniture & Decor',
    count: '8,900+ products',
    slug: 'home-living',
    bg: 'bg-emerald-600',
    lightBg: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    icon: '🏠',
    items: ['Furniture', 'Lighting', 'Bedding', 'Kitchen'],
  },
  {
    name: 'Sports',
    description: 'Fitness & Outdoor Gear',
    count: '5,600+ products',
    slug: 'sports',
    bg: 'bg-[#7C3AED]',
    lightBg: 'bg-purple-50',
    textColor: 'text-[#7C3AED]',
    icon: '⚽',
    items: ['Gym Equipment', 'Cycling', 'Running', 'Yoga'],
  },
  {
    name: 'Beauty',
    description: 'Skincare & Wellness',
    count: '7,200+ products',
    slug: 'beauty',
    bg: 'bg-rose-600',
    lightBg: 'bg-rose-50',
    textColor: 'text-rose-600',
    icon: '💄',
    items: ['Skincare', 'Makeup', 'Perfume', 'Hair Care'],
  },
  {
    name: 'Books & Media',
    description: 'Books, Music & Movies',
    count: '3,100+ products',
    slug: 'books',
    bg: 'bg-[#7C3AED]',
    lightBg: 'bg-purple-50',
    textColor: 'text-[#7C3AED]',
    icon: '📚',
    items: ['Fiction', 'Non-Fiction', 'Textbooks', 'Comics'],
  },
]

export default function ThemeSection() {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
            <p className="text-gray-500 text-sm mt-1">Find exactly what you're looking for</p>
          </div>
          <Link href="/products" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900">
            All Categories <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-200"
            >
              {/* Header */}
              <div className={`${cat.bg} px-5 py-4 flex items-center justify-between`}>
                <div>
                  <h3 className="text-white font-bold text-lg">{cat.name}</h3>
                  <p className="text-white/70 text-xs mt-0.5">{cat.count}</p>
                </div>
                <span className="text-4xl">{cat.icon}</span>
              </div>

              {/* Body */}
              <div className="p-4">
                <p className="text-sm text-gray-500 mb-3">{cat.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.items.map((item) => (
                    <span key={item} className={`text-xs font-medium px-2.5 py-1 rounded-full ${cat.lightBg} ${cat.textColor}`}>
                      {item}
                    </span>
                  ))}
                </div>
                <div className={`mt-4 flex items-center gap-1 text-sm font-semibold ${cat.textColor} group-hover:gap-2 transition-all`}>
                  Shop Now <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
