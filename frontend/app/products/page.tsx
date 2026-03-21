'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ProductGrid from '@/components/product/ProductGrid'
import CartDrawer from '@/components/cart/CartDrawer'
import { Product } from '@/components/product/ProductCard'
import api from '@/lib/api'
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
]

const PRICE_RANGES = [
  { label: 'Any Price', min: '', max: '' },
  { label: 'Under $25', min: '', max: '25' },
  { label: '$25 – $50', min: '25', max: '50' },
  { label: '$50 – $100', min: '50', max: '100' },
  { label: '$100 – $250', min: '100', max: '250' },
  { label: '$250+', min: '250', max: '' },
]

export default function ProductsPage() {
  return <Suspense><ProductsContent /></Suspense>
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-[#E5E7EB] py-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-xs font-semibold text-[#111111] uppercase tracking-wider mb-3"
      >
        {title}
        {open ? <ChevronUp className="h-3.5 w-3.5 text-[#6B7280]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#6B7280]" />}
      </button>
      {open && children}
    </div>
  )
}

function ProductsContent() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [selectedPriceRange, setSelectedPriceRange] = useState(0)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([])

  const categorySlug = searchParams.get('category') || ''
  const limit = 24

  // Load categories once
  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.data || [])).catch(() => {})
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        sortBy: sort,
        limit,
        offset: (page - 1) * limit,
      }
      // Resolve slug to UUID for proper category filtering
      if (categorySlug) {
        const cat = categories.find((c) => c.slug === categorySlug)
        if (cat) params.categoryId = cat.id
      }
      if (minPrice) params.minPrice = minPrice
      if (maxPrice) params.maxPrice = maxPrice
      const { data } = await api.get('/products', { params })
      setProducts(data.data || [])
      setTotal(data.pagination?.total || 0)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [page, sort, categorySlug, minPrice, maxPrice, categories])


  useEffect(() => { fetchProducts() }, [fetchProducts])

  const totalPages = Math.ceil(total / limit)

  const applyPriceRange = (idx: number) => {
    setSelectedPriceRange(idx)
    setMinPrice(PRICE_RANGES[idx].min)
    setMaxPrice(PRICE_RANGES[idx].max)
    setPage(1)
  }

  const clearAllFilters = () => {
    setMinPrice(''); setMaxPrice(''); setSelectedPriceRange(0); setPage(1)
  }

  const pageTitle = categorySlug
    ? categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'All Products'

  const hasActiveFilters = !!(categorySlug || minPrice || maxPrice)

  const Sidebar = () => (
    <div>
      <FilterSection title="Category">
        <div className="space-y-0.5">
          <a
            href="/products"
            className={`flex items-center gap-2 px-2 py-1.5 text-sm transition-colors ${
              !categorySlug ? 'text-[#111111] font-medium' : 'text-[#6B7280] hover:text-[#111111]'
            }`}
          >
            {!categorySlug && <span className="w-1 h-1 rounded-full bg-[#7C3AED] shrink-0" />}
            {categorySlug && <span className="w-1 h-1 shrink-0" />}
            All Categories
          </a>
          {categories.map((cat) => {
            const active = cat.slug === categorySlug
            return (
              <a
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className={`flex items-center gap-2 px-2 py-1.5 text-sm transition-colors ${
                  active ? 'text-[#111111] font-medium' : 'text-[#6B7280] hover:text-[#111111]'
                }`}
              >
                {active && <span className="w-1 h-1 rounded-full bg-[#7C3AED] shrink-0" />}
                {!active && <span className="w-1 h-1 shrink-0" />}
                {cat.name}
              </a>
            )
          })}
        </div>
      </FilterSection>

      <FilterSection title="Price">
        <div className="space-y-0.5">
          {PRICE_RANGES.map((range, idx) => (
            <button
              key={range.label}
              onClick={() => applyPriceRange(idx)}
              className={`flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm transition-colors ${
                selectedPriceRange === idx ? 'text-[#111111] font-medium' : 'text-[#6B7280] hover:text-[#111111]'
              }`}
            >
              {selectedPriceRange === idx && <span className="w-1 h-1 rounded-full bg-[#7C3AED] shrink-0" />}
              {selectedPriceRange !== idx && <span className="w-1 h-1 shrink-0" />}
              {range.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {hasActiveFilters && (
        <div className="pt-4">
          <a href="/products" onClick={clearAllFilters}
            className="text-xs text-[#6B7280] hover:text-[#111111] underline underline-offset-2">
            Clear all filters
          </a>
        </div>
      )}
    </div>
  )

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="bg-white min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Breadcrumb */}
          <nav className="text-xs text-[#6B7280] mb-6 flex items-center gap-1.5">
            <a href="/" className="hover:text-[#111111]">Home</a>
            <span>/</span>
            <a href="/products" className="hover:text-[#111111]">Products</a>
            {categorySlug && (
              <>
                <span>/</span>
                <span className="text-[#111111] capitalize">{categorySlug.replace(/-/g, ' ')}</span>
              </>
            )}
          </nav>

          <div className="flex gap-8">
            {/* Filter sidebar — desktop, not sticky */}
            <aside className="hidden lg:block w-[220px] shrink-0">
              <Sidebar />
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E5E7EB]">
                <div>
                  <h1 className="text-xl font-bold text-[#111111]">{pageTitle}</h1>
                  {!loading && (
                    <p className="text-sm text-[#6B7280] mt-0.5">{total.toLocaleString()} products</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileSidebarOpen(true)}
                    className="lg:hidden flex items-center gap-1.5 px-3 py-2 border border-[#E5E7EB] text-sm text-[#111111] hover:bg-[#F9FAFB] transition-colors"
                  >
                    <SlidersHorizontal className="h-4 w-4" /> Filters
                  </button>
                  <div className="relative">
                    <select
                      value={sort}
                      onChange={(e) => { setSort(e.target.value); setPage(1) }}
                      className="appearance-none pl-3 pr-8 py-2 border border-[#E5E7EB] text-sm text-[#111111] focus:outline-none focus:border-[#7C3AED] bg-white cursor-pointer"
                    >
                      {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-[#6B7280] pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Active filter chips */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {categorySlug && (
                    <a href="/products"
                      className="inline-flex items-center gap-1.5 px-3 py-1 border border-[#E5E7EB] text-xs text-[#111111] hover:bg-[#F9FAFB] transition-colors">
                      {categorySlug.replace(/-/g, ' ')} <X className="h-3 w-3" />
                    </a>
                  )}
                  {(minPrice || maxPrice) && (
                    <button
                      onClick={() => { setMinPrice(''); setMaxPrice(''); setSelectedPriceRange(0) }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 border border-[#E5E7EB] text-xs text-[#111111] hover:bg-[#F9FAFB] transition-colors"
                    >
                      {minPrice && maxPrice ? `$${minPrice}–$${maxPrice}` : minPrice ? `$${minPrice}+` : `Under $${maxPrice}`}
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  <a href="/products"
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs text-[#6B7280] hover:text-[#111111] underline underline-offset-2">
                    Clear all
                  </a>
                </div>
              )}

              {/* Product grid */}
              {!loading && products.length === 0 ? (
                <div className="py-24 text-center">
                  <p className="text-base font-semibold text-[#111111] mb-2">No products found</p>
                  <p className="text-sm text-[#6B7280] mb-6">Try adjusting your filters or search terms</p>
                  <a href="/products"
                    className="inline-block px-5 py-2 border border-[#111111] text-sm font-medium text-[#111111] hover:bg-[#111111] hover:text-white transition-colors">
                    Clear Filters
                  </a>
                </div>
              ) : (
                <ProductGrid products={products} loading={loading} />
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-1 mt-12">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-[#E5E7EB] text-sm text-[#111111] disabled:opacity-40 hover:bg-[#F9FAFB] transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 text-sm transition-colors ${
                          p === page
                            ? 'bg-[#111111] text-white'
                            : 'border border-[#E5E7EB] text-[#111111] hover:bg-[#F9FAFB]'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-[#E5E7EB] text-sm text-[#111111] disabled:opacity-40 hover:bg-[#F9FAFB] transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile filter drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
              <h2 className="font-semibold text-[#111111]">Filters</h2>
              <button onClick={() => setMobileSidebarOpen(false)} className="text-[#6B7280] hover:text-[#111111]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <Sidebar />
            </div>
            <div className="p-4 border-t border-[#E5E7EB]">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="w-full py-2.5 bg-[#111111] text-white text-sm font-semibold hover:bg-[#7C3AED] transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}
