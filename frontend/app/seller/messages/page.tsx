'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import {
  MessageSquare, Send, Mail, User, Package, ShoppingBag,
  CheckCheck, Clock, ChevronRight, Search, Filter, X, AlertCircle
} from 'lucide-react'

interface Message {
  id: string
  customer_id: string
  customer_first_name: string
  customer_last_name: string
  customer_email: string
  order_id?: string
  order_number?: string
  product_id?: string
  product_name?: string
  subject: string
  direction: 'inbound' | 'outbound'
  message: string
  is_read: boolean
  created_at: string
}

export default function SellerMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'inbound' | 'outbound'>('all')

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      const { data } = await api.get('/seller/messages')
      setMessages(data.data || [])
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (msg: Message) => {
    if (msg.is_read || msg.direction === 'outbound') return
    try {
      await api.put(`/seller/messages/${msg.id}/read`)
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m))
    } catch {}
  }

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return
    setSending(true)
    try {
      const { data } = await api.post('/seller/messages', {
        customerId: selectedMessage.customer_id,
        orderId: selectedMessage.order_id || null,
        productId: selectedMessage.product_id || null,
        subject: `Re: ${selectedMessage.subject || 'No Subject'}`,
        message: replyText,
      })
      setMessages(prev => [data.data, ...prev])
      setReplyText('')
    } catch (err) {
      console.error('Failed to send reply:', err)
    } finally {
      setSending(false)
    }
  }

  const selectMessage = (msg: Message) => {
    setSelectedMessage(msg)
    markAsRead(msg)
  }

  const filtered = messages.filter(m => {
    if (filter === 'unread' && m.is_read) return false
    if (filter === 'inbound' && m.direction !== 'inbound') return false
    if (filter === 'outbound' && m.direction !== 'outbound') return false
    if (search) {
      const q = search.toLowerCase()
      return (
        m.customer_first_name?.toLowerCase().includes(q) ||
        m.customer_last_name?.toLowerCase().includes(q) ||
        m.customer_email?.toLowerCase().includes(q) ||
        m.subject?.toLowerCase().includes(q) ||
        m.message?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const unreadCount = messages.filter(m => !m.is_read && m.direction === 'inbound').length

  // Group messages by customer for a conversation-like view
  const conversationGrouped = new Map<string, Message[]>()
  filtered.forEach(m => {
    const key = m.customer_id
    if (!conversationGrouped.has(key)) conversationGrouped.set(key, [])
    conversationGrouped.get(key)!.push(m)
  })

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 h-[calc(100vh-0px)] flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#7C3AED]/10 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Messages</h1>
              <p className="text-sm text-gray-500">Manage conversations with your buyers</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-100">
              {unreadCount} unread
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search messages..."
            className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
          />
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(['all', 'unread', 'inbound', 'outbound'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-colors ${
                filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-0 border border-gray-200 rounded-2xl overflow-hidden bg-white min-h-0">
        {/* Message List */}
        <div className="w-[380px] border-r border-gray-100 overflow-y-auto shrink-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-400">No messages found</p>
              <p className="text-xs text-gray-300 mt-1">Customer inquiries will appear here</p>
            </div>
          ) : (
            filtered.map(msg => (
              <button
                key={msg.id}
                onClick={() => selectMessage(msg)}
                className={`w-full text-left p-4 border-b border-gray-50 transition-colors ${
                  selectedMessage?.id === msg.id ? 'bg-[#7C3AED]/5' : 'hover:bg-gray-50'
                } ${!msg.is_read && msg.direction === 'inbound' ? 'bg-blue-50/40' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    msg.direction === 'inbound'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-green-100 text-green-600'
                  }`}>
                    {msg.direction === 'inbound' ? (
                      <Mail className="w-4 h-4" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${!msg.is_read && msg.direction === 'inbound' ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {msg.customer_first_name} {msg.customer_last_name}
                      </p>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {new Date(msg.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {msg.subject && (
                      <p className="text-xs font-semibold text-gray-600 truncate mt-0.5">{msg.subject}</p>
                    )}
                    <p className="text-xs text-gray-400 truncate mt-0.5">{msg.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {msg.order_number && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                          <ShoppingBag className="w-2.5 h-2.5" /> {msg.order_number}
                        </span>
                      )}
                      {msg.product_name && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                          <Package className="w-2.5 h-2.5" /> {msg.product_name}
                        </span>
                      )}
                    </div>
                  </div>
                  {!msg.is_read && msg.direction === 'inbound' && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Message Detail */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedMessage ? (
            <>
              {/* Detail Header */}
              <div className="p-5 border-b border-gray-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-gray-400" />
                    <h3 className="font-bold text-gray-900">
                      {selectedMessage.customer_first_name} {selectedMessage.customer_last_name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedMessage.direction === 'inbound'
                        ? 'bg-blue-50 text-blue-600 border border-blue-100'
                        : 'bg-green-50 text-green-600 border border-green-100'
                    }`}>
                      {selectedMessage.direction === 'inbound' ? 'Received' : 'Sent'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{selectedMessage.customer_email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    {new Date(selectedMessage.created_at).toLocaleString()}
                  </p>
                  {selectedMessage.is_read && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-green-500 font-bold mt-1">
                      <CheckCheck className="w-3 h-3" /> Read
                    </span>
                  )}
                </div>
              </div>

              {/* Context Tags */}
              {(selectedMessage.order_number || selectedMessage.product_name) && (
                <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
                  {selectedMessage.order_number && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                      <ShoppingBag className="w-3.5 h-3.5 text-[#7C3AED]" /> Order #{selectedMessage.order_number}
                    </span>
                  )}
                  {selectedMessage.product_name && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                      <Package className="w-3.5 h-3.5 text-[#7C3AED]" /> {selectedMessage.product_name}
                    </span>
                  )}
                </div>
              )}

              {/* Message Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedMessage.subject && (
                  <h4 className="text-lg font-bold text-gray-900 mb-4">{selectedMessage.subject}</h4>
                )}
                <div className="bg-gray-50 rounded-xl p-5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <div className="flex gap-3">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows={2}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 resize-none bg-white"
                  />
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || sending}
                    className="px-5 h-auto self-end py-3 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-40 flex items-center gap-2 shrink-0"
                    style={{ backgroundColor: '#7C3AED' }}
                  >
                    <Send className="w-4 h-4" />
                    {sending ? 'Sending...' : 'Reply'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-bold text-gray-400">Select a conversation</p>
                <p className="text-xs text-gray-300 mt-1">Click a message to view details and reply</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
