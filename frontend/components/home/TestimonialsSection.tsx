'use client'

import { Star, Quote } from 'lucide-react'

const testimonials = [
  { name: 'Sarah M.', role: 'Fashion Enthusiast', rating: 5, quote: "ShopHub has become my go-to marketplace. Great prices, reliable sellers, and the variety is unmatched!", avatar: 'SM', color: 'bg-gray-900' },
  { name: 'James K.', role: 'Tech Buyer', rating: 5, quote: "I've bought electronics, home goods, and sports equipment here. So easy to find exactly what I need.", avatar: 'JK', color: 'bg-[#7C3AED]' },
  { name: 'Emily R.', role: 'Home Decorator', rating: 5, quote: "Best marketplace I've used. From furniture to gadgets — everything in one place with great buyer protection.", avatar: 'ER', color: 'bg-rose-600' },
  { name: 'David L.', role: 'Regular Shopper', rating: 4, quote: "Fast shipping, easy returns, and the deals are genuinely good. I recommend ShopHub to everyone.", avatar: 'DL', color: 'bg-emerald-600' },
]

export default function TestimonialsSection() {
  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900">Trusted by Millions</h2>
          <p className="text-gray-500 text-sm mt-1">Join over 10 million happy shoppers worldwide</p>
          <div className="flex items-center justify-center gap-1 mt-3">
            {[1,2,3,4,5].map(s => <Star key={s} className="h-5 w-5 fill-yellow-400 text-yellow-400" />)}
            <span className="ml-2 text-sm font-semibold text-gray-700">4.8 / 5 average rating</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <Quote className="h-6 w-6 text-gray-200" />
              <p className="text-sm text-gray-600 leading-relaxed flex-1">"{t.quote}"</p>
              <div className="flex items-center gap-1 mt-1">
                {[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= t.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{t.avatar}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
