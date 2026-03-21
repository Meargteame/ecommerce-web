'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { Check, X, ShieldCheck } from 'lucide-react'

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      {message}
    </div>
  )
}

export default function PasswordPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    if (!user) router.push('/')
  }, [user, router])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm_password) { setToast({ message: 'Passwords do not match', type: 'error' }); return }
    if (pwForm.new_password.length < 8) { setToast({ message: 'Min 8 characters', type: 'error' }); return }
    setPwSaving(true)
    try {
      await api.put('/users/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password })
      setToast({ message: 'Password changed successfully', type: 'success' })
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setToast({ message: e.response?.data?.error || 'Failed to change password', type: 'error' })
    }
    setPwSaving(false)
  }

  if (!user) return null

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-gray-100 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Security Credentials</h1>
            <p className="text-sm text-gray-500 mt-2">Update your password to ensure your account remains secure.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-5xl">
          <div className="lg:col-span-1 border-r border-gray-100 pr-0 lg:pr-10">
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-6 mb-6">
              <ShieldCheck className="h-10 w-10 text-[#17B26A] mb-4" />
              <h3 className="font-bold text-[#111111] text-lg mb-2">Password Requirements</h3>
              <ul className="text-sm text-[#4B5563] space-y-2 list-disc pl-4">
                <li>Minimum 8 characters long</li>
                <li>At least one uppercase letter</li>
                <li>At least one number</li>
                <li>Do not use common dictionary words</li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-2">
            <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
              {(['current_password', 'new_password', 'confirm_password'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 capitalize">{field.replace(/_/g, ' ')}</label>
                  <input type="password" value={pwForm[field]} onChange={(e) => setPwForm((f) => ({ ...f, [field]: e.target.value }))}
                    required minLength={field !== 'current_password' ? 8 : undefined}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-all shadow-sm bg-white text-gray-900" />
                </div>
              ))}
              
              <div className="pt-4 mt-8 border-t border-gray-100">
                <button type="submit" disabled={pwSaving}
                  className="w-full sm:w-auto px-10 flex items-center justify-center gap-2 py-3 bg-[#111111] hover:bg-black text-white rounded-lg text-sm font-bold disabled:opacity-50 transition-colors shadow-sm">
                  {pwSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
    </>
  )
}
