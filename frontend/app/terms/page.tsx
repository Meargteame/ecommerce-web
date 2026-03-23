import Link from 'next/link'
import Header from '@/components/layout/HeaderWrapper'
import Footer from '@/components/layout/Footer'

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 1, 2025</p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using ShopHub, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Use of the Platform</h2>
            <p>ShopHub provides an online marketplace connecting buyers and sellers. You agree to use the platform only for lawful purposes and in accordance with these terms. You must be at least 18 years old to create an account.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. ShopHub is not liable for any loss resulting from unauthorized account access.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Buying and Selling</h2>
            <p>Sellers are responsible for the accuracy of their listings, including descriptions, pricing, and availability. Buyers agree to pay for items they purchase. ShopHub acts as an intermediary and is not responsible for disputes between buyers and sellers, though we provide tools to help resolve them.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Prohibited Items</h2>
            <p>You may not list or sell illegal items, counterfeit goods, hazardous materials, or any items that violate applicable laws. ShopHub reserves the right to remove listings and suspend accounts that violate these rules.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Fees</h2>
            <p>ShopHub charges a commission on completed sales. Current fee rates are available on our seller information page. We reserve the right to modify fees with 30 days notice.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Limitation of Liability</h2>
            <p>ShopHub is not liable for indirect, incidental, or consequential damages arising from your use of the platform. Our total liability shall not exceed the fees paid by you in the 12 months preceding the claim.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Changes to Terms</h2>
            <p>We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Contact</h2>
            <p>For questions about these terms, contact us at <a href="mailto:legal@shophub.com" className="text-blue-600 hover:underline">legal@shophub.com</a>.</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 flex gap-4 text-sm">
          <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
          <Link href="/help" className="text-blue-600 hover:underline">Help Center</Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
