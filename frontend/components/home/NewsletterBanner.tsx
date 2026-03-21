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
    <section className="w-full px-4 sm:px-6 lg:px-8 py-4">
      <div className="bg-[#111111] px-8 py-10 text-center">
        <div className="w-10 h-10 bg-[#7C3AED] flex items-center justify-center mx-auto mb-4">
          <Mail className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Get the best deals first</h2>
        <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
          Subscribe to our newsletter and never miss a sale, new arrival, or exclusive offer.
        </p>
        {submitted ? (
          <div className="inline-flex items-center gap-2 bg-[#7C3AED] text-white px-6 py-3 font-semibold text-sm">
            You&apos;re subscribed!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="flex-1 h-11 px-4 bg-white/10 border border-white/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7C3AED] transition-colors"
            />
            <button type="submit"
              className="h-11 px-6 bg-[#7C3AED] hover:bg-purple-800 text-white text-sm font-semibold transition-colors shrink-0">
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
