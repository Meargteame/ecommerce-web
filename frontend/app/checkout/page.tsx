'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/input'
import CartSummary from '@/components/cart/CartSummary'
import api from '@/lib/api'
import Link from 'next/link'
import { Lock, CheckCircle } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
)

type Step = 'shipping' | 'payment'

interface Address {
  firstName: string; lastName: string; street: string; city: string; state: string; zip: string; country: string; phone: string
}

function CheckoutForm({ address, orderId, onSuccess, onError }: { address: Address; orderId: string; onSuccess: () => void; onError: (msg: string) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)

  const handlePay = async () => {
    if (!stripe || !elements) return
    setPaying(true)
    try {
      const { data } = await api.post('/payments/create-intent', { orderId })
      const { clientSecret } = data.data
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement)!, billing_details: { name: `${address.firstName} ${address.lastName}`.trim() } },
      })
      if (result.error) { onError(result.error.message || 'Payment failed'); setPaying(false); return }
      await api.post('/payments/confirm', { orderId, paymentIntentId: result.paymentIntent!.id })
      onSuccess()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      onError(e?.response?.data?.error || 'Payment failed')
      setPaying(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="p-4 border border-gray-300 rounded-lg bg-white shadow-sm">
        <CardElement options={{ style: { base: { fontSize: '15px', color: '#111111', fontFamily: 'inherit', '::placeholder': { color: '#9ca3af' } }, invalid: { color: '#dc2626' } } }} />
      </div>
      <button onClick={handlePay} disabled={paying || !stripe}
        className="w-full flex items-center justify-center gap-2 py-4 bg-[#111111] hover:bg-black disabled:bg-gray-300 text-white text-base font-bold rounded-lg transition-colors shadow-sm"
      >
        <Lock className="h-5 w-5" /> {paying ? 'Processing...' : 'Complete Payment'}
      </button>
    </div>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total, clearCart } = useCartStore()
  const user = useAuthStore((s) => s.user)

  const [step, setStep] = useState<Step>('shipping')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoLoading, setPromoLoading] = useState(false)
  const [orderId, setOrderId] = useState<string>('')

  const [address, setAddress] = useState<Address>({ firstName: user?.first_name || '', lastName: user?.last_name || '', street: '', city: '', state: '', zip: '', country: 'US', phone: '' })
  const setAddr = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAddress((a) => ({ ...a, [k]: e.target.value }))

  const applyPromo = async () => {
    if (!promoCode.trim()) return
    setPromoLoading(true); setError('')
    try {
      const { data } = await api.post('/promotions/validate', { code: promoCode, order_total: total() })
      setPromoDiscount(data.data?.discount_amount || 0); setPromoApplied(true)
    } catch { setError('Invalid or expired promo code') }
    setPromoLoading(false)
  }

  const handleContinueToPayment = async () => {
    if (!address.firstName || !address.street || !address.city || !address.state || !address.zip) { setError('Please fill all required fields'); return }
    setError(''); setLoading(true)
    try {
      const shippingAddress = { fullName: `${address.firstName} ${address.lastName}`.trim(), addressLine1: address.street, city: address.city, state: address.state, postalCode: address.zip, country: address.country, phone: address.phone || undefined }
      const { data } = await api.post('/orders', { shippingAddress, billingAddress: shippingAddress, customerEmail: user!.email, customerPhone: address.phone || undefined, promoCode: promoApplied ? promoCode : undefined })
      setOrderId(data.data.id); setStep('payment')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }; setError(e?.response?.data?.error || 'Failed to create order.')
    }
    setLoading(false)
  }

  const handlePaymentSuccess = () => { clearCart(); router.push(`/account/orders/${orderId}?success=1`) }

  if (!user) return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-32 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Secure Checkout</h2>
        <p className="text-gray-500 mb-8 font-medium">Please sign in to your account to continue securely.</p>
        <Link href="/auth/login?redirect=/checkout" className="px-8 py-3.5 bg-[#111111] text-white font-bold rounded-lg hover:bg-black inline-block shadow-sm">Sign In to Continue</Link>
      </div>
      <Footer />
    </div>
  )

  if (items.length === 0) return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-32 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8 font-medium">Add some items before proceeding to checkout.</p>
        <Link href="/products" className="px-8 py-3.5 bg-[#7C3AED] text-white font-bold rounded-lg hover:bg-purple-800 inline-block shadow-sm">Shop Now</Link>
      </div>
      <Footer />
    </div>
  )

  const stepsList: Step[] = ['shipping', 'payment']
  const stepIdx = stepsList.indexOf(step)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="mb-10 pb-4 border-b border-gray-100 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Secure Checkout</h1>
          
          {/* Step indicator */}
          <div className="flex items-center gap-3">
            {stepsList.map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                {i > 0 && <div className="w-12 h-px bg-gray-200" />}
                <div className={`flex items-center gap-2 font-bold uppercase tracking-wider text-xs
                  ${step === s ? 'text-gray-900' : i < stepIdx ? 'text-[#17B26A]' : 'text-gray-400'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2
                    ${step === s ? 'border-gray-900 bg-gray-900 text-white' : i < stepIdx ? 'border-[#17B26A] bg-[#17B26A] text-white' : 'border-gray-200 bg-white text-gray-400'}`}>
                    {i < stepIdx ? '✓' : i + 1}
                  </span>
                  {s}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Form panel */}
          <div className="lg:col-span-2 space-y-8">
            {step === 'shipping' && (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Shipping Information</h2>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input label="First Name" value={address.firstName} onChange={setAddr('firstName')} required />
                    <Input label="Last Name" value={address.lastName} onChange={setAddr('lastName')} required />
                  </div>
                  <Input label="Street Address" value={address.street} onChange={setAddr('street')} placeholder="123 Main St" required />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input label="City" value={address.city} onChange={setAddr('city')} required />
                    <Input label="State / Province" value={address.state} onChange={setAddr('state')} required />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input label="ZIP / Postal Code" value={address.zip} onChange={setAddr('zip')} required />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700">Country</label>
                      <select value={address.country} onChange={setAddr('country')} className="h-11 px-4 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] bg-white font-medium">
                        <option value="US">United States</option><option value="CA">Canada</option><option value="GB">United Kingdom</option><option value="AU">Australia</option><option value="ET">Ethiopia</option>
                      </select>
                    </div>
                  </div>
                  <Input label="Phone (optional)" value={address.phone} onChange={setAddr('phone')} placeholder="+1 555 000 0000" />
                  
                  {error && <div className="p-3 bg-red-50 text-red-700 text-sm font-medium border border-red-200 rounded-lg">{error}</div>}
                  
                  <div className="pt-4 mt-8 border-t border-gray-100 flex justify-end">
                    <button onClick={handleContinueToPayment} disabled={loading}
                      className="px-10 py-3.5 bg-[#7C3AED] hover:bg-purple-800 text-white font-bold rounded-lg disabled:opacity-50 transition-colors shadow-sm text-lg">
                      {loading ? 'Creating Order...' : 'Continue to Payment'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 'payment' && (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Secure Payment</h2>
                  <button onClick={() => setStep('shipping')} className="text-sm font-bold text-gray-500 hover:text-[#7C3AED] transition-colors">Edit Shipping</button>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-8 flex gap-4 items-start">
                  <div className="mt-1"><CheckCircle className="h-5 w-5 text-[#17B26A]" /></div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-1">Shipping Details Saved</p>
                    <p className="text-sm font-medium text-gray-600 leading-relaxed">{address.firstName} {address.lastName}<br />{address.street}, {address.city}, {address.state} {address.zip}</p>
                  </div>
                </div>

                {error && <div className="p-3 bg-red-50 text-red-700 text-sm font-medium border border-red-200 rounded-lg mb-6">{error}</div>}
                
                <Elements stripe={stripePromise}>
                  <CheckoutForm address={address} orderId={orderId} onSuccess={handlePaymentSuccess} onError={(msg) => setError(msg)} />
                </Elements>
                
                <p className="text-xs font-semibold text-gray-400 flex justify-center items-center gap-1.5 mt-6">
                  <Lock className="h-3.5 w-3.5" /> Payments processed securely by Stripe.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-4 border-b border-gray-200">Order Summary</h2>
              <CartSummary items={items} promoDiscount={promoDiscount} />
            </div>

            {step === 'shipping' && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Promo Code</h3>
                {promoApplied ? (
                  <div className="flex items-center gap-2 text-[#17B26A] text-sm font-bold bg-[#ECFDF3] border border-[#ABEFC6] p-3 rounded-lg">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span className="flex-1">Saved ${promoDiscount.toFixed(2)}</span>
                    <button onClick={() => { setPromoApplied(false); setPromoDiscount(0); setPromoCode('') }} className="text-[#067647] hover:underline text-xs">Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="Enter discount code"
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]" />
                    <button onClick={applyPromo} disabled={promoLoading || !promoCode}
                      className="px-5 py-2.5 bg-gray-900 text-white font-bold text-sm rounded-lg hover:bg-black disabled:bg-gray-300 transition-colors shadow-sm">
                      {promoLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
