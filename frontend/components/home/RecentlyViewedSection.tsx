'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, ArrowRight } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'

interface ViewedProduct {
  id: string
  name: string
  slug: string
  price: number
  base_price?: number
  image_url?: string
  category_name?: string
}

export default function RecentlyViewedSection() {
  const [items, setItems] = useState<ViewedProduct[]>([])
  const [adding, setAdding] = useState<string | null>(null)
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('recentlyViewedProducts')
      if (!raw) {
        setItems([])
        return
      }

      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setItems(parsed.slice(0, 8))
      } else {
        setItems([])
      }
    } catch {
      setItems([])
    }
  }, [])

  const handleAdd = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setAdding(id)
    try {
      await addItem(id, 1)
    } finally {
      setAdding(null)
    }
  }

  if (!items.length) return null

  return (
    <section className="max-w-[1920px] mx-auto px-6 lg:px-12 py-8">
      <div className="bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#111111]">Recently Viewed</h2>
          <Link href="/products" className="flex items-center gap-1 text-sm font-medium text-[#7C3AED] hover:underline">
            Continue shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/products/${item.slug}`}
              className="group min-w-[185px] max-w-[185px] bg-white border border-[#E5E7EB] overflow-hidden hover:border-[#111111] transition-colors flex flex-col"
            >
              <div className="relative aspect-square bg-[#F9FAFB]">
                {item.image_url ? (
                  <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">No image</div>
                )}
              </div>

              <div className="p-3 flex flex-col flex-1">
                {item.category_name && (
                  <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wide mb-1">{item.category_name}</p>
                )}
                <h3 className="text-xs font-medium text-[#111111] line-clamp-2 leading-snug mb-2">{item.name}</h3>

                <div className="flex items-baseline gap-1.5 mb-2.5 mt-auto">
                  <span className="text-sm font-bold text-[#111111]">${Number(item.price).toFixed(2)}</span>
                  {item.base_price && item.base_price > item.price && (
                    <span className="text-[11px] text-[#6B7280] line-through">${Number(item.base_price).toFixed(2)}</span>
                  )}
                </div>

                <button
                  onClick={(e) => handleAdd(e, item.id)}
                  disabled={adding === item.id}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#111111] hover:bg-[#7C3AED] disabled:opacity-60 text-white text-xs font-semibold transition-colors"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {adding === item.id ? 'Adding...' : 'Add'}
                </button>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
