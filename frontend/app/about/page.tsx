'use client'

import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import { Heart, Globe, Shield, Zap, ChevronRight } from 'lucide-react'

const values = [
  { icon: <Heart className="h-6 w-6" />, title: 'Customer First', desc: 'Every decision we make starts with the question: how does this help our customers?' },
  { icon: <Shield className="h-6 w-6" />, title: 'Trust & Safety', desc: 'We invest heavily in fraud prevention and buyer/seller protection to keep everyone safe.' },
  { icon: <Globe className="h-6 w-6" />, title: 'Global Reach', desc: 'Connecting buyers and sellers across 50+ countries with seamless cross-border commerce.' },
  { icon: <Zap className="h-6 w-6" />, title: 'Innovation', desc: 'We continuously improve our platform with cutting-edge technology and user feedback.' },
]

const team = [
  { name: 'Alex Chen', role: 'CEO & Co-Founder', initials: 'AC' },
  { name: 'Sarah Johnson', role: 'CTO & Co-Founder', initials: 'SJ' },
  { name: 'Marcus Williams', role: 'Head of Operations', initials: 'MW' },
  { name: 'Priya Patel', role: 'Head of Design', initials: 'PP' },
]

const milestones = [
  { year: '2020', event: 'ShopHub founded with a vision to democratize e-commerce' },
  { year: '2021', event: 'Reached 10,000 sellers and 500,000 registered buyers' },
  { year: '2022', event: 'Expanded to 30 countries and launched mobile apps' },
  { year: '2023', event: 'Surpassed $100M in total seller earnings' },
  { year: '2024', event: 'Launched AI-powered product recommendations and seller tools' },
  { year: '2025', event: 'Now serving 10M+ buyers and 50K+ sellers worldwide' },
]

export default function AboutPage() {
  return (
    <>
      <Header />
      <CartDrawer />

      {/* Hero */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">We&apos;re Building the Future of Commerce</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            ShopHub is a marketplace where anyone can buy and sell anything — from everyday essentials to rare finds — with confidence and ease.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Our Mission</span>
              <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-4">Empowering Commerce for Everyone</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We believe that commerce should be accessible to everyone — whether you&apos;re a small business owner selling handmade goods or a global brand reaching new markets.
              </p>
              <p className="text-gray-600 leading-relaxed">
                ShopHub provides the tools, technology, and trust infrastructure that lets buyers shop with confidence and sellers build sustainable businesses.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '10M+', label: 'Active Buyers' },
                { value: '50K+', label: 'Sellers' },
                { value: '2M+', label: 'Products' },
                { value: '50+', label: 'Countries' },
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-50 rounded-xl p-6 text-center border border-gray-200">
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Our Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-700 mx-auto mb-4">
                  {v.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Our Journey</h2>
          <div className="relative">
            <div className="absolute left-16 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              {milestones.map((m) => (
                <div key={m.year} className="flex items-start gap-6">
                  <div className="shrink-0 w-14 text-right">
                    <span className="text-sm font-bold text-gray-900">{m.year}</span>
                  </div>
                  <div className="relative shrink-0 mt-1">
                    <div className="w-4 h-4 rounded-full bg-gray-900 border-2 border-white ring-2 ring-gray-200" />
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{m.event}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Meet the Team</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {team.map((member) => (
              <div key={member.name} className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-lg mx-auto mb-3">
                  {member.initials}
                </div>
                <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-900 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Join the ShopHub Community</h2>
          <p className="text-gray-400 mb-8">Whether you&apos;re here to shop or sell, there&apos;s a place for you on ShopHub.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/products" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-colors">
              Start Shopping <ChevronRight className="h-5 w-5" />
            </Link>
            <Link href="/sell" className="inline-flex items-center gap-2 px-8 py-4 bg-transparent text-white font-semibold rounded-xl hover:bg-white/10 transition-colors border border-white/30">
              Start Selling <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
