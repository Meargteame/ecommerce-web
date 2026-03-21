'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Eye, EyeOff, CheckCircle, XCircle, Store, ShoppingBag } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuthModalStore } from '@/store/authModalStore'

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export default function AuthModal() {
  const router = useRouter()
  const { open, tab, closeModal, setTab } = useAuthModalStore()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const loading = useAuthStore((s) => s.loading)

  const [email, setEmail] = useState('')
  const [emailSubmitted, setEmailSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)

  const [regRole, setRegRole] = useState<'customer' | 'seller'>('customer')
  const [regForm, setRegForm] = useState({ firstName: '', lastName: '', password: '', confirm: '' })
  const [showRegPw, setShowRegPw] = useState(false)
  const [showRules, setShowRules] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) {
      setEmail('')
      setEmailSubmitted(false)
      setError('')
      setLoginPassword('')
      setRegForm({ firstName: '', lastName: '', password: '', confirm: '' })
      setShowRules(false)
      setTimeout(() => emailRef.current?.focus(), 50)
    }
  }, [open, tab])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, closeModal])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!mounted || !open) return null

  const switchTab = (t: 'login' | 'register') => {
    setTab(t)
    setEmailSubmitted(false)
    setError('')
    setEmail('')
  }

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    setError('')
    setEmailSubmitted(true)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, loginPassword)
      closeModal()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Invalid email or password')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (regForm.password !== regForm.confirm) { setError('Passwords do not match'); return }
    const failed = passwordRules.filter((r) => !r.test(regForm.password))
    if (failed.length > 0) { setError('Password does not meet all requirements'); return }
    try {
      await register({
        email,
        password: regForm.password,
        firstName: regForm.firstName,
        lastName: regForm.lastName,
        role: regRole,
      })
      closeModal()
      if (regRole === 'seller') router.push('/seller')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Registration failed. Please try again.')
    }
  }

  const setReg = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setRegForm((f) => ({ ...f, [k]: e.target.value }))

  const inputClass = 'w-full h-12 px-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary/30 transition-all placeholder:text-gray-400'

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={closeModal} />

      {/* Modal */}
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[440px] z-10 overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Decorative corner glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-6 right-6 w-10 h-10 glass rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all hover:rotate-90 z-20"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-8 sm:p-12">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 premium-gradient rounded-3xl flex items-center justify-center shadow-xl shadow-primary/30">
              <ShoppingBag className="text-white h-8 w-8" />
            </div>
          </div>

          <h2 className="text-3xl font-black text-gray-900 text-center mb-2 tracking-tight">
            {tab === 'login' ? 'Welcome back' : 'Join ShopHub'}
          </h2>
          <p className="text-center text-sm text-gray-500 font-medium mb-10">
            {tab === 'login' ? 'Please enter your details to sign in' : 'Create an account to start shopping'}
          </p>

          {/* Tab Switcher */}
          <div className="flex p-1 bg-gray-100 rounded-2xl mb-8">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-3 text-sm font-bold rounded-[0.85rem] transition-all duration-300 ${
                tab === 'login' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 py-3 text-sm font-bold rounded-[0.85rem] transition-all duration-300 ${
                tab === 'register' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-2xl mb-6 flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Forms */}
          {!emailSubmitted ? (
            <form onSubmit={handleEmailContinue} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={inputClass}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 premium-gradient text-white rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-95"
              >
                Continue
              </button>
            </form>
          ) : tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-gray-500 font-bold">{email}</span>
                <button type="button" onClick={() => setEmailSubmitted(false)} className="text-xs text-primary font-bold hover:underline">Change</button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end ml-1">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Password</label>
                  <Link href="/auth/forgot-password" onClick={closeModal} className="text-[11px] font-bold text-primary hover:underline uppercase tracking-wider">Forgot?</Link>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPw ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                    autoFocus
                    required
                  />
                  <button type="button" onClick={() => setShowLoginPw(!showLoginPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors">
                    {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 premium-gradient text-white rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-gray-500 font-bold">{email}</span>
                <button type="button" onClick={() => setEmailSubmitted(false)} className="text-xs text-primary font-bold hover:underline">Change</button>
              </div>

              <div className="flex p-1 bg-gray-50 border border-gray-100 rounded-2xl">
                <button type="button" onClick={() => setRegRole('customer')}
                  className={`flex-1 py-3 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                    regRole === 'customer' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'
                  }`}>
                  <ShoppingBag className="h-4 w-4" /> BUYER
                </button>
                <button type="button" onClick={() => setRegRole('seller')}
                  className={`flex-1 py-3 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                    regRole === 'seller' ? 'premium-gradient text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
                  }`}>
                  <Store className="h-4 w-4" /> SELLER
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">First Name</label>
                  <input type="text" value={regForm.firstName} onChange={setReg('firstName')} placeholder="John" className={inputClass} required />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
                  <input type="text" value={regForm.lastName} onChange={setReg('lastName')} placeholder="Doe" className={inputClass} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                  <div className="relative">
                    <input type={showRegPw ? 'text' : 'password'} value={regForm.password} onChange={setReg('password')} onFocus={() => setShowRules(true)} placeholder="Min. 8 chars" className={inputClass} required />
                    <button type="button" onClick={() => setShowRegPw(!showRegPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900">
                      {showRegPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm</label>
                  <div className="relative">
                    <input type={showRegPw ? 'text' : 'password'} value={regForm.confirm} onChange={setReg('confirm')} placeholder="Repeat it" className={inputClass} required />
                  </div>
                </div>
              </div>
              {showRules && regForm.password && (
                <div className="p-3 bg-gray-50 rounded-xl grid grid-cols-2 gap-2 mt-2">
                    {passwordRules.map((rule) => {
                      const ok = rule.test(regForm.password)
                      return (
                        <div key={rule.label} className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tight ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                          {ok ? <CheckCircle className="h-3 w-3" /> : <div className="w-3 h-3 border-2 border-current rounded-full opacity-20" />}
                          {rule.label}
                        </div>
                      )
                    })}
                  </div>
                )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 premium-gradient text-white rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
              >
                {loading ? 'Processing...' : 'Create Account'}
              </button>

              <p className="text-center text-[10px] text-gray-400 font-bold px-4 leading-relaxed">
                By signing up you agree to our{' '}
                <Link href="/terms" onClick={closeModal} className="text-primary hover:underline">Terms</Link>
                {' & '}
                <Link href="/privacy" onClick={closeModal} className="text-primary hover:underline">Privacy Policy</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
