'use client'

import { useEffect, useState, useRef } from 'react'
import api from '@/lib/api'
import {
  CheckCircle, AlertCircle, Store, Upload, Image as ImageIcon,
  Building2, Phone, Mail, Landmark, FileText, Globe, Facebook,
  Instagram, Twitter, Shield, CreditCard, ChevronRight, Camera, X
} from 'lucide-react'

type Tab = 'branding' | 'business' | 'policies' | 'social'

export default function SellerSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('branding')
  const [form, setForm] = useState({
    storeName: '',
    storeDescription: '',
    storeLogoUrl: '',
    storeBannerUrl: '',
    contactEmail: '',
    contactPhone: '',
    payoutEmail: '',
    businessAddress: '',
    taxId: '',
    returnPolicy: '',
    shippingPolicy: '',
    socialFacebook: '',
    socialInstagram: '',
    socialTwitter: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get('/seller/profile')
      .then(({ data }) => {
        const p = data.data
        setForm({
          storeName: p.storeName || '',
          storeDescription: p.storeDescription || '',
          storeLogoUrl: p.storeLogoUrl || '',
          storeBannerUrl: p.storeBannerUrl || '',
          contactEmail: p.contactEmail || '',
          contactPhone: p.contactPhone || '',
          payoutEmail: p.payoutEmail || '',
          businessAddress: p.businessAddress || '',
          taxId: p.taxId || '',
          returnPolicy: p.returnPolicy || '',
          shippingPolicy: p.shippingPolicy || '',
          socialFacebook: p.socialFacebook || '',
          socialInstagram: p.socialInstagram || '',
          socialTwitter: p.socialTwitter || '',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await api.put('/seller/profile', form)
      setMessage('All settings saved successfully!')
      setTimeout(() => setMessage(''), 4000)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file: File, type: 'logo' | 'banner') => {
    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingBanner
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = data.data?.url || data.url
      if (type === 'logo') {
        setForm(f => ({ ...f, storeLogoUrl: url }))
      } else {
        setForm(f => ({ ...f, storeBannerUrl: url }))
      }
    } catch {
      setError(`Failed to upload ${type} image`)
    } finally {
      setUploading(false)
    }
  }

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const tabs: { key: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: 'branding', label: 'Store Branding', icon: <Store className="w-4 h-4" />, desc: 'Logo, banner & identity' },
    { key: 'business', label: 'Business Details', icon: <Building2 className="w-4 h-4" />, desc: 'Contact, tax & payouts' },
    { key: 'policies', label: 'Store Policies', icon: <FileText className="w-4 h-4" />, desc: 'Returns & shipping' },
    { key: 'social', label: 'Social Links', icon: <Globe className="w-4 h-4" />, desc: 'Connect your channels' },
  ]

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading seller profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#7C3AED]/10 rounded-xl flex items-center justify-center">
            <Store className="w-5 h-5 text-[#7C3AED]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
            <p className="text-sm text-gray-500">Manage every aspect of your seller profile</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-8 pb-6 border-b border-gray-100">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.key
              ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/25'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            <div className="text-left">
              <div className="font-bold">{tab.label}</div>
              <div className={`text-[10px] ${activeTab === tab.key ? 'text-white/70' : 'text-gray-400'}`}>{tab.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        <div className="max-w-3xl">

          {/* ── BRANDING TAB ── */}
          {activeTab === 'branding' && (
            <div className="space-y-8">
              {/* Store Logo */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#7C3AED]" /> Store Logo
                </h3>
                <p className="text-xs text-gray-400 mb-5">Recommended: 400×400px, square format, PNG or JPG</p>
                <div className="flex items-center gap-6">
                  <div
                    onClick={() => logoRef.current?.click()}
                    className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-[#7C3AED]/40 transition-colors bg-gray-50 overflow-hidden relative group"
                  >
                    {form.storeLogoUrl ? (
                      <>
                        <img src={form.storeLogoUrl} alt="Store Logo" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="w-5 h-5 text-white" />
                        </div>
                      </>
                    ) : uploadingLogo ? (
                      <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                        <span className="text-[10px] text-gray-400 font-bold">UPLOAD</span>
                      </div>
                    )}
                  </div>
                  <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'logo') }} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 font-medium mb-2">Your logo appears on your storefront, invoices, and customer communications.</p>
                    {form.storeLogoUrl && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, storeLogoUrl: '' }))} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                        <X className="w-3 h-3" /> Remove logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Store Banner */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#7C3AED]" /> Store Banner
                </h3>
                <p className="text-xs text-gray-400 mb-5">Recommended: 1200×300px, wide landscape format</p>
                <div
                  onClick={() => bannerRef.current?.click()}
                  className="w-full h-40 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-[#7C3AED]/40 transition-colors bg-gray-50 overflow-hidden relative group"
                >
                  {form.storeBannerUrl ? (
                    <>
                      <img src={form.storeBannerUrl} alt="Store Banner" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-6 h-6 text-white" />
                        <span className="text-white text-sm font-bold ml-2">Change Banner</span>
                      </div>
                    </>
                  ) : uploadingBanner ? (
                    <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <span className="text-xs text-gray-400 font-bold">CLICK TO UPLOAD BANNER</span>
                      <p className="text-[10px] text-gray-300 mt-1">Displayed at the top of your store page</p>
                    </div>
                  )}
                </div>
                <input ref={bannerRef} type="file" accept="image/*" hidden onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'banner') }} />
                {form.storeBannerUrl && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, storeBannerUrl: '' }))} className="mt-3 text-xs text-red-500 hover:underline flex items-center gap-1">
                    <X className="w-3 h-3" /> Remove banner
                  </button>
                )}
              </div>

              {/* Store Name & Description */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#7C3AED]" /> Store Identity
                </h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Store Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={form.storeName}
                    onChange={set('storeName')}
                    required
                    placeholder="Your store name"
                    className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Store Description</label>
                  <textarea
                    value={form.storeDescription}
                    onChange={set('storeDescription')}
                    rows={4}
                    placeholder="Tell customers about your store, what you sell, and what makes you unique..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]/40 transition-all resize-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">{form.storeDescription.length}/500 characters</p>
                </div>
              </div>
            </div>
          )}

          {/* ── BUSINESS DETAILS TAB ── */}
          {activeTab === 'business' && (
            <div className="space-y-8">
              {/* Contact Information */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#7C3AED]" /> Contact Information
                </h3>
                <p className="text-xs text-gray-400 -mt-3">How customers and the platform can reach you</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" /> Contact Email
                    </label>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={set('contactEmail')}
                      placeholder="contact@yourstore.com"
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" /> Contact Phone
                    </label>
                    <input
                      value={form.contactPhone}
                      onChange={set('contactPhone')}
                      placeholder="+1 (234) 567-8900"
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]/40 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Business Registration */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#7C3AED]" /> Business Registration
                </h3>
                <p className="text-xs text-gray-400 -mt-3">Legal information for tax and compliance purposes</p>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-gray-400" /> Tax ID / EIN
                  </label>
                  <input
                    value={form.taxId}
                    onChange={set('taxId')}
                    placeholder="e.g. 12-3456789"
                    className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]/40 transition-all"
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> This information is encrypted and never shared publicly
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Address</label>
                  <textarea
                    value={form.businessAddress}
                    onChange={set('businessAddress')}
                    rows={3}
                    placeholder="123 Business Ave, Suite 100&#10;City, State 12345&#10;Country"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]/40 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Payout Information */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#7C3AED]" /> Payout Information
                </h3>
                <p className="text-xs text-gray-400 -mt-3">Where your earnings will be deposited</p>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payout Email</label>
                  <input
                    type="email"
                    value={form.payoutEmail}
                    onChange={set('payoutEmail')}
                    placeholder="payouts@yourstore.com"
                    className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]/40 transition-all"
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5">This is where you'll receive your earnings after platform commission deductions</p>
                </div>
              </div>
            </div>
          )}

          {/* ── POLICIES TAB ── */}
          {activeTab === 'policies' && (
            <div className="space-y-8">
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Policy Visibility</p>
                  <p className="text-xs text-amber-600 mt-0.5">These policies will be visible to all customers on your product and store pages. Write them clearly and professionally.</p>
                </div>
              </div>

              {/* Return Policy */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#7C3AED]" /> Return & Refund Policy
                </h3>
                <textarea
                  value={form.returnPolicy}
                  onChange={set('returnPolicy')}
                  rows={8}
                  placeholder="Describe your return and refund policy here...&#10;&#10;Example:&#10;• Items can be returned within 30 days of delivery&#10;• Items must be in original, unused condition&#10;• Refunds are processed within 5-7 business days&#10;• Shipping costs are non-refundable&#10;• Custom or personalized items cannot be returned"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]/40 transition-all resize-none leading-relaxed"
                />
                <p className="text-[10px] text-gray-400">{form.returnPolicy.length} characters</p>
              </div>

              {/* Shipping Policy */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#7C3AED]" /> Shipping Policy
                </h3>
                <textarea
                  value={form.shippingPolicy}
                  onChange={set('shippingPolicy')}
                  rows={8}
                  placeholder="Describe your shipping policy here...&#10;&#10;Example:&#10;• Orders are processed within 1-2 business days&#10;• Standard shipping: 5-7 business days&#10;• Express shipping: 2-3 business days&#10;• Free shipping on orders over $50&#10;• We ship internationally to 30+ countries"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]/40 transition-all resize-none leading-relaxed"
                />
                <p className="text-[10px] text-gray-400">{form.shippingPolicy.length} characters</p>
              </div>
            </div>
          )}

          {/* ── SOCIAL LINKS TAB ── */}
          {activeTab === 'social' && (
            <div className="space-y-8">
              <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
                <Globe className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Boost Your Visibility</p>
                  <p className="text-xs text-blue-600 mt-0.5">Add your social media profiles to build trust and drive traffic. Links will display on your public store page.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#7C3AED]" /> Social Media Profiles
                </h3>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-[#1877F2]" /> Facebook
                  </label>
                  <div className="flex items-center">
                    <span className="h-11 px-3 inline-flex items-center text-xs text-gray-400 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl font-mono">facebook.com/</span>
                    <input
                      value={form.socialFacebook}
                      onChange={set('socialFacebook')}
                      placeholder="yourpage"
                      className="flex-1 h-11 px-4 border border-gray-200 rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]/40 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-[#E4405F]" /> Instagram
                  </label>
                  <div className="flex items-center">
                    <span className="h-11 px-3 inline-flex items-center text-xs text-gray-400 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl font-mono">instagram.com/</span>
                    <input
                      value={form.socialInstagram}
                      onChange={set('socialInstagram')}
                      placeholder="yourhandle"
                      className="flex-1 h-11 px-4 border border-gray-200 rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]/40 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                    <Twitter className="w-4 h-4 text-[#1DA1F2]" /> Twitter / X
                  </label>
                  <div className="flex items-center">
                    <span className="h-11 px-3 inline-flex items-center text-xs text-gray-400 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl font-mono">x.com/</span>
                    <input
                      value={form.socialTwitter}
                      onChange={set('socialTwitter')}
                      placeholder="yourhandle"
                      className="flex-1 h-11 px-4 border border-gray-200 rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]/40 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Feedback + Save Button ── */}
          <div className="mt-10 pt-8 border-t border-gray-100">
            {message && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-xl mb-5">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {message}
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl mb-5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Changes are saved across all tabs simultaneously</p>
              <button
                type="submit"
                disabled={saving}
                className="px-8 h-11 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#7C3AED]/20 hover:shadow-[#7C3AED]/40 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                style={{ backgroundColor: '#7C3AED' }}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save All Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
