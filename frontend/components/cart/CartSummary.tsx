import { CartItem } from '@/store/cartStore'

interface CartSummaryProps {
  items: CartItem[]
  showItems?: boolean
  promoDiscount?: number
}

export default function CartSummary({ items, showItems = true, promoDiscount = 0 }: CartSummaryProps) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const shipping = subtotal >= 50 ? 0 : 5.99
  const total = subtotal + shipping - promoDiscount

  return (
    <div className="space-y-3">
      {showItems && items.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto pb-2 border-b border-gray-100">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm text-gray-600">
              <span className="truncate mr-2">{item.name} × {item.quantity}</span>
              <span className="shrink-0 font-medium">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
            {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
          </span>
        </div>
        {promoDiscount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-${promoDiscount.toFixed(2)}</span>
          </div>
        )}
        {subtotal < 50 && shipping > 0 && (
          <p className="text-xs text-gray-400">
            Add ${(50 - subtotal).toFixed(2)} more for free shipping
          </p>
        )}
      </div>

      <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-gray-900">
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>
    </div>
  )
}
