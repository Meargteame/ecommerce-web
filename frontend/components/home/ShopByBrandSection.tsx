import Link from 'next/link'

const brands = [
  { name: 'Apple', subtitle: 'iPhone, Mac, iPad', href: '/search?q=Apple' },
  { name: 'Samsung', subtitle: 'Galaxy & Appliances', href: '/search?q=Samsung' },
  { name: 'Sony', subtitle: 'Audio & Cameras', href: '/search?q=Sony' },
  { name: 'Nike', subtitle: 'Shoes & Sportswear', href: '/search?q=Nike' },
  { name: 'Adidas', subtitle: 'Street & Running', href: '/search?q=Adidas' },
  { name: 'LG', subtitle: 'TVs & Home Tech', href: '/search?q=LG' },
  { name: 'Xiaomi', subtitle: 'Phones & Gadgets', href: '/search?q=Xiaomi' },
  { name: 'Canon', subtitle: 'Cameras & Lenses', href: '/search?q=Canon' },
]

export default function ShopByBrandSection() {
  return (
    <section className="max-w-[1920px] mx-auto px-6 lg:px-12 py-8">
      <div className="bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#111111]">Shop by Brand</h2>
          <Link href="/products" className="text-sm font-medium text-[#7C3AED] hover:underline">
            View all
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {brands.map((brand) => (
            <Link
              key={brand.name}
              href={brand.href}
              className="min-w-[170px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 hover:border-[#7C3AED] hover:bg-white transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-[#111111] text-white text-xs font-bold flex items-center justify-center mb-2">
                {brand.name.slice(0, 2).toUpperCase()}
              </div>
              <p className="text-sm font-semibold text-[#111111]">{brand.name}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">{brand.subtitle}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
