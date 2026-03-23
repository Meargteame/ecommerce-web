'use client'

import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/HeaderWrapper'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import { useCartStore } from '@/store/cartStore'
import { ShoppingBag, Minus, Plus, Trash2, Tag, ShieldCheck } from 'lucide-react'

export default function CartPage() {
  const { items, total, count, updateItem, removeItem } = useCartStore()
  const shipping = total() >= 50 ? 0 : 5.99
  const grandTotal = total() + shipping

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="mb-8 pb-4 border-b border-gray-100 flex items-end justify-between">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Shopping Cart
            {count() > 0 && <span className="ml-3 text-lg font-medium text-gray-400">({count()} items)</span>}
          </h1>
          {count() > 0 && (
            <Link href="/products" className="text-sm font-semibold text-[#7C3AED] hover:text-purple-800 transition-colors hidden sm:block">
              Continue Shopping →
            </Link>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-32 max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-10 w-10 text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-lg font-medium text-gray-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
            <Link href="/products"
              className="inline-flex items-center px-8 py-4 bg-[#111111] text-white text-lg font-bold rounded-lg hover:bg-black transition-colors shadow-sm">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-10 items-start">
            {/* Items — 2/3 */}
            <div className="flex-1 min-w-0 w-full">
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row gap-6 p-6 hover:bg-gray-50/50 transition-colors">
                    {/* Image */}
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-50 flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between gap-4 mb-1">
                          <Link href={`/products/${item.slug}`} className="text-lg font-bold text-gray-900 hover:text-[#7C3AED] line-clamp-2">
                            {item.name}
                          </Link>
                          <span className="text-lg font-bold text-gray-900 shrink-0">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-500">${item.price.toFixed(2)} each</p>
                      </div>

                      <div className="flex items-center justify-between mt-4 sm:mt-0">
                        {/* Quantity stepper */}
                        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
                          <button
                            onClick={() => item.quantity > 1 ? updateItem(item.id, item.quantity - 1) : removeItem(item.id)}
                            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900 transition-all"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="text-sm font-bold w-10 text-center text-gray-900">{item.quantity}</span>
                          <button
                            onClick={() => updateItem(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900 transition-all"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order summary — 1/3 */}
            <div className="w-full lg:w-[380px] shrink-0 lg:sticky lg:top-24">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 lg:p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">Order Summary</h2>

                <div className="space-y-4 text-sm font-medium">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="text-gray-900">${total().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Estimated Shipping</span>
                    {shipping === 0 ? (
                      <span className="text-[#17B26A] font-bold flex items-center gap-1">
                        <Tag className="h-4 w-4" /> Free
                      </span>
                    ) : (
                      <span className="text-gray-900">${shipping.toFixed(2)}</span>
                    )}
                  </div>
                  {shipping > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-2">
                      <p className="text-sm font-bold text-[#7C3AED]">
                        You are ${(50 - total()).toFixed(2)} away from Free Shipping!
                      </p>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-5 mt-5 flex justify-between font-bold text-gray-900 text-lg">
                    <span>Total</span>
                    <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Link href="/checkout"
                  className="block w-full flex items-center justify-center gap-2 mt-8 py-4 bg-[#7C3AED] hover:bg-purple-800 text-white text-base font-bold rounded-lg transition-colors shadow-sm">
                  <ShieldCheck className="h-5 w-5" /> Proceed to Checkout
                </Link>

                <p className="text-center font-medium text-xs text-gray-400 mt-4">Secure checkout powered by Stripe</p>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
