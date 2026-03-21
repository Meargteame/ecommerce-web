'use client'

import Link from 'next/link'
import { X, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import CartItem from './CartItem'

export default function CartDrawer() {
  const { items, open, setOpen, total, count } = useCartStore()

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      )}
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 flex flex-col transition-transform duration-300 shadow-xl ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#111111]" />
            <h2 className="font-semibold text-[#111111]">Cart <span className="text-[#6B7280] font-normal">({count()})</span></h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#6B7280] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#6B7280] gap-4">
              <div className="w-14 h-14 border border-[#E5E7EB] flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#111111]">Your cart is empty</p>
                <p className="text-xs text-[#6B7280] mt-1">Add some products to get started</p>
              </div>
              <button onClick={() => setOpen(false)}
                className="px-5 py-2 bg-[#111111] hover:bg-[#7C3AED] text-white text-sm font-medium rounded transition-colors">
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="py-4 divide-y divide-[#E5E7EB]">
              {items.map((item) => <CartItem key={item.id} item={item} />)}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-[#E5E7EB] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#6B7280]">Subtotal</span>
              <span className="text-lg font-bold text-[#111111]">${total().toFixed(2)}</span>
            </div>
            <p className="text-xs text-[#6B7280]">Shipping & taxes calculated at checkout</p>
            <Link href="/checkout" onClick={() => setOpen(false)}
              className="block w-full text-center py-3 bg-[#111111] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded transition-colors">
              Checkout
            </Link>
            <Link href="/cart" onClick={() => setOpen(false)}
              className="block w-full text-center py-3 border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#111111] text-sm font-medium rounded transition-colors">
              View Cart
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
