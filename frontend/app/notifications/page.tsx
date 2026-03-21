'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { Bell, Package, Tag, Info, Check, CheckCheck } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

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
      <Header />
      <CartDrawer />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && <p className="text-sm text-gray-500 mt-0.5">{unreadCount} unread</p>}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <Bell className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-700">No notifications yet</p>
            <p className="text-gray-500 mt-1">We&apos;ll notify you about orders, deals, and more.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${n.is_read ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'}`}
              >
                <div className="mt-0.5 shrink-0">
                  {typeIcon[n.type] || <Bell className="h-5 w-5 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${n.is_read ? 'text-gray-900' : 'text-gray-900'}`}>{n.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)} className="shrink-0 p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors" title="Mark as read">
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
