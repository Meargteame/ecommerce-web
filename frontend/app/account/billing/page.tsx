'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, CreditCard, Lock, CheckCircle2, X } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import api from '@/lib/api'

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

interface PaymentMethod {
  id: string
  type: string
  provider: string
  last_four: string
  brand: string
  expiry_month: number
  expiry_year: number
  is_default: boolean
}

function StripeAddCardForm({ onSuccess, onCancel }: { onSuccess: (pm: PaymentMethod) => void, onCancel: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setSaving(true)
    setError(null)

    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) throw new Error("Card element not found")

      // Use Stripe to create a PaymentMethod securely on the client side
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      })

      if (stripeError) {
        throw new Error(stripeError.message || 'Failed to process card details')
      }

      // Send the tokenized details to the backend
      const res = await api.post('/payment-methods', {
        type: 'card',
        provider: 'stripe',
        providerToken: paymentMethod.id,
        lastFour: paymentMethod.card?.last4 || '',
        brand: paymentMethod.card?.brand || 'unknown',
        expiryMonth: paymentMethod.card?.exp_month || 12,
        expiryYear: paymentMethod.card?.exp_year || 2026,
        holderName: 'Account Holder',
        isDefault: true
      })
      
      onSuccess(res.data.data)
    } catch (err: any) {
      setError(err.message || 'Error adding payment method')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[#7C3AED]" /> Secure Card Entry
        </h3>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="text-sm font-medium text-gray-500 mb-6">Enter your card details below. They will be encrypted immediately and never stored raw.</p>
      
      <div className="p-5 border border-gray-200 rounded-xl bg-gray-50/50 shadow-inner">
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#111827',
              fontFamily: 'Inter, system-ui, sans-serif',
              '::placeholder': { color: '#9CA3AF' }
            },
            invalid: { color: '#EF4444' }
          }
        }} />
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg uppercase tracking-wider">{error}</div>}

      <div className="pt-4 flex gap-3">
        <button type="button" onClick={onCancel} disabled={saving} className="flex-1 py-3 text-gray-700 hover:bg-gray-100 font-bold rounded-xl transition-colors text-sm border border-gray-200 disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={!stripe || saving} className="flex-1 py-3 bg-[#111111] hover:bg-black text-white font-bold rounded-xl transition-colors shadow-lg shadow-black/10 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? 'Encrypting...' : <><Lock className="w-4 h-4" /> Save Card</>}
        </button>
      </div>
    </form>
  )
}


export default function BillingPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  const fetchPaymentMethods = async () => {
    try {
      const { data } = await api.get('/payment-methods')
      setPaymentMethods(data.data)
    } catch (error) {
      console.error('Failed to fetch payment methods', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this payment method?')) return
    try {
      await api.delete(`/payment-methods/${id}`)
      setPaymentMethods(methods => methods.filter(m => m.id !== id))
    } catch (error) {
      console.error('Failed to delete payment method', error)
    }
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-gray-100 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Payment Methods</h1>
          <p className="text-sm text-gray-500 mt-2">Manage your saved credit cards, verify billing details, and set your default payment preferences.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#111111] hover:bg-black text-white text-sm font-bold rounded-lg transition-colors shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" /> Add Payment Method
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-28 bg-gray-50 rounded-2xl border border-gray-100 animate-pulse" />
          <div className="h-28 bg-gray-50 rounded-2xl border border-gray-100 animate-pulse" />
        </div>
      ) : (
        <div className="space-y-0.5 border border-gray-200 rounded-2xl overflow-hidden shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] bg-gray-200">
          {paymentMethods.length === 0 ? (
            <div className="bg-white p-16 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5 relative">
                <CreditCard className="h-8 w-8 text-gray-300" />
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                  <Lock className="h-4 w-4 text-[#17B26A]" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No saved methods</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-6 text-sm">Add a credit or debit card for a faster checkout experience. Your card details are securely encrypted end-to-end.</p>
              <button onClick={() => setShowAddModal(true)} className="text-[#7C3AED] font-bold text-sm hover:underline flex items-center justify-center gap-1 mx-auto">
                <Lock className="w-3 h-3" /> Securely add a card
              </button>
            </div>
          ) : (
            paymentMethods.map((method) => (
              <div key={method.id} className={`bg-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${method.is_default ? 'bg-[#F9F5FF]' : 'hover:bg-gray-50'}`}>
                <div className="flex items-start gap-5">
                  <div className="w-16 h-11 bg-gradient-to-br from-gray-800 to-gray-900 rounded-md flex items-center justify-center shadow-inner shrink-0 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                    <span className="font-bold text-white text-xs tracking-wider uppercase z-10">{method.brand}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-bold text-gray-900">
                        {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last_four}
                      </p>
                      {method.is_default && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F9F5FF] border border-[#E9D7FE] text-[#7C3AED]">
                          <CheckCircle2 className="w-3 h-3" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      Expires {method.expiry_month.toString().padStart(2, '0')} / {method.expiry_year}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full sm:w-auto pt-4 sm:pt-0 border-t border-gray-100 sm:border-0 pl-[5.25rem] sm:pl-0">
                  <button onClick={() => handleDelete(method.id)} className="text-sm font-bold text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1.5 ml-auto sm:ml-0">
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      <div className="mt-8 flex items-start gap-3 p-4 bg-[#F9FAFB] rounded-xl border border-gray-200">
        <Lock className="w-5 h-5 text-[#17B26A] shrink-0 mt-0.5" />
        <p className="text-xs font-semibold text-gray-500 leading-relaxed max-w-2xl">
          Payments are securely processed by Stripe. We do not store your full credit card number or CVV code on our servers. Your payment information is encrypted with 256-bit SSL technology.
        </p>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          {stripePromise ? (
            <Elements stripe={stripePromise}>
              <StripeAddCardForm 
                onSuccess={(pm) => {
                  setPaymentMethods([pm, ...paymentMethods.filter(m => !m.is_default)])
                  setShowAddModal(false)
                }} 
                onCancel={() => setShowAddModal(false)} 
              />
            </Elements>
          ) : (
            <div className="bg-white p-8 rounded-2xl w-full max-w-sm text-center">
              <h3 className="text-lg font-bold text-red-600 mb-2">Stripe Not Configured</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">Please add your Stripe Publishable Key to the .env.local file to test card processing.</p>
              <button onClick={() => setShowAddModal(false)} className="px-6 py-2 bg-gray-100 text-gray-900 hover:bg-gray-200 font-bold rounded-lg text-sm transition-colors">Close</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
