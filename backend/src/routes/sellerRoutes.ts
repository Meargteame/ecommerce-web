import { Router, Response } from 'express'
import { AuthRequest, authenticate, authorize } from '../middleware/auth'
import sellerService from '../services/sellerService'
import productService from '../services/productService'
import pool from '../config/database'

const router = Router()

router.use(authenticate)
router.use(authorize('seller', 'admin'))

/** GET /api/seller/profile */
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await sellerService.getOrCreateProfile(req.user!.userId)
    res.json({ data: profile })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** PUT /api/seller/profile */
router.put('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await sellerService.updateProfile(req.user!.userId, req.body)
    res.json({ data: profile })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** GET /api/seller/dashboard */
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await sellerService.getDashboardStats(req.user!.userId)
    res.json({ data: stats })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** GET /api/seller/products */
router.get('/products', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0
    const result = await sellerService.getProducts(req.user!.userId, limit, offset)
    res.json({ data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** GET /api/seller/orders */
router.get('/orders', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0
    const result = await sellerService.getOrders(req.user!.userId, limit, offset)
    res.json({ data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** PUT /api/seller/orders/:id/status */
router.put('/orders/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status, trackingNumber } = req.body
    const result = await sellerService.updateOrderStatus(req.params.id, req.user!.userId, status, trackingNumber)
    res.json({ data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** POST /api/seller/products */
router.post('/products', async (req: AuthRequest, res: Response) => {
  try {
    const product = await productService.createProduct({
      ...req.body,
      sellerId: req.user!.userId,
    })
    res.status(201).json({ data: product })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** PUT /api/seller/products/:id */
router.put('/products/:id', async (req: AuthRequest, res: Response) => {
  try {
    const product = await sellerService.updateSellerProduct(req.params.id, req.user!.userId, req.body)
    res.json({ data: product })
  } catch (err: any) {
    res.status(err.message === 'Product not found' ? 404 : 403).json({ error: err.message })
  }
})

/** DELETE /api/seller/products/:id */
router.delete('/products/:id', async (req: AuthRequest, res: Response) => {
  try {
    await sellerService.deleteSellerProduct(req.params.id, req.user!.userId)
    res.json({ message: 'Product deleted' })
  } catch (err: any) {
    res.status(err.message === 'Product not found' ? 404 : 403).json({ error: err.message })
  }
})

/** GET /api/seller/inventory */
router.get('/inventory', async (req: AuthRequest, res: Response) => {
  try {
    const result = await sellerService.getInventory(req.user!.userId)
    res.json({ data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** PUT /api/seller/inventory/:productId */
router.put('/inventory/:productId', async (req: AuthRequest, res: Response) => {
  try {
    const { stock_quantity } = req.body
    const result = await sellerService.updateStock(req.params.productId, req.user!.userId, stock_quantity)
    res.json({ data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** GET /api/seller/earnings */
router.get('/earnings', async (req: AuthRequest, res: Response) => {
  try {
    const result = await sellerService.getEarnings(req.user!.userId)
    res.json({ data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** GET /api/seller/reviews */
router.get('/reviews', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0
    const result = await sellerService.getSellerReviews(req.user!.userId, limit, offset)
    res.json({ data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** POST /api/seller/reviews/:id/respond */
router.post('/reviews/:id/respond', async (req: AuthRequest, res: Response) => {
  try {
    const { response } = req.body
    const result = await sellerService.respondToReview(req.params.id, req.user!.userId, response)
    res.json({ data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// ─── CUSTOMER MESSAGES ───

/** GET /api/seller/messages */
router.get('/messages', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT m.*, u.first_name as customer_first_name, u.last_name as customer_last_name,
              u.email as customer_email,
              o.order_number, p.name as product_name
       FROM seller_customer_messages m
       JOIN users u ON u.id = m.customer_id
       LEFT JOIN orders o ON o.id = m.order_id
       LEFT JOIN products p ON p.id = m.product_id
       WHERE m.seller_id = $1
       ORDER BY m.created_at DESC
       LIMIT 50`,
      [req.user!.userId]
    )
    res.json({ data: result.rows })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** POST /api/seller/messages (reply to customer) */
router.post('/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, orderId, productId, subject, message } = req.body
    const result = await pool.query(
      `INSERT INTO seller_customer_messages (seller_id, customer_id, order_id, product_id, subject, direction, message)
       VALUES ($1, $2, $3, $4, $5, 'outbound', $6) RETURNING *`,
      [req.user!.userId, customerId, orderId || null, productId || null, subject || '', message]
    )
    res.status(201).json({ data: result.rows[0] })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** PUT /api/seller/messages/:id/read */
router.put('/messages/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      `UPDATE seller_customer_messages SET is_read = true, read_at = NOW()
       WHERE id = $1 AND seller_id = $2`,
      [req.params.id, req.user!.userId]
    )
    res.json({ message: 'Marked as read' })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// ─── SHIPPING TEMPLATES ───

/** GET /api/seller/shipping */
router.get('/shipping', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM shipping_templates WHERE seller_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [req.user!.userId]
    )
    res.json({ data: result.rows })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** POST /api/seller/shipping */
router.post('/shipping', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, processingTime, domesticFreeShipping, domesticFreeShippingThreshold,
      domesticFlatRate, shipsInternationally, internationalFlatRate, isDefault
    } = req.body
    
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      if (isDefault) {
        await client.query('UPDATE shipping_templates SET is_default = false WHERE seller_id = $1', [req.user!.userId])
      }
      const result = await client.query(
        `INSERT INTO shipping_templates
         (seller_id, name, processing_time, domestic_free_shipping, domestic_free_shipping_threshold,
          domestic_flat_rate, ships_internationally, international_flat_rate, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [req.user!.userId, name, processingTime || 1, domesticFreeShipping || false,
         domesticFreeShippingThreshold || null, domesticFlatRate || null,
         shipsInternationally || false, internationalFlatRate || null, isDefault || false]
      )
      await client.query('COMMIT')
      res.status(201).json({ data: result.rows[0] })
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** PUT /api/seller/shipping/:id */
router.put('/shipping/:id', async (req: AuthRequest, res: Response) => {
  try {
    const check = await pool.query('SELECT id FROM shipping_templates WHERE id = $1 AND seller_id = $2', [req.params.id, req.user!.userId])
    if (check.rows.length === 0) return res.status(404).json({ error: 'Template not found' })

    const {
      name, processingTime, domesticFreeShipping, domesticFreeShippingThreshold,
      domesticFlatRate, shipsInternationally, internationalFlatRate, isDefault
    } = req.body

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      if (isDefault) {
        await client.query('UPDATE shipping_templates SET is_default = false WHERE seller_id = $1', [req.user!.userId])
      }
      const result = await client.query(
        `UPDATE shipping_templates SET
          name = COALESCE($1, name), processing_time = COALESCE($2, processing_time),
          domestic_free_shipping = COALESCE($3, domestic_free_shipping),
          domestic_free_shipping_threshold = $4,
          domestic_flat_rate = $5,
          ships_internationally = COALESCE($6, ships_internationally),
          international_flat_rate = $7,
          is_default = COALESCE($8, is_default),
          updated_at = NOW()
         WHERE id = $9 RETURNING *`,
        [name, processingTime, domesticFreeShipping, domesticFreeShippingThreshold,
         domesticFlatRate, shipsInternationally, internationalFlatRate, isDefault, req.params.id]
      )
      await client.query('COMMIT')
      res.json({ data: result.rows[0] })
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

/** DELETE /api/seller/shipping/:id */
router.delete('/shipping/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'DELETE FROM shipping_templates WHERE id = $1 AND seller_id = $2 RETURNING *',
      [req.params.id, req.user!.userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Template not found' })
    res.json({ message: 'Template deleted' })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
