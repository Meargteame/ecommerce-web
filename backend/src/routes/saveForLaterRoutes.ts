import { Router, Response } from 'express'
import { AuthRequest, authenticate, optionalAuth } from '../middleware/auth'
import pool from '../config/database'
import { AppError } from '../middleware/errorHandler'
import crypto from 'crypto'

const router = Router()

// Save for Later (Cart extension - save items without losing them)

// GET /api/saved-for-later - Get all saved items
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    
    const result = await pool.query(
      `SELECT sfl.*, 
        p.name as product_name, p.slug, p.base_price as current_price, p.average_rating, p.review_count,
        pv.variant_name, pv.price as variant_current_price, pv.sku,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('attribute_name', a.name, 'value', v.attribute_value))
         FROM variant_attributes v
         JOIN product_attributes a ON a.id = v.attribute_id
         WHERE v.variant_id = sfl.variant_id
        ) as variant_attributes,
        CASE 
          WHEN p.base_price < sfl.price_at_save THEN 'price_dropped'
          WHEN p.base_price > sfl.price_at_save THEN 'price_increased'
          ELSE 'same_price'
        END as price_status
      FROM saved_for_later sfl
      JOIN products p ON p.id = sfl.product_id
      LEFT JOIN product_variants pv ON pv.id = sfl.variant_id
      WHERE sfl.user_id = ?
      ORDER BY sfl.saved_at DESC`,
      [userId]
    )
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch saved items', 500)
  }
})

// POST /api/saved-for-later - Save item from cart or product page
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { productId, variantId, quantity } = req.body
    
    // Get current price
    const priceResult = await pool.query(
      `SELECT COALESCE(pv.price, p.base_price) as price
       FROM products p
       LEFT JOIN product_variants pv ON pv.id = ? AND pv.product_id = p.id
       WHERE p.id = ?`,
      [variantId || null, productId]
    )
    
    if (priceResult.rows.length === 0) {
      throw new AppError('Product not found', 404)
    }
    
    const priceAtSave = priceResult.rows[0].price
    
    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO saved_for_later (id, user_id, product_id, variant_id, quantity, price_at_save)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         quantity = VALUES(quantity), 
         saved_at = NOW(), 
         price_at_save = VALUES(price_at_save)`,
      [id, userId, productId, variantId || null, quantity || 1, priceAtSave]
    )
    
    const finalResult = await pool.query('SELECT * FROM saved_for_later WHERE user_id = ? AND product_id = ? AND variant_id <=> ?', [userId, productId, variantId || null])
    
    res.status(201).json({ message: 'Item saved for later', data: finalResult.rows[0] })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to save item', 500)
  }
})

// POST /api/saved-for-later/:id/move-to-cart - Move saved item to cart
router.post('/:id/move-to-cart', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    
    // Get saved item
    const savedItemResult = await pool.query(
      `SELECT * FROM saved_for_later WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    
    if (savedItemResult.rows.length === 0) {
      throw new AppError('Saved item not found', 404)
    }
    
    const item = savedItemResult.rows[0]
    
    // Get or create cart
    let cartResult = await pool.query(
      `SELECT id FROM carts WHERE user_id = ?`,
      [userId]
    )
    
    // Add to cart
    const cartItemId = crypto.randomUUID()
    await pool.query(
      `INSERT INTO cart_items (id, user_id, product_id, variant_id, quantity)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = cart_items.quantity + VALUES(quantity)`,
      [cartItemId, userId, item.product_id, item.variant_id || null, item.quantity]
    )
    
    // Remove from saved
    await pool.query(
      `DELETE FROM saved_for_later WHERE id = ?`,
      [id]
    )
    
    res.json({ message: 'Item moved to cart' })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to move item to cart', 500)
  }
})

// DELETE /api/saved-for-later/:id - Remove saved item
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    
    const result = await pool.query(
      `DELETE FROM saved_for_later WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    
    if (result.rowCount === 0) {
      throw new AppError('Saved item not found', 404)
    }
    
    res.json({ message: 'Item removed' })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to remove item', 500)
  }
})

// Move all saved items to cart
router.post('/move-all-to-cart', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    
    const itemsToMoveResult = await pool.query(
      `SELECT * FROM saved_for_later WHERE user_id = ?`,
      [userId]
    )
    const itemsToMove = itemsToMoveResult.rows

    for (const item of itemsToMove) {
        const cartItemId = crypto.randomUUID()
        await pool.query(
          `INSERT INTO cart_items (id, user_id, product_id, variant_id, quantity)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE quantity = cart_items.quantity + VALUES(quantity)`,
          [cartItemId, userId, item.product_id, item.variant_id || null, item.quantity]
        )
    }
    
    // Clear saved items
    await pool.query(
      `DELETE FROM saved_for_later WHERE user_id = ?`,
      [userId]
    )
    
    res.json({ message: 'All items moved to cart' })
  } catch (error) {
    throw new AppError('Failed to move items', 500)
  }
})

// Get price change notifications for saved items
router.get('/price-changes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    
    const result = await pool.query(
      `SELECT sfl.id, sfl.price_at_save, 
        p.base_price as current_price,
        p.name as product_name,
        (p.base_price - sfl.price_at_save) as price_difference,
        ROUND(((p.base_price - sfl.price_at_save) / sfl.price_at_save * 100), 2) as percentage_change,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image
      FROM saved_for_later sfl
      JOIN products p ON p.id = sfl.product_id
      WHERE sfl.user_id = ? AND p.base_price != sfl.price_at_save
      ORDER BY ABS(p.base_price - sfl.price_at_save) DESC`,
      [userId]
    )
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch price changes', 500)
  }
})

export default router
