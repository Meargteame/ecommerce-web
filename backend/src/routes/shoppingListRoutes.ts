import { Router, Response } from 'express'
import { AuthRequest, authenticate, optionalAuth } from '../middleware/auth'
import pool from '../config/database'
import { AppError } from '../middleware/errorHandler'
import crypto from 'crypto'

const router = Router()

// Shopping Lists (Multiple named wishlists)

// GET /api/shopping-lists - Get all user's shopping lists
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    
    const result = await pool.query(
      `SELECT sl.*, 
        (SELECT JSON_ARRAYAGG(JSON_OBJECT(
          'id', p.id, 'name', p.name, 'slug', p.slug, 'base_price', p.base_price,
          'image', (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1)
        ))
        FROM (
          SELECT p.id, p.name, p.slug, p.base_price, sli.list_id
          FROM shopping_list_items sli
          JOIN products p ON p.id = sli.product_id
          WHERE sli.list_id = sl.id
          LIMIT 4
        ) p
        ) as preview_items
      FROM shopping_lists sl
      WHERE sl.user_id = ?
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
    const shareToken = isPublic ? crypto.randomBytes(32).toString('hex') : null
    
    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO shopping_lists (id, user_id, name, description, is_public, share_token)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, name, description, isPublic || false, shareToken]
    )
    
    const result = await pool.query('SELECT * FROM shopping_lists WHERE id = ?', [id])
    
    res.status(201).json({ 
      message: 'Shopping list created',
      data: result.rows[0]
    })
  } catch (error) {
    if ((error as any).code === 'ER_DUP_ENTRY' || (error as any).code === '23505') {
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
      `SELECT * FROM shopping_lists WHERE id = ? AND user_id = ?`,
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
      WHERE sli.list_id = ?
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
    
    await pool.query(
      `UPDATE shopping_lists 
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           is_public = COALESCE(?, is_public),
           updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [name, description, isPublic, id, userId]
    )
    
    const result = await pool.query('SELECT * FROM shopping_lists WHERE id = ? AND user_id = ?', [id, userId])
    
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
      `SELECT is_default FROM shopping_lists WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    
    if (checkResult.rows.length === 0) {
      throw new AppError('Shopping list not found', 404)
    }
    
    if (checkResult.rows[0].is_default) {
      throw new AppError('Cannot delete default list', 400)
    }
    
    await pool.query(
      `DELETE FROM shopping_lists WHERE id = ? AND user_id = ?`,
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
      `SELECT id FROM shopping_lists WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    
    if (listCheck.rows.length === 0) {
      throw new AppError('Shopping list not found', 404)
    }
    
    const itemId = crypto.randomUUID()
    await pool.query(
      `INSERT INTO shopping_list_items (id, list_id, product_id, variant_id, quantity, notes, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), notes = VALUES(notes), priority = VALUES(priority)`,
      [itemId, id, productId, variantId || null, quantity || 1, notes, priority || 0]
    )
    
    const finalResult = await pool.query('SELECT * FROM shopping_list_items WHERE list_id = ? AND product_id = ? AND variant_id <=> ?', [id, productId, variantId || null])
    
    res.status(201).json({ message: 'Item added to list', data: finalResult.rows[0] })
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
      `SELECT id FROM shopping_lists WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    
    if (listCheck.rows.length === 0) {
      throw new AppError('Shopping list not found', 404)
    }
    
    const result = await pool.query(
      `DELETE FROM shopping_list_items WHERE id = ? AND list_id = ?`,
      [itemId, id]
    )
    
    if (result.rowCount === 0) {
      throw new AppError('Item not found in this list', 404)
    }
    
    res.json({ message: 'Item removed from list' })
  } catch (error) {
    if (error instanceof AppError) throw error
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
      `SELECT id FROM shopping_lists WHERE id IN (?, ?) AND user_id = ?`,
      [id, targetListId, userId]
    )
    
    if (listsCheck.rows.length !== 2) {
      throw new AppError('One or more lists not found', 404)
    }
    
    // Move item
    const result = await pool.query(
      `UPDATE shopping_list_items SET list_id = ? WHERE id = ? AND list_id = ?`,
      [targetListId, itemId, id]
    )
    
    if (result.rowCount === 0) {
      throw new AppError('Item not found in source list', 404)
    }
    
    res.json({ message: 'Item moved to target list' })
  } catch (error) {
    if (error instanceof AppError) throw error
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
       WHERE sl.share_token = ? AND sl.is_public = true`,
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
      WHERE sli.list_id = ?`,
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
    const publicListResult = await pool.query(
      `SELECT * FROM shopping_lists WHERE share_token = ? AND is_public = true`,
      [token]
    )
    
    if (publicListResult.rows.length === 0) {
      throw new AppError('List not found', 404)
    }
    
    const publicList = publicListResult.rows[0]
    
    // Create copy
    const newListId = crypto.randomUUID()
    await pool.query(
      `INSERT INTO shopping_lists (id, user_id, name, description)
       VALUES (?, ?, CONCAT(?, ' (Copy)'), ?)`,
      [newListId, userId, publicList.name, publicList.description]
    )
    
    // Copy items
    const itemsToCopy = await pool.query(
      `SELECT product_id, variant_id, quantity, notes, priority
       FROM shopping_list_items WHERE list_id = ?`,
      [publicList.id]
    )
    
    for (const item of itemsToCopy.rows) {
      const newItemId = crypto.randomUUID()
      await pool.query(
        `INSERT INTO shopping_list_items (id, list_id, product_id, variant_id, quantity, notes, priority)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newItemId, newListId, item.product_id, item.variant_id, item.quantity, item.notes, item.priority]
      )
    }
    
    const finalNewList = await pool.query('SELECT * FROM shopping_lists WHERE id = ?', [newListId])
    
    res.json({ message: 'List copied to your account', data: finalNewList.rows[0] })
  } catch (error) {
    throw new AppError('Failed to copy list', 500)
  }
})

export default router
