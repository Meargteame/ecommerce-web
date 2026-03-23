'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/HeaderWrapper'
import Footer from '@/components/layout/Footer'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/input'
import CartSummary from '@/components/cart/CartSummary'
import api from '@/lib/api'
import Link from 'next/link'
import { Lock, CheckCircle, Shield, Truck, CreditCard, ChevronRight, ArrowLeft, ShoppingBag } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

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
        payment_method: { 
          card: elements.getElement(CardElement)!, 
          billing_details: { 
            name: `${address.firstName} ${address.lastName}`.trim(),
            address: {
              line1: address.street,
              city: address.city,
              state: address.state,
              postal_code: address.zip,
              country: address.country
            }
          } 
        },
      })
      if (result.error) { onError(result.error.message || 'Payment failed'); setPaying(false); return }
      await api.post('/payments/confirm', { orderId, paymentIntentId: result.paymentIntent!.id })
      onSuccess()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string }; status?: number } }
      if (e?.response?.status === 401) {
        onError('Your session has expired. Please sign in again to complete your purchase.')
      } else {
        onError(e?.response?.data?.error || 'Payment failed')
      }
      setPaying(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-6 border border-gray-100 rounded-3xl bg-gray-50/50 group focus-within:border-primary/20 transition-all">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 block">Secure Card Entry</label>
        <CardElement options={{ 
          style: { 
            base: { 
              fontSize: '16px', 
              color: '#030712', 
              fontFamily: 'system-ui, sans-serif',
              '::placeholder': { color: '#9ca3af' } 
            }, 
            invalid: { color: '#ef4444' } 
          } 
        }} />
      </div>
      <button onClick={handlePay} disabled={paying || !stripe}
        className={`w-full flex items-center justify-center gap-3 py-5 text-white text-base font-black uppercase tracking-[0.15em] rounded-2xl transition-all shadow-xl ${paying ? 'bg-gray-200 cursor-not-allowed' : 'premium-gradient shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]'}`}
      >
        <Lock className="h-5 w-5 stroke-[2.5]" /> 
        {paying ? 'Verifying Transaction...' : 'Authorize Payment'}
      </button>
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="h-px flex-1 bg-gray-100" />
        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">End-to-End Encrypted</p>
        <div className="h-px flex-1 bg-gray-100" />
      </div>
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
      const { data } = await api.post('/promotions/validate', { code: promoCode, cartTotal: total() })
      setPromoDiscount(data.data?.discount_amount || 0); setPromoApplied(true)
    } catch { setError('Invalid or expired promo code') }
    setPromoLoading(false)
  }

  const handleContinueToPayment = async () => {
    if (!address.firstName || !address.lastName || !address.street || !address.city || !address.state || !address.zip) { 
      setError('Required delivery fields missing'); 
      return 
    }
    setError(''); setLoading(true)
    try {
      const shippingAddress = { 
        fullName: `${address.firstName} ${address.lastName}`.trim(), 
        addressLine1: address.street, 
        city: address.city, 
        state: address.state, 
        postalCode: address.zip, 
        country: address.country, 
        phone: address.phone || undefined 
      }
      const { data } = await api.post('/orders', { 
        shippingAddress, 
        billingAddress: shippingAddress, 
        customerEmail: user!.email, 
        customerPhone: address.phone || undefined, 
        promoCode: promoApplied ? promoCode : undefined 
      })
      setOrderId(data.data.id); setStep('payment')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }; setError(e?.response?.data?.error || 'System error. Please retry.')
    }
    setLoading(false)
  }

  const handlePaymentSuccess = () => { 
    clearCart(); 
    router.push(`/checkout/success?id=${orderId}`) 
  }

  if (!user) return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="max-w-xl mx-auto px-6 py-32 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner shadow-gray-200/50">
          <Lock className="h-10 w-10 text-gray-300" />
        </div>
        <h2 className="text-4xl font-black text-gray-950 tracking-tight mb-4">Secured Checkpoint</h2>
        <p className="text-gray-500 font-medium mb-10 text-lg">We need to verify your credentials before authorizing this transaction.</p>
        <Link href="/auth/login?redirect=/checkout" className="premium-gradient px-12 py-5 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all inline-block">Sign In to Authenticate</Link>
      </div>
      <Footer />
    </div>
  )

  if (items.length === 0) return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="max-w-xl mx-auto px-6 py-32 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
          <ShoppingBag className="h-10 w-10 text-gray-200" />
        </div>
        <h2 className="text-4xl font-black text-gray-950 tracking-tight mb-4">Basket is Vacant</h2>
        <p className="text-gray-500 font-medium mb-10 text-lg">Add some global treasures to your collection before proceeding to checkout.</p>
        <Link href="/products" className="premium-gradient px-12 py-5 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all inline-block">Explore Marketplace</Link>
      </div>
      <Footer />
    </div>
  )

  const stepsList: Step[] = ['shipping', 'payment']
  const stepIdx = stepsList.indexOf(step)

  return (
    <div className="min-h-screen bg-gray-50/30 flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-12 lg:py-20">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-gray-100 pb-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3">Gateway Secure</p>
            <h1 className="text-5xl font-black text-gray-950 tracking-tighter">Checkout Flow</h1>
          </div>
          
          <div className="flex items-center gap-6">
            {stepsList.map((s, i) => (
              <div key={s} className="flex items-center gap-4">
                {i > 0 && <div className="w-8 h-[2px] bg-gray-200 rounded-full" />}
                <div className={`flex items-center gap-3 transition-opacity duration-300 ${step === s ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border-2 transition-all duration-500 ${step === s ? 'premium-gradient border-transparent text-white shadow-lg shadow-primary/25 scale-110' : i < stepIdx ? 'bg-emerald-500 border-transparent text-white' : 'bg-white border-gray-100 text-gray-400'}`}>
                    {i < stepIdx ? <CheckCircle className="h-5 w-5" /> : i + 1}
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-900">{s}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
          {/* Main Form Area */}
          <div className="xl:col-span-8 space-y-10">
            {step === 'shipping' && (
              <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/50 border border-gray-50 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-10 opacity-5">
                  <Truck className="w-32 h-32" />
                </div>
                <h2 className="text-2xl font-black text-gray-950 tracking-tight mb-8 uppercase italic">Logistic Dispatch</h2>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="First Identity" value={address.firstName} onChange={setAddr('firstName')} placeholder="e.g. Liam" required />
                    <Input label="Last Identity" value={address.lastName} onChange={setAddr('lastName')} placeholder="e.g. Vance" required />
                  </div>
                  
                  <Input label="Delivery Point (Address)" value={address.street} onChange={setAddr('street')} placeholder="123 Metropolitan Ave, Ste 402" required />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Input label="Settlement (City)" value={address.city} onChange={setAddr('city')} required />
                    <Input label="Region (State)" value={address.state} onChange={setAddr('state')} required />
                    <Input label="Terminal (Zip)" value={address.zip} onChange={setAddr('zip')} required />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Global Territory</label>
                       <select value={address.country} onChange={setAddr('country')} className="h-14 px-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/10 bg-white transition-all appearance-none cursor-pointer">
                          <option value="US">United States</option>
                          <option value="CA">Canada</option>
                          <option value="GB">United Kingdom</option>
                          <option value="AU">Australia</option>
                          <option value="ET">Ethiopia</option>
                       </select>
                    </div>
                    <Input label="Communication (Phone)" value={address.phone} onChange={setAddr('phone')} placeholder="+1 (555) 000-0000" />
                  </div>
                  
                  {error && <div className="p-4 bg-red-50 text-red-700 text-xs font-black uppercase tracking-widest border-l-4 border-red-500 rounded-lg">{error}</div>}
                  
                  <div className="pt-8 flex justify-between items-center">
                    <Link href="/cart" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
                      <ArrowLeft className="h-4 w-4" /> Back to Basket
                    </Link>
                    <button onClick={handleContinueToPayment} disabled={loading}
                      className="px-10 py-5 bg-gray-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] rounded-2xl disabled:opacity-50 transition-all shadow-xl shadow-black/10 hover:scale-105 active:scale-95">
                      {loading ? 'Processing logistics...' : 'Next Step: Authorize Payment'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 'payment' && (
              <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/50 border border-gray-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5">
                  <Shield className="w-32 h-32" />
                </div>
                
                <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-50">
                  <h2 className="text-2xl font-black text-gray-950 tracking-tight uppercase italic underline decoration-primary decoration-4 underline-offset-8">Authorize Payment</h2>
                  <button onClick={() => setStep('shipping')} className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:scale-105 transition-transform">Back to Delivery</button>
                </div>

                {!stripePromise ? (
                  <div className="p-12 text-center bg-red-50/50 border border-red-100 rounded-[2.5rem] space-y-6">
                    <div className="w-20 h-20 bg-red-100/50 rounded-full flex items-center justify-center mx-auto">
                      <Lock className="h-10 w-10 text-red-500" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-xl font-black text-gray-950 uppercase tracking-tight">Payment Gateway Offline</h3>
                       <p className="text-sm font-medium text-gray-500 max-w-sm mx-auto leading-relaxed">The <code className="bg-red-100 px-1.5 py-0.5 rounded text-red-600">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> is missing from your <code className="font-bold text-gray-900">.env.local</code> file.</p>
                    </div>
                    <div className="pt-4">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Please add your Stripe test key to reactivate checkout flows.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col md:flex-row gap-8 mb-12">
                      <div className="flex-1 p-8 bg-emerald-50/30 border border-emerald-100 rounded-3xl relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-10 transition-transform group-hover:scale-125 duration-500">
                          <Truck className="w-24 h-24 text-emerald-600" />
                        </div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" /> Dispatching To:
                        </p>
                        <p className="text-base font-black text-gray-950 leading-relaxed uppercase tracking-tight">
                          {address.firstName} {address.lastName}<br />
                          <span className="text-gray-500 text-sm font-bold tracking-normal">{address.street}, {address.city}<br />{address.state} {address.zip}, {address.country}</span>
                        </p>
                      </div>

                      <div className="flex-1 p-8 bg-blue-50/30 border border-blue-100 rounded-3xl relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-10 transition-transform group-hover:scale-125 duration-500">
                          <CreditCard className="w-24 h-24 text-blue-600" />
                        </div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                           Security Verification
                        </p>
                        <p className="text-sm font-bold text-gray-500 leading-relaxed">
                          Your transaction is encrypted using 256-bit SSL technology. ShopHub does not store your raw card credentials.
                        </p>
                      </div>
                    </div>

                    {error && <div className="p-4 bg-red-50 text-red-700 text-xs font-black uppercase tracking-widest border-l-4 border-red-500 rounded-lg mb-8">{error}</div>}
                    
                    <Elements stripe={stripePromise}>
                      <CheckoutForm address={address} orderId={orderId} onSuccess={handlePaymentSuccess} onError={(msg) => setError(msg)} />
                    </Elements>
                    
                    <div className="flex items-center justify-center gap-6 mt-10">
                       <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-crosshair" />
                       <div className="w-px h-10 bg-gray-100" />
                       <div className="flex flex-col items-center">
                          <Shield className="h-5 w-5 text-emerald-500 mb-1" />
                          <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Certified Partner</p>
                       </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Checkout Totals & Sidebar */}
          <div className="xl:col-span-4 space-y-8">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-gray-200/50 border border-gray-50 relative">
               <div className="absolute -top-4 -right-4 w-12 h-12 premium-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 scale-90 rotate-12">
                  <ShoppingBag className="h-6 w-6 text-white" />
               </div>
               <h2 className="text-xl font-black text-gray-950 tracking-tight mb-6 pb-4 border-b border-gray-50 uppercase">Order Summary</h2>
               
               <div className="CartSumWrapper">
                  <CartSummary items={items} promoDiscount={promoDiscount} />
               </div>

               {step === 'shipping' && (
                  <div className="mt-10 pt-8 border-t border-gray-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 pl-1">Voucher Key</p>
                    {promoApplied ? (
                      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl group">
                        <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                        <div className="flex-1">
                           <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Applied</p>
                           <p className="text-sm font-black text-emerald-700">-${promoDiscount.toFixed(2)} Credit</p>
                        </div>
                        <button onClick={() => { setPromoApplied(false); setPromoDiscount(0); setPromoCode('') }} className="text-emerald-300 hover:text-red-500 transition-colors uppercase text-[10px] font-black">X</button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="SHOPHUB_20"
                          className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                        <button onClick={applyPromo} disabled={promoLoading || !promoCode}
                          className="px-6 py-3.5 bg-gray-950 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-black disabled:bg-gray-100 transition-all shadow-lg active:scale-95">
                          {promoLoading ? '...' : <ChevronRight className="h-5 w-5" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>

            <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-black/20">
               <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" /> Satisfaction Oath
               </h3>
               <div className="space-y-4">
                  {[
                    '60-Day Unconditional Returns',
                    'Zero-Hassle Global Shipping',
                    'Direct Manufacturer Warranty',
                    'Carbon-Neutral Dispatch'
                  ].map(trust => (
                    <div key={trust} className="flex items-center gap-4 group">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary group-hover:scale-150 transition-transform" />
                      <p className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">{trust}</p>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
