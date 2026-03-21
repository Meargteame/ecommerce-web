import { Router, Response, Request } from 'express'
import productService from '../services/productService'
import { validateQuery, productFiltersSchema } from '../utils/validation'
import { AuthRequest, authenticate, authorize } from '../middleware/auth'

const router = Router()

/**
 * @route   POST /api/categories
 * @desc    Create category (admin only)
 * @access  Private (Admin)
 */
router.post('/', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const category = await productService.createCategory(req.body)
    res.status(201).json({ message: 'Category created successfully', data: category })
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Failed to create category' })
  }
})

/**
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await productService.getCategories()
    res.status(200).json({ data: categories })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get categories' })
  }
})

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID
 * @access  Public
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const category = await productService.getCategory(id)

    if (!category) {
      res.status(404).json({ error: 'Category not found' })
      return
    }

    res.status(200).json({ data: category })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get category' })
  }
})

/**
 * @route   GET /api/categories/:id/products
 * @desc    Get products by category
 * @access  Public
 */
router.get('/:id/products', validateQuery(productFiltersSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const filters = req.query as any

    const result = await productService.getProductsByCategory(id, filters)

    res.status(200).json({
      data: result.products,
      pagination: {
        total: result.total,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
      },
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get products' })
  }
})

export default router
