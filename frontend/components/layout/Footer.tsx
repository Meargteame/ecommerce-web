import Link from 'next/link'
import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react'

const links = {
  Shop: [
    { label: 'All Products', href: '/products' },
    { label: 'New Arrivals', href: '/products?sort=newest' },
    { label: 'Sale', href: '/products?sale=true' },
    { label: 'Electronics', href: '/products?category=electronics' },
    { label: 'Fashion', href: '/products?category=fashion' },
  ],
  Support: [
    { label: 'Help Center', href: '/help' },
    { label: 'Track Order', href: '/track-order' },
    { label: 'Returns & Refunds', href: '/help' },
    { label: 'Contact Us', href: '/help' },
    { label: 'Buyer Protection', href: '/help' },
  ],
  Sell: [
    { label: 'Sell on ShopHub', href: '/sell' },
    { label: 'Seller Center', href: '/seller' },
    { label: 'Seller Policies', href: '/terms' },
  ],
  Company: [
    { label: 'About Us', href: '/about' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
}

export default function Footer() {
  return (
    <footer className="w-full px-4 sm:px-6 lg:px-8 pb-6 mt-2">
      <div className="bg-gray-950 rounded-3xl text-gray-400 px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-violet-700 rounded-2xl flex items-center justify-center">
                <span className="text-white font-black text-base">S</span>
              </div>
              <span className="text-white font-extrabold text-xl tracking-tight">
                Shop<span className="text-violet-500">Hub</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-5 text-gray-500">
              Your one-stop marketplace for everything. Millions of products from thousands of trusted sellers.
            </p>
            <div className="flex items-center gap-2">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a key={i} href="#"
                  className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-violet-500 transition-colors group">
                  <Icon className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <p className="text-white text-sm font-bold mb-4">{title}</p>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href}
                      className="text-sm text-gray-500 hover:text-violet-500 transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} ShopHub. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>Secure payments</span>
            <span>·</span>
            <span>Free returns</span>
            <span>·</span>
            <span>Buyer protection</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
