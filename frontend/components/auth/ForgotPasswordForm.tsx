'use client'

import { useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
        <p className="font-semibold text-gray-900">Check your email</p>
        <p className="text-sm text-gray-500">
          If an account exists for <span className="font-medium text-gray-700">{email}</span>, you&apos;ll receive a reset link shortly.
        </p>
        <Link href="/auth/login" className="block text-sm hover:underline mt-4" style={{color:'#7C3AED'}}>
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Sending...' : 'Send Reset Link'}
      </Button>
      <p className="text-center text-sm text-gray-600">
        Remember your password?{' '}
        <Link href="/auth/login" className="font-medium hover:underline" style={{color:'#7C3AED'}}>Sign in</Link>
      </p>
    </form>
  )
}
