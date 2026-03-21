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
        <div className="w-full border-b border-gray-100/80">
          <div className="w-full mx-auto px-6 lg:px-12">
            <div className="flex items-center h-20 gap-10 xl:gap-20">

              {/* Logo */}
              <Link href="/" className="flex items-center gap-4 group shrink-0 transition-transform hover:scale-[1.02]">
                <div className="w-12 h-12 premium-gradient rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-500">
                  <ShoppingBag className="text-white h-7 w-7" />
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-gray-900 text-3xl tracking-tighter leading-none">ShopHub</span>
                  <span className="text-[10px] text-primary/70 font-black uppercase tracking-[0.4em] leading-none mt-2 transition-colors group-hover:text-primary">Premium Store</span>
                </div>
              </Link>

              {/* Deliver to */}
              <button className="hidden xl:flex items-center gap-4 shrink-0 text-left group px-6 py-3 bg-gray-50/50 hover:bg-gray-50 rounded-[1.5rem] border border-transparent hover:border-gray-200 transition-all duration-300">
                <MapPin className="h-6 w-6 text-gray-400 group-hover:text-primary transition-colors shrink-0" />
                <div className="leading-tight">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Deliver to</p>
                  <p className="text-sm font-black text-gray-900 flex items-center gap-2">
                    Worldwide <ChevronDown className="h-4 w-4 text-primary group-hover:translate-y-0.5 transition-transform" />
                  </p>
                </div>
              </button>

              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1 max-w-5xl mx-2">
                <div className="group flex items-center h-14 bg-gray-50 border border-gray-100 rounded-[1.75rem] overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 focus-within:bg-white focus-within:border-primary/20 transition-all duration-500 shadow-sm shadow-black/[0.02]">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search for physical or digital products, brands and more..."
                    className="flex-1 h-full px-8 bg-transparent text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="h-full px-10 text-gray-400 hover:text-primary transition-colors shrink-0 flex items-center justify-center bg-gray-100/50 group-hover:bg-gray-100 border-l border-gray-200/50"
                  >
                    <Search className="h-6 w-6 transition-transform group-hover:scale-110" />
                  </button>
                </div>
              </form>

              {/* Right actions */}
              <div className="flex items-center gap-3 xl:gap-5 shrink-0">

                {/* Notifications (logged in only) */}
                {user && (
                  <Link href="/notifications"
                    className="relative hidden sm:flex flex-col items-center justify-center w-12 h-12 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-2xl transition-all duration-300">
                    <Bell className="h-6 w-6" />
                    {unreadNotifs > 0 && (
                      <span className="absolute top-2 right-2 min-w-[20px] h-[20px] bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-primary/30 border-2 border-white">
                        {unreadNotifs > 9 ? '9+' : unreadNotifs}
                      </span>
                    )}
                  </Link>
                )}

                {/* Wishlist */}
                <Link href="/wishlist"
                  className="hidden sm:flex items-center justify-center w-12 h-12 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-300">
                  <Heart className="h-6 w-6 shadow-sm" />
                </Link>

                {/* Cart */}
                <button
                  onClick={() => setCartOpen(true)}
                  className="relative flex items-center justify-center w-12 h-12 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-2xl transition-all duration-300 mr-2"
                >
                  <ShoppingCart className="h-6 w-6" />
                  {cartCount > 0 && (
                    <span className="absolute top-2 right-2 min-w-[20px] h-[20px] bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-primary/30 border-2 border-white animate-in zoom-in duration-300">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>

                {/* Account */}
                {user ? (
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="hidden sm:flex items-center gap-3 px-4 h-12 bg-gray-50/50 hover:bg-gray-100 rounded-2xl border border-transparent hover:border-gray-200 transition-all duration-300"
                    >
                      <div className="w-8 h-8 rounded-xl premium-gradient flex items-center justify-center text-white font-black text-xs shadow-lg shadow-primary/20">
                        {user.first_name[0]}{user.last_name[0]}
                      </div>
                      <div className="flex flex-col text-left leading-none">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Account</span>
                        <span className="text-sm font-black text-gray-900">{user.first_name}</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 top-full mt-3 w-64 bg-white border border-gray-100 rounded-3xl shadow-2xl py-2 z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="px-6 py-5 bg-gray-50/50 border-b border-gray-100">
                          <p className="text-sm font-black text-gray-900 mb-0.5">{user.first_name} {user.last_name}</p>
                          <p className="text-xs font-medium text-gray-400 truncate">{user.email}</p>
                        </div>
                        <div className="py-2">
                          {user.role === 'admin' && (
                            <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                              className="flex items-center px-6 py-3 text-sm font-black text-primary bg-primary/5 hover:bg-primary/10 transition-all border-b border-gray-100">
                              Admin Dashboard
                            </Link>
                          )}
                          {user.role === 'seller' && (
                            <Link href="/seller" onClick={() => setUserMenuOpen(false)}
                              className="flex items-center px-6 py-3 text-sm font-black text-primary bg-primary/5 hover:bg-primary/10 transition-all border-b border-gray-100">
                              Seller Hub
                            </Link>
                          )}
                          {[
                            { href: '/account/profile', label: 'My Profile' },
                            { href: '/account/orders', label: 'My Orders' },
                            { href: '/account/billing', label: 'Payment Methods' },
                            { href: '/account/addresses', label: 'Saved Addresses' },
                          ].map((item) => (
                            <Link key={item.label} href={item.href} onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center px-6 py-3 text-sm font-bold text-gray-500 hover:text-primary hover:bg-primary/5 transition-all">
                              {item.label}
                            </Link>
                          ))}
                        </div>
                        <div className="border-t border-gray-100 py-2 bg-gray-50/30">
                          <button
                            onClick={() => { setUserMenuOpen(false); setSignOutModalOpen(true) }}
                            className="flex items-center w-full px-6 py-3 text-sm font-black text-red-600 hover:bg-red-50 transition-all"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => openModal('login')}
                    className="hidden sm:flex items-center gap-3 px-6 h-12 bg-primary hover:bg-primary-hover text-white rounded-2xl shadow-xl shadow-primary/20 transition-all duration-300 group"
                  >
                    <User className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-black">Log In</span>
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
          <div className="w-full mx-auto px-6 lg:px-12">
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
