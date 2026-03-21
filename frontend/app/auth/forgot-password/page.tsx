'use client'

import { useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { CheckCircle, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { email: email.trim() })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12 border-t border-gray-100">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-violet-700 rounded-2xl flex items-center justify-center">
          <span className="text-white font-black text-base">S</span>
        </div>
        <span className="font-extrabold text-gray-900 text-xl">Shop<span className="text-violet-500">Hub</span></span>
      </Link>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.1)] border border-gray-200 p-8 sm:p-10">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
              <p className="text-gray-500 text-sm mb-6">
                If an account exists for <span className="font-medium text-gray-700">{email}</span>, we&apos;ve sent a password reset link.
              </p>
              <button
                onClick={() => { setSent(false) }}
                className="text-sm text-violet-500 hover:underline font-medium"
              >
                Resend email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Reset your password</h1>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we&apos;ll send a reset link.</p>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl mb-4">{error}</p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-violet-500 hover:bg-violet-700 text-white text-sm font-semibold rounded-full transition-colors disabled:bg-gray-300"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>

        <Link href="/auth/login"
          className="flex items-center justify-center gap-1.5 mt-5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Sign In
        </Link>
      </div>
    </div>
  )
}
