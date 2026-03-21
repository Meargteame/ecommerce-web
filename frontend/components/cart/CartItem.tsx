'use client'

import Image from 'next/image'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCartStore, CartItem as CartItemType } from '@/store/cartStore'

export default function CartItem({ item }: { item: CartItemType }) {
  const { updateItem, removeItem } = useCartStore()

  return (
    <div className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-200" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
        <p className="text-sm font-bold text-gray-900 mt-0.5">${(item.price * item.quantity).toFixed(2)}</p>

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => item.quantity > 1 ? updateItem(item.id, item.quantity - 1) : removeItem(item.id)}
            className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-sm w-6 text-center">{item.quantity}</span>
          <button
            onClick={() => updateItem(item.id, item.quantity + 1)}
            className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button onClick={() => removeItem(item.id)} className="ml-auto text-gray-400 hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
