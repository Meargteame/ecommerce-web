jest.mock('../config/database', () => ({
  default: { query: jest.fn(), connect: jest.fn() },
  __esModule: true,
}))

jest.mock('../config/redis', () => ({
  cache: { get: jest.fn(() => null), set: jest.fn(), del: jest.fn() },
  __esModule: true,
}))

import pool from '../config/database'
import { CartService } from '../services/cartService'

const mockPool = pool as jest.Mocked<typeof pool>
const cartService = new CartService()

const mockProduct = {
  id: 'prod-1', name: 'Test Product', slug: 'test-product',
  base_price: '29.99', status: 'published', stock_quantity: 10,
  category_id: 'cat-1', brand: null, description: null,
  average_rating: null, review_count: 0, view_count: 0,
  created_at: new Date(), updated_at: new Date(),
}

describe('CartService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getCart', () => {
    it('returns empty cart for user with no items', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'cart-1', user_id: 'u1', session_id: null }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

      const cart = await cartService.getCart('u1')
      expect(cart.items).toHaveLength(0)
      expect(cart.subtotal).toBe(0)
    })
  })

  describe('validateCart', () => {
    it('returns valid for empty cart', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'cart-1', user_id: 'u1', session_id: null }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

      const result = await cartService.validateCart('u1')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})
