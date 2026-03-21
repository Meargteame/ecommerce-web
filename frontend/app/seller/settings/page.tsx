'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function SellerSettingsPage() {
  const [form, setForm] = useState({
    storeName: '',
    storeDescription: '',
    contactEmail: '',
    contactPhone: '',
    payoutEmail: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/seller/profile')
      .then(({ data }) => {
        const p = data.data
        setForm({
          storeName: p.storeName || '',
          storeDescription: p.storeDescription || '',
          contactEmail: p.contactEmail || '',
          contactPhone: p.contactPhone || '',
          payoutEmail: p.payoutEmail || '',
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
      setMessage('Settings saved successfully')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  if (loading) {
    return (
      <div className="p-8">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#7C3AED', borderTopColor:'transparent'}} />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your store profile and preferences</p>
      </div>

      <div className="max-w-xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Store Name <span className="text-red-400">*</span>
              </label>
              <input
                value={form.storeName}
                onChange={set('storeName')}
                required
                placeholder="Your store name"
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Store Description</label>
              <textarea
                value={form.storeDescription}
                onChange={set('storeDescription')}
                rows={3}
                placeholder="Tell customers about your store..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Email</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={set('contactEmail')}
                  placeholder="contact@store.com"
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Phone</label>
                <input
                  value={form.contactPhone}
                  onChange={set('contactPhone')}
                  placeholder="+1 234 567 8900"
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Payout Email</label>
              <input
                type="email"
                value={form.payoutEmail}
                onChange={set('payoutEmail')}
                placeholder="payouts@yourstore.com"
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">Where you'll receive your earnings</p>
            </div>

            {message && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 px-3 py-2.5 rounded-lg">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {message}
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2.5 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full h-11 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              style={{backgroundColor:'#7C3AED'}}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
