'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Star, MessageSquare, X, Send } from 'lucide-react'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
      ))}
    </div>
  )
}

export default function SellerReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(0)
  const limit = 20

  const fetchReviews = async (offset = 0) => {
    setLoading(true)
    try {
      const { data } = await api.get('/seller/reviews', { params: { limit, offset } })
      setReviews(data.data.reviews || [])
      setTotal(data.data.total || 0)
    } catch {
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReviews(page * limit) }, [page])

  const submitResponse = async (reviewId: string) => {
    if (!responseText.trim()) return
    setSaving(true)
    try {
      await api.post(`/seller/reviews/${reviewId}/respond`, { response: responseText })
      setReviews(prev => prev.map(r =>
        r.id === reviewId ? { ...r, sellerResponse: responseText, sellerResponseAt: new Date().toISOString() } : r
      ))
      setResponding(null)
      setResponseText('')
    } catch {
      alert('Failed to submit response')
    } finally {
      setSaving(false)
    }
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews & Ratings</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total reviews</p>
        </div>
        {reviews.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 text-center">
            <p className="text-3xl font-bold text-gray-900">{avgRating}</p>
            <StarRating rating={Math.round(Number(avgRating))} />
            <p className="text-xs text-gray-400 mt-1">avg rating</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{borderColor:'#7C3AED', borderTopColor:'transparent'}} />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Star className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">No reviews yet</p>
          <p className="text-gray-400 text-xs mt-1">Reviews will appear here once customers rate your products</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <StarRating rating={r.rating} />
                    {r.isVerifiedPurchase && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        Verified Purchase
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {r.title && <p className="font-semibold text-gray-900 mb-1">{r.title}</p>}
                  {r.comment && <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">
                      by {r.firstName} {r.lastName?.charAt(0)}.
                    </span>
                    <span className="text-gray-200">·</span>
                  <span className="text-xs font-medium" style={{color:'#7C3AED'}}>{r.productName}</span>
                  </div>
                </div>
                {!r.sellerResponse && responding !== r.id && (
                  <button
                    onClick={() => { setResponding(r.id); setResponseText('') }}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border rounded-lg transition-colors shrink-0"
                    style={{color:'#7C3AED', borderColor:'#e9d5ff'}}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f5f3ff')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                    <MessageSquare className="h-3.5 w-3.5" />
                    Respond
                  </button>
                )}
              </div>

              {/* Existing response */}
              {r.sellerResponse && (
                <div className="mt-4 bg-purple-50 border border-purple-100 rounded-lg p-4">
                  <p className="text-xs font-semibold mb-1" style={{color:'#7C3AED'}}>Your response</p>
                  <p className="text-sm text-gray-700">{r.sellerResponse}</p>
                </div>
              )}

              {/* Response form */}
              {responding === r.id && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <textarea
                    value={responseText}
                    onChange={e => setResponseText(e.target.value)}
                    rows={3}
                    placeholder="Write a professional response to this review..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none"
                    style={{outlineColor:'#7C3AED'}}
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-2 justify-end">
                    <button
                      onClick={() => { setResponding(null); setResponseText('') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                    <button
                      onClick={() => submitResponse(r.id)}
                      disabled={saving || !responseText.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white disabled:opacity-50 rounded-lg transition-colors font-medium"
                      style={{backgroundColor:'#7C3AED'}}>
                      <Send className="h-3.5 w-3.5" />
                      {saving ? 'Sending...' : 'Send Response'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {total > limit && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-500">
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white bg-white transition-colors">
                  Previous
                </button>
                <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white bg-white transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
