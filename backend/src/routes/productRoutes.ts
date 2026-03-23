import { Router, Response, Request } from 'express'
import productService from '../services/productService'
import { AuthRequest, authenticate, authorize, optionalAuth } from '../middleware/auth'
import {
  validate,
  validateQuery,
  createProductSchema,
  updateProductSchema,
  productFiltersSchema,
} from '../utils/validation'

const router = Router()

/**
 * @route   GET /api/products
 * @desc    List products with filters
 * @access  Public
 */
router.get('/', validateQuery(productFiltersSchema), async (req: Request, res: Response) => {
  try {
    const filters = req.query as any
    const result = await productService.listProducts(filters)

    res.status(200).json({
      data: result.products,
      pagination: {
        total: result.total,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
      },
    })
  } catch (error) {
    console.error('List products error:', error)
    res.status(500).json({ error: 'Failed to list products' })
  }
})

/**
 * @route   GET /api/products/search
 * @desc    Search products
 * @access  Public
 */
router.get('/search', validateQuery(productFiltersSchema), async (req: Request, res: Response) => {
  try {
    const { search, ...filters } = req.query as any

    if (!search) {
      res.status(400).json({ error: 'Search query is required' })
      return
    }

    const result = await productService.searchProducts(search, filters)

    res.status(200).json({
      data: result.products,
      pagination: {
        total: result.total,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
      },
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to search products' })
  }
})

/**
 * @route   GET /api/products/brands
 * @desc    Get all brands
 * @access  Public
 */
router.get('/brands', async (_req: Request, res: Response) => {
  try {
    const brands = await productService.getBrands()
    res.status(200).json({ data: brands })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get brands' })
  }
})

/**
 * @route   GET /api/products/by-slug/:slug
 * @desc    Get product by slug (for SEO-friendly URLs)
 * @access  Public
 */
router.get('/by-slug/:slug', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params
    const product = await productService.getProductBySlug(slug, true)

    if (!product) {
      res.status(404).json({ error: 'Product not found' })
      return
    }

    const [images, variants] = await Promise.all([
      productService.getProductImages(product.id),
      productService.getProductVariants(product.id),
    ])

    res.status(200).json({
      data: {
        ...product,
        images,
        variants,
      },
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get product' })
  }
})

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Public
 */
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const incrementView = !req.user || req.user.role === 'customer' // Don't increment for admin views

    const product = await productService.getProduct(id, incrementView)

    if (!product) {
      res.status(404).json({ error: 'Product not found' })
      return
    }

    // Get additional data
    const [images, variants] = await Promise.all([
      productService.getProductImages(id),
      productService.getProductVariants(id),
    ])

    res.status(200).json({
      data: {
        ...product,
        images,
        variants,
      },
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get product' })
  }
})

/**
 * @route   POST /api/products
 * @desc    Create product (admin only)
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  validate(createProductSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const product = await productService.createProduct({
        ...req.body,
        sellerId: req.user?.userId,
      })

      res.status(201).json({
        message: 'Product created successfully',
        data: product,
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already exists') || error.message.includes('not found')) {
          res.status(400).json({ error: error.message })
          return
        }
      }
      res.status(500).json({ error: 'Failed to create product' })
    }
  }
)

/**
 * @route   PUT /api/products/:id
 * @desc    Update product (admin only)
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  validate(updateProductSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const product = await productService.updateProduct(id, req.body)

      res.status(200).json({
        message: 'Product updated successfully',
        data: product,
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Product not found') {
          res.status(404).json({ error: error.message })
          return
        }
        res.status(400).json({ error: error.message })
        return
      }
      res.status(500).json({ error: 'Failed to update product' })
    }
  }
)

/**
 * @route   POST /api/products/:id/variants
 * @desc    Create product variant (admin only)
 * @access  Private (Admin)
 */
router.post(
  '/:id/variants',
  authenticate,
  authorize('admin', 'manager'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const variant = await productService.createVariant(id, req.body)

      res.status(201).json({
        message: 'Variant created successfully',
        data: variant,
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Product not found') {
          res.status(404).json({ error: error.message })
          return
        }
        res.status(400).json({ error: error.message })
        return
      }
      res.status(500).json({ error: 'Failed to create variant' })
    }
  }
)

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (admin only)
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      await productService.deleteProduct(id)

      res.status(200).json({ message: 'Product deleted successfully' })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Product not found') {
          res.status(404).json({ error: error.message })
          return
        }
      }
      res.status(500).json({ error: 'Failed to delete product' })
    }
  }
)

/**
 * @route   POST /api/products/:id/images
 * @desc    Add image to product
 * @access  Private (seller or admin)
 */
router.post(
  '/:id/images',
  authenticate,
  authorize('seller', 'admin', 'manager'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const { url, altText, displayOrder, isPrimary } = req.body
      if (!url) {
        res.status(400).json({ error: 'Image URL is required' })
        return
      }

      // Verify product exists
      const product = await productService.getProduct(id)
      if (!product) {
        res.status(404).json({ error: 'Product not found' })
        return
      }

      const pool = (await import('../config/database')).default
      
      // If setting as primary, unset existing primary
      if (isPrimary) {
        await pool.query(
          'UPDATE product_images SET is_primary = false WHERE product_id = ?',
          [id]
        )
      }

      const imageId = (await import('crypto')).randomUUID()
      await pool.query(
        `INSERT INTO product_images (id, product_id, url, alt_text, display_order, is_primary)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [imageId, id, url, altText || null, displayOrder || 0, isPrimary || false]
      )

      const finalResult = await pool.query('SELECT * FROM product_images WHERE id = ?', [imageId])
      
      res.status(201).json({
        message: 'Image added successfully',
        data: finalResult.rows[0],
      })
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message })
        return
      }
      res.status(500).json({ error: 'Failed to add image' })
    }
  }
)

export default router
