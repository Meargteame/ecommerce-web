'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import api from '@/lib/api'

interface ReviewFormProps {
  productId: string
  onSuccess: (review: { id: string; rating: number; title: string; body: string; user_name: string; created_at: string }) => void
}

export default function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) { setError('Please select a star rating.'); return }
    if (!title.trim()) { setError('Please add a review title.'); return }
    if (!body.trim()) { setError('Please write your review.'); return }
    setSubmitting(true)
    setError('')
    try {
      const { data } = await api.post('/reviews', { productId, rating, title: title.trim(), comment: body.trim() })
      onSuccess(data.data)
      setRating(0)
      setTitle('')
      setBody('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit review. Please try again.')
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl border border-gray-200 p-6 space-y-4">
      <h3 className="font-semibold text-gray-900">Write a Review</h3>

      <div>
        <p className="text-sm text-gray-600 mb-2">Your Rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              className="focus:outline-none"
            >
              <Star
                className={`h-7 w-7 transition-colors ${s <= (hovered || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Review Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={100}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Your Review</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tell others what you think about this product..."
          rows={4}
          maxLength={1000}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{body.length}/1000</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors text-sm"
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}
