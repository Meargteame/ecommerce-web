'use client'

import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ShoppingCart, Search, ChevronDown, Heart, Menu, X, Bell, User, MapPin, ShoppingBag } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useAuthModalStore } from '@/store/authModalStore'
import api from '@/lib/api'

const categories = [
  { href: '/products?category=electronics', label: 'Electronics' },
  { href: '/products?category=beauty', label: 'Beauty & Fragrance' },
  { href: '/products?category=home-living', label: 'Home & Kitchen' },
  { href: '/products?category=food', label: 'Grocery' },
  { href: '/products?category=fashion&gender=men', label: "Men's Fashion" },
  { href: '/products?category=fashion&gender=women', label: "Women's Fashion" },
  { href: '/products?category=toys', label: 'Baby' },
  { href: '/products?category=toys', label: 'Toys' },
  { href: '/products?category=fashion&age=kids', label: "Kids' Fashion" },
  { href: '/products?category=sports', label: 'Sports & Outdoors' },
  { href: '/products?category=health', label: 'Health & Nutrition' },
  { href: '/products?sale=true', label: 'Sale 🔥' },
  { href: '/sell', label: 'Sell on ShopHub' },
]

const categoryMegaMenu: Record<string, {
  links: { label: string; href: string }[]
  promo: { title: string; subtitle: string; href: string }
}> = {
  Electronics: {
    links: [
      { label: 'Smartphones', href: '/search?q=smartphone' },
      { label: 'Laptops', href: '/search?q=laptop' },
      { label: 'Headphones', href: '/search?q=headphones' },
      { label: 'Cameras', href: '/search?q=camera' },
      { label: 'Gaming', href: '/search?q=gaming' },
      { label: 'Smart Home', href: '/search?q=smart+home' },
    ],
    promo: {
      title: 'Weekend Tech Drop',
      subtitle: 'Extra savings on selected gadgets',
      href: '/products?category=electronics&sale=true',
    },
  },
  'Beauty & Fragrance': {
    links: [
      { label: 'Skincare', href: '/search?q=skincare' },
      { label: 'Makeup', href: '/search?q=makeup' },
      { label: 'Fragrances', href: '/search?q=perfume' },
      { label: 'Hair Care', href: '/search?q=hair+care' },
      { label: 'Bath & Body', href: '/search?q=bath+body' },
      { label: 'Beauty Tools', href: '/search?q=beauty+tools' },
    ],
    promo: {
      title: 'Beauty Picks',
      subtitle: 'Trending products loved by buyers',
      href: '/products?category=beauty',
    },
  },
  'Home & Kitchen': {
    links: [
      { label: 'Kitchen Essentials', href: '/search?q=kitchen' },
      { label: 'Furniture', href: '/search?q=furniture' },
      { label: 'Bedding', href: '/search?q=bedding' },
      { label: 'Storage', href: '/search?q=storage' },
      { label: 'Decor', href: '/search?q=decor' },
      { label: 'Cleaning', href: '/search?q=cleaning' },
    ],
    promo: {
      title: 'Home Refresh',
      subtitle: 'Make every room feel brand new',
      href: '/products?category=home-living',
    },
  },
  "Men's Fashion": {
    links: [
      { label: 'Shirts', href: '/search?q=men+shirt' },
      { label: 'Jeans', href: '/search?q=men+jeans' },
      { label: 'Sneakers', href: '/search?q=men+sneakers' },
      { label: 'Watches', href: '/search?q=men+watch' },
      { label: 'Jackets', href: '/search?q=men+jacket' },
      { label: 'Accessories', href: '/search?q=men+accessories' },
    ],
    promo: {
      title: 'Menswear Edit',
      subtitle: 'New fits dropping this week',
      href: '/products?category=fashion&gender=men',
    },
  },
  "Women's Fashion": {
    links: [
      { label: 'Dresses', href: '/search?q=women+dress' },
      { label: 'Handbags', href: '/search?q=handbag' },
      { label: 'Heels', href: '/search?q=heels' },
      { label: 'Jewelry', href: '/search?q=jewelry' },
      { label: 'Outerwear', href: '/search?q=women+jacket' },
      { label: 'Athleisure', href: '/search?q=women+activewear' },
    ],
    promo: {
      title: 'Style Spotlight',
      subtitle: 'Trending looks at fresh prices',
      href: '/products?category=fashion&gender=women',
    },
  },
  'Sports & Outdoors': {
    links: [
      { label: 'Running', href: '/search?q=running' },
      { label: 'Cycling', href: '/search?q=cycling' },
      { label: 'Gym & Fitness', href: '/search?q=fitness' },
      { label: 'Camping', href: '/search?q=camping' },
      { label: 'Team Sports', href: '/search?q=football' },
      { label: 'Outdoor Gear', href: '/search?q=outdoor+gear' },
    ],
    promo: {
      title: 'Move More',
      subtitle: 'Gear up for indoor and outdoor training',
      href: '/products?category=sports',
    },
  },
}

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const count = useCartStore((s) => s.count)
  const setCartOpen = useCartStore((s) => s.setOpen)
  const searchParams = useSearchParams()
  const openModal = useAuthModalStore((s) => s.openModal)
  const [searchTerm, setSearchTerm] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [signOutModalOpen, setSignOutModalOpen] = useState(false)
  const [activeCategoryMenu, setActiveCategoryMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const auth = searchParams.get('auth')
    if (auth === 'login') openModal('login')
    if (auth === 'register') openModal('register')
  }, [searchParams, openModal])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setMobileMenuOpen(false) }, [pathname])

  useEffect(() => {
    if (!user) { setUnreadNotifs(0); return }
    api.get('/notifications').then(({ data }) => {
      const notifs = data.data?.notifications || []
      setUnreadNotifs(notifs.filter((n: { is_read: boolean }) => !n.is_read).length)
    }).catch(() => {})
  }, [user])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`)
  }

  const cartCount = count()
  const activeMegaMenu = activeCategoryMenu ? categoryMegaMenu[activeCategoryMenu] : null

  return (
    <>
      <header className={`w-full sticky top-0 z-40 transition-all duration-300 ${
        scrolled ? 'glass py-1' : 'bg-white py-3'
      }`}>

        {/* ── TOP BAR ── */}
        <div className="">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-14 gap-4 lg:gap-8">

              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 group shrink-0">
                <div className="w-9 h-9 premium-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-all duration-300">
                  <ShoppingBag className="text-white h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 text-xl tracking-tight leading-none">ShopHub</span>
                  <span className="text-[10px] text-primary/70 font-bold uppercase tracking-[0.2em] leading-none mt-1">Premium Store</span>
                </div>
              </Link>

              {/* Deliver to — noon has this between logo and search */}
              <button className="hidden lg:flex items-center gap-1.5 shrink-0 text-left group">
                <MapPin className="h-4 w-4 text-[#6B7280] shrink-0" />
                <div className="leading-tight">
                  <p className="text-[10px] text-[#6B7280]">Deliver to</p>
                  <p className="text-xs font-semibold text-[#111111] flex items-center gap-0.5">
                    Worldwide <ChevronDown className="h-3 w-3 text-[#6B7280]" />
                  </p>
                </div>
              </button>

              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
                <div className="group flex items-center h-11 bg-gray-100 border-none rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white transition-all">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search for products, brands and more"
                    className="flex-1 h-full px-5 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="h-full px-6 text-gray-400 hover:text-primary transition-colors shrink-0 flex items-center justify-center"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </form>

              {/* Right actions — compact, icon + label style like noon */}
              <div className="flex items-center gap-0.5 shrink-0">

                {/* Notifications (logged in only) */}
                {user && (
                  <Link href="/notifications"
                    className="relative hidden sm:flex flex-col items-center justify-center w-10 h-10 text-[#6B7280] hover:text-[#111111] rounded transition-colors">
                    <Bell className="h-5 w-5" />
                    {unreadNotifs > 0 && (
                      <span className="absolute top-1 right-1 min-w-[15px] h-[15px] bg-[#7C3AED] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                        {unreadNotifs > 9 ? '9+' : unreadNotifs}
                      </span>
                    )}
                  </Link>
                )}

                {/* Wishlist */}
                <Link href="/wishlist"
                  className="hidden sm:flex items-center justify-center w-10 h-10 text-[#6B7280] hover:text-[#111111] rounded transition-colors">
                  <Heart className="h-5 w-5" />
                </Link>

                {/* Cart */}
                <button
                  onClick={() => setCartOpen(true)}
                  className="relative flex items-center justify-center w-10 h-10 text-[#6B7280] hover:text-[#111111] rounded transition-colors mr-1"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[15px] h-[15px] bg-[#7C3AED] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>

                {/* Account */}
                {user ? (
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="hidden sm:flex flex-col items-center justify-center gap-0.5 px-2 h-10 text-[#6B7280] hover:text-[#111111] rounded transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#111111] flex items-center justify-center text-white font-semibold text-[10px] shrink-0">
                        {user.first_name[0]}{user.last_name[0]}
                      </div>
                      <span className="text-[10px] font-medium leading-none hidden lg:block">{user.first_name}</span>
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-[#E5E7EB] rounded-lg shadow-xl py-1 z-50 overflow-hidden text-left">
                        <div className="px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB]">
                          <p className="text-sm font-semibold text-[#111111] whitespace-nowrap overflow-hidden text-ellipsis">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-[#6B7280] truncate">{user.email}</p>
                        </div>
                        <div className="py-1">
                          {[
                            { href: '/account/profile', label: 'My Profile' },
                            { href: '/account/orders', label: 'My Orders' },
                            { href: '/account/billing', label: 'Payment Methods' },
                            { href: '/account/addresses', label: 'Saved Addresses' },
                          ].map((item) => (
                            <Link key={item.label} href={item.href} onClick={() => setUserMenuOpen(false)}
                                  className="block px-4 py-2.5 text-sm text-[#4B5563] font-medium hover:text-[#111111] hover:bg-[#F3F4F6] transition-colors">
                              {item.label}
                            </Link>
                          ))}
                        </div>
                        <div className="border-t border-[#E5E7EB] py-1">
                          {user.role === 'customer' && (
                            <Link href="/sell" onClick={() => setUserMenuOpen(false)}
                                  className="block px-4 py-2.5 text-sm text-[#4B5563] font-medium hover:text-[#111111] hover:bg-[#F3F4F6] transition-colors">
                              Start Selling
                            </Link>
                          )}
                          {user.role === 'seller' && (
                            <Link href="/seller" onClick={() => setUserMenuOpen(false)}
                                  className="block px-4 py-2.5 text-sm text-[#7C3AED] font-bold hover:bg-[#F3F4F6] transition-colors">
                              Seller Dashboard
                            </Link>
                          )}
                          {user.role === 'admin' && (
                            <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                                  className="block px-4 py-2.5 text-sm text-[#ef4444] font-bold hover:bg-[#F3F4F6] transition-colors">
                              Admin Panel
                            </Link>
                          )}
                        </div>
                        <div className="border-t border-[#E5E7EB] py-1 bg-gray-50">
                          <button
                            onClick={() => { setUserMenuOpen(false); setSignOutModalOpen(true) }}
                            className="block w-full text-left px-4 py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 hover:text-red-700 transition-colors"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Log In button — noon style: icon + text */
                  <button
                    onClick={() => openModal('login')}
                    className="hidden sm:flex items-center gap-1.5 px-3 h-10 text-sm font-medium text-[#111111] hover:bg-[#F3F4F6] rounded transition-colors border border-[#E5E7EB]"
                  >
                    <User className="h-4 w-4 text-[#6B7280]" />
                    Log In
                  </button>
                )}

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden flex items-center justify-center w-10 h-10 text-[#6B7280] hover:bg-[#F3F4F6] rounded transition-colors"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── CATEGORY BAR ── */}
        <div
          className={`border-t border-gray-100 hidden md:block relative transition-all duration-300 ${
            scrolled ? 'h-0 opacity-0 overflow-hidden' : 'h-11 opacity-100'
          }`}
          onMouseLeave={() => setActiveCategoryMenu(null)}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 -ml-3">
              {categories.map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  onMouseEnter={() => setActiveCategoryMenu(categoryMegaMenu[cat.label] ? cat.label : null)}
                  className={`px-3 py-2 text-[13px] font-semibold transition-all rounded-lg relative group ${
                    activeCategoryMenu === cat.label ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  {cat.label}
                  <span className={`absolute bottom-1.5 left-3 right-3 h-0.5 bg-primary transition-all duration-300 transform scale-x-0 group-hover:scale-x-100 ${
                    activeCategoryMenu === cat.label ? 'scale-x-100' : ''
                  }`} />
                </Link>
              ))}
            </div>
          </div>

          {activeMegaMenu && (
            <div className="absolute left-0 right-0 top-full bg-white border-t border-[#E5E7EB] shadow-sm">
              <div className="w-full px-4 lg:px-6 py-4 grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Explore {activeCategoryMenu}</p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                    {activeMegaMenu.links.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setActiveCategoryMenu(null)}
                        className="px-3 py-2 text-sm text-[#374151] hover:text-[#111111] hover:bg-[#F9FAFB] border border-[#E5E7EB] transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <Link
                  href={activeMegaMenu.promo.href}
                  onClick={() => setActiveCategoryMenu(null)}
                  className="border border-[#E5E7EB] bg-[#F9FAFB] p-4 flex flex-col justify-between hover:border-[#7C3AED] transition-colors"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Featured</p>
                    <h3 className="text-base font-bold text-[#111111] mt-1">{activeMegaMenu.promo.title}</h3>
                    <p className="text-sm text-[#6B7280] mt-1">{activeMegaMenu.promo.subtitle}</p>
                  </div>
                  <p className="text-sm font-semibold text-[#7C3AED] mt-4">Shop collection →</p>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── MOBILE MENU ── */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-[#E5E7EB]">
            <div className="px-4 py-3">
              <form onSubmit={handleSearch}>
                <div className="flex items-center h-10 bg-[#F3F4F6] border border-[#E5E7EB] rounded-md overflow-hidden">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="What are you looking for?"
                    className="flex-1 h-full px-4 bg-transparent text-sm focus:outline-none"
                  />
                  <button type="submit" className="h-full px-4 bg-[#7C3AED] text-white">
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
            <nav className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-1">
              {categories.map((cat) => (
                <Link key={cat.label} href={cat.href}
                  className="py-1.5 text-sm text-[#374151] hover:text-[#111111]">
                  {cat.label}
                </Link>
              ))}
            </nav>
            {!user && (
              <div className="px-4 pb-4 flex gap-2">
                <button onClick={() => { openModal('login'); setMobileMenuOpen(false) }}
                  className="flex-1 py-2 border border-[#E5E7EB] rounded text-sm font-medium text-[#111111]">
                  Log In
                </button>
                <button onClick={() => { openModal('register'); setMobileMenuOpen(false) }}
                  className="flex-1 py-2 bg-[#7C3AED] text-white rounded text-sm font-semibold">
                  Register
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Sign Out Modal */}
      {signOutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white border border-[#E5E7EB] rounded-md shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-base font-semibold text-[#111111] mb-1">Sign out</h2>
            <p className="text-sm text-[#6B7280] mb-5">Are you sure you want to sign out?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setSignOutModalOpen(false)}
                className="flex-1 py-2 border border-[#E5E7EB] rounded text-sm font-medium text-[#111111] hover:bg-[#F9FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => { setSignOutModalOpen(false); await logout(); router.push('/') }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
