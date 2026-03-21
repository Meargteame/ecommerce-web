import pool from '../config/database'
import cartService from './cartService'
import inventoryService from './inventoryService'
import notificationService from './notificationService'

interface CreateOrderDTO {
  userId: string
  shippingAddress: {
    fullName: string
    addressLine1: string
    addressLine2?: string
    city: string
    state?: string
    postalCode: string
    country: string
    phone?: string
  }
  billingAddress?: {
    fullName: string
    addressLine1: string
    addressLine2?: string
    city: string
    state?: string
    postalCode: string
    country: string
    phone?: string
  }
  customerEmail: string
  customerPhone?: string
  promoCode?: string
  notes?: string
}

type OrderStatus =
  | 'placed'
  | 'payment_confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

interface Order {
  id: string
  orderNumber: string
  userId: string
  status: OrderStatus
  subtotal: number
  shippingCost: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  currency: string
  shippingAddress: any
  billingAddress: any
  customerEmail: string
  customerPhone?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

interface OrderFilters {
  userId?: string
  status?: OrderStatus
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export class OrderService {
  private readonly TAX_RATE = 0.08
  private readonly SHIPPING_COST = 10.0

  private generateOrderNumber(): string {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `ORD-${y}${m}${day}-${rand}`
  }

  async createOrder(data: CreateOrderDTO): Promise<Order> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const cart = await cartService.getCart(data.userId)
      if (cart.items.length === 0) throw new Error('Cart is empty')

      const validation = await cartService.validateCart(data.userId)
      if (!validation.valid) {
        throw new Error(`Cart validation failed: ${validation.errors.join(', ')}`)
      }

      const cartItems = cart.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      }))

      const reserved = await inventoryService.reserveCartItems(cartItems)
      if (!reserved) throw new Error('Failed to reserve inventory')

      const subtotal = cart.subtotal
      const shippingCost = this.SHIPPING_COST
      const taxAmount = subtotal * this.TAX_RATE
      const discountAmount = 0
      const totalAmount = subtotal + shippingCost + taxAmount - discountAmount

      const billing = data.billingAddress || data.shippingAddress
      const orderNumber = this.generateOrderNumber()

      const orderResult = await client.query(
        `INSERT INTO orders (
          order_number, user_id, status, subtotal, shipping_cost, tax_amount,
          discount_amount, total_amount, currency, shipping_address, billing_address,
          customer_email, customer_phone, notes,
          shipping_full_name, shipping_phone, shipping_address_line1, shipping_address_line2,
          shipping_city, shipping_state, shipping_postal_code, shipping_country,
          billing_full_name, billing_phone, billing_address_line1, billing_address_line2,
          billing_city, billing_state, billing_postal_code, billing_country
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
          $15,$16,$17,$18,$19,$20,$21,$22,
          $23,$24,$25,$26,$27,$28,$29,$30
        ) RETURNING *`,
        [
          orderNumber, data.userId, 'placed',
          subtotal, shippingCost, taxAmount, discountAmount, totalAmount, 'USD',
          JSON.stringify(data.shippingAddress), JSON.stringify(billing),
          data.customerEmail, data.customerPhone || null, data.notes || null,
          data.shippingAddress.fullName, data.shippingAddress.phone || null,
          data.shippingAddress.addressLine1, data.shippingAddress.addressLine2 || null,
          data.shippingAddress.city, data.shippingAddress.state || '',
          data.shippingAddress.postalCode, data.shippingAddress.country,
          billing.fullName, billing.phone || null,
          billing.addressLine1, billing.addressLine2 || null,
          billing.city, billing.state || '',
          billing.postalCode, billing.country,
        ]
      )

      const order = orderResult.rows[0]

      for (const item of cart.items) {
        await client.query(
          `INSERT INTO order_items (
            order_id, product_id, variant_id, product_variant_id, product_name, variant_name,
            sku, product_sku, quantity, unit_price, subtotal
          ) VALUES ($1,$2,$3,$3,$4,$5,$6,$6,$7,$8,$9)`,
          [
            order.id, item.productId, item.variantId || null,
            item.product.name, item.variant?.variantName || null,
            item.variant?.sku || 'N/A', item.quantity, item.unitPrice, item.subtotal,
          ]
        )
      }

      await client.query(
        'INSERT INTO order_status_history (order_id, status, notes) VALUES ($1,$2,$3)',
        [order.id, 'placed', 'Order placed']
      )

      await cartService.clearCart(data.userId)
      await client.query('COMMIT')

      // Send confirmation email — non-blocking, never fails the order
      notificationService.sendOrderConfirmation(order.id).catch((err) =>
        console.error('Order confirmation email failed:', err)
      )

      return this.mapOrder(order)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async getOrder(id: string, userId?: string): Promise<Order | null> {
    const query = userId
      ? 'SELECT * FROM orders WHERE id = $1 AND user_id = $2'
      : 'SELECT * FROM orders WHERE id = $1'
    const params = userId ? [id, userId] : [id]
    const result = await pool.query(query, params)
    if (result.rows.length === 0) return null
    return this.mapOrder(result.rows[0])
  }

  async getOrderWithItems(id: string, userId?: string): Promise<any> {
    const order = await this.getOrder(id, userId)
    if (!order) return null

    const itemsResult = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1', [id]
    )
    const items = itemsResult.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      variantId: row.variant_id,
      productName: row.product_name,
      variantName: row.variant_name,
      sku: row.sku,
      quantity: row.quantity,
      unitPrice: parseFloat(row.unit_price),
      subtotal: parseFloat(row.subtotal),
    }))

    const historyResult = await pool.query(
      'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC', [id]
    )
    const statusHistory = historyResult.rows.map((row) => ({
      id: row.id,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
    }))

    return { ...order, items, statusHistory }
  }

  async listOrders(filters: OrderFilters): Promise<{ orders: Order[]; total: number }> {
    const { userId, status, startDate, endDate, limit = 20, offset = 0 } = filters
    const conditions: string[] = []
    const values: any[] = []
    let p = 1

    if (userId)    { conditions.push('user_id = $' + p++);     values.push(userId) }
    if (status)    { conditions.push('status = $' + p++);      values.push(status) }
    if (startDate) { conditions.push('created_at >= $' + p++); values.push(startDate) }
    if (endDate)   { conditions.push('created_at <= $' + p++); values.push(endDate) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM orders ${where}`, values
    )
    const total = parseInt(countResult.rows[0].total)

    const result = await pool.query(
      `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $${p} OFFSET $${p + 1}`,
      [...values, limit, offset]
    )

    return { orders: result.rows.map((r) => this.mapOrder(r)), total }
  }

  async updateOrderStatus(id: string, status: OrderStatus, notes?: string, userId?: string): Promise<Order> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const orderCheck = await client.query(
        'SELECT id, status FROM orders WHERE id = $1', [id]
      )
      if (orderCheck.rows.length === 0) throw new Error('Order not found')

      const currentStatus = orderCheck.rows[0].status
      if (!this.isValidStatusTransition(currentStatus, status)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${status}`)
      }

      const result = await client.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      )

      await client.query(
        'INSERT INTO order_status_history (order_id, status, notes, created_by) VALUES ($1,$2,$3,$4)',
        [id, status, notes || null, userId || null]
      )

      await client.query('COMMIT')

      // Send status update email — non-blocking
      notificationService.sendOrderStatusUpdate(id, status).catch((err) =>
        console.error('Order status email failed:', err)
      )

      return this.mapOrder(result.rows[0])
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async cancelOrder(id: string, userId: string, reason?: string): Promise<Order> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1 AND user_id = $2', [id, userId]
      )
      if (orderResult.rows.length === 0) throw new Error('Order not found')

      const order = orderResult.rows[0]
      if (!['placed', 'payment_confirmed', 'processing'].includes(order.status)) {
        throw new Error('Order cannot be cancelled at this stage')
      }

      const itemsResult = await client.query(
        'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = $1', [id]
      )
      await inventoryService.releaseCartItems(
        itemsResult.rows.map((r) => ({ productId: r.product_id, variantId: r.variant_id, quantity: r.quantity }))
      )

      const result = await client.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        ['cancelled', id]
      )

      await client.query(
        'INSERT INTO order_status_history (order_id, status, notes, created_by) VALUES ($1,$2,$3,$4)',
        [id, 'cancelled', reason || 'Cancelled by customer', userId]
      )

      await client.query('COMMIT')
      return this.mapOrder(result.rows[0])
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  private isValidStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
    const valid: Record<OrderStatus, OrderStatus[]> = {
      placed: ['payment_confirmed', 'cancelled'],
      payment_confirmed: ['processing', 'cancelled'],
      processing: ['packed', 'cancelled'],
      packed: ['shipped'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    }
    return valid[from]?.includes(to) || false
  }

  private mapOrder(row: any): Order {
    return {
      id: row.id,
      orderNumber: row.order_number,
      userId: row.user_id,
      status: row.status,
      subtotal: parseFloat(row.subtotal),
      shippingCost: parseFloat(row.shipping_cost),
      taxAmount: parseFloat(row.tax_amount),
      discountAmount: parseFloat(row.discount_amount),
      totalAmount: parseFloat(row.total_amount),
      currency: row.currency,
      shippingAddress: row.shipping_address,
      billingAddress: row.billing_address,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

export default new OrderService()
