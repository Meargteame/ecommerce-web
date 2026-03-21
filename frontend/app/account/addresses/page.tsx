'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'
import { MapPin, Plus, Pencil, Trash2, Home, Map } from 'lucide-react'

interface Address { id: string; label?: string; first_name: string; last_name: string; street: string; city: string; state: string; zip: string; country: string; is_default: boolean }

export default function AddressesPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addrLoading, setAddrLoading] = useState(false)
  const [addrModalOpen, setAddrModalOpen] = useState(false)
  const [editingAddr, setEditingAddr] = useState<Address | null>(null)
  
  const emptyAddr = { label: '', first_name: '', last_name: '', street: '', city: '', state: '', zip: '', country: 'US', is_default: false }
  const [addrForm, setAddrForm] = useState(emptyAddr)
  const [addrSaving, setAddrSaving] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    fetchAddresses()
  }, [user, router])

  const fetchAddresses = () => {
    setAddrLoading(true)
    api.get('/users/addresses').then(({ data }) => setAddresses(data.data?.addresses || [])).catch(() => {}).finally(() => setAddrLoading(false))
  }

  const openAddAddr = () => { setEditingAddr(null); setAddrForm(emptyAddr); setAddrModalOpen(true) }
  const openEditAddr = (a: Address) => {
    setEditingAddr(a)
    setAddrForm({ label: a.label || '', first_name: a.first_name, last_name: a.last_name, street: a.street, city: a.city, state: a.state, zip: a.zip, country: a.country, is_default: a.is_default })
    setAddrModalOpen(true)
  }
  
  const handleSaveAddr = async (e: React.FormEvent) => {
    e.preventDefault(); setAddrSaving(true)
    try {
      editingAddr ? await api.put(`/users/addresses/${editingAddr.id}`, addrForm) : await api.post('/users/addresses', addrForm)
      setAddrModalOpen(false); fetchAddresses()
    } catch {}
    setAddrSaving(false)
  }

  const handleDeleteAddr = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return
    await api.delete(`/users/addresses/${id}`).catch(() => {})
    fetchAddresses()
  }

  const setAddr = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAddrForm((f) => ({ ...f, [k]: e.target.value }))

  if (!user) return null

  return (
    <>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-gray-100 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Saved Addresses</h1>
            <p className="text-sm text-gray-500 mt-2">Manage your shipping and billing addresses for faster checkout.</p>
          </div>
          <button onClick={openAddAddr} className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-[#7C3AED] hover:bg-purple-800 text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Add New Address
          </button>
        </div>

        {addrLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[1,2,3].map((i) => <div key={i} className="h-48 bg-gray-50 rounded-2xl border border-gray-100 animate-pulse" />)}</div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Map className="h-10 w-10 text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No saved addresses</h2>
            <p className="font-medium text-gray-500 max-w-md mx-auto mb-6">Add an address to ensure swift and accurate delivery for your next order.</p>
            <button onClick={openAddAddr} className="text-[#7C3AED] font-bold hover:underline">Add your first address</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addresses.map((addr) => (
              <div key={addr.id} className={`p-6 border rounded-2xl flex flex-col justify-between transition-colors ${addr.is_default ? 'border-[#7C3AED] bg-[#F9F5FF]/40 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                <div className="flex gap-4">
                  <div className={`mt-1 shrink-0 ${addr.is_default ? 'text-[#7C3AED]' : 'text-gray-400'}`}>
                    {addr.label?.toLowerCase().includes('home') ? <Home className="h-6 w-6" /> : <MapPin className="h-6 w-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="font-bold text-gray-900">{addr.first_name} {addr.last_name}</p>
                      {addr.label && <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium">{addr.label}</span>}
                      {addr.is_default && <span className="text-[10px] text-white bg-[#7C3AED] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Default</span>}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">
                      {addr.street}<br />
                      {addr.city}, {addr.state} {addr.zip}<br />
                      {addr.country}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button onClick={() => openEditAddr(addr)} className="text-sm font-bold text-[#7C3AED] hover:text-purple-800 transition-colors">Edit</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => handleDeleteAddr(addr.id)} className="text-sm font-bold text-gray-500 hover:text-red-600 transition-colors">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Address modal */}
        {addrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 overflow-y-auto pt-10 pb-10">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-auto relative overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-bold text-gray-900 text-lg">{editingAddr ? 'Edit Address' : 'Add New Address'}</h3>
              </div>
              <form onSubmit={handleSaveAddr} className="p-6 space-y-5">
                <Input label="Address Label (optional)" placeholder="e.g. Home, Office" value={addrForm.label} onChange={setAddr('label')} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="First Name" value={addrForm.first_name} onChange={setAddr('first_name')} required />
                  <Input label="Last Name" value={addrForm.last_name} onChange={setAddr('last_name')} required />
                </div>
                <Input label="Street Address" value={addrForm.street} onChange={setAddr('street')} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="City" value={addrForm.city} onChange={setAddr('city')} required />
                  <Input label="State / Province" value={addrForm.state} onChange={setAddr('state')} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="ZIP / Postal Code" value={addrForm.zip} onChange={setAddr('zip')} required />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Country</label>
                    <select value={addrForm.country} onChange={setAddr('country')} className="px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] bg-white shadow-sm font-medium">
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer pt-2">
                  <input type="checkbox" checked={addrForm.is_default} onChange={(e) => setAddrForm((f) => ({ ...f, is_default: e.target.checked }))} className="w-5 h-5 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED]" />
                  Set as default shipping address
                </label>
                <div className="flex gap-3 pt-6 mt-2 border-t border-gray-100">
                  <button type="button" onClick={() => setAddrModalOpen(false)} className="flex-1 py-3 text-gray-700 font-bold hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">Cancel</button>
                  <button type="submit" disabled={addrSaving} className="flex-1 py-3 bg-[#111111] text-white font-bold rounded-lg hover:bg-black disabled:opacity-50 transition-colors shadow-sm">
                    {addrSaving ? 'Saving...' : editingAddr ? 'Save Changes' : 'Add Address'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </>
  )
}
