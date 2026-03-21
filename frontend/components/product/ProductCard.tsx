'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Star, Heart, Sparkles } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { useState, useEffect } from 'react'
import api from '@/lib/api'

import { useWishlistStore } from '@/store/wishlistStore'

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

// High-quality fallbacks for missing product images
const UNSPLASH_FALLBACKS = [
  'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&q=80', // Shoes
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', // Watch
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', // Headphones
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', // Nike
  'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80', // Sneakers
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80', // Glasses
  'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&q=80', // Shoe
  'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80', // Bag
]

function ImagePlaceholder({ name }: { name: string }) {
  // Use hash of name to pick a stable random image
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const fallback = UNSPLASH_FALLBACKS[hash % UNSPLASH_FALLBACKS.length]
  
  return (
    <div className="relative w-full h-full">
      <Image src={fallback} alt={name} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-70" />
    </div>
  )
}

export default function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem)
  const user = useAuthStore((s) => s.user)
  const { items: wishlistItems, toggleWishlist, fetchWishlist } = useWishlistStore()
  const [adding, setAdding] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  const isWishlisted = wishlistItems.some(item => item.productId === product.id)

  useEffect(() => {
    if (user && wishlistItems.length === 0) {
      fetchWishlist()
    }
  }, [user, fetchWishlist, wishlistItems.length])

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    setAdding(true)
    try { await addItem(product.id, 1) } finally { setAdding(false) }
  }

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user) {
      useWishlistStore.getState().showToast('Please sign in to save items', 'info')
      return
    }
    
    setWishlistLoading(true)
    await toggleWishlist(product.id, product.name)
    setWishlistLoading(false)
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
          <Image src={imageUrl} alt={product.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className={'object-cover transition-transform duration-700 group-hover:scale-110 ' + (outOfStock ? 'opacity-40 grayscale' : '')} />
        ) : (
          <ImagePlaceholder name={product.name} />
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
          onClick={handleToggleWishlist}
          disabled={wishlistLoading}
          className={`absolute top-3 right-3 w-9 h-9 glass rounded-full flex items-center justify-center transition-all duration-300 ${
            isWishlisted ? 'bg-red-50 border-red-100 scale-110' : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
          }`}
        >
          <Heart className={`h-4 w-4 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover:text-red-400'}`} />
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
