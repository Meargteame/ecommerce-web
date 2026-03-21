'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useAuthModalStore } from '@/store/authModalStore'
import {
  LayoutDashboard, Package, ShoppingBag, Settings, Store,
  ArrowLeft, BarChart2, Warehouse, DollarSign, Star,
} from 'lucide-react'

const navItems = [
  { href: '/seller', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/seller/products', label: 'Products', icon: Package },
  { href: '/seller/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/seller/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/seller/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/seller/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/seller/reviews', label: 'Reviews', icon: Star },
  { href: '/seller/settings', label: 'Settings', icon: Settings },
]

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const loadUser = useAuthStore((s) => s.loadUser)
  const openModal = useAuthModalStore((s) => s.openModal)

  useEffect(() => { loadUser() }, [])

  useEffect(() => {
    if (user === null) return
    if (!user) {
      openModal('login')
      router.replace('/')
      return
    }
    if (user.role !== 'seller' && user.role !== 'admin') {
      router.replace('/sell')
    }
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{borderColor:'#7C3AED', borderTopColor:'transparent'}} />
          <p className="text-gray-500 text-sm">Checking access...</p>
        </div>
      </div>
    )
  }

  if (user.role !== 'seller' && user.role !== 'admin') return null

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0 sticky top-0 h-screen">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{backgroundColor:'#7C3AED'}}>
            <Store className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">Seller Hub</p>
            <p className="text-[10px] text-gray-400 leading-tight truncate max-w-[120px]">{user.email}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-purple-50 border border-purple-100'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                style={active ? {color:'#7C3AED'} : {}}>
                <Icon className="h-4 w-4 shrink-0" style={active ? {color:'#7C3AED'} : {}} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <Link href="/"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to ShopHub
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
