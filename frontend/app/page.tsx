import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import HeroSection from '@/components/home/HeroSection'
import CategorySection from '@/components/home/CategorySection'
import OnSaleSection from '@/components/home/OnSaleSection'
import ShopByBrandSection from '@/components/home/ShopByBrandSection'
import RecentlyViewedSection from '@/components/home/RecentlyViewedSection'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import PromoBanner from '@/components/home/PromoBanner'
import NewsletterBanner from '@/components/home/NewsletterBanner'
import ProductCarousel from '@/components/home/ProductCarousel'
import AuthModalTrigger from '@/components/auth/AuthModalTrigger'
import { Suspense } from 'react'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <CartDrawer />
      <Suspense>
        <AuthModalTrigger />
      </Suspense>
      <main className="flex-1">
        <HeroSection />
        <CategorySection />
        <ShopByBrandSection />
        <RecentlyViewedSection />
        <OnSaleSection />
        <FeaturedProducts />
        <PromoBanner />
        <ProductCarousel title="Electronics & Gadgets" category="electronics" sort="newest" />
        <ProductCarousel title="Fashion & Style" category="fashion" sort="newest" />
        <ProductCarousel title="Top Rated Products" sort="rating" />
        <NewsletterBanner />
      </main>
      <Footer />
    </div>
  )
}
