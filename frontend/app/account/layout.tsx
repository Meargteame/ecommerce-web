'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/HeaderWrapper'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import { useAuthStore } from '@/store/authStore'
import { User, Package, MapPin, CreditCard, Lock, Bell, HelpCircle, LogOut } from 'lucide-react'

const navigation = [
  { name: 'Profile', href: '/account/profile', icon: User },
  { name: 'Orders', href: '/account/orders', icon: Package },
  { name: 'Addresses', href: '/account/addresses', icon: MapPin },
  { name: 'Payment Methods', href: '/account/billing', icon: CreditCard },
  { name: 'Password & Security', href: '/account/password', icon: Lock },
  { name: 'Notifications', href: '/account/notifications', icon: Bell },
  { name: 'Support Tickets', href: '/account/support', icon: HelpCircle },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  // Hide sidebar on specific full-screen pages like become-seller
  if (pathname.includes('/become-seller')) {
    return <>{children}</>
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      <CartDrawer />
      
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          
          {/* Sidebar Navigation */}
          <aside className="w-full md:w-64 lg:w-72 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm sticky top-24">
              <div className="p-6 border-b border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#F3F4F6] overflow-hidden flex items-center justify-center shrink-0 border border-gray-200">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-900 truncate">
                    {user?.first_name} {user?.last_name}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium truncate">{user?.email}</p>
                </div>
              </div>
              
              <nav className="p-3 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        isActive 
                          ? 'bg-[#F9F5FF] text-[#7C3AED]' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className={`h-5 w-5 ${isActive ? 'text-[#7C3AED]' : 'text-gray-400'}`} />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
              
              <div className="p-3 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-5 w-5 text-red-500" />
                  Log Out
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 lg:p-10">
            {children}
          </div>
          
        </div>
      </main>

      <Footer />
    </div>
  )
}
