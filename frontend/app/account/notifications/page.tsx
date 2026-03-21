'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { Bell, Package, Tag, Info, Check, CheckCheck } from 'lucide-react'

interface Notification { id: string; type: string; title: string; message: string; is_read: boolean; created_at: string }

const typeIcon: Record<string, React.ReactNode> = {
  order: <Package className="h-5 w-5 text-gray-600" />,
  promotion: <Tag className="h-5 w-5 text-green-600" />,
  system: <Info className="h-5 w-5" style={{color:'#7C3AED'}} />,
}

export default function NotificationsPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return }
    api.get('/notifications')
      .then(({ data }) => setNotifications(data.data?.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, router])

  const markRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {}
  }

  if (!user) return null

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-gray-100 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System Notifications</h1>
            <p className="text-sm text-gray-500 mt-2">Stay updated on your orders, account security, and exclusive deals.</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-md transition-colors border border-gray-200 shadow-sm">
              <CheckCheck className="h-4 w-4" /> Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4 max-w-4xl">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-white border-b border-gray-100 py-6 animate-pulse flex gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full shrink-0" />
                <div className="w-full">
                  <div className="h-5 bg-gray-200 rounded w-1/4 mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-32">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="h-10 w-10 text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all caught up</h2>
            <p className="text-gray-500 max-w-sm mx-auto text-lg">We'll notify you here when there are important updates regarding your account or orders.</p>
          </div>
        ) : (
          <div className="max-w-5xl divide-y divide-gray-100 border-t border-gray-100">
            {notifications.map((n) => (
              <div key={n.id} className={`flex items-start gap-5 py-6 ${n.is_read ? 'opacity-70' : ''}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${n.is_read ? 'bg-gray-50 border-gray-200' : 'bg-[#F9F5FF] border-[#E9D7FE]'}`}>
                  {typeIcon[n.type] || <Bell className="h-5 w-5 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex justify-between items-start gap-4 mb-1">
                    <p className={`text-lg ${n.is_read ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>{n.title}</p>
                    <span className="text-xs font-medium text-gray-400 whitespace-nowrap">{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className={`text-base leading-relaxed ${n.is_read ? 'text-gray-500' : 'text-gray-700'}`}>{n.message}</p>
                </div>
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)} className="shrink-0 mt-1 p-2 text-gray-400 hover:text-[#7C3AED] hover:bg-[#F9F5FF] rounded-md transition-colors border border-transparent hover:border-[#E9D7FE]" title="Mark as read">
                    <Check className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
    </>
  )
}
