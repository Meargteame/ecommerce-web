'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'
import { Pencil, Check, X, User } from 'lucide-react'

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      {message}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [editing, setEditing] = useState(false)
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', phone: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/?auth=login'); return }
    setProfileForm({ first_name: user.first_name, last_name: user.last_name, phone: '' })
  }, [user, router])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.put('/users/profile', profileForm)
      setToast({ message: 'Profile updated. The page will reload.', type: 'success' })
      setTimeout(() => window.location.reload(), 1500)
    } catch { setToast({ message: 'Failed to update profile', type: 'error' }) }
    setSaving(false)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <CartDrawer />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-gray-100 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Login & Security</h1>
            <p className="text-sm text-gray-500 mt-2">Manage your personal information, email, phone number, and security settings.</p>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 font-semibold transition-colors shadow-sm">
              <Pencil className="h-4 w-4" /> Edit Profile
            </button>
          ) : (
            <button onClick={() => setEditing(false)} className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
              <X className="h-4 w-4" /> Cancel Edit
            </button>
          )}
        </div>

        <div className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-1 border-r border-gray-100 pr-0 md:pr-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-full bg-[#F3F4F6] border-4 border-white shadow-lg flex items-center justify-center text-gray-400 mb-6 overflow-hidden">
                <User className="h-16 w-16" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{user.first_name} {user.last_name}</h2>
              <p className="text-sm text-gray-500 mt-1">{user.email}</p>
              <div className="mt-6 px-4 py-2 bg-[#F9F5FF] text-[#7C3AED] rounded-full text-xs font-bold uppercase tracking-wider border border-[#E9D7FE]">
                {user.role} Account
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Personal Details</h3>
            
            {editing ? (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                    <input type="text" value={profileForm.first_name} onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                    <input type="text" value={profileForm.last_name} onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none shadow-sm" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Phone Number</label>
                  <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+1 (555) 000-0000" className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none shadow-sm" />
                  <p className="text-xs text-gray-500 mt-2">We will never share your phone number with tracking agencies.</p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex gap-4">
                  <button type="submit" disabled={saving} className="px-8 py-3 bg-[#111111] hover:bg-black text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2">
                    <Check className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-3 p-5 sm:p-6 hover:bg-gray-50 transition-colors">
                  <dt className="text-sm font-medium text-gray-500">Full name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 font-medium">{user.first_name} {user.last_name}</dd>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 p-5 sm:p-6 hover:bg-gray-50 transition-colors">
                  <dt className="text-sm font-medium text-gray-500">Email address</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 font-medium">{user.email}</dd>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 p-5 sm:p-6 hover:bg-gray-50 transition-colors">
                  <dt className="text-sm font-medium text-gray-500">Phone number</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 font-medium">{profileForm.phone || <span className="text-gray-400 italic">Not provided</span>}</dd>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
