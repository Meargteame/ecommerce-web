'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/HeaderWrapper'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import ProductGrid from '@/components/product/ProductGrid'
import { Product } from '@/components/product/ProductCard'
import api from '@/lib/api'
import { Search, ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react'

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

const RATING_OPTIONS = [
  { label: 'Any Rating', value: '' },
  { label: '4★ & up', value: '4' },
  { label: '3★ & up', value: '3' },
  { label: '2★ & up', value: '2' },
]

export default function SearchPage() {
  return <Suspense><SearchContent /></Suspense>
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-gray-100 py-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-sm font-semibold text-[#111111] mb-3"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && children}
    </div>
  )
}

function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('newest')
  const [selectedPriceRange, setSelectedPriceRange] = useState(0)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minRating, setMinRating] = useState('')
  const [onSale, setOnSale] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const limit = 20

  const fetchResults = useCallback(async () => {
    if (!query.trim()) { setProducts([]); setTotal(0); return }
    setLoading(true)
    try {
      const params: Record<string, string | number> = { search: query, page, limit, sort }
      if (minPrice) params.min_price = minPrice
      if (maxPrice) params.max_price = maxPrice
      if (minRating) params.min_rating = minRating
      if (onSale) params.on_sale = 'true'
      const { data } = await api.get('/products', { params })
      setProducts(data.data?.products || [])
      setTotal(data.data?.total || 0)
    } catch { setProducts([]) }
    finally { setLoading(false) }
  }, [query, page, sort, minPrice, maxPrice, minRating, onSale])

  useEffect(() => { setPage(1) }, [query])
  useEffect(() => { fetchResults() }, [fetchResults])

  const totalPages = Math.ceil(total / limit)

  const applyPriceRange = (idx: number) => {
    setSelectedPriceRange(idx)
    setMinPrice(PRICE_RANGES[idx].min)
    setMaxPrice(PRICE_RANGES[idx].max)
    setPage(1)
  }

  const clearFilters = () => {
    setSelectedPriceRange(0); setMinPrice(''); setMaxPrice(''); setMinRating(''); setOnSale(false); setPage(1)
  }

  const hasFilters = selectedPriceRange !== 0 || !!minRating || onSale

  const Sidebar = () => (
    <div className="space-y-0">
      <FilterSection title="Price">
        <div className="space-y-0.5">
          {PRICE_RANGES.map((range, idx) => (
            <button key={range.label} onClick={() => applyPriceRange(idx)}
              className={`flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm transition-colors ${
                selectedPriceRange === idx
                  ? 'text-[#7C3AED] font-medium'
                  : 'text-[#6B7280] hover:text-[#111111]'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedPriceRange === idx ? 'bg-[#7C3AED]' : 'bg-transparent'}`} />
              {range.label}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Rating">
        <div className="space-y-0.5">
          {RATING_OPTIONS.map((r) => (
            <button key={r.value} onClick={() => { setMinRating(r.value); setPage(1) }}
              className={`flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm transition-colors ${
                minRating === r.value
                  ? 'text-[#7C3AED] font-medium'
                  : 'text-[#6B7280] hover:text-[#111111]'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${minRating === r.value ? 'bg-[#7C3AED]' : 'bg-transparent'}`} />
              {r.label}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Offers">
        <button onClick={() => { setOnSale(!onSale); setPage(1) }}
          className={`flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm transition-colors ${
            onSale ? 'text-[#7C3AED] font-medium' : 'text-[#6B7280] hover:text-[#111111]'
          }`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${onSale ? 'bg-[#7C3AED]' : 'bg-transparent'}`} />
          On Sale
        </button>
      </FilterSection>

      {hasFilters && (
        <div className="pt-4">
          <button onClick={clearFilters}
            className="w-full py-2 text-sm text-[#6B7280] hover:text-[#111111] border border-[#E5E7EB] rounded hover:border-[#111111] transition-colors">
            Clear Filters
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Search header bar */}
          <div className="border border-[#E5E7EB] px-5 py-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Search className="h-4 w-4 text-[#6B7280] shrink-0" />
              <div>
                {query ? (
                  <>
                    <h1 className="text-base font-semibold text-[#111111]">Results for &ldquo;{query}&rdquo;</h1>
                    {!loading && <p className="text-xs text-[#6B7280] mt-0.5">{total.toLocaleString()} products found</p>}
                  </>
                ) : (
                  <h1 className="text-base font-semibold text-[#111111]">Search Products</h1>
                )}
              </div>
            </div>
            {query && (
              <div className="flex items-center gap-2">
                <button onClick={() => setMobileSidebarOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 px-3 py-2 border border-[#E5E7EB] text-sm text-[#111111] hover:bg-[#F9FAFB]">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                  {hasFilters && <span className="w-2 h-2 bg-[#7C3AED] rounded-full" />}
                </button>
                <div className="relative">
                  <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }}
                    className="appearance-none pl-3 pr-8 py-2 border border-[#E5E7EB] text-sm text-[#111111] focus:outline-none focus:border-[#7C3AED] bg-white cursor-pointer">
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-[#6B7280] pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Active filter chips */}
          {query && hasFilters && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedPriceRange !== 0 && (
                <button onClick={() => applyPriceRange(0)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#F9FAFB] text-[#111111] text-xs font-medium border border-[#E5E7EB] hover:border-[#111111] transition-colors">
                  {PRICE_RANGES[selectedPriceRange].label} <X className="h-3 w-3" />
                </button>
              )}
              {minRating && (
                <button onClick={() => setMinRating('')}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#F9FAFB] text-[#111111] text-xs font-medium border border-[#E5E7EB] hover:border-[#111111] transition-colors">
                  {minRating}★ & up <X className="h-3 w-3" />
                </button>
              )}
              {onSale && (
                <button onClick={() => setOnSale(false)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#F9FAFB] text-[#111111] text-xs font-medium border border-[#E5E7EB] hover:border-[#111111] transition-colors">
                  On Sale <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {!query ? (
            <div className="text-center py-20 border border-[#E5E7EB]">
              <Search className="h-8 w-8 mx-auto mb-3 text-gray-300" />
              <p className="text-base font-medium text-[#111111]">Type something to search</p>
              <p className="text-sm text-[#6B7280] mt-1">Use the search bar above to find products</p>
            </div>
          ) : (
            <div className="flex gap-6">
              {/* Desktop sidebar */}
              <aside className="hidden lg:block w-52 shrink-0 self-start">
                <Sidebar />
              </aside>

              <div className="flex-1 min-w-0">
                {!loading && products.length === 0 ? (
                  <div className="text-center py-20 border border-[#E5E7EB]">
                    <Search className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                    <p className="text-base font-medium text-[#111111]">No results for &ldquo;{query}&rdquo;</p>
                    <p className="text-sm text-[#6B7280] mt-1">Try different keywords or adjust your filters</p>
                    {hasFilters && (
                      <button onClick={clearFilters}
                        className="mt-4 px-5 py-2 bg-[#111111] text-white text-sm font-medium rounded hover:bg-[#7C3AED] transition-colors">
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <ProductGrid products={products} loading={loading} />
                    {totalPages > 1 && (
                      <div className="flex justify-center gap-1 mt-10">
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                          className="px-4 py-2 border border-[#E5E7EB] text-sm disabled:opacity-40 hover:bg-[#F9FAFB] bg-white">
                          Previous
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                          return (
                            <button key={p} onClick={() => setPage(p)}
                              className={`w-10 h-10 text-sm ${p === page ? 'bg-[#111111] text-white' : 'border border-[#E5E7EB] hover:bg-[#F9FAFB] bg-white'}`}>
                              {p}
                            </button>
                          )
                        })}
                        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                          className="px-4 py-2 border border-[#E5E7EB] text-sm disabled:opacity-40 hover:bg-[#F9FAFB] bg-white">
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
              <h2 className="font-semibold text-[#111111]">Filters</h2>
              <button onClick={() => setMobileSidebarOpen(false)} className="text-[#6B7280] hover:text-[#111111]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4"><Sidebar /></div>
            <div className="p-4 border-t border-[#E5E7EB]">
              <button onClick={() => setMobileSidebarOpen(false)}
                className="w-full py-3 bg-[#111111] text-white text-sm font-medium hover:bg-[#7C3AED] transition-colors">
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
