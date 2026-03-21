import { Router, Response } from 'express'
import { AuthRequest, authenticate, authorize } from '../middleware/auth'
import adminService from '../services/adminService'
import pool from '../config/database'

const router = Router()
router.use(authenticate)
router.use(authorize('admin'))

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
router.get('/dashboard', async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await adminService.getDashboardStats()
    res.json({ data: stats })
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

    const result = await adminService.getSellers(limit, offset, search)
    res.json({ data: result })
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

    const result = await adminService.getCommissions(limit, offset)
    res.json({ data: result })
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
    const categories = await adminService.getCategories()
    res.json({ data: categories })
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
    const result = await adminService.getReviews(limit, offset)
    res.json({ data: result })
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

    const result = await adminService.getSupportTickets(limit, offset, status)
    res.json({ data: result })
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

    const result = await adminService.getLogs(limit, offset, type)
    res.json({ data: result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── ORDERS ───────────────────────────────────────────────────────────────────
router.get('/orders', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0
    const status = (req.query.status as string) || ''
    const result = await adminService.getOrders(limit, offset, status)
    res.json({ data: result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── USERS ────────────────────────────────────────────────────────────────────
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0
    const search = (req.query.search as string) || ''
    const role = (req.query.role as string) || ''
    const result = await adminService.getUsers(limit, offset, search, role)
    res.json({ data: result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
router.get('/products', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0
    const search = (req.query.search as string) || ''
    const result = await adminService.getProducts(limit, offset, search)
    res.json({ data: result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
