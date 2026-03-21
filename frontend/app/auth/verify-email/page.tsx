'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    token ? 'loading' : 'idle'
  )
  const [message, setMessage] = useState('')

  // Resend form
  const [email, setEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [resendMsg, setResendMsg] = useState('')

  useEffect(() => {
    if (!token) return
    api.post('/auth/verify-email', { token })
      .then(() => {
        setStatus('success')
        setMessage('Your email has been verified. You can now sign in.')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err?.response?.data?.error || 'Invalid or expired verification link.')
      })
  }, [token])

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setResendLoading(true)
    setResendStatus('idle')
    try {
      await api.post('/auth/resend-verification', { email: email.trim() })
      setResendStatus('success')
      setResendMsg('If eligible, a verification email has been sent. Check your inbox.')
    } catch {
      setResendStatus('error')
      setResendMsg('Something went wrong. Please try again.')
    }
    setResendLoading(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12 border-t border-gray-100">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-violet-700 rounded-2xl flex items-center justify-center">
          <span className="text-white font-black text-base">S</span>
        </div>
        <span className="font-extrabold text-gray-900 text-xl">Shop<span className="text-violet-500">Hub</span></span>
      </Link>
      <div className="bg-white rounded-2xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.1)] border border-gray-200 p-8 sm:p-10 text-center max-w-md w-full">
        {/* Token verification states */}
        {status === 'loading' && (
          <div className="text-center py-4">
            <Loader2 className="h-10 w-10 animate-spin text-violet-400 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Email Verified!</h1>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <Link href="/auth/login"
              className="inline-flex items-center px-6 py-2.5 bg-violet-500 hover:bg-violet-700 text-white text-sm font-semibold rounded-full transition-colors">
              Sign In
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
          </div>
        )}

        {status === 'idle' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-violet-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h1>
            <p className="text-gray-500 text-sm mb-6">
              We sent a verification link to your email. Click it to activate your account.
            </p>
          </div>
        )}

        {/* Resend section — shown when no token or on error */}
        {(status === 'idle' || status === 'error') && (
          <div className="border-t border-gray-100 pt-6 mt-2">
            <p className="text-sm font-medium text-gray-700 mb-3">Didn&apos;t receive it? Resend below.</p>
            {resendStatus === 'success' ? (
              <div className="flex items-start gap-2 p-3 bg-green-50 rounded-2xl text-sm text-green-700">
                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {resendMsg}
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3">
                {resendStatus === 'error' && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{resendMsg}</p>
                )}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full py-2.5 bg-violet-500 hover:bg-violet-700 text-white text-sm font-semibold rounded-full transition-colors disabled:bg-gray-300"
                >
                  {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <p className="text-center mt-5 text-sm text-gray-500">
        <Link href="/auth/login" className="text-violet-500 hover:underline font-medium">Back to Sign In</Link>
      </p>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
