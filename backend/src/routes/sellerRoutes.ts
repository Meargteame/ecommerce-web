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

export default router
