import pool from '../config/database'
import productService from './productService'

interface SellerProfile {
  id: string
  userId: string
  storeName: string
  storeDescription?: string
  storeLogoUrl?: string
  storeBannerUrl?: string
  businessAddress?: string
  taxId?: string
  socialFacebook?: string
  socialInstagram?: string
  socialTwitter?: string
  returnPolicy?: string
  shippingPolicy?: string
  contactEmail?: string
  contactPhone?: string
  payoutEmail?: string
  totalSales: number
  totalRevenue: number
  rating?: number
  isVerified: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface UpdateProfileDTO {
  storeName?: string
  storeDescription?: string
  storeLogoUrl?: string
  storeBannerUrl?: string
  businessAddress?: string
  taxId?: string
  socialFacebook?: string
  socialInstagram?: string
  socialTwitter?: string
  returnPolicy?: string
  shippingPolicy?: string
  contactEmail?: string
  contactPhone?: string
  payoutEmail?: string
}

export class SellerService {
  async getOrCreateProfile(userId: string): Promise<SellerProfile> {
    const existing = await pool.query('SELECT * FROM seller_profiles WHERE user_id = $1', [userId])
    if (existing.rows.length > 0) return this.mapProfile(existing.rows[0])

    const userResult = await pool.query('SELECT email, first_name, last_name FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) throw new Error('User not found')
    const u = userResult.rows[0]

    const result = await pool.query(
      `INSERT INTO seller_profiles (user_id, store_name, contact_email)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'My Store', u.email]
    )
    return this.mapProfile(result.rows[0])
  }

  async updateProfile(userId: string, data: UpdateProfileDTO): Promise<SellerProfile> {
    const updates: string[] = []
    const values: any[] = []
    let p = 1

    const fieldMap: [keyof UpdateProfileDTO, string][] = [
      ['storeName', 'store_name'],
      ['storeDescription', 'store_description'],
      ['storeLogoUrl', 'store_logo_url'],
      ['storeBannerUrl', 'store_banner_url'],
      ['businessAddress', 'business_address'],
      ['taxId', 'tax_id'],
      ['socialFacebook', 'social_facebook'],
      ['socialInstagram', 'social_instagram'],
      ['socialTwitter', 'social_twitter'],
      ['returnPolicy', 'return_policy'],
      ['shippingPolicy', 'shipping_policy'],
      ['contactEmail', 'contact_email'],
      ['contactPhone', 'contact_phone'],
      ['payoutEmail', 'payout_email'],
    ]

    for (const [field, col] of fieldMap) {
      if (data[field] !== undefined) {
        updates.push(`${col} = $${p++}`)
        values.push(data[field])
      }
    }

    if (updates.length === 0) throw new Error('No fields to update')
    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(userId)

    const result = await pool.query(
      `UPDATE seller_profiles SET ${updates.join(', ')} WHERE user_id = $${p} RETURNING *`,
      values
    )
    if (result.rows.length === 0) throw new Error('Seller profile not found')
    return this.mapProfile(result.rows[0])
  }

  async getProducts(sellerId: string, limit = 20, offset = 0): Promise<{ products: any[]; total: number }> {
    const [productsResult, countResult] = await Promise.all([
      pool.query(
        `SELECT p.*, c.name as category_name,
                (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) as image_url
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.seller_id = $1
         ORDER BY p.created_at DESC
         LIMIT $2 OFFSET $3`,
        [sellerId, limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM products WHERE seller_id = $1', [sellerId]),
    ])

    return {
      products: productsResult.rows.map(row => ({
        ...(productService as any).mapProduct(row),
        imageUrl: row.image_url,
        categoryName: row.category_name
      })),
      total: parseInt(countResult.rows[0].count),
    }
  }

  async getOrders(sellerId: string, limit = 20, offset = 0): Promise<{ orders: any[]; total: number }> {
    const [ordersResult, countResult] = await Promise.all([
      pool.query(
        `SELECT DISTINCT o.id, o.order_number, o.status, o.total_amount,
                o.customer_email, o.created_at
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
         WHERE p.seller_id = $1
         ORDER BY o.created_at DESC
         LIMIT $2 OFFSET $3`,
        [sellerId, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT o.id) FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
         WHERE p.seller_id = $1`,
        [sellerId]
      ),
    ])

    return {
      orders: ordersResult.rows.map(r => ({
        id: r.id,
        orderNumber: r.order_number,
        status: r.status,
        totalAmount: parseFloat(r.total_amount),
        customerEmail: r.customer_email,
        createdAt: r.created_at
      })),
      total: parseInt(countResult.rows[0].count),
    }
  }

  async getDashboardStats(sellerId: string): Promise<any> {
    const [productCount, orderStats, revenueStats, currentMonthRevenue, lastMonthRevenue, currentMonthOrders, lastMonthOrders] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM products WHERE seller_id = $1', [sellerId]),
      pool.query(
        `SELECT COUNT(DISTINCT o.id) as total_orders
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
         WHERE p.seller_id = $1`,
        [sellerId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(oi.subtotal), 0) as total_revenue
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         JOIN orders o ON o.id = oi.order_id
         WHERE p.seller_id = $1 AND o.status != 'cancelled'`,
        [sellerId]
      ),
      // Last 30 days revenue
      pool.query(
        `SELECT COALESCE(SUM(oi.subtotal), 0) as revenue
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         JOIN orders o ON o.id = oi.order_id
         WHERE p.seller_id = $1 AND o.status != 'cancelled'
         AND o.created_at >= NOW() - INTERVAL '30 days'`,
        [sellerId]
      ),
      // 30-60 days ago revenue
      pool.query(
        `SELECT COALESCE(SUM(oi.subtotal), 0) as revenue
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         JOIN orders o ON o.id = oi.order_id
         WHERE p.seller_id = $1 AND o.status != 'cancelled'
         AND o.created_at >= NOW() - INTERVAL '60 days'
         AND o.created_at < NOW() - INTERVAL '30 days'`,
        [sellerId]
      ),
      // Last 30 days orders
      pool.query(
        `SELECT COUNT(DISTINCT o.id) as orders
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
         WHERE p.seller_id = $1 AND o.created_at >= NOW() - INTERVAL '30 days'`,
        [sellerId]
      ),
      // 30-60 days ago orders
      pool.query(
        `SELECT COUNT(DISTINCT o.id) as orders
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
         WHERE p.seller_id = $1 AND o.created_at >= NOW() - INTERVAL '60 days'
         AND o.created_at < NOW() - INTERVAL '30 days'`,
        [sellerId]
      ),
    ])

    const currRev = parseFloat(currentMonthRevenue.rows[0].revenue)
    const lastRev = parseFloat(lastMonthRevenue.rows[0].revenue)
    const revTrend = lastRev > 0 ? ((currRev - lastRev) / lastRev) * 100 : 0

    const currOrd = parseInt(currentMonthOrders.rows[0].orders)
    const lastOrd = parseInt(lastMonthOrders.rows[0].orders)
    const ordTrend = lastOrd > 0 ? ((currOrd - lastOrd) / lastOrd) : 0

    return {
      totalProducts: parseInt(productCount.rows[0].count),
      totalOrders: parseInt(orderStats.rows[0].total_orders),
      totalRevenue: parseFloat(revenueStats.rows[0].total_revenue),
      revenueTrend: revTrend.toFixed(1),
      ordersTrend: currOrd - lastOrd,
      viewCount: 0, // Placeholder for future enhancement
      conversionRate: 0, // Placeholder for future enhancement
    }
  }

  async updateSellerProduct(productId: string, sellerId: string, data: Record<string, unknown>): Promise<any> {
    const check = await pool.query('SELECT id FROM products WHERE id = $1 AND seller_id = $2', [productId, sellerId])
    if (check.rows.length === 0) throw new Error('Product not found or not owned by seller')
    return productService.updateProduct(productId, data)
  }

  async deleteSellerProduct(productId: string, sellerId: string): Promise<void> {
    const check = await pool.query('SELECT id FROM products WHERE id = $1 AND seller_id = $2', [productId, sellerId])
    if (check.rows.length === 0) throw new Error('Product not found or not owned by seller')
    await productService.deleteProduct(productId)
  }

  async updateOrderStatus(orderId: string, sellerId: string, status: string, trackingNumber?: string): Promise<any> {
    const check = await pool.query(
      `SELECT DISTINCT o.id FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       WHERE o.id = $1 AND p.seller_id = $2`,
      [orderId, sellerId]
    )
    if (check.rows.length === 0) throw new Error('Order not found or not authorized')

    const updates: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP']
    const values: any[] = [status]

    if (trackingNumber) {
      updates.push(`tracking_number = $${values.length + 1}`)
      values.push(trackingNumber)
    }
    values.push(orderId)

    const result = await pool.query(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )
    return result.rows[0]
  }

  async getInventory(sellerId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT p.id, p.name, p.sku, p.stock_quantity, p.status,
              p.base_price, p.price,
              (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) as image_url,
              c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.seller_id = $1
       ORDER BY p.stock_quantity ASC`,
      [sellerId]
    )
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      stockQuantity: row.stock_quantity,
      status: row.status,
      basePrice: parseFloat(row.base_price),
      price: parseFloat(row.price || row.base_price),
      imageUrl: row.image_url,
      categoryName: row.category_name
    }))
  }

  async updateStock(productId: string, sellerId: string, stockQuantity: number): Promise<any> {
    const check = await pool.query('SELECT id FROM products WHERE id = $1 AND seller_id = $2', [productId, sellerId])
    if (check.rows.length === 0) throw new Error('Product not found or not authorized')
    const result = await pool.query(
      'UPDATE products SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, stock_quantity',
      [stockQuantity, productId]
    )
    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      stockQuantity: result.rows[0].stock_quantity
    }
  }

  async getEarnings(sellerId: string): Promise<any> {
    const rateResult = await pool.query(`SELECT value FROM platform_settings WHERE key = 'commission_rate' LIMIT 1`)
    const rate = parseFloat(rateResult.rows[0]?.value || '10') / 100
    const netRate = 1 - rate

    const [total, monthly, recent] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(oi.subtotal), 0) as gross_revenue,
           COALESCE(SUM(oi.subtotal * $2), 0) as net_revenue,
           COALESCE(SUM(oi.subtotal * $3), 0) as platform_fee,
           COUNT(DISTINCT o.id) as total_orders
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         JOIN orders o ON o.id = oi.order_id
         WHERE p.seller_id = $1 AND o.status NOT IN ('cancelled', 'refunded')`,
        [sellerId, netRate, rate]
      ),
      pool.query(
        `SELECT
           DATE_TRUNC('month', o.created_at) as month,
           COALESCE(SUM(oi.subtotal * $2), 0) as net_revenue,
           COUNT(DISTINCT o.id) as orders
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         JOIN orders o ON o.id = oi.order_id
         WHERE p.seller_id = $1 AND o.status NOT IN ('cancelled', 'refunded')
           AND o.created_at >= NOW() - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', o.created_at)
         ORDER BY month DESC`,
        [sellerId, netRate]
      ),
      pool.query(
        `SELECT o.order_number, o.created_at, o.status,
                COALESCE(SUM(oi.subtotal * $2), 0) as net_amount,
                COALESCE(SUM(oi.subtotal * $3), 0) as fee
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         JOIN orders o ON o.id = oi.order_id
         WHERE p.seller_id = $1 AND o.status NOT IN ('cancelled', 'refunded')
         GROUP BY o.id, o.order_number, o.created_at, o.status
         ORDER BY o.created_at DESC
         LIMIT 10`,
        [sellerId, netRate, rate]
      ),
    ])

    return {
      summary: {
        grossRevenue: parseFloat(total.rows[0].gross_revenue),
        netRevenue: parseFloat(total.rows[0].net_revenue),
        platformFee: parseFloat(total.rows[0].platform_fee),
        totalOrders: parseInt(total.rows[0].total_orders),
        commissionRate: rate * 100
      },
      monthly: monthly.rows.map(r => ({
        month: r.month,
        netRevenue: parseFloat(r.net_revenue),
        orders: parseInt(r.orders)
      })),
      recentPayouts: recent.rows.map(r => ({
        orderNumber: r.order_number,
        createdAt: r.created_at,
        status: r.status,
        netAmount: parseFloat(r.net_amount),
        fee: parseFloat(r.fee)
      })),
    }
  }

  async getSellerReviews(sellerId: string, limit = 20, offset = 0): Promise<any> {
    const [reviews, count] = await Promise.all([
      pool.query(
        `SELECT r.id, r.rating, r.title, r.comment, r.is_verified_purchase,
                r.created_at, r.seller_response, r.seller_response_at,
                p.name as product_name, p.id as product_id,
                u.first_name, u.last_name
         FROM reviews r
         JOIN products p ON p.id = r.product_id
         JOIN users u ON u.id = r.user_id
         WHERE p.seller_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [sellerId, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM reviews r
         JOIN products p ON p.id = r.product_id
         WHERE p.seller_id = $1`,
        [sellerId]
      ),
    ])

    return {
      reviews: reviews.rows.map(r => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        isVerifiedPurchase: r.is_verified_purchase,
        createdAt: r.created_at,
        sellerResponse: r.seller_response,
        sellerResponseAt: r.seller_response_at,
        productName: r.product_name,
        productId: r.product_id,
        firstName: r.first_name,
        lastName: r.last_name
      })),
      total: parseInt(count.rows[0].count),
    }
  }

  async respondToReview(reviewId: string, sellerId: string, response: string): Promise<any> {
    const check = await pool.query(
      `SELECT r.id FROM reviews r
       JOIN products p ON p.id = r.product_id
       WHERE r.id = $1 AND p.seller_id = $2`,
      [reviewId, sellerId]
    )
    if (check.rows.length === 0) throw new Error('Review not found or not authorized')

    const result = await pool.query(
      `UPDATE reviews SET seller_response = $1, seller_response_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [response, reviewId]
    )
    const row = result.rows[0]
    return {
      id: row.id,
      sellerResponse: row.seller_response,
      sellerResponseAt: row.seller_response_at
    }
  }

  private mapProfile(row: any): SellerProfile {
    return {
      id: row.id,
      userId: row.user_id,
      storeName: row.store_name,
      storeDescription: row.store_description,
      storeLogoUrl: row.store_logo_url,
      storeBannerUrl: row.store_banner_url,
      businessAddress: row.business_address,
      taxId: row.tax_id,
      socialFacebook: row.social_facebook,
      socialInstagram: row.social_instagram,
      socialTwitter: row.social_twitter,
      returnPolicy: row.return_policy,
      shippingPolicy: row.shipping_policy,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      payoutEmail: row.payout_email,
      totalSales: parseFloat(row.total_sales || 0),
      totalRevenue: parseFloat(row.total_revenue || 0),
      rating: row.rating ? parseFloat(row.rating) : undefined,
      isVerified: row.is_verified,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

export default new SellerService()
