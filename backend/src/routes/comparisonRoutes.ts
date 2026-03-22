import { Router, Response } from 'express'
import { AuthRequest, authenticate, optionalAuth } from '../middleware/auth'
import pool from '../config/database'
import { AppError } from '../middleware/errorHandler'
import crypto from 'crypto'

const router = Router()

// Product Comparison API

// GET /api/comparison - Get user's comparison sets
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    
    const result = await pool.query(
      `SELECT pcs.*,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT(
          'id', p.id, 'name', p.name, 'slug', p.slug, 'base_price', p.base_price,
          'brand', p.brand, 'average_rating', p.average_rating, 'review_count', p.review_count,
          'image', (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1)
        ))
        FROM product_comparison_items pci
        JOIN products p ON p.id = pci.product_id
        WHERE pci.set_id = pcs.id
        ) as products,
        (SELECT COUNT(*) FROM product_comparison_items WHERE set_id = pcs.id) as product_count
      FROM product_comparison_sets pcs
      WHERE pcs.user_id = ?
      ORDER BY pcs.created_at DESC`,
      [userId]
    )
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch comparison sets', 500)
  }
})

// POST /api/comparison - Create new comparison set
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { name, productIds } = req.body
    
    // Create set
    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO product_comparison_sets (id, user_id, name, expires_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))`,
      [id, userId, name || 'Product Comparison']
    )
    
    const setResult = await pool.query('SELECT * FROM product_comparison_sets WHERE id = ?', [id])
    const setId = id
    
    // Add products
    if (productIds && productIds.length > 0) {
      const placeholders = productIds.map(() => '(?, ?, ?)').join(', ')
      const values: any[] = []
      productIds.forEach((pid: string) => {
        values.push(crypto.randomUUID(), setId, pid)
      })
      await pool.query(
        `INSERT INTO product_comparison_items (id, set_id, product_id) VALUES ${placeholders}`,
        values
      )
    }
    
    res.status(201).json({ 
      message: 'Comparison set created', 
      data: setResult.rows[0] 
    })
  } catch (error) {
    throw new AppError('Failed to create comparison set', 500)
  }
})

// GET /api/comparison/:id - Get comparison details with full specs
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.userId
    
    // Check ownership if user is logged in
    if (userId) {
      const ownershipCheck = await pool.query(
        `SELECT id FROM product_comparison_sets WHERE id = ? AND user_id = ?`,
        [id, userId]
      )
      if (ownershipCheck.rows.length === 0) {
        throw new AppError('Comparison set not found', 404)
      }
    }
    
    // Get products with full details
    const productsResult = await pool.query(
      `SELECT 
        p.id, p.name, p.slug, p.base_price, p.description, p.brand,
        p.average_rating, p.review_count, p.specifications,
        c.name as category_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('url', image_url, 'alt', alt_text))
         FROM (SELECT image_url, alt_text FROM product_images WHERE product_id = p.id LIMIT 5) img
        ) as images,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT(
          'id', pv.id, 'variant_name', pv.variant_name, 'price', pv.price, 'sku', pv.sku,
          'attributes', (SELECT JSON_ARRAYAGG(JSON_OBJECT('name', a.name, 'value', va.attribute_value))
                         FROM variant_attributes va
                         JOIN product_attributes a ON a.id = va.attribute_id
                         WHERE va.variant_id = pv.id)
        ))
         FROM product_variants pv WHERE pv.product_id = p.id
        ) as variants,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('rating', r.rating, 'title', r.title, 'content', r.content))
         FROM (SELECT rating, title, content FROM reviews WHERE product_id = p.id ORDER BY created_at DESC LIMIT 3) r
        ) as recent_reviews
      FROM product_comparison_items pci
      JOIN products p ON p.id = pci.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE pci.set_id = ?`,
      [id]
    )
    
    if (productsResult.rows.length === 0) {
      throw new AppError('Comparison set not found or empty', 404)
    }
    
    // Build comparison table structure
    const products = productsResult.rows
    const allSpecs = new Set<string>()
    
    products.forEach((p: any) => {
      if (p.specifications) {
        const specs = typeof p.specifications === 'string' ? JSON.parse(p.specifications) : p.specifications
        Object.keys(specs).forEach(key => allSpecs.add(key))
      }
    })
    
    const comparisonTable = {
      products: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: p.image,
        price: p.base_price,
        brand: p.brand,
        rating: p.average_rating,
        reviewCount: p.review_count,
        category: p.category_name,
        images: p.images,
        variants: p.variants,
        recentReviews: p.recent_reviews
      })),
      specifications: Array.from(allSpecs).map(spec => ({
        name: spec,
        values: products.map((p: any) => {
          const specs = typeof p.specifications === 'string' ? JSON.parse(p.specifications) : p.specifications
          return {
            productId: p.id,
            value: specs?.[spec] || 'N/A'
          }
        })
      })),
      highlights: {
        lowestPrice: products.reduce((min: any, p: any) => p.base_price < min.base_price ? p : min, products[0]),
        highestRated: products.reduce((max: any, p: any) => (p.average_rating || 0) > (max.average_rating || 0) ? p : max, products[0]),
        mostReviewed: products.reduce((max: any, p: any) => (p.review_count || 0) > (max.review_count || 0) ? p : max, products[0])
      }
    }
    
    res.json({ data: comparisonTable })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to fetch comparison', 500)
  }
})

// POST /api/comparison/:id/products - Add product to comparison
router.post('/:id/products', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const { productId } = req.body
    
    // Verify ownership
    const ownershipCheck = await pool.query(
      `SELECT id FROM product_comparison_sets WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    
    if (ownershipCheck.rows.length === 0) {
      throw new AppError('Comparison set not found', 404)
    }
    
    // Check max products (typically 4-5 for comparison)
    const countCheck = await pool.query(
      `SELECT COUNT(*) as count FROM product_comparison_items WHERE set_id = ?`,
      [id]
    )
    
    if (parseInt((countCheck.rows[0] as any).count) >= 5) {
      throw new AppError('Maximum 5 products allowed per comparison', 400)
    }
    
    const itemId = crypto.randomUUID()
    const result = await pool.query(
      `INSERT INTO product_comparison_items (id, set_id, product_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE product_id = product_id`,
      [itemId, id, productId]
    )
    
    if (result.rowCount === 0) {
      throw new AppError('Product already in comparison', 400)
    }
    
    res.status(201).json({ message: 'Product added to comparison' })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to add product', 500)
  }
})

// DELETE /api/comparison/:id/products/:productId - Remove product from comparison
router.delete('/:id/products/:productId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id, productId } = req.params
    
    // Verify ownership
    const ownershipCheck = await pool.query(
      `SELECT id FROM product_comparison_sets WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    
    if (ownershipCheck.rows.length === 0) {
      throw new AppError('Comparison set not found', 404)
    }
    
    await pool.query(
      `DELETE FROM product_comparison_items WHERE set_id = ? AND product_id = ?`,
      [id, productId]
    )
    
    res.json({ message: 'Product removed from comparison' })
  } catch (error) {
    throw new AppError('Failed to remove product', 500)
  }
})

// DELETE /api/comparison/:id - Delete comparison set
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    
    const result = await pool.query(
      `DELETE FROM product_comparison_sets WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    
    if (result.rowCount === 0) {
      throw new AppError('Comparison set not found', 404)
    }
    
    res.json({ message: 'Comparison set deleted' })
  } catch (error) {
    throw new AppError('Failed to delete comparison', 500)
  }
})

// Guest comparison (session-based)
router.post('/guest', async (req, res) => {
  try {
    const { productIds, sessionId } = req.body
    const generatedSessionId = sessionId || crypto.randomBytes(32).toString('hex')
    
    // Create set with session
    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO product_comparison_sets (id, session_id, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [id, generatedSessionId]
    )
    
    const setId = id
    
    // Add products
    if (productIds && productIds.length > 0) {
      const placeholders = productIds.map(() => '(?, ?, ?)').join(', ')
      const values: any[] = []
      productIds.forEach((pid: string) => {
        values.push(crypto.randomUUID(), setId, pid)
      })
      await pool.query(
        `INSERT INTO product_comparison_items (id, set_id, product_id) VALUES ${placeholders}`,
        values
      )
    }
    
    res.status(201).json({ 
      message: 'Guest comparison created',
      sessionId: generatedSessionId,
      comparisonId: setId
    })
  } catch (error) {
    throw new AppError('Failed to create guest comparison', 500)
  }
})

// Get guest comparison
router.get('/guest/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    
    const setResult = await pool.query(
      `SELECT id FROM product_comparison_sets WHERE session_id = ? AND expires_at > NOW()`,
      [sessionId]
    )
    
    if (setResult.rows.length === 0) {
      throw new AppError('Comparison not found or expired', 404)
    }
    
    // Get products
    const productsResult = await pool.query(
      `SELECT 
        p.id, p.name, p.slug, p.base_price, p.brand,
        p.average_rating, p.review_count, p.specifications,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image
      FROM product_comparison_items pci
      JOIN products p ON p.id = pci.product_id
      WHERE pci.set_id = ?`,
      [setResult.rows[0].id]
    )
    
    res.json({ data: productsResult.rows })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to fetch guest comparison', 500)
  }
})

export default router
