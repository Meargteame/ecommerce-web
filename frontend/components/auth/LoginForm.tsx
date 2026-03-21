'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/input'

export default function LoginForm() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const user = await login(form.email, form.password)
      if (user?.role === 'admin') router.push('/admin')
      else if (user?.role === 'seller') router.push('/seller')
      else router.push('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        || (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Invalid email or password')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        required
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        required
      />
      <div className="text-right">
        <Link href="/auth/forgot-password" className="text-sm hover:underline" style={{color:'#7C3AED'}}>
          Forgot password?
        </Link>
      </div>
      <button type="submit" disabled={loading}
        className="w-full py-2.5 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        style={{backgroundColor:'#7C3AED'}}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
