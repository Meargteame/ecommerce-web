jest.mock('../config/database', () => ({
  default: { query: jest.fn(), connect: jest.fn() },
  __esModule: true,
}))

jest.mock('../services/cartService', () => ({
  default: {
    getCart: jest.fn(),
    validateCart: jest.fn(),
    clearCart: jest.fn(),
  },
  __esModule: true,
}))

jest.mock('../services/inventoryService', () => ({
  default: { reserveCartItems: jest.fn(() => true), releaseCartItems: jest.fn() },
  __esModule: true,
}))

jest.mock('../services/notificationService', () => ({
  default: { sendOrderConfirmation: jest.fn(() => Promise.resolve()), sendOrderStatusUpdate: jest.fn(() => Promise.resolve()) },
  __esModule: true,
}))

import pool from '../config/database'
import cartService from '../services/cartService'
import { OrderService } from '../services/orderService'

const mockPool = pool as jest.Mocked<typeof pool>
const mockCart = cartService as jest.Mocked<typeof cartService>
const orderService = new OrderService()

describe('OrderService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('createOrder', () => {
    it('throws when cart is empty', async () => {
      mockCart.getCart.mockResolvedValueOnce({ items: [], subtotal: 0, total: 0 } as any)

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      }
      mockPool.connect = jest.fn().mockResolvedValueOnce(mockClient) as any
      mockClient.query.mockResolvedValue({ rows: [] } as any)

      await expect(orderService.createOrder({
        userId: 'u1',
        shippingAddress: { fullName: 'Test', addressLine1: '123 St', city: 'NYC', postalCode: '10001', country: 'US' },
        customerEmail: 'test@example.com',
      })).rejects.toThrow('Cart is empty')
    })
  })

  describe('listOrders', () => {
    it('returns orders with total', async () => {
      ;(mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            { id: 'o1', order_number: 'ORD-001', user_id: 'u1', status: 'placed',
              subtotal: '50', shipping_cost: '10', tax_amount: '4', discount_amount: '0',
              total_amount: '64', currency: 'USD', shipping_address: {}, billing_address: {},
              customer_email: 'test@example.com', customer_phone: null, notes: null,
              created_at: new Date(), updated_at: new Date() },
          ],
          rowCount: 1,
        })

      const result = await orderService.listOrders({ userId: 'u1' })
      expect(result.total).toBe(2)
      expect(result.orders).toHaveLength(1)
      expect(result.orders[0].orderNumber).toBe('ORD-001')
    })
  })
})
