'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'
import { MessageSquare, Plus, Clock, Search } from 'lucide-react'

interface Ticket { id: string; subject: string; status: string; priority: string; created_at: string }

export default function SupportPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [ticketForm, setTicketForm] = useState({ subject: '', order_id: '', message: '', priority: 'low' })
  const [ticketSaving, setTicketSaving] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    fetchTickets()
  }, [user, router])

  const fetchTickets = () => {
    setTicketsLoading(true)
    api.get('/support/tickets').then(({ data }) => setTickets(data?.data?.tickets || [])).catch(() => {}).finally(() => setTicketsLoading(false))
  }

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault(); setTicketSaving(true)
    try {
      await api.post('/support/tickets', ticketForm)
      setTicketModalOpen(false)
      fetchTickets()
    } catch {}
    setTicketSaving(false)
  }

  if (!user) return null

  return (
    <>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-gray-100 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Customer Support</h1>
            <p className="text-sm text-gray-500 mt-2">View your past tickets or create a new one for assistance.</p>
          </div>
          <button onClick={() => setTicketModalOpen(true)} className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-[#111111] hover:bg-black text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Open New Ticket
          </button>
        </div>

        {ticketsLoading ? (
          <div className="space-y-4 max-w-5xl">
            {[1,2,3].map((i) => <div key={i} className="h-24 bg-gray-50 rounded-xl border border-gray-100 animate-pulse" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-32">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="h-10 w-10 text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">How can we help you?</h2>
            <p className="text-gray-500 max-w-sm mx-auto text-lg mb-8">You don't have any support tickets yet. Feel free to reach out if you have any questions or issues.</p>
            <button onClick={() => setTicketModalOpen(true)} className="px-8 py-4 bg-[#7C3AED] text-white font-bold rounded-full hover:bg-purple-800 transition-colors shadow-sm text-lg">
              Contact Support
            </button>
          </div>
        ) : (
          <div className="max-w-5xl border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500">
              <span className="flex-1">Ticket Subject</span>
              <span className="w-32 text-center hidden sm:block">Status</span>
              <span className="w-24 text-right">Date</span>
            </div>
            <div className="divide-y divide-gray-100">
              {tickets.map((t) => (
                <div key={t.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-bold text-gray-900 truncate">{t.subject}</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">#{t.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div className="w-32 text-center hidden sm:block">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${t.status === 'open' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="w-24 text-right text-sm text-gray-500 font-medium">
                    {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ticket Modal */}
        {ticketModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 overflow-y-auto py-10">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-auto relative overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-900 text-lg">Submit a Request</h3>
                <p className="text-sm text-gray-500 mt-1">Our support team usually responds within 24 hours.</p>
              </div>
              <form onSubmit={handleSaveTicket} className="p-6 space-y-5">
                <Input label="Subject" placeholder="Brief description of the issue" value={ticketForm.subject} onChange={(e) => setTicketForm((f) => ({...f, subject: e.target.value}))} required />
                <Input label="Order ID (Optional)" placeholder="e.g. ORD-12345" value={ticketForm.order_id} onChange={(e) => setTicketForm((f) => ({...f, order_id: e.target.value}))} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Priority Level</label>
                  <select value={ticketForm.priority} onChange={(e) => setTicketForm((f) => ({...f, priority: e.target.value}))} className="px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] bg-white shadow-sm font-medium">
                    <option value="low">Low - General Inquiry</option>
                    <option value="medium">Medium - Ordering Issue</option>
                    <option value="high">High - Critical Problem</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Detailed Message</label>
                  <textarea rows={5} placeholder="Please provide as much detail as possible..." required value={ticketForm.message} onChange={(e) => setTicketForm((f) => ({...f, message: e.target.value}))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] resize-none shadow-sm" />
                </div>
                <div className="flex gap-3 pt-6 lg:pt-8 mt-2 border-t border-gray-100">
                  <button type="button" onClick={() => setTicketModalOpen(false)} className="flex-1 py-3 text-gray-700 font-bold hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">Cancel</button>
                  <button type="submit" disabled={ticketSaving} className="flex-1 py-3 bg-[#7C3AED] text-white font-bold rounded-lg hover:bg-purple-800 disabled:opacity-50 transition-colors shadow-sm">
                    {ticketSaving ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </>
  )
}
