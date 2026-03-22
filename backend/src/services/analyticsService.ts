import pool from '../config/database'

interface DateRange {
  startDate: Date
  endDate: Date
}

interface TrackEventDTO {
  userId?: string
  sessionId: string
  eventType: 'page_view' | 'product_view' | 'add_to_cart' | 'remove_from_cart' | 'checkout_start' | 'checkout_complete' | 'search' | 'click'
  eventData?: any
  ipAddress?: string
  userAgent?: string
  referrer?: string
}

interface SalesMetrics {
  totalRevenue: number
  orderCount: number
  averageOrderValue: number
  totalItems: number
  topProducts: Array<{
    productId: string
    productName: string
    revenue: number
    quantity: number
  }>
  revenueByDay: Array<{
    date: string
    revenue: number
    orders: number
  }>
}

interface ConversionMetrics {
  totalSessions: number
  sessionsWithCart: number
  sessionsWithCheckout: number
  completedOrders: number
  cartConversionRate: number
  checkoutConversionRate: number
  overallConversionRate: number
  abandonedCarts: number
  cartAbandonmentRate: number
}

interface CustomerMetrics {
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  averageLifetimeValue: number
  topCustomers: Array<{
    userId: string
    email: string
    totalSpent: number
    orderCount: number
  }>
}

interface ProductMetrics {
  productId: string
  productName: string
  views: number
  addedToCart: number
  purchased: number
  revenue: number
  conversionRate: number
  averageRating: number
  reviewCount: number
}

interface TrafficSource {
  source: string
  sessions: number
  conversions: number
  conversionRate: number
  revenue: number
}

export class AnalyticsService {
  async trackEvent(data: TrackEventDTO): Promise<void> {
    await pool.query(
      `INSERT INTO analytics_events (
        user_id, session_id, event_type, event_data, ip_address, user_agent, referrer
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId || null,
        data.sessionId,
        data.eventType,
        JSON.stringify(data.eventData || {}),
        data.ipAddress || null,
        data.userAgent || null,
        data.referrer || null,
      ]
    )
  }

  async getSalesMetrics(dateRange: DateRange): Promise<SalesMetrics> {
    // Total revenue and order count
    const summaryResult = await pool.query(
      `SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount) / NULLIF(COUNT(*), 0), 0) as average_order_value,
        COALESCE(SUM((SELECT SUM(quantity) FROM order_items WHERE order_id = orders.id)), 0) as total_items
       FROM orders
       WHERE created_at >= ? AND created_at <= ?
       AND status NOT IN ('cancelled')`,
      [dateRange.startDate, dateRange.endDate]
    )

    const summary = summaryResult.rows[0]

    // Top products by revenue
    const topProductsResult = await pool.query(
      `SELECT 
        oi.product_id,
        oi.product_name,
        SUM(oi.subtotal) as revenue,
        SUM(oi.quantity) as quantity
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.created_at >= ? AND o.created_at <= ?
       AND o.status NOT IN ('cancelled')
       GROUP BY oi.product_id, oi.product_name
       ORDER BY revenue DESC
       LIMIT 10`,
      [dateRange.startDate, dateRange.endDate]
    )

    // Revenue by day
    const revenueByDayResult = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        SUM(total_amount) as revenue,
        COUNT(*) as orders
       FROM orders
       WHERE created_at >= ? AND created_at <= ?
       AND status NOT IN ('cancelled')
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [dateRange.startDate, dateRange.endDate]
    )

    return {
      totalRevenue: parseFloat(summary.total_revenue),
      orderCount: parseInt(summary.order_count),
      averageOrderValue: parseFloat(summary.average_order_value),
      totalItems: parseInt(summary.total_items),
      topProducts: topProductsResult.rows.map((row: any) => ({
        productId: row.product_id,
        productName: row.product_name,
        revenue: parseFloat(row.revenue),
        quantity: parseInt(row.quantity),
      })),
      revenueByDay: revenueByDayResult.rows.map((row: any) => ({
        date: row.date,
        revenue: parseFloat(row.revenue),
        orders: parseInt(row.orders),
      })),
    }
  }

  async getConversionMetrics(dateRange: DateRange): Promise<ConversionMetrics> {
    // Total sessions
    const sessionsResult = await pool.query(
      `SELECT COUNT(DISTINCT session_id) as total_sessions
       FROM analytics_events
       WHERE created_at >= ? AND created_at <= ?`,
      [dateRange.startDate, dateRange.endDate]
    )

    // Sessions with cart activity
    const cartSessionsResult = await pool.query(
      `SELECT COUNT(DISTINCT session_id) as sessions_with_cart
       FROM analytics_events
       WHERE created_at >= ? AND created_at <= ?
       AND event_type = 'add_to_cart'`,
      [dateRange.startDate, dateRange.endDate]
    )

    // Sessions with checkout
    const checkoutSessionsResult = await pool.query(
      `SELECT COUNT(DISTINCT session_id) as sessions_with_checkout
       FROM analytics_events
       WHERE created_at >= ? AND created_at <= ?
       AND event_type = 'checkout_start'`,
      [dateRange.startDate, dateRange.endDate]
    )

    // Completed orders
    const completedOrdersResult = await pool.query(
      `SELECT COUNT(DISTINCT session_id) as completed_orders
       FROM analytics_events
       WHERE created_at >= ? AND created_at <= ?
       AND event_type = 'checkout_complete'`,
      [dateRange.startDate, dateRange.endDate]
    )

    const totalSessions = parseInt(sessionsResult.rows[0].total_sessions) || 1
    const sessionsWithCart = parseInt(cartSessionsResult.rows[0].sessions_with_cart)
    const sessionsWithCheckout = parseInt(checkoutSessionsResult.rows[0].sessions_with_checkout)
    const completedOrders = parseInt(completedOrdersResult.rows[0].completed_orders)

    const cartConversionRate = (sessionsWithCart / totalSessions) * 100
    const checkoutConversionRate = sessionsWithCheckout > 0 ? (completedOrders / sessionsWithCheckout) * 100 : 0
    const overallConversionRate = (completedOrders / totalSessions) * 100
    const abandonedCarts = sessionsWithCart - completedOrders
    const cartAbandonmentRate = sessionsWithCart > 0 ? (abandonedCarts / sessionsWithCart) * 100 : 0

    return {
      totalSessions,
      sessionsWithCart,
      sessionsWithCheckout,
      completedOrders,
      cartConversionRate: Math.round(cartConversionRate * 100) / 100,
      checkoutConversionRate: Math.round(checkoutConversionRate * 100) / 100,
      overallConversionRate: Math.round(overallConversionRate * 100) / 100,
      abandonedCarts,
      cartAbandonmentRate: Math.round(cartAbandonmentRate * 100) / 100,
    }
  }

  async getCustomerMetrics(dateRange: DateRange): Promise<CustomerMetrics> {
    // Total customers
    const totalCustomersResult = await pool.query(
      `SELECT COUNT(DISTINCT id) as total_customers
       FROM users
       WHERE created_at <= ?`,
      [dateRange.endDate]
    )

    // New customers in date range
    const newCustomersResult = await pool.query(
      `SELECT COUNT(*) as new_customers
       FROM users
       WHERE created_at >= ? AND created_at <= ?`,
      [dateRange.startDate, dateRange.endDate]
    )

    // Returning customers (customers with orders in this period who also had orders before)
    const returningCustomersResult = await pool.query(
      `SELECT COUNT(DISTINCT o1.user_id) as returning_customers
       FROM orders o1
       WHERE o1.created_at >= ? AND o1.created_at <= ?
       AND EXISTS (
         SELECT 1 FROM orders o2
         WHERE o2.user_id = o1.user_id
         AND o2.created_at < ?
       )`,
      [dateRange.startDate, dateRange.endDate, dateRange.startDate]
    )

    // Average lifetime value
    const avgLtvResult = await pool.query(
      `SELECT AVG(total_spent) as avg_ltv
       FROM (
         SELECT user_id, SUM(total_amount) as total_spent
         FROM orders
         WHERE status NOT IN ('cancelled')
         GROUP BY user_id
       ) as customer_totals`
    )

    // Top customers
    const topCustomersResult = await pool.query(
      `SELECT 
        u.id as user_id,
        u.email,
        SUM(o.total_amount) as total_spent,
        COUNT(o.id) as order_count
       FROM users u
       JOIN orders o ON u.id = o.user_id
       WHERE o.created_at >= ? AND o.created_at <= ?
       AND o.status NOT IN ('cancelled')
       GROUP BY u.id, u.email
       ORDER BY total_spent DESC
       LIMIT 10`,
      [dateRange.startDate, dateRange.endDate]
    )

    return {
      totalCustomers: parseInt(totalCustomersResult.rows[0].total_customers),
      newCustomers: parseInt(newCustomersResult.rows[0].new_customers),
      returningCustomers: parseInt(returningCustomersResult.rows[0].returning_customers),
      averageLifetimeValue: parseFloat(avgLtvResult.rows[0].avg_ltv) || 0,
      topCustomers: topCustomersResult.rows.map((row: any) => ({
        userId: row.user_id,
        email: row.email,
        totalSpent: parseFloat(row.total_spent),
        orderCount: parseInt(row.order_count),
      })),
    }
  }

  async getProductMetrics(productId: string, dateRange: DateRange): Promise<ProductMetrics> {
    // Product info
    const productResult = await pool.query(
      'SELECT name, average_rating, review_count FROM products WHERE id = ?',
      [productId]
    )

    if (productResult.rows.length === 0) {
      throw new Error('Product not found')
    }

    const product = productResult.rows[0]

    // Views
    const viewsResult = await pool.query(
      `SELECT COUNT(*) as views
       FROM analytics_events
       WHERE event_type = 'product_view'
       AND JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.productId')) = ?
       AND created_at >= ? AND created_at <= ?`,
      [productId, dateRange.startDate, dateRange.endDate]
    )

    // Added to cart
    const addedToCartResult = await pool.query(
      `SELECT COUNT(*) as added_to_cart
       FROM analytics_events
       WHERE event_type = 'add_to_cart'
       AND JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.productId')) = ?
       AND created_at >= ? AND created_at <= ?`,
      [productId, dateRange.startDate, dateRange.endDate]
    )

    // Purchased and revenue
    const purchasedResult = await pool.query(
      `SELECT 
        SUM(oi.quantity) as purchased,
        SUM(oi.subtotal) as revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE oi.product_id = ?
       AND o.created_at >= ? AND o.created_at <= ?
       AND o.status NOT IN ('cancelled')`,
      [productId, dateRange.startDate, dateRange.endDate]
    )

    const views = parseInt(viewsResult.rows[0].views)
    const addedToCart = parseInt(addedToCartResult.rows[0].added_to_cart)
    const purchased = parseInt(purchasedResult.rows[0].purchased) || 0
    const revenue = parseFloat(purchasedResult.rows[0].revenue) || 0

    const conversionRate = views > 0 ? (purchased / views) * 100 : 0

    return {
      productId,
      productName: product.name,
      views,
      addedToCart,
      purchased,
      revenue,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageRating: parseFloat(product.average_rating),
      reviewCount: product.review_count,
    }
  }

  async getTrafficSources(dateRange: DateRange): Promise<TrafficSource[]> {
    const result = await pool.query(
      `SELECT 
        COALESCE(
          CASE 
            WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
            WHEN referrer LIKE '%google%' THEN 'Google'
            WHEN referrer LIKE '%facebook%' THEN 'Facebook'
            WHEN referrer LIKE '%instagram%' THEN 'Instagram'
            WHEN referrer LIKE '%twitter%' THEN 'Twitter'
            ELSE 'Other'
          END,
          'Direct'
        ) as source,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(DISTINCT CASE WHEN event_type = 'checkout_complete' THEN session_id END) as conversions
       FROM analytics_events
       WHERE created_at >= ? AND created_at <= ?
       GROUP BY source
       ORDER BY sessions DESC`,
      [dateRange.startDate, dateRange.endDate]
    )

    // Get revenue by source
    const revenueResult = await pool.query(
      `SELECT 
        COALESCE(
          CASE 
            WHEN ae.referrer IS NULL OR ae.referrer = '' THEN 'Direct'
            WHEN ae.referrer LIKE '%google%' THEN 'Google'
            WHEN ae.referrer LIKE '%facebook%' THEN 'Facebook'
            WHEN ae.referrer LIKE '%instagram%' THEN 'Instagram'
            WHEN ae.referrer LIKE '%twitter%' THEN 'Twitter'
            ELSE 'Other'
          END,
          'Direct'
        ) as source,
        SUM(o.total_amount) as revenue
       FROM analytics_events ae
       JOIN orders o ON ae.session_id = o.id
       WHERE ae.created_at >= ? AND ae.created_at <= ?
       AND ae.event_type = 'checkout_complete'
       AND o.status NOT IN ('cancelled')
       GROUP BY source`,
      [dateRange.startDate, dateRange.endDate]
    )

    const revenueMap = new Map<string, number>()
    revenueResult.rows.forEach((row: any) => {
      revenueMap.set(row.source, parseFloat(row.revenue))
    })

    return result.rows.map((row: any) => {
      const sessions = parseInt(row.sessions)
      const conversions = parseInt(row.conversions)
      const conversionRate = sessions > 0 ? (conversions / sessions) * 100 : 0

      return {
        source: row.source,
        sessions,
        conversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        revenue: revenueMap.get(row.source) || 0,
      }
    })
  }

  async getDashboardMetrics(dateRange: DateRange): Promise<any> {
    const [sales, conversion, customer] = await Promise.all([
      this.getSalesMetrics(dateRange),
      this.getConversionMetrics(dateRange),
      this.getCustomerMetrics(dateRange),
    ])

    return {
      sales,
      conversion,
      customer,
      summary: {
        totalRevenue: sales.totalRevenue,
        totalOrders: sales.orderCount,
        averageOrderValue: sales.averageOrderValue,
        conversionRate: conversion.overallConversionRate,
        totalCustomers: customer.totalCustomers,
        newCustomers: customer.newCustomers,
      },
    }
  }
}

export default new AnalyticsService()
