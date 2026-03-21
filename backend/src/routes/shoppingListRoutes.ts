import { Router, Response } from 'express'
import { AuthRequest, authenticate, optionalAuth } from '../middleware/auth'
import pool from '../config/database'
import { AppError } from '../middleware/errorHandler'

const router = Router()

// Shopping Lists (Multiple named wishlists)

// GET /api/shopping-lists - Get all user's shopping lists
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    
    const result = await pool.query(
      `SELECT sl.*, 
        (SELECT json_agg(json_build_object(
          'id', p.id, 'name', p.name, 'slug', p.slug, 'base_price', p.base_price,
          'image', (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1)
        ))
        FROM shopping_list_items sli
        JOIN products p ON p.id = sli.product_id
        WHERE sli.list_id = sl.id
        LIMIT 4
        ) as preview_items
      FROM shopping_lists sl
      WHERE sl.user_id = $1
      ORDER BY sl.is_default DESC, sl.created_at DESC`,
      [userId]
    )
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch shopping lists', 500)
  }
})

// POST /api/shopping-lists - Create new list
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { name, description, isPublic } = req.body
    
    // Generate share token if public
    const shareToken = isPublic ? require('crypto').randomBytes(32).toString('hex') : null
    
    const result = await pool.query(
      `INSERT INTO shopping_lists (user_id, name, description, is_public, share_token)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, name, description, isPublic || false, shareToken]
    )
    
    res.status(201).json({ 
      message: 'Shopping list created',
      data: result.rows[0] 
    })
  } catch (error) {
    if ((error as any).code === '23505') {
      throw new AppError('A list with this name already exists', 400)
    }
    throw new AppError('Failed to create shopping list', 500)
  }
})

// GET /api/shopping-lists/:id - Get list details with items
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    
    // Get list
    const listResult = await pool.query(
      `SELECT * FROM shopping_lists WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    
    if (listResult.rows.length === 0) {
      throw new AppError('Shopping list not found', 404)
    }
    
    // Get items with product details
    const itemsResult = await pool.query(
      `SELECT sli.*, 
        p.name as product_name, p.slug, p.base_price, p.average_rating,
        pv.variant_name, pv.price as variant_price,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image,
        (SELECT CASE WHEN quantity_available > 0 THEN true ELSE false END 
         FROM product_variants WHERE id = sli.variant_id) as in_stock
      FROM shopping_list_items sli
      JOIN products p ON p.id = sli.product_id
      LEFT JOIN product_variants pv ON pv.id = sli.variant_id
      WHERE sli.list_id = $1
      ORDER BY sli.priority DESC, sli.added_at DESC`,
      [id]
    )
    
    res.json({ 
      data: {
        ...listResult.rows[0],
        items: itemsResult.rows
      }
    })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to fetch shopping list', 500)
  }
})

// PUT /api/shopping-lists/:id - Update list
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const { name, description, isPublic } = req.body
    
    const result = await pool.query(
      `UPDATE shopping_lists 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_public = COALESCE($3, is_public),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [name, description, isPublic, id, userId]
    )
    
    if (result.rows.length === 0) {
      throw new AppError('Shopping list not found', 404)
    }
    
    res.json({ message: 'List updated', data: result.rows[0] })
  } catch (error) {
    throw new AppError('Failed to update shopping list', 500)
  }
})

// DELETE /api/shopping-lists/:id - Delete list
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    
    // Check if it's the default list
    const checkResult = await pool.query(
      `SELECT is_default FROM shopping_lists WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    
    if (checkResult.rows.length === 0) {
      throw new AppError('Shopping list not found', 404)
    }
    
    if (checkResult.rows[0].is_default) {
      throw new AppError('Cannot delete default list', 400)
    }
    
    await pool.query(
      `DELETE FROM shopping_lists WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    
    res.json({ message: 'Shopping list deleted' })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to delete shopping list', 500)
  }
})

// POST /api/shopping-lists/:id/items - Add item to list
router.post('/:id/items', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const { productId, variantId, quantity, notes, priority } = req.body
    
    // Verify list belongs to user
    const listCheck = await pool.query(
      `SELECT id FROM shopping_lists WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    
    if (listCheck.rows.length === 0) {
      throw new AppError('Shopping list not found', 404)
    }
    
    const result = await pool.query(
      `INSERT INTO shopping_list_items (list_id, product_id, variant_id, quantity, notes, priority)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (list_id, product_id, variant_id) 
       DO UPDATE SET quantity = EXCLUDED.quantity, notes = EXCLUDED.notes, priority = EXCLUDED.priority
       RETURNING *`,
      [id, productId, variantId || null, quantity || 1, notes, priority || 0]
    )
    
    res.status(201).json({ message: 'Item added to list', data: result.rows[0] })
  } catch (error) {
    throw new AppError('Failed to add item to list', 500)
  }
})

// DELETE /api/shopping-lists/:id/items/:itemId - Remove item
router.delete('/:id/items/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id, itemId } = req.params
    
    // Verify list belongs to user
    const listCheck = await pool.query(
      `SELECT id FROM shopping_lists WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    
    if (listCheck.rows.length === 0) {
      throw new AppError('Shopping list not found', 404)
    }
    
    await pool.query(
      `DELETE FROM shopping_list_items WHERE id = $1 AND list_id = $2`,
      [itemId, id]
    )
    
    res.json({ message: 'Item removed from list' })
  } catch (error) {
    throw new AppError('Failed to remove item', 500)
  }
})

// Move item between lists
router.post('/:id/items/:itemId/move', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id, itemId } = req.params
    const { targetListId } = req.body
    
    // Verify both lists belong to user
    const listsCheck = await pool.query(
      `SELECT id FROM shopping_lists WHERE id IN ($1, $2) AND user_id = $3`,
      [id, targetListId, userId]
    )
    
    if (listsCheck.rows.length !== 2) {
      throw new AppError('One or more lists not found', 404)
    }
    
    // Move item
    await pool.query(
      `UPDATE shopping_list_items SET list_id = $1 WHERE id = $2 AND list_id = $3`,
      [targetListId, itemId, id]
    )
    
    res.json({ message: 'Item moved to target list' })
  } catch (error) {
    throw new AppError('Failed to move item', 500)
  }
})

// GET /api/shopping-lists/public/:token - View public list
router.get('/public/:token', async (req, res) => {
  try {
    const { token } = req.params
    
    const listResult = await pool.query(
      `SELECT sl.*, u.first_name, u.last_name
       FROM shopping_lists sl
       JOIN users u ON u.id = sl.user_id
       WHERE sl.share_token = $1 AND sl.is_public = true`,
      [token]
    )
    
    if (listResult.rows.length === 0) {
      throw new AppError('List not found or not public', 404)
    }
    
    const itemsResult = await pool.query(
      `SELECT sli.*, p.name as product_name, p.slug, p.base_price,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image
      FROM shopping_list_items sli
      JOIN products p ON p.id = sli.product_id
      WHERE sli.list_id = $1`,
      [listResult.rows[0].id]
    )
    
    res.json({
      data: {
        ...listResult.rows[0],
        items: itemsResult.rows
      }
    })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to fetch public list', 500)
  }
})

// Copy public list to my lists
router.post('/public/:token/copy', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { token } = req.params
    
    // Get public list
    const publicList = await pool.query(
      `SELECT * FROM shopping_lists WHERE share_token = $1 AND is_public = true`,
      [token]
    )
    
    if (publicList.rows.length === 0) {
      throw new AppError('List not found', 404)
    }
    
    // Create copy
    const newList = await pool.query(
      `INSERT INTO shopping_lists (user_id, name, description)
       VALUES ($1, $2 || ' (Copy)', $3)
       RETURNING *`,
      [userId, publicList.rows[0].name, publicList.rows[0].description]
    )
    
    // Copy items
    await pool.query(
      `INSERT INTO shopping_list_items (list_id, product_id, variant_id, quantity, notes, priority)
       SELECT $1, product_id, variant_id, quantity, notes, priority
       FROM shopping_list_items WHERE list_id = $2`,
      [newList.rows[0].id, publicList.rows[0].id]
    )
    
    res.json({ message: 'List copied to your account', data: newList.rows[0] })
  } catch (error) {
    throw new AppError('Failed to copy list', 500)
  }
})

export default router
