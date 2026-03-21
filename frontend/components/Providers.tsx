'use client'

import StoreInitializer from '@/components/StoreInitializer'
import AuthModal from '@/components/auth/AuthModal'
import CartDrawer from '@/components/cart/CartDrawer'

// Client-side providers and global UI components
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StoreInitializer />
      {children}
      <AuthModal />
    </>
  )
}
