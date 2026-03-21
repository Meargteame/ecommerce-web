import pool from '../config/database';

export interface AdminDashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalSellers: number;
  totalProducts: number;
  platformCommission: number;
  recentOrders: any[];
}

class AdminService {
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const settings = await pool.query(`SELECT value FROM platform_settings WHERE key = 'commission_rate' LIMIT 1`);
    const rate = parseFloat(settings.rows[0]?.value || '10') / 100;

    const [revenue, orders, users, sellers, products, commission, recentOrders] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status NOT IN ('cancelled', 'refunded')`),
      pool.query(`SELECT COUNT(*) as total FROM orders`),
      pool.query(`SELECT COUNT(*) as total FROM users`),
      pool.query(`SELECT COUNT(*) as total FROM users WHERE role = 'seller'`),
      pool.query(`SELECT COUNT(*) as total FROM products`),
      pool.query(`SELECT COALESCE(SUM(total_amount * $1), 0) as total FROM orders WHERE status NOT IN ('cancelled', 'refunded')`, [rate]),
      pool.query(`SELECT o.id, o.order_number as "orderNumber", o.status, o.total_amount as "totalAmount", o.created_at as "createdAt", u.email as "customerEmail"
                  FROM orders o LEFT JOIN users u ON u.id = o.user_id
                  ORDER BY o.created_at DESC LIMIT 8`),
    ]);

    return {
      totalRevenue: parseFloat(revenue.rows[0].total),
      totalOrders: parseInt(orders.rows[0].total),
      totalUsers: parseInt(users.rows[0].total),
      totalSellers: parseInt(sellers.rows[0].total),
      totalProducts: parseInt(products.rows[0].total),
      platformCommission: parseFloat(commission.rows[0].total),
      recentOrders: recentOrders.rows,
    };
  }

  async getSellers(limit = 20, offset = 0, search = ''): Promise<{ sellers: any[]; total: number }> {
    const conditions = [`u.role = 'seller'`];
    const values: any[] = [];
    let p = 1;
    if (search) {
      conditions.push(`(u.email ILIKE $${p} OR u.first_name ILIKE $${p} OR u.last_name ILIKE $${p})`);
      values.push(`%${search}%`);
      p++;
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    const countValues = [...values];
    values.push(limit, offset);

    const [sellers, count] = await Promise.all([
      pool.query(
        `SELECT u.id, u.email, u.first_name as "firstName", u.last_name as "lastName", u.account_status as "accountStatus", u.created_at as "createdAt",
                sp.store_name as "storeName", sp.is_verified as "isVerified", sp.is_active as "isActive", sp.rating,
                (SELECT COUNT(*) FROM products WHERE seller_id = u.id) as "productCount",
                (SELECT COALESCE(SUM(oi.subtotal), 0) FROM order_items oi JOIN products pr ON pr.id = oi.product_id WHERE pr.seller_id = u.id) as "totalRevenue"
         FROM users u
         LEFT JOIN seller_profiles sp ON sp.user_id = u.id
         ${where}
         ORDER BY u.created_at DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        values
      ),
      pool.query(`SELECT COUNT(*) FROM users u ${where}`, countValues),
    ]);

    return {
      sellers: sellers.rows,
      total: parseInt(count.rows[0].count),
    };
  }

  async getCommissions(limit = 20, offset = 0): Promise<any> {
    const settings = await pool.query(`SELECT value FROM platform_settings WHERE key = 'commission_rate' LIMIT 1`);
    const rateValue = settings.rows[0]?.value || '10';
    const rate = parseFloat(rateValue) / 100;

    const [summary, perSeller] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(o.total_amount), 0) as "grossRevenue",
          COALESCE(SUM(o.total_amount * $1), 0) as "totalCommission",
          COUNT(DISTINCT o.id) as "totalOrders"
        FROM orders o WHERE o.status NOT IN ('cancelled', 'refunded')`, [rate]),
      pool.query(
        `SELECT u.id, u.email, u.first_name as "firstName", u.last_name as "lastName", sp.store_name as "storeName",
               COALESCE(SUM(oi.subtotal), 0) as "sellerRevenue",
               COALESCE(SUM(oi.subtotal * $1), 0) as "commissionOwed",
               COUNT(DISTINCT o.id) as "orderCount"
        FROM users u
        JOIN seller_profiles sp ON sp.user_id = u.id
        LEFT JOIN products p ON p.seller_id = u.id
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON o.id = oi.order_id AND o.status NOT IN ('cancelled', 'refunded')
        WHERE u.role = 'seller'
        GROUP BY u.id, u.email, u.first_name, u.last_name, sp.store_name
        ORDER BY "commissionOwed" DESC
        LIMIT $2 OFFSET $3`,
        [rate, limit, offset]
      ),
    ]);

    return {
      summary: summary.rows[0],
      sellers: perSeller.rows,
      commissionRate: rateValue,
    };
  }

  async getCategories(): Promise<any[]> {
    const result = await pool.query(`
      SELECT c.*, COUNT(p.id) as "productCount"
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id ORDER BY c.display_order ASC, c.name ASC`);
    
    return result.rows.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      parentId: r.parent_id,
      imageUrl: r.image_url,
      displayOrder: r.display_order,
      productCount: parseInt(r.productCount),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  async getReviews(limit = 20, offset = 0): Promise<{ reviews: any[]; total: number }> {
    const [reviews, count] = await Promise.all([
      pool.query(
        `SELECT r.id, r.rating, r.title, r.comment, r.is_verified_purchase as "isVerifiedPurchase",
                r.created_at as "createdAt", r.seller_response as "sellerResponse", r.seller_response_at as "sellerResponseAt",
                p.name as "productName", u.email as "userEmail", u.first_name as "firstName", u.last_name as "lastName"
         FROM reviews r
         JOIN products p ON p.id = r.product_id
         JOIN users u ON u.id = r.user_id
         ORDER BY r.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM reviews`),
    ]);

    return {
      reviews: reviews.rows,
      total: parseInt(count.rows[0].count),
    };
  }

  async getSupportTickets(limit = 20, offset = 0, status = ''): Promise<{ tickets: any[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let p = 1;
    if (status) {
      conditions.push(`st.status = $${p++}`);
      values.push(status);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const countValues = [...values];
    values.push(limit, offset);

    const [tickets, count] = await Promise.all([
      pool.query(
        `SELECT st.id, st.subject, st.message, st.status, st.priority, st.admin_response as "adminResponse",
                st.resolved_at as "resolvedAt", st.created_at as "createdAt", st.updated_at as "updatedAt",
                u.email as "userEmail", u.first_name as "firstName", u.last_name as "lastName"
         FROM support_tickets st
         LEFT JOIN users u ON u.id = st.user_id
         ${where}
         ORDER BY st.created_at DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        values
      ),
      pool.query(`SELECT COUNT(*) FROM support_tickets st ${where}`, countValues),
    ]);

    return {
      tickets: tickets.rows,
      total: parseInt(count.rows[0].count),
    };
  }

  async getLogs(limit = 50, offset = 0, type = ''): Promise<{ logs: any[]; total: number }> {
    const values: any[] = [];
    let whereClause = '';
    if (type) {
      whereClause = `WHERE ae.event_type = $1`;
      values.push(type);
    }
    const p = values.length;
    values.push(limit, offset);

    const [logs, count] = await Promise.all([
      pool.query(
        `SELECT ae.id, ae.event_type as "eventType", ae.ip_address as "ipAddress", ae.created_at as "createdAt",
                ae.user_agent as "userAgent", ae.event_data as "eventData", u.email as "userEmail"
         FROM analytics_events ae
         LEFT JOIN users u ON u.id = ae.user_id
         ${whereClause}
         ORDER BY ae.created_at DESC
         LIMIT $${p + 1} OFFSET $${p + 2}`,
        values
      ),
      pool.query(
        `SELECT COUNT(*) FROM analytics_events${type ? ` WHERE event_type = $1` : ''}`,
        type ? [type] : []
      ),
    ]);

    return {
      logs: logs.rows,
      total: parseInt(count.rows[0].count),
    };
  }

  async getOrders(limit = 20, offset = 0, status = ''): Promise<{ orders: any[]; total: number }> {
    const values: any[] = [];
    let where = '';
    if (status) {
      where = 'WHERE o.status = $1';
      values.push(status);
    }
    const p = values.length;
    values.push(limit, offset);

    const [orders, count] = await Promise.all([
      pool.query(
        `SELECT o.id, o.order_number as "orderNumber", o.status, o.total_amount as "totalAmount",
                o.created_at as "createdAt", u.email as "customerEmail",
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as "itemCount"
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         ${where}
         ORDER BY o.created_at DESC
         LIMIT $${p + 1} OFFSET $${p + 2}`,
        values
      ),
      pool.query(`SELECT COUNT(*) FROM orders o ${where}`, status ? [status] : []),
    ]);

    return {
      orders: orders.rows,
      total: parseInt(count.rows[0].count),
    };
  }

  async getUsers(limit = 20, offset = 0, search = '', role = ''): Promise<{ users: any[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let p = 1;

    if (search) {
      conditions.push(`(u.email ILIKE $${p} OR u.first_name ILIKE $${p} OR u.last_name ILIKE $${p})`);
      values.push(`%${search}%`);
      p++;
    }
    if (role) {
      conditions.push(`u.role = $${p}`);
      values.push(role);
      p++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const countValues = [...values];
    values.push(limit, offset);

    const [users, count] = await Promise.all([
      pool.query(
        `SELECT u.id, u.email, u.first_name as "firstName", u.last_name as "lastName", u.role,
                u.account_status as "accountStatus", u.created_at as "createdAt",
                (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as "orderCount"
         FROM users u
         ${where}
         ORDER BY u.created_at DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        values
      ),
      pool.query(`SELECT COUNT(*) FROM users u ${where}`, countValues),
    ])

    return {
      users: users.rows,
      total: parseInt(count.rows[0].count),
    };
  }

  async getProducts(limit = 20, offset = 0, search = ''): Promise<{ products: any[]; total: number }> {
    const values: any[] = [];
    let where = '';
    if (search) {
      where = `WHERE p.name ILIKE $1 OR p.description ILIKE $1`;
      values.push(`%${search}%`);
    }
    const p = values.length;
    values.push(limit, offset);

    const [products, count] = await Promise.all([
      pool.query(
        `SELECT p.id, p.name, p.description, p.base_price as "basePrice", p.category_id as "categoryId",
                p.status, p.brand, p.image_url as "imageUrl", p.average_rating as "averageRating",
                p.created_at as "createdAt", c.name as "categoryName",
                (SELECT SUM(stock_quantity) FROM product_variants WHERE product_id = p.id) as "stockQuantity"
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         ${where}
         ORDER BY p.created_at DESC
         LIMIT $${p + 1} OFFSET $${p + 2}`,
        values
      ),
      pool.query(`SELECT COUNT(*) FROM products p ${where}`, values.slice(0, 1)),
    ])

    return {
      products: products.rows,
      total: parseInt(count.rows[0].count),
    }
  }
}

export default new AdminService();
