'use client'


export const dynamic = 'force-dynamic';
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/HeaderWrapper'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { DollarSign, TrendingUp, Shield, Users, Package, BarChart2, ChevronRight, CheckCircle, Loader2 } from 'lucide-react'

const benefits = [
  { icon: <DollarSign className="h-6 w-6" />, title: 'Low Fees', desc: 'Keep more of what you earn with our competitive seller fees starting at just 5%.' },
  { icon: <TrendingUp className="h-6 w-6" />, title: 'Reach Millions', desc: 'List your products in front of millions of active buyers across the globe.' },
  { icon: <Shield className="h-6 w-6" />, title: 'Seller Protection', desc: 'Our seller protection program keeps your business safe from fraud and disputes.' },
  { icon: <Users className="h-6 w-6" />, title: 'Seller Support', desc: 'Dedicated support team available 7 days a week to help you grow.' },
  { icon: <Package className="h-6 w-6" />, title: 'Easy Listings', desc: 'List products in minutes with our intuitive product management tools.' },
  { icon: <BarChart2 className="h-6 w-6" />, title: 'Analytics', desc: 'Track your sales, views, and revenue with detailed analytics dashboards.' },
]

const steps = [
  { num: '01', title: 'Create an Account', desc: 'Sign up for free and complete your seller profile in minutes.' },
  { num: '02', title: 'List Your Products', desc: 'Add your products with photos, descriptions, and pricing.' },
  { num: '03', title: 'Start Selling', desc: 'Receive orders, ship products, and get paid directly to your account.' },
]

const perks = [
  'No monthly subscription fees',
  'Instant payouts after delivery',
  'Built-in shipping label generation',
  'Promotional tools and discount codes',
  'Inventory management system',
  'Customer review management',
]

export default function SellPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')

  const isSeller = user?.role === 'seller' || user?.role === 'admin'

  const handleBecomeSeller = async () => {
    setUpgrading(true)
    setUpgradeError('')
    try {
      const { data } = await api.post('/users/become-seller')
      // Update local auth state with new role
      setUser({ ...user!, role: data.data.role })
      router.push('/seller')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setUpgradeError(e?.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setUpgrading(false)
    }
  }

  const HeroCTA = () => {
    if (!user) {
      return (
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register" className="inline-flex items-center gap-2 px-8 py-4 bg-violet-500 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors text-lg">
            Start Selling Free <ChevronRight className="h-5 w-5" />
          </Link>
          <Link href="/auth/login" className="inline-flex items-center gap-2 px-8 py-4 bg-transparent text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-lg border border-white/30">
            Sign In
          </Link>
        </div>
      )
    }
    if (isSeller) {
      return (
        <Link href="/seller" className="inline-flex items-center gap-2 px-8 py-4 bg-violet-500 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors text-lg">
          Go to Seller Dashboard <ChevronRight className="h-5 w-5" />
        </Link>
      )
    }
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={handleBecomeSeller}
          disabled={upgrading}
          className="inline-flex items-center gap-2 px-8 py-4 bg-violet-500 text-white font-bold rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-colors text-lg"
        >
          {upgrading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
          {upgrading ? 'Activating...' : 'Become a Seller Now'}
        </button>
        {upgradeError && <p className="text-red-300 text-sm">{upgradeError}</p>}
        <p className="text-gray-400 text-sm">Logged in as {user.email}</p>
      </div>
    )
  }

  return (
    <>
      <Header />
      <CartDrawer />

      {/* Hero */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block bg-violet-500/20 text-violet-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            Join 50,000+ sellers on ShopHub
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
            Turn Your Products Into<br />a Thriving Business
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Reach millions of buyers, manage your inventory, and grow your revenue — all from one powerful platform.
          </p>
          <HeroCTA />
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: '50K+', label: 'Active Sellers' },
              { value: '2M+', label: 'Products Listed' },
              { value: '10M+', label: 'Happy Buyers' },
              { value: '$500M+', label: 'Seller Earnings' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-[#f5f5f5]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Why Sell on ShopHub?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center text-violet-500 mb-4">
                  {b.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">How It Works</h2>
          <div className="space-y-6">
            {steps.map((step) => (
              <div key={step.num} className="flex items-start gap-6">
                <div className="shrink-0 w-14 h-14 bg-violet-500 text-white rounded-xl flex items-center justify-center font-bold text-lg">
                  {step.num}
                </div>
                <div className="pt-2">
                  <h3 className="font-semibold text-gray-900 text-lg">{step.title}</h3>
                  <p className="text-gray-600 mt-1">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="py-16 bg-[#f5f5f5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Everything You Need to Succeed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {perks.map((perk) => (
              <div key={perk} className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-200">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <span className="text-sm font-medium text-gray-800">{perk}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-900 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Selling?</h2>
          <p className="text-gray-400 mb-8">Join thousands of sellers already growing their business on ShopHub. It&apos;s free to get started.</p>
          {!user ? (
            <Link href="/auth/register" className="inline-flex items-center gap-2 px-8 py-4 bg-violet-500 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors text-lg">
              Create Seller Account <ChevronRight className="h-5 w-5" />
            </Link>
          ) : isSeller ? (
            <Link href="/seller" className="inline-flex items-center gap-2 px-8 py-4 bg-violet-500 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors text-lg">
              Go to Dashboard <ChevronRight className="h-5 w-5" />
            </Link>
          ) : (
            <button onClick={handleBecomeSeller} disabled={upgrading}
              className="inline-flex items-center gap-2 px-8 py-4 bg-violet-500 text-white font-bold rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-colors text-lg">
              {upgrading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
              {upgrading ? 'Activating...' : 'Become a Seller'}
            </button>
          )}
        </div>
      </section>

      <Footer />
    </>
  )
}
