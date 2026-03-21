'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import api from '@/lib/api'
import ProductCard from '@/components/product/ProductCard'

function Skeleton() {
  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-50" />
      <div className="p-5 space-y-4">
        <div className="h-2 bg-gray-100 rounded-full w-1/3" />
        <div className="h-4 bg-gray-100 rounded-full w-full" />
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-100 rounded-lg w-1/2" />
          <div className="h-10 w-10 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export default function FeaturedProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/products', { params: { limit: 10, sortBy: 'newest' } })
      .then(({ data }) => {
        const list = data.data || []
        setProducts(list.map((p: any) => ({
          id: p.id, name: p.name, slug: p.slug, price: p.price,
          base_price: p.base_price, average_rating: p.average_rating,
          review_count: p.review_count, category_name: p.category_name,
          image_url: p.image_url || p.images?.[0]?.image_url,
        })))
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none mb-2">
            Featured <span className="text-gradient">Products</span>
          </h2>
          <p className="text-sm text-gray-500 font-medium">Handpicked premium products just for you</p>
        </div>
        <Link href="/products" className="text-sm font-bold text-primary hover:text-primary/80 transition-all flex items-center gap-1 group">
          Explore all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {loading
          ? Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} />)
          : products.length > 0
            ? products.map((p) => <ProductCard key={p.id} product={p as any} />)
            : (
              <div className="col-span-full glass rounded-[2.5rem] p-16 text-center">
                <p className="text-gray-500 font-medium mb-4">No products found in this collection.</p>
                <Link href="/sell" className="inline-flex py-3 px-8 premium-gradient text-white rounded-2xl font-bold text-sm">
                  Start Selling
                </Link>
              </div>
            )
        }
      </div>
    </section>
  )
}
