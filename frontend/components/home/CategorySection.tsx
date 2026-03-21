import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

const categories = [
  { label: 'Electronics', href: '/products?category=electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&q=70' },
  { label: 'Fashion', href: '/products?category=fashion', image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=200&q=70' },
  { label: 'Home & Living', href: '/products?category=home-living', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&q=70' },
  { label: 'Sports', href: '/products?category=sports', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200&q=70' },
  { label: 'Books', href: '/products?category=books', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&q=70' },
  { label: 'Beauty', href: '/products?category=beauty', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=70' },
  { label: 'Toys & Kids', href: '/products?category=toys', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=70' },
  { label: 'Automotive', href: '/products?category=automotive', image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&q=70' },
]

export default function CategorySection() {
  return (
    <section className="max-w-[1920px] mx-auto px-6 lg:px-12 py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none mb-2">
            Shop by <span className="text-gradient">Category</span>
          </h2>
          <p className="text-sm text-gray-500 font-medium">Explore our curated collections of premium products</p>
        </div>
        <Link href="/products" className="group flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-all">
          View all categories
          <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6">
        {categories.map((cat) => (
          <Link key={cat.label} href={cat.href} className="group flex flex-col items-center gap-4 text-center">
            <div className="w-full aspect-square rounded-[2rem] overflow-hidden bg-white shadow-sm border border-gray-100 relative group-hover:shadow-xl group-hover:shadow-primary/10 group-hover:-translate-y-2 transition-all duration-300">
              <Image src={cat.image} alt={cat.label} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 25vw, 12vw"
                className="object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            <span className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors tracking-tight">
              {cat.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
