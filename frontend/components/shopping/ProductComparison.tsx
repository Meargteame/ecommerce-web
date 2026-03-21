'use client'

import { useEffect, useState } from 'react'
import { useComparisonStore } from '@/store/comparisonStore'
import { Button } from '@/components/ui/button'
import { X, Plus, Scale, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ProductComparisonTableProps {
  comparisonId?: string
  sessionId?: string
}

export function ProductComparisonTable({ comparisonId, sessionId }: ProductComparisonTableProps) {
  const { currentComparison, fetchComparison, fetchGuestComparison, loading, removeFromComparison } = useComparisonStore()
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  useEffect(() => {
    if (comparisonId) {
      fetchComparison(comparisonId)
    } else if (sessionId) {
      fetchGuestComparison(sessionId)
    }
  }, [comparisonId, sessionId])

  if (loading) {
    return <div className="text-center py-8">Loading comparison...</div>
  }

  if (!currentComparison || currentComparison.products.length === 0) {
    return (
      <div className="text-center py-12">
        <Scale className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No products to compare</p>
        <p className="text-sm text-gray-400 mt-2">Add products to see a side-by-side comparison</p>
      </div>
    )
  }

  const { products, specifications, highlights } = currentComparison

  const handleRemove = async (productId: string) => {
    if (!comparisonId) return
    setIsRemoving(productId)
    await removeFromComparison(comparisonId, productId)
    setIsRemoving(null)
  }

  return (
    <div className="overflow-x-auto">
      {/* Products Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${products.length}, minmax(250px, 1fr))` }}>
        {/* Empty corner cell */}
        <div className="p-4 border-b" />
        
        {/* Product cards */}
        {products.map((product) => (
          <div key={product.id} className="p-4 border-b relative group">
            <button
              onClick={() => handleRemove(product.id)}
              disabled={isRemoving === product.id}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
            
            <Link href={`/products/${product.slug}`} className="block">
              <div className="aspect-square rounded-lg bg-gray-100 mb-3 overflow-hidden">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No image
                  </div>
                )}
              </div>
              
              <h3 className="font-medium text-sm line-clamp-2 hover:text-primary">
                {product.name}
              </h3>
              
              <div className="mt-2">
                <span className="font-bold">${product.base_price}</span>
                {product.brand && (
                  <p className="text-xs text-gray-500">{product.brand}</p>
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Highlights Row */}
      <div className="grid gap-4 bg-gray-50" style={{ gridTemplateColumns: `200px repeat(${products.length}, minmax(250px, 1fr))` }}>
        <div className="p-4 font-medium text-sm">Highlights</div>
        {products.map((product) => (
          <div key={product.id} className="p-4 text-sm">
            <div className="space-y-1">
              {highlights.lowestPrice.id === product.id && (
                <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                  <Check className="h-3 w-3" /> Lowest Price
                </span>
              )}
              {highlights.highestRated.id === product.id && (
                <span className="inline-flex items-center gap-1 text-blue-600 text-xs">
                  <Check className="h-3 w-3" /> Highest Rated
                </span>
              )}
              {highlights.mostReviewed.id === product.id && (
                <span className="inline-flex items-center gap-1 text-purple-600 text-xs">
                  <Check className="h-3 w-3" /> Most Reviewed
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Rating Row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${products.length}, minmax(250px, 1fr))` }}>
        <div className="p-4 font-medium text-sm border-b">Rating</div>
        {products.map((product) => (
          <div key={product.id} className="p-4 border-b text-sm">
            {product.average_rating ? (
              <div className="flex items-center gap-1">
                <span className="font-medium">{product.average_rating.toFixed(1)}</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-400">5</span>
                <span className="text-gray-500 ml-1">({product.review_count})</span>
              </div>
            ) : (
              <span className="text-gray-400">No reviews</span>
            )}
          </div>
        ))}
      </div>

      {/* Price Row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${products.length}, minmax(250px, 1fr))` }}>
        <div className="p-4 font-medium text-sm border-b">Price</div>
        {products.map((product) => (
          <div key={product.id} className={cn(
            "p-4 border-b text-sm",
            highlights.lowestPrice.id === product.id && "bg-green-50"
          )}>
            <span className="font-bold text-lg">${product.base_price}</span>
          </div>
        ))}
      </div>

      {/* Brand Row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${products.length}, minmax(250px, 1fr))` }}>
        <div className="p-4 font-medium text-sm border-b">Brand</div>
        {products.map((product) => (
          <div key={product.id} className="p-4 border-b text-sm">
            {product.brand || '-'}
          </div>
        ))}
      </div>

      {/* Category Row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${products.length}, minmax(250px, 1fr))` }}>
        <div className="p-4 font-medium text-sm border-b">Category</div>
        {products.map((product) => (
          <div key={product.id} className="p-4 border-b text-sm">
            {product.category || '-'}
          </div>
        ))}
      </div>

      {/* Specifications */}
      {specifications.map((spec) => (
        <div key={spec.name} className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${products.length}, minmax(250px, 1fr))` }}>
          <div className="p-4 font-medium text-sm border-b">{spec.name}</div>
          {products.map((product) => {
            const specValue = spec.values.find(v => v.productId === product.id)?.value
            return (
              <div key={product.id} className="p-4 border-b text-sm">
                {specValue !== undefined && specValue !== null ? (
                  typeof specValue === 'object' ? JSON.stringify(specValue) : String(specValue)
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* Action Row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${products.length}, minmax(250px, 1fr))` }}>
        <div className="p-4" />
        {products.map((product) => (
          <div key={product.id} className="p-4">
            <Button className="w-full" asChild>
              <Link href={`/products/${product.slug}`}>
                View Product
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

interface AddToComparisonButtonProps {
  productId: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

export function AddToComparisonButton({ 
  productId, 
  variant = 'outline', 
  size = 'sm',
  className 
}: AddToComparisonButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { sets, fetchSets, createSet, addToComparison } = useComparisonStore()

  const handleOpen = async () => {
    await fetchSets()
    setIsOpen(true)
  }

  const handleAddToNew = async () => {
    const setId = await createSet([productId], 'Product Comparison')
    setIsOpen(false)
  }

  const handleAddToExisting = async (setId: string) => {
    await addToComparison(setId, productId)
    setIsOpen(false)
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpen}
        className={className}
      >
        <Scale className="h-4 w-4 mr-2" />
        Compare
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Add to Comparison</h3>
              <button onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {sets.length > 0 && (
                <>
                  <p className="text-sm text-gray-500">Select existing comparison:</p>
                  {sets.slice(0, 3).map((set) => (
                    <button
                      key={set.id}
                      onClick={() => handleAddToExisting(set.id)}
                      disabled={set.product_count >= 5}
                      className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="font-medium">{set.name || 'Comparison'}</div>
                      <div className="text-sm text-gray-500">{set.product_count} products</div>
                      {set.product_count >= 5 && (
                        <div className="text-xs text-red-500 mt-1">Maximum 5 products allowed</div>
                      )}
                    </button>
                  ))}
                </>
              )}

              <div className="border-t pt-3">
                <Button onClick={handleAddToNew} className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Start New Comparison
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
