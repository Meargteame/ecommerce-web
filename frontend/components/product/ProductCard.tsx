'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Star, Heart } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { useState, useEffect } from 'react'
import api from '@/lib/api'

export interface Product {
  id: string
  name: string
  slug: string
  price?: number
  basePrice?: number
  base_price?: number
  averageRating?: number
  average_rating?: number
  reviewCount?: number
  review_count?: number
  images?: { image_url: string }[]
  image_url?: string // from list endpoint top-level
  category_name?: string
  categoryName?: string
  stock_quantity?: number
  stockQuantity?: number
}

function ImagePlaceholder() {
  return (
    <div className="w-full h-full bg-[#F9FAFB] flex items-center justify-center">
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10 text-gray-300">
        <rect x="4" y="10" width="40" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
        <circle cx="18" cy="22" r="5" stroke="currentColor" strokeWidth="2" />
        <path d="M4 34l10-10 8 8 6-6 16 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export default function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem)
  const user = useAuthStore((s) => s.user)
  const [adding, setAdding] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  // Initialize wishlist toggle based on local storage cache across sessions or optimistic UI
  // Real implementation for checking initial state would ideal require wishlist context, but we will optimistically check
  useEffect(() => {
    if (user) {
      api.get('/wishlists').then(({ data }) => {
        const wishlists = data.data || []
        const found = wishlists.find((w: any) => w.productId === product.id || w.product_id === product.id)
        if (found) setWishlisted(true)
      }).catch(() => {})
    }
  }, [user, product.id])

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    setAdding(true)
    try { await addItem(product.id, 1) } finally { setAdding(false) }
  }

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user) return // Should probably redirect to login
    
    setWishlistLoading(true)
    try {
      if (wishlisted) {
        await api.delete(`/wishlists/${product.id}`)
        setWishlisted(false)
      } else {
        await api.post('/wishlists', { productId: product.id })
        setWishlisted(true)
      }
    } catch {
       // revert on error
       setWishlisted(!wishlisted)
    } finally {
      setWishlistLoading(false)
    }
  }

  // Normalize fields — list endpoint returns camelCase + top-level image_url
  const price = product.price ?? product.basePrice ?? product.base_price ?? 0
  const basePrice = product.base_price ?? product.basePrice
  const imageUrl = product.image_url || product.images?.[0]?.image_url
  const rating = product.average_rating ?? product.averageRating
  const reviewCount = product.review_count ?? product.reviewCount
  const stockQty = product.stock_quantity ?? product.stockQuantity
  const categoryName = product.category_name ?? product.categoryName
  const discount = basePrice && basePrice > price ? Math.round((1 - price / basePrice) * 100) : null
  const outOfStock = stockQty === 0

  return (
    <Link href={'/products/' + product.slug}
      className="group bg-white rounded-[2rem] border border-gray-100 overflow-hidden hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 flex flex-col hover:-translate-y-2">
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {imageUrl ? (
          <Image src={imageUrl} alt={product.name} fill
            className={'object-cover transition-transform duration-700 group-hover:scale-110 ' + (outOfStock ? 'opacity-40 grayscale' : '')} />
        ) : (
          <ImagePlaceholder />
        )}
        
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {discount && (
            <span className="premium-gradient text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg shadow-primary/20">
              {discount}% OFF
            </span>
          )}
          {outOfStock && (
            <span className="bg-gray-900/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full">
              SOLD OUT
            </span>
          )}
        </div>

        <button
          onClick={toggleWishlist}
          disabled={wishlistLoading}
          className={`absolute top-3 right-3 w-9 h-9 glass rounded-full flex items-center justify-center transition-all duration-300 ${
            wishlisted ? 'bg-red-50 border-red-100 scale-110' : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
          }`}
        >
          <Heart className={`h-4 w-4 transition-colors ${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover:text-red-400'}`} />
        </button>
      </div>

      <div className="p-5 flex flex-col flex-1">
        {categoryName && (
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <p className="text-[10px] text-primary font-bold uppercase tracking-[0.15em]">{categoryName}</p>
          </div>
        )}
        
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-3 flex-1 leading-snug group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-gray-900 leading-none">${price.toFixed(2)}</span>
              {basePrice && basePrice > price && (
                <span className="text-xs text-gray-400 line-through font-medium">${basePrice.toFixed(2)}</span>
              )}
            </div>
            {rating != null && (
              <div className="flex items-center gap-1 mt-1.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-[10px] font-bold text-gray-600">{Number(rating).toFixed(1)}</span>
                <span className="text-[10px] text-gray-400 font-medium">({reviewCount || 0})</span>
              </div>
            )}
          </div>

          {!outOfStock && (
            <button
              onClick={handleAddToCart}
              disabled={adding}
              className="w-10 h-10 premium-gradient text-white rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}
