'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/input'
import { CheckCircle, XCircle, ShoppingBag, Store } from 'lucide-react'

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
]

export default function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const register = useAuthStore((s) => s.register)
  const loading = useAuthStore((s) => s.loading)
  const [role, setRole] = useState<'customer' | 'seller'>('customer')
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [showRules, setShowRules] = useState(false)

  // Pre-select seller if ?seller=true in URL
  useEffect(() => {
    if (searchParams.get('seller') === 'true') setRole('seller')
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    const failedRules = passwordRules.filter((r) => !r.test(form.password))
    if (failedRules.length > 0) { setError(`Password must have: ${failedRules.map((r) => r.label.toLowerCase()).join(', ')}`); return }
    try {
      const user = await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, role })
      if (user?.role === 'admin') router.push('/admin')
      else if (user?.role === 'seller') router.push('/seller')
      else router.push('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        || (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Registration failed. Please try again.')
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Role toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          type="button"
          onClick={() => setRole('customer')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all ${
            role === 'customer'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          Buyer
        </button>
        <button
          type="button"
          onClick={() => setRole('seller')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all ${
            role === 'seller'
              ? 'text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          style={role === 'seller' ? {backgroundColor:'#7C3AED'} : {}}
        >
          <Store className="h-4 w-4" />
          Seller
        </button>
      </div>

      {role === 'seller' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2.5 text-xs text-[#7C3AED]">
          You&apos;ll get access to the Seller Dashboard to list products and manage orders.
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <Input label="First Name" placeholder="John" value={form.firstName} onChange={set('firstName')} required />
        <Input label="Last Name" placeholder="Doe" value={form.lastName} onChange={set('lastName')} required />
      </div>
      <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
      <div>
        <Input
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          value={form.password}
          onChange={set('password')}
          onFocus={() => setShowRules(true)}
          required
        />
        {showRules && form.password && (
          <div className="mt-2 space-y-1">
            {passwordRules.map((rule) => {
              const ok = rule.test(form.password)
              return (
                <div key={rule.label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                  {ok ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {rule.label}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <Input label="Confirm Password" type="password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} required />

      <button type="submit" disabled={loading}
        className={`w-full py-2.5 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
          role === 'seller'
            ? ''
            : 'bg-gray-900 hover:bg-gray-800'
        }`}
        style={role === 'seller' ? {backgroundColor:'#7C3AED'} : {}}>
        {loading ? 'Creating account...' : role === 'seller' ? 'Create Seller Account' : 'Create Account'}
      </button>

      <p className="text-center text-xs text-gray-400">
        By registering you agree to our{' '}
        <Link href="/terms" className="hover:underline" style={{color:'#7C3AED'}}>Terms</Link>
        {' '}and{' '}
        <Link href="/privacy" className="hover:underline" style={{color:'#7C3AED'}}>Privacy Policy</Link>
      </p>
    </form>
  )
}
