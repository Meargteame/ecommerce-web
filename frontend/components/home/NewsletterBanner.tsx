'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'

export default function NewsletterBanner() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) setSubmitted(true)
  }

  return (
    <section className="w-full bg-white py-20 mt-12 relative overflow-hidden border-t border-gray-100">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="max-w-[1920px] mx-auto px-6 lg:px-12 text-center relative z-10">
        <div className="w-16 h-16 premium-gradient rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/20 rotate-12 transition-transform duration-500">
          <Mail className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Stay in the <span className="text-primary">Inner Circle</span></h2>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto font-medium">
          Subscribe to our newsletter and never miss a sale, new arrival, or exclusive offer.
        </p>
        {submitted ? (
          <div className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 font-bold text-sm rounded-2xl shadow-xl shadow-primary/20 animate-in fade-in zoom-in duration-500">
            You&apos;re subscribed!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto relative group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="flex-1 h-14 px-6 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
            />
            <button type="submit"
              className="h-14 px-8 premium-gradient hover:shadow-2xl hover:shadow-primary/30 text-white text-sm font-bold rounded-2xl transition-all shadow-xl shadow-primary/10 shrink-0">
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
