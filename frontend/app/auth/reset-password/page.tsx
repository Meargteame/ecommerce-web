'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react'

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    const failed = passwordRules.filter((r) => !r.test(password))
    if (failed.length) {
      setError(`Password needs: ${failed.map((r) => r.label.toLowerCase()).join(', ')}`)
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/reset-password', { token, newPassword: password })
      setSuccess(true)
      setTimeout(() => router.push('/'), 2000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Reset failed. The link may have expired.')
    }
    setLoading(false)
  }

  if (!token) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="font-bold text-gray-900 mb-2">Invalid reset link</h2>
        <p className="text-sm text-gray-500 mb-4">This link is missing a token.</p>
        <Link href="/auth/forgot-password" className="text-sm text-violet-500 hover:underline font-medium">
          Request a new reset link
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="font-bold text-gray-900 mb-2">Password reset!</h2>
        <p className="text-sm text-gray-500">Redirecting you home...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
        />
        {password && (
          <div className="mt-2 space-y-1">
            {passwordRules.map((r) => {
              const ok = r.test(password)
              return (
                <div key={r.label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                  {ok
                    ? <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                  {r.label}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-violet-500 hover:bg-violet-700 text-white text-sm font-semibold rounded-full transition-colors disabled:bg-gray-300"
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
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
          <h1 className="text-xl font-bold text-gray-900 mb-1">Set new password</h1>
          <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            </div>
          }>
            <ResetPasswordContent />
          </Suspense>
        </div>

        <Link href="/auth/login"
          className="flex items-center justify-center gap-1.5 mt-5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Sign In
        </Link>
      </div>
    </div>
  )
}
