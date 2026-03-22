import pool from '../config/database'
import crypto from 'crypto'

export interface SellerProfile {
  id: string
  userId: string
  storeName: string
  storeDescription?: string
  storeLogoUrl?: string
  storeBannerUrl?: string
  contactEmail?: string
  contactPhone?: string
  payoutEmail?: string
  totalSales: number
  totalRevenue: number
  rating: number
  isVerified: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class SellerService {
  async getOrCreateProfile(userId: string): Promise<SellerProfile> {
    const result = await pool.query('SELECT * FROM seller_profiles WHERE user_id = ?', [userId])
    
    if (result.rows.length > 0) {
      return this.mapProfile(result.rows[0])
    }

    // Create a new profile if not exists
    const id = crypto.randomUUID()
    // Try to get some default info from users table
    const userResult = await pool.query('SELECT first_name, last_name, email FROM users WHERE id = ?', [userId])
    const user = userResult.rows[0]
    const storeName = user ? `${user.first_name}'s Store` : 'New Store'
    const contactEmail = user ? user.email : null

    await pool.query(
      `INSERT INTO seller_profiles (id, user_id, store_name, contact_email)
       VALUES (?, ?, ?, ?)`,
      [id, userId, storeName, contactEmail]
    )

    const newProfile = await pool.query('SELECT * FROM seller_profiles WHERE id = ?', [id])
    return this.mapProfile(newProfile.rows[0])
  }

  async updateProfile(userId: string, data: any): Promise<SellerProfile> {
    const updates: string[] = []
    const params: any[] = []

    const fieldMap: Record<string, string> = {
      storeName: 'store_name',
      storeDescription: 'store_description',
      storeLogoUrl: 'store_logo_url',
      storeBannerUrl: 'store_banner_url',
      contactEmail: 'contact_email',
      contactPhone: 'contact_phone',
      payoutEmail: 'payout_email'
    }

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        updates.push(`${dbField} = ?`)
        params.push(data[key])
      }
    }

    if (updates.length === 0) {
      return this.getOrCreateProfile(userId)
    }

    params.push(userId)
    await pool.query(
      `UPDATE seller_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
      params
    )

    return this.getOrCreateProfile(userId)
  }

  async getDashboardStats(userId: string): Promise<any> {
    // Total Revenue & Orders
    const salesResult = await pool.query(
      `SELECT COALESCE(SUM(oi.subtotal), 0) as revenue, COUNT(DISTINCT o.id) as orders
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE p.seller_id = ? AND o.status != 'cancelled'`,
      [userId]
    )

    // Total Products
    const productsResult = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE seller_id = ?',
      [userId]
    )

    // Average Rating
    const ratingResult = await pool.query(
      'SELECT rating FROM seller_profiles WHERE user_id = ?',
      [userId]
    )

    // Recent 5 Orders
    const recentOrdersResult = await pool.query(
      `SELECT DISTINCT o.id, o.order_number as orderNumber, o.total_amount as totalAmount, o.status, o.created_at as createdAt
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE p.seller_id = ?
       ORDER BY o.created_at DESC
       LIMIT 5`,
      [userId]
    )

    return {
      revenue: parseFloat(salesResult.rows[0].revenue),
      orders: parseInt(salesResult.rows[0].orders),
      products: parseInt(productsResult.rows[0].count),
      rating: parseFloat(ratingResult.rows[0]?.rating || 0),
      recentOrders: recentOrdersResult.rows
    }
  }

  async getProducts(userId: string, limit: number, offset: number): Promise<any> {
    const [products, count] = await Promise.all([
      pool.query(
        `SELECT p.*, c.name as categoryName,
                (SELECT SUM(stock_quantity) FROM product_variants WHERE product_id = p.id) as totalStock
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.seller_id = ?
         ORDER BY p.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      ),
      pool.query('SELECT COUNT(*) as count FROM products WHERE seller_id = ?', [userId])
    ])

    return {
      products: products.rows,
      total: parseInt(count.rows[0].count)
    }
  }

  async getOrders(userId: string, limit: number, offset: number): Promise<any> {
    const [orders, count] = await Promise.all([
      pool.query(
        `SELECT DISTINCT o.id, o.order_number as orderNumber, o.total_amount as totalAmount, 
                         o.status, o.created_at as createdAt, u.email as customerEmail
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         JOIN users u ON u.id = o.user_id
         WHERE p.seller_id = ?
         ORDER BY o.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT o.id) as count
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         WHERE p.seller_id = ?`,
        [userId]
      )
    ])

    return {
      orders: orders.rows,
      total: parseInt(count.rows[0].count)
    }
  }

  async updateOrderStatus(orderId: string, userId: string, status: string, trackingNumber?: string): Promise<any> {
    // Verify order contains items from this seller
    const check = await pool.query(
      `SELECT 1 FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ? AND p.seller_id = ?
       LIMIT 1`,
      [orderId, userId]
    )

    if (check.rows.length === 0) {
      throw new Error('Access denied or order not found')
    }

    const updates = ['status = ?']
    const params: any[] = [status]

    if (trackingNumber) {
      updates.push('tracking_number = ?')
      params.push(trackingNumber)
    }

    params.push(orderId)
    await pool.query(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
      params
    )

    return { success: true }
  }

  async updateSellerProduct(productId: string, userId: string, data: any): Promise<any> {
    // Verify ownership
    const check = await pool.query('SELECT 1 FROM products WHERE id = ? AND seller_id = ?', [productId, userId])
    if (check.rows.length === 0) throw new Error('Access denied or product not found')

    // Reuse logic from ProductService if possible, or implement here
    const updates: string[] = []
    const params: any[] = []

    const fields = ['name', 'description', 'base_price', 'price', 'status', 'brand', 'sku']
    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`)
        params.push(data[field])
      }
    }

    if (updates.length > 0) {
      params.push(productId)
      await pool.query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params)
    }

    const result = await pool.query('SELECT * FROM products WHERE id = ?', [productId])
    return result.rows[0]
  }

  async deleteSellerProduct(productId: string, userId: string): Promise<void> {
    const result = await pool.query('DELETE FROM products WHERE id = ? AND seller_id = ?', [productId, userId])
    if (result.rowCount === 0) throw new Error('Access denied or product not found')
  }

  async getInventory(userId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT p.id, p.name, p.sku, 
              (SELECT SUM(stock_quantity) FROM product_variants WHERE product_id = p.id) as totalStock,
              p.stock_quantity as baseStock
       FROM products p
       WHERE p.seller_id = ?`,
      [userId]
    )
    return result.rows
  }

  async updateStock(productId: string, userId: string, quantity: number): Promise<any> {
    const result = await pool.query(
      'UPDATE products SET stock_quantity = ? WHERE id = ? AND seller_id = ?',
      [quantity, productId, userId]
    )
    if (result.rowCount === 0) throw new Error('Access denied or product not found')
    
    const updated = await pool.query('SELECT id, stock_quantity FROM products WHERE id = ?', [productId])
    return updated.rows[0]
  }

  async getEarnings(userId: string): Promise<any> {
    const result = await pool.query(
      `SELECT 
         COALESCE(SUM(oi.subtotal), 0) as totalEarnings,
         COALESCE(SUM(CASE WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN oi.subtotal ELSE 0 END), 0) as last30Days
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE p.seller_id = ? AND o.status = 'delivered'`,
      [userId]
    )

    const revenue = await pool.query(
      `SELECT DATE(o.created_at) as date, SUM(oi.subtotal) as amount
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE p.seller_id = ? AND o.status = 'delivered'
       GROUP BY DATE(o.created_at)
       ORDER BY date DESC
       LIMIT 30`,
      [userId]
    )

    return {
      summary: result.rows[0],
      history: revenue.rows
    }
  }

  async getSellerReviews(userId: string, limit: number, offset: number): Promise<any> {
    const [reviews, count] = await Promise.all([
      pool.query(
        `SELECT r.*, p.name as productName, u.first_name, u.last_name
         FROM reviews r
         JOIN products p ON p.id = r.product_id
         JOIN users u ON u.id = r.user_id
         WHERE p.seller_id = ?
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM reviews r
         JOIN products p ON p.id = r.product_id
         WHERE p.seller_id = ?`,
        [userId]
      )
    ])

    return {
      reviews: reviews.rows,
      total: parseInt(count.rows[0].count)
    }
  }

  async respondToReview(reviewId: string, userId: string, response: string): Promise<any> {
    const check = await pool.query(
      `SELECT 1 FROM reviews r
       JOIN products p ON p.id = r.product_id
       WHERE r.id = ? AND p.seller_id = ?`,
      [reviewId, userId]
    )

    if (check.rows.length === 0) throw new Error('Access denied or review not found')

    await pool.query(
      'UPDATE reviews SET seller_response = ?, seller_response_at = NOW() WHERE id = ?',
      [response, reviewId]
    )

    const updated = await pool.query('SELECT * FROM reviews WHERE id = ?', [reviewId])
    return updated.rows[0]
  }

  private mapProfile(row: any): SellerProfile {
    return {
      id: row.id,
      userId: row.user_id,
      storeName: row.store_name,
      storeDescription: row.store_description,
      storeLogoUrl: row.store_logo_url,
      storeBannerUrl: row.store_banner_url,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      payoutEmail: row.payout_email,
      totalSales: parseInt(row.total_sales) || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      rating: parseFloat(row.rating) || 0,
      isVerified: Boolean(row.is_verified),
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}

export default new SellerService()
