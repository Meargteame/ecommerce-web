'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import { Search, Package, CreditCard, Truck, RotateCcw, User, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'

const categories = [
  { icon: <Package className="h-6 w-6" />, label: 'Orders', href: '#orders' },
  { icon: <CreditCard className="h-6 w-6" />, label: 'Payments', href: '#payments' },
  { icon: <Truck className="h-6 w-6" />, label: 'Shipping', href: '#shipping' },
  { icon: <RotateCcw className="h-6 w-6" />, label: 'Returns', href: '#returns' },
  { icon: <User className="h-6 w-6" />, label: 'Account', href: '#account' },
  { icon: <MessageCircle className="h-6 w-6" />, label: 'Contact Us', href: '#contact' },
]

const faqs: { section: string; id: string; items: { q: string; a: string }[] }[] = [
  {
    section: 'Orders', id: 'orders',
    items: [
      { q: 'How do I track my order?', a: 'You can track your order by visiting the Track Order page and entering your order ID. You can also find your order ID in your account under My Orders.' },
      { q: 'Can I cancel or modify my order?', a: "Orders can be cancelled within 1 hour of placement if they haven't been processed yet. Go to My Orders, select the order, and click Cancel. Modifications are not supported after placement." },
      { q: 'What if I receive the wrong item?', a: "Contact our support team within 7 days of delivery with your order ID and a photo of the item received. We'll arrange a replacement or refund." },
    ],
  },
  {
    section: 'Payments', id: 'payments',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept all major credit/debit cards (Visa, Mastercard, Amex), PayPal, and bank transfers. All payments are secured with 256-bit SSL encryption.' },
      { q: 'When will I be charged?', a: 'Your card is charged immediately when you place an order. For bank transfers, payment must be completed within 24 hours or the order will be cancelled.' },
      { q: 'How do I get a refund?', a: 'Refunds are processed within 5-7 business days after we receive and inspect the returned item. The amount will be credited back to your original payment method.' },
    ],
  },
  {
    section: 'Shipping', id: 'shipping',
    items: [
      { q: 'How long does shipping take?', a: 'Standard shipping takes 5-7 business days. Express shipping (2-3 days) and overnight options are available at checkout for an additional fee.' },
      { q: 'Do you offer free shipping?', a: 'Yes! Orders over $50 qualify for free standard shipping. Some sellers may offer free shipping on all their products regardless of order value.' },
      { q: 'Do you ship internationally?', a: 'We currently ship to over 50 countries. International shipping times vary by destination (typically 10-21 business days). Additional customs fees may apply.' },
    ],
  },
  {
    section: 'Returns', id: 'returns',
    items: [
      { q: 'What is your return policy?', a: 'Most items can be returned within 30 days of delivery in their original condition. Some categories like digital goods and perishables are non-returnable.' },
      { q: 'How do I start a return?', a: 'Go to My Orders, select the order, and click "Return Item". Follow the instructions to print a prepaid return label and drop off the package.' },
      { q: 'Who pays for return shipping?', a: 'If the return is due to our error (wrong item, defective product), we cover return shipping. For change-of-mind returns, a $5.99 return shipping fee applies.' },
    ],
  },
  {
    section: 'Account', id: 'account',
    items: [
      { q: 'How do I reset my password?', a: "Click \"Forgot Password\" on the login page and enter your email. You'll receive a reset link within a few minutes. Check your spam folder if you don't see it." },
      { q: 'How do I update my email address?', a: 'For security reasons, email changes require identity verification. Contact our support team with your current email and we\'ll guide you through the process.' },
      { q: 'How do I delete my account?', a: 'Account deletion requests can be submitted through our support form. Note that this action is irreversible and all order history will be permanently removed.' },
    ],
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-4 text-left gap-4"
      >
        <span className="font-medium text-gray-900 text-sm">{q}</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>
      {open && <p className="pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>}
    </div>
  )
}

export default function HelpPage() {
  const [search, setSearch] = useState('')

  const filtered = faqs.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        !search ||
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((s) => s.items.length > 0)

  return (
    <>
      <Header />
      <CartDrawer />

      {/* Hero */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold mb-3">How can we help you?</h1>
          <p className="text-gray-400 mb-8">Search our help center or browse topics below</p>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for answers..."
              className="w-full px-5 py-4 pl-12 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
            />
            <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!search && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
            {categories.map((cat) => (
              <a
                key={cat.label}
                href={cat.href}
                className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors text-center"
              >
                <span className="text-gray-600">{cat.icon}</span>
                <span className="font-medium text-gray-900 text-sm">{cat.label}</span>
              </a>
            ))}
          </div>
        )}

        <div className="space-y-8">
          {filtered.map((section) => (
            <div key={section.id} id={section.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-bold text-gray-900">{section.section}</h2>
              </div>
              <div className="px-6">
                {section.items.map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="font-medium">No results found for &quot;{search}&quot;</p>
              <p className="text-sm mt-1">Try different keywords or contact our support team.</p>
            </div>
          )}
        </div>

        <div id="contact" className="mt-12 bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
          <MessageCircle className="h-10 w-10 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Still need help?</h2>
          <p className="text-gray-600 mb-6">Our support team is available Monday–Friday, 9am–6pm EST.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:support@shophub.com" className="px-6 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors">
              Email Support
            </a>
            <Link href="/track-order" className="px-6 py-3 bg-white text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors">
              Track an Order
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
