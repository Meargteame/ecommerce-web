import { Router, Response } from 'express'
import { AuthRequest, authenticate, authorize } from '../middleware/auth'
import pool from '../config/database'

const router = Router()
router.use(authenticate)
router.use(authorize('admin'))

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
router.get('/dashboard', async (_req: AuthRequest, res: Response) => {
  try {
    const [revenue, orders, users, sellers, products, commission, recentOrders] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(total_amount),0) as total FROM orders WHERE status NOT IN ('cancelled','refunded')`),
      pool.query(`SELECT COUNT(*) as total FROM orders`),
      pool.query(`SELECT COUNT(*) as total FROM users`),
      pool.query(`SELECT COUNT(*) as total FROM users WHERE role='seller'`),
      pool.query(`SELECT COUNT(*) as total FROM products`),
      pool.query(`SELECT COALESCE(SUM(total_amount*0.1),0) as total FROM orders WHERE status NOT IN ('cancelled','refunded')`),
      pool.query(`SELECT o.id, o.order_number, o.status, o.total_amount, o.created_at, u.email as customer_email
                  FROM orders o LEFT JOIN users u ON u.id=o.user_id
                  ORDER BY o.created_at DESC LIMIT 8`),
    ])
    res.json({
      data: {
        total_revenue: parseFloat(revenue.rows[0].total),
        total_orders: parseInt(orders.rows[0].total),
        total_users: parseInt(users.rows[0].total),
        total_sellers: parseInt(sellers.rows[0].total),
        total_products: parseInt(products.rows[0].total),
        platform_commission: parseFloat(commission.rows[0].total),
        recent_orders: recentOrders.rows,
      },
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── SELLERS ──────────────────────────────────────────────────────────────────
router.get('/sellers', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0
    const search = (req.query.search as string) || ''

    const conditions = [`u.role = 'seller'`]
    const values: any[] = []
    let p = 1
    if (search) {
      conditions.push(`(u.email ILIKE $${p} OR u.first_name ILIKE $${p} OR u.last_name ILIKE $${p})`)
      values.push(`%${search}%`)
      p++
    }

    const where = 'WHERE ' + conditions.join(' AND ')
    const countValues = [...values]
    values.push(limit, offset)

    const [sellers, count] = await Promise.all([
      pool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.account_status, u.created_at,
                sp.store_name, sp.is_verified, sp.is_active, sp.rating,
                (SELECT COUNT(*) FROM products WHERE seller_id=u.id) as product_count,
                (SELECT COALESCE(SUM(oi.subtotal),0) FROM order_items oi JOIN products pr ON pr.id=oi.product_id WHERE pr.seller_id=u.id) as total_revenue
         FROM users u
         LEFT JOIN seller_profiles sp ON sp.user_id=u.id
         ${where}
         ORDER BY u.created_at DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        values
      ),
      pool.query(`SELECT COUNT(*) FROM users u ${where}`, countValues),
    ])

    res.json({ data: { sellers: sellers.rows, total: parseInt(count.rows[0].count) } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/sellers/:id/verify', async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      `UPDATE seller_profiles SET is_verified=$1, updated_at=NOW() WHERE user_id=$2`,
      [req.body.verified, req.params.id]
    )
    res.json({ message: 'Seller verification updated' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/sellers/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body
    await pool.query(`UPDATE users SET account_status=$1 WHERE id=$2`, [status, req.params.id])
    await pool.query(
      `UPDATE seller_profiles SET is_active=$1, updated_at=NOW() WHERE user_id=$2`,
      [status === 'active', req.params.id]
    )
    res.json({ message: 'Seller status updated' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── COMMISSIONS ──────────────────────────────────────────────────────────────
router.get('/commissions', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0

    const [summary, perSeller, settings] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(o.total_amount),0) as gross_revenue,
          COALESCE(SUM(o.total_amount*0.1),0) as total_commission,
          COUNT(DISTINCT o.id) as total_orders
        FROM orders o WHERE o.status NOT IN ('cancelled','refunded')`),
      pool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, sp.store_name,
               COALESCE(SUM(oi.subtotal),0) as seller_revenue,
               COALESCE(SUM(oi.subtotal*0.1),0) as commission_owed,
               COUNT(DISTINCT o.id) as order_count
        FROM users u
        JOIN seller_profiles sp ON sp.user_id=u.id
        LEFT JOIN products p ON p.seller_id=u.id
        LEFT JOIN order_items oi ON oi.product_id=p.id
        LEFT JOIN orders o ON o.id=oi.order_id AND o.status NOT IN ('cancelled','refunded')
        WHERE u.role='seller'
        GROUP BY u.id, u.email, u.first_name, u.last_name, sp.store_name
        ORDER BY commission_owed DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT * FROM platform_settings WHERE key='commission_rate' LIMIT 1`),
    ])

    res.json({
      data: {
        summary: summary.rows[0],
        sellers: perSeller.rows,
        commission_rate: settings.rows[0]?.value || '10',
      },
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/commissions/rate', async (req: AuthRequest, res: Response) => {
  try {
    const { rate } = req.body
    await pool.query(
      `INSERT INTO platform_settings (key, value) VALUES ('commission_rate', $1)
       ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()`,
      [String(rate)]
    )
    res.json({ message: 'Commission rate updated', rate })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
router.get('/categories', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id=c.id
      GROUP BY c.id ORDER BY c.display_order ASC, c.name ASC`)
    res.json({ data: result.rows })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, description, parent_id, image_url, display_order } = req.body
    const result = await pool.query(
      `INSERT INTO categories (name, slug, description, parent_id, image_url, display_order)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        name,
        slug || name.toLowerCase().replace(/\s+/g, '-'),
        description || null,
        parent_id || null,
        image_url || null,
        display_order || 0,
      ]
    )
    res.status(201).json({ data: result.rows[0] })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/categories/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, description, image_url, display_order } = req.body
    const result = await pool.query(
      `UPDATE categories SET name=$1, slug=$2, description=$3, image_url=$4, display_order=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [name, slug, description || null, image_url || null, display_order || 0, req.params.id]
    )
    if (!result.rows.length) {
      res.status(404).json({ error: 'Category not found' })
      return
    }
    res.json({ data: result.rows[0] })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

router.delete('/categories/:id', async (req: AuthRequest, res: Response) => {
  try {
    const check = await pool.query(
      `SELECT COUNT(*) FROM products WHERE category_id=$1`,
      [req.params.id]
    )
    if (parseInt(check.rows[0].count) > 0) {
      res.status(400).json({ error: 'Cannot delete category with products' })
      return
    }
    await pool.query(`DELETE FROM categories WHERE id=$1`, [req.params.id])
    res.json({ message: 'Category deleted' })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// ─── REVIEWS ──────────────────────────────────────────────────────────────────
router.get('/reviews', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0
    const [reviews, count] = await Promise.all([
      pool.query(
        `SELECT r.*, p.name as product_name, u.email as user_email, u.first_name, u.last_name
         FROM reviews r
         JOIN products p ON p.id=r.product_id
         JOIN users u ON u.id=r.user_id
         ORDER BY r.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM reviews`),
    ])
    res.json({ data: { reviews: reviews.rows, total: parseInt(count.rows[0].count) } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/reviews/:id', async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(`DELETE FROM reviews WHERE id=$1`, [req.params.id])
    res.json({ message: 'Review deleted' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── SUPPORT TICKETS ──────────────────────────────────────────────────────────
router.get('/support', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0
    const status = (req.query.status as string) || ''

    const conditions: string[] = []
    const values: any[] = []
    let p = 1
    if (status) {
      conditions.push(`st.status=$${p++}`)
      values.push(status)
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const countValues = [...values]
    values.push(limit, offset)

    const [tickets, count] = await Promise.all([
      pool.query(
        `SELECT st.*, u.email as user_email, u.first_name, u.last_name
         FROM support_tickets st
         LEFT JOIN users u ON u.id=st.user_id
         ${where}
         ORDER BY st.created_at DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        values
      ),
      pool.query(`SELECT COUNT(*) FROM support_tickets st ${where}`, countValues),
    ])
    res.json({ data: { tickets: tickets.rows, total: parseInt(count.rows[0].count) } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/support/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { status, admin_response } = req.body
    const result = await pool.query(
      `UPDATE support_tickets
       SET status=$1, admin_response=$2,
           resolved_at=CASE WHEN $1='resolved' THEN NOW() ELSE resolved_at END,
           updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [status, admin_response || null, req.params.id]
    )
    res.json({ data: result.rows[0] })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
router.get('/settings', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT key, value, description FROM platform_settings ORDER BY key`
    )
    const settings: Record<string, string> = {}
    result.rows.forEach((r: any) => { settings[r.key] = r.value })
    res.json({ data: settings })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const entries = Object.entries(req.body) as [string, string][]
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO platform_settings (key, value) VALUES ($1,$2)
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, value]
      )
    }
    res.json({ message: 'Settings saved' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── LOGS ─────────────────────────────────────────────────────────────────────
router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0
    const type = (req.query.type as string) || ''

    const values: any[] = []
    let whereClause = ''
    if (type) {
      whereClause = `WHERE ae.event_type=$1`
      values.push(type)
    }
    const p = values.length
    values.push(limit, offset)

    const [logs, count] = await Promise.all([
      pool.query(
        `SELECT ae.id, ae.event_type, ae.ip_address, ae.created_at,
                ae.user_agent, ae.event_data, u.email as user_email
         FROM analytics_events ae
         LEFT JOIN users u ON u.id=ae.user_id
         ${whereClause}
         ORDER BY ae.created_at DESC
         LIMIT $${p + 1} OFFSET $${p + 2}`,
        values
      ),
      pool.query(
        `SELECT COUNT(*) FROM analytics_events${type ? ` WHERE event_type=$1` : ''}`,
        type ? [type] : []
      ),
    ])
    res.json({ data: { logs: logs.rows, total: parseInt(count.rows[0].count) } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
