import ProductCard, { Product } from './ProductCard'

interface ProductGridProps {
  products: Product[]
  loading?: boolean
}

export default function ProductGrid({ products, loading }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden animate-pulse">
            <div className="aspect-square bg-gray-50" />
            <div className="p-5 space-y-4">
              <div className="h-2 bg-gray-100 rounded-full w-1/3" />
              <div className="h-4 bg-gray-100 rounded-full w-full" />
              <div className="h-4 bg-gray-100 rounded-full w-2/3" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-6 bg-gray-100 rounded-lg w-1/2" />
                <div className="h-10 w-10 bg-gray-100 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!products.length) {
    return (
      <div className="text-center py-20 border border-gray-100 rounded-[2.5rem] bg-gray-50/50">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <p className="font-bold text-gray-900 text-lg">No products found</p>
        <p className="text-sm mt-1 text-gray-500 font-medium">Try adjusting your filters or search terms</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  )
}
