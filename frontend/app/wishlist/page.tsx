'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/HeaderWrapper'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import api from '@/lib/api'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'

interface WishlistItem {
  id: string
  productId: string
  product: { name: string; slug: string; basePrice: number; imageUrl?: string; averageRating?: number }
}

export default function WishlistPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const addItem = useCartStore((s) => s.addItem)
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    api.get('/wishlists')
      .then(({ data }) => setItems(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, router])

  const removeItem = async (productId: string) => {
    try {
      await api.delete(`/wishlists/${productId}`)
      setItems((prev) => prev.filter((i) => i.productId !== productId))
    } catch {}
  }

  const handleAddToCart = async (item: WishlistItem) => {
    setAdding(item.id)
    try { await addItem(item.productId, 1) } finally { setAdding(null) }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-gray-100 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Your Wishlist</h1>
            <p className="text-sm text-gray-500 mt-2">Private list of items you have saved for later.</p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-[#7C3AED] hover:text-purple-800 transition-colors">
            Continue Shopping →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[1,2,3,4,5].map((i) => <div key={i} className="h-80 bg-gray-50 rounded-2xl border border-gray-100 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-32">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-10 w-10 text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 max-w-sm mx-auto text-lg mb-8">Save items you love here and they'll be ready when you want to check out.</p>
            <Link href="/products" className="px-8 py-4 bg-[#7C3AED] text-white font-bold rounded-full hover:bg-purple-800 transition-colors shadow-sm text-lg">
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl overflow-hidden group border border-gray-200 hover:border-gray-300 transition-colors shadow-sm flex flex-col">
                <Link href={`/products/${item.product.slug}`} className="relative block aspect-[4/5] bg-gray-100 overflow-hidden">
                  {item.product.imageUrl ? (
                    <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-gray-50 flex items-center justify-center text-4xl">📦</div>
                  )}
                  <button onClick={(e) => { e.preventDefault(); removeItem(item.productId) }} className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 hover:text-red-600 hover:bg-white transition-colors shadow-sm z-10 opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Link>
                <div className="p-4 flex flex-col flex-1">
                  <Link href={`/products/${item.product.slug}`} className="font-bold text-gray-900 hover:text-[#7C3AED] line-clamp-2 text-sm mb-1">{item.product.name}</Link>
                  <p className="font-bold text-gray-900 text-lg mb-4 mt-auto">${Number(item.product.basePrice).toFixed(2)}</p>
                  
                  <button onClick={() => handleAddToCart(item)} disabled={adding === item.id}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#111111] hover:bg-black disabled:bg-gray-300 text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
                    <ShoppingCart className="h-4 w-4" />
                    {adding === item.id ? 'Adding...' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
