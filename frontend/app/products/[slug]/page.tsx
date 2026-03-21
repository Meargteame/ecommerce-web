import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import { useCartStore } from '@/store/cartStore'
import api from '@/lib/api'
import ReviewForm from '@/components/product/ReviewForm'
import ProductGrid from '@/components/product/ProductGrid'
import { useAuthStore } from '@/store/authStore'
import { Star, ShoppingCart, Heart, Truck, Shield, RotateCcw, ChevronRight, Share2, Check } from 'lucide-react'

interface ProductDetail {
  id: string
  name: string
  slug: string
  description: string
  price?: number
  basePrice?: number
  base_price?: number
  stock_quantity?: number
  stockQuantity?: number
  average_rating?: number
  averageRating?: number
  review_count?: number
  reviewCount?: number
  category_id?: string
  categoryId?: string
  category_name?: string
  categoryName?: string
  images?: { imageUrl?: string; image_url?: string; isPrimary?: boolean; is_primary?: boolean }[]
  variants?: { id: string; variant_name?: string; variantName?: string; price_adjustment?: number; priceAdjustment?: number; stock_quantity?: number; stockQuantity?: number; attributes: Record<string, string> }[]
  reviews?: { id: string; rating: number; title: string; body: string; comment?: string; user_name?: string; created_at?: string }[]
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingRelated, setLoadingRelated] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>()
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [shared, setShared] = useState(false)
  
  const addItem = useCartStore((s) => s.addItem)
  const user = useAuthStore((s) => s.user)

  const fetchRelated = useCallback(async (categoryId: string, currentId: string) => {
    setLoadingRelated(true)
    try {
      const { data } = await api.get('/products', { 
        params: { category_id: categoryId, limit: 4 } 
      })
      const filtered = (data.data?.products || []).filter((p: any) => p.id !== currentId)
      setRelatedProducts(filtered)
    } finally {
      setLoadingRelated(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    api.get(`/products/by-slug/${slug}`)
      .then(({ data }) => {
        const prod = data.data
        setProduct(prod)
        if (prod.category_id || prod.categoryId) {
          fetchRelated(prod.category_id || prod.categoryId, prod.id)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    if (user) {
      api.get('/wishlists').then(({ data }) => {
        const wishlists = data.data || [];
        const found = wishlists.find((w: any) => w.product?.slug === slug || w.productId === product?.id || w.product_id === product?.id);
        if (found) setWishlisted(true);
      }).catch(() => {})
    }
  }, [slug, user, product?.id, fetchRelated])

  const toggleWishlist = async () => {
    if (!product || !user) return 
    try {
      if (wishlisted) {
        await api.delete(`/wishlists/${product.id}`)
        setWishlisted(false)
      } else {
        await api.post('/wishlists', { productId: product.id })
        setWishlisted(true)
      }
    } catch (err) { console.error(err) }
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  if (loading) return (
    <div className="min-h-screen bg-white">
      <Header /><CartDrawer />
      <div className="max-w-7xl mx-auto px-4 py-32 flex flex-col items-center justify-center text-gray-400">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold text-gray-900">Loading experience...</p>
      </div>
      <Footer />
    </div>
  )

  if (!product) return (
    <div className="min-h-screen bg-white">
      <Header /><CartDrawer />
      <div className="max-w-7xl mx-auto px-4 py-32 text-center">
        <h2 className="text-3xl font-black text-gray-900 mb-4">Product Not Found</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">We couldn't find the product you're looking for. It might have been removed or the link is incorrect.</p>
        <Link href="/products" className="premium-gradient px-8 py-4 text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform inline-block">Browse All Products</Link>
      </div>
      <Footer />
    </div>
  )

  const price = product.price ?? product.basePrice ?? product.base_price ?? 0
  const basePrice = product.base_price ?? product.basePrice
  const stockQty = product.stock_quantity ?? product.stockQuantity ?? 0
  const avgRating = product.average_rating ?? product.averageRating
  const reviewCount = product.review_count ?? product.reviewCount
  const catName = product.category_name ?? product.categoryName

  const images = product.images || []
  const currentImage = images[selectedImage]?.image_url ?? images[selectedImage]?.imageUrl
  const discount = basePrice && basePrice > price ? Math.round((1 - price / basePrice) * 100) : null

  const handleAddToCart = async () => {
    setAdding(true)
    try { await addItem(product.id, quantity, selectedVariant) }
    finally { setAdding(false) }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-10 overflow-x-auto whitespace-nowrap pb-2 scrollbar-hide">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/products" className="hover:text-primary transition-colors">Products</Link>
          {catName && <>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/products?category=${catName}`} className="hover:text-primary transition-colors">{catName}</Link>
          </>}
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900 truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Gallery Sidebar for desktop / Main image */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-1 hidden md:flex flex-col gap-3">
              {images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)}
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 ${i === selectedImage ? 'border-primary shadow-lg shadow-primary/10' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                  <Image src={(img.image_url ?? img.imageUrl)!} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
            
            <div className="md:col-span-5 relative aspect-square rounded-[2.5rem] overflow-hidden bg-gray-50 border border-gray-100 group shadow-2xl shadow-gray-100">
              {currentImage ? (
                <Image src={currentImage} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" priority />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">📦</div>
              )}
              {discount && (
                <div className="absolute top-6 left-6 premium-gradient text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg">
                  -{discount}% OFF
                </div>
              )}
              
              {/* Mobile indicators */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 md:hidden">
                {images.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === selectedImage ? 'w-6 bg-primary' : 'w-2 bg-white/50'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Product Data */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {catName && <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">{catName}</span>}
                <button onClick={handleShare} className={`flex items-center gap-2 transition-all duration-300 ${shared ? 'text-green-500' : 'text-gray-400 hover:text-primary'}`}>
                  {shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                  <span className="text-[10px] font-black uppercase tracking-widest">{shared ? 'Copied!' : 'Share'}</span>
                </button>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-black text-gray-950 leading-tight tracking-tighter">{product.name}</h1>

              <div className="flex items-center gap-6">
                {avgRating != null && (
                  <div className="flex items-center gap-2">
                    <div className="flex bg-yellow-400/10 px-2 py-1 rounded-lg">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-black text-yellow-700 ml-1.5">{Number(avgRating).toFixed(1)}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{reviewCount} reviews</span>
                  </div>
                )}
                <div className="h-4 w-px bg-gray-100" />
                <div className="flex items-center gap-2 group cursor-pointer">
                  <Heart className={`h-4 w-4 transition-colors ${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-300 group-hover:text-red-400'}`} />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-gray-900 transition-colors">Wishlist</span>
                </div>
              </div>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-black text-gray-950 tracking-tighter">${price.toFixed(2)}</span>
              {basePrice && basePrice > price && (
                <span className="text-xl text-gray-300 font-bold line-through tracking-tighter">${basePrice.toFixed(2)}</span>
              )}
            </div>

            <p className="text-base text-gray-500 leading-relaxed font-medium">{product.description}</p>

            {/* Selection Section */}
            <div className="space-y-6 pt-4">
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">Select Option</p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => (
                      <button key={v.id} onClick={() => setSelectedVariant(v.id)}
                        className={`px-5 py-3 rounded-2xl border-2 text-sm font-bold transition-all duration-300 ${selectedVariant === v.id ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5' : 'border-gray-100 text-gray-500 hover:border-gray-300'}`}>
                        {v.variant_name ?? v.variantName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Quantity</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-gray-50 rounded-2xl p-1 border border-gray-100">
                    <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center font-bold text-xl hover:text-primary transition-colors">−</button>
                    <span className="w-12 text-center text-sm font-black">{quantity}</span>
                    <button onClick={() => setQuantity((q) => q + 1)} className="w-10 h-10 flex items-center justify-center font-bold text-xl hover:text-primary transition-colors">+</button>
                  </div>
                  
                  {/* Stock Status with Urgency */}
                  <div className="flex-1">
                    {stockQty > 0 ? (
                      stockQty <= 10 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-xs font-black text-red-500 uppercase tracking-widest">Only {stockQty} Left in Stock!</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-xs font-black text-green-600 uppercase tracking-widest">In Stock & Ready to Ship</span>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Out of Stock</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={handleAddToCart} disabled={adding || stockQty === 0}
                  className={`flex-[3] flex items-center justify-center gap-3 py-5 text-white font-black uppercase tracking-[0.1em] rounded-2xl transition-all duration-300 shadow-xl ${adding || stockQty === 0 ? 'bg-gray-200 cursor-not-allowed shadow-none' : 'premium-gradient shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]'}`}>
                  <ShoppingCart className="h-5 w-5" />
                  {adding ? 'Processing...' : stockQty === 0 ? 'Out of Stock' : 'Add to Bag'}
                </button>
                <button onClick={toggleWishlist}
                  className={`flex-1 flex items-center justify-center rounded-2xl border-2 transition-all duration-300 ${wishlisted ? 'border-red-500 bg-red-50 text-red-500' : 'border-gray-100 text-gray-400 hover:border-red-200 hover:text-red-400 hover:bg-red-50/50'}`}>
                  <Heart className={`h-6 w-6 ${wishlisted ? 'fill-red-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Confidence Badges */}
            <div className="grid grid-cols-3 gap-3 pt-8 border-t border-gray-100">
              {[
                { icon: <Truck className="h-5 w-5" />, label: 'Fast Delivery' },
                { icon: <Shield className="h-5 w-5" />, label: 'Secure Payment' },
                { icon: <RotateCcw className="h-5 w-5" />, label: 'Easy Returns' },
              ].map((b) => (
                <div key={b.label} className="flex flex-col items-center text-center gap-2 p-4 bg-gray-50/50 rounded-2xl border border-gray-50 group hover:border-primary/20 transition-colors">
                  <span className="text-primary group-hover:scale-110 transition-transform">{b.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Content Tabs/Sections */}
        <div className="mt-24 space-y-24">
          {/* Reviews Section */}
          <section className="bg-gray-50 rounded-[3rem] p-8 md:p-16 border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-4">Customer Experience</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-black mr-1">{Number(avgRating || 0).toFixed(1)}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase">Rating</span>
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Based on {reviewCount} real reviews</span>
                </div>
              </div>
              {!user && (
                <Link href="/auth/login" className="premium-gradient px-8 py-4 text-white font-bold rounded-2xl text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all">Sign In to Review</Link>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-8 space-y-6">
                {product.reviews && product.reviews.length > 0 ? (
                  <div className="grid gap-6">
                    {product.reviews.map((r) => (
                      <div key={r.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary uppercase text-xs">
                            {r.user_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 leading-none mb-1">{r.user_name || 'Verified Buyer'}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Purchased on {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'recently'}</p>
                          </div>
                          <div className="ml-auto flex">
                            {[1,2,3,4,5].map((s) => (
                              <Star key={s} className={`h-3 w-3 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                        <h4 className="font-bold text-gray-950 mb-2 leading-tight">{r.title}</h4>
                        <p className="text-sm text-gray-500 leading-relaxed font-semibold">{r.body}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-64 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-8">
                    <p className="text-gray-400 font-bold mb-2 uppercase tracking-widest">No review yet</p>
                    <p className="text-sm text-gray-400">Share your thoughts with the community!</p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4">
                {user && (
                  <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl sticky top-24">
                    <h3 className="font-black text-xl text-gray-950 mb-6 tracking-tight">Write a Review</h3>
                    <ReviewForm
                      productId={product.id}
                      onSuccess={(review) => setProduct((p) => p ? { ...p, reviews: [...(p.reviews || []), review] } : p)}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-3xl font-black text-gray-950 tracking-tighter mb-2">You May Also Like</h2>
                  <p className="text-xs font-black uppercase tracking-widest text-primary">Discover more from {catName}</p>
                </div>
                <Link href={`/products?category=${catName}`} className="text-sm font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors flex items-center gap-2">
                  View Category <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <ProductGrid products={relatedProducts} loading={loadingRelated} />
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
