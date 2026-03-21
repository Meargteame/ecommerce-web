import Link from 'next/link'
import { Facebook, Twitter, Instagram, Youtube, ShoppingBag, ArrowRight } from 'lucide-react'

const links = {
  Shop: [
    { label: 'All Products', href: '/products' },
    { label: 'New Arrivals', href: '/products?sort=newest' },
    { label: 'Sale & Clearance', href: '/products?sale=true' },
    { label: 'Electronics', href: '/products?category=electronics' },
    { label: 'Fashion Edit', href: '/products?category=fashion' },
  ],
  Support: [
    { label: 'Help Center', href: '/help' },
    { label: 'Track Your Order', href: '/track-order' },
    { label: 'Returns & Refunds', href: '/help' },
    { label: 'Contact Support', href: '/help' },
    { label: 'Buyer Protection', href: '/help' },
  ],
  Sell: [
    { label: 'Become a Seller', href: '/sell' },
    { label: 'Seller Dashboard', href: '/seller' },
    { label: 'Seller Requirements', href: '/terms' },
    { label: 'Marketplace Fees', href: '/help' },
  ],
  Company: [
    { label: 'Our Story', href: '/about' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Careers', href: '/about' },
  ],
}

export default function Footer() {
  return (
    <footer className="w-full bg-white pt-20 pb-10 mt-0 border-t border-gray-100 relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute bottom-0 left-0 w-[50rem] h-[50rem] bg-primary/5 blur-[150px] rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      <div className="max-w-[1920px] mx-auto px-6 lg:px-12 relative z-10">
        <div className="grid grid-cols-1 xl:grid-cols-6 gap-16 xl:gap-24 mb-20">
          {/* Brand Discovery */}
          <div className="xl:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-8 group">
              <div className="w-12 h-12 premium-gradient rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                <ShoppingBag className="text-white h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-gray-900 font-black text-2xl tracking-tighter leading-none">ShopHub</span>
                <span className="text-[10px] text-primary/70 font-black uppercase tracking-[0.4em] leading-none mt-1.5 transition-colors group-hover:text-primary">Premium Store</span>
              </div>
            </Link>
            
            <p className="text-lg text-gray-500 font-medium leading-relaxed mb-10 max-w-md">
              The destination for <span className="text-gray-900">extraordinary finds</span> and world-class service. Empowering local sellers, delighting global buyers.
            </p>

            <div className="flex items-center gap-4">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a key={i} href="#"
                  className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-all duration-300 group">
                  <Icon className="h-5 w-5 text-gray-400 group-hover:text-white group-hover:scale-110 transition-all" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Grid */}
          <div className="xl:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-12">
            {Object.entries(links).map(([title, items]) => (
              <div key={title}>
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] mb-8">{title}</h4>
                <ul className="space-y-4">
                  {items.map((item) => (
                    <li key={item.label}>
                      <Link href={item.href}
                        className="text-sm text-gray-500 hover:text-primary transition-colors flex items-center group">
                        <span className="h-px w-0 bg-primary mr-0 group-hover:w-3 group-hover:mr-2 transition-all duration-300" />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-10 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-8">
            <p className="text-xs text-gray-400 font-medium tracking-wide">
              © {new Date().getFullYear()} ShopHub Global. All signatures reserved.
            </p>
            <div className="hidden lg:flex items-center gap-6">
              {['Security', 'Status', 'API', 'Legal'].map(item => (
                <Link key={item} href="#" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">{item}</Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-10">
            <Link href="/products" className="group flex items-center gap-3 text-xs font-black text-gray-900 uppercase tracking-widest">
              Explore Now <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
