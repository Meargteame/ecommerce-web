import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/Providers'
import Toast from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'ShopHub - The Marketplace for Everyone',
  description: 'Discover one-of-a-kind products you won\'t find anywhere else',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-white overflow-x-hidden">
        <Providers>
          {children}
          <Toast />
        </Providers>
      </body>
    </html>
  )
}
