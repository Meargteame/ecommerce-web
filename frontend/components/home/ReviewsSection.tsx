'use client'

export default function ReviewsSection() {
  const reviews = [
    {
      author: 'Cooper B.',
      source: 'Review from TrustPilot',
      rating: 5,
      text: "My experience with ShopHub has been great, I've been able to start my own business and am making great money. What makes it even better is I get to support my favorite pc content channel on YouTube due to him being a part of this great company."
    },
    {
      author: 'Javier G.',
      source: 'Review of Forge Computers',
      rating: 5,
      text: 'Super easy to start up and run and the customer service was very helpful and patient. 10/10 will be using them again. Thank you guys for making it easy for me to get my first pc!'
    },
    {
      author: 'George M.',
      source: 'Review from TrustPilot',
      rating: 5,
      text: "I've been buying & selling on ShopHub for a little over 2 years now and have over 100 sales on my account. The Discord community is full of incredible people and staff is more than willing to help you with any orders you may have. I always list my things on ShopHub FIRST because I rather sell to the awesome community who deserve it than other marketplaces filled with people who will waste my time."
    },
    {
      author: 'Jonathan W.',
      source: 'Review from TrustB',
      rating: 5,
      text: 'Consistency of great service and a great experience is a rarity.'
    },
  ]

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reviews.map((review, index) => (
            <div key={index} className="rounded-xl p-6 bg-gray-800 text-white shadow-lg">
              <div className="flex mb-3">
                {[...Array(review.rating)].map((_, i) => (
                  <span key={i} className="text-yellow-400">⭐</span>
                ))}
              </div>
              <p className="text-sm mb-4 line-clamp-6">{review.text}</p>
              <div className="border-t border-gray-700 pt-4">
                <p className="font-semibold text-sm">- {review.author}</p>
                <p className="text-xs text-gray-400">{review.source}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
