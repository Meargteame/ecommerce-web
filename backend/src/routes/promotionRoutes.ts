import { Router, Request, Response } from 'express'
import promotionService from '../services/promotionService'
import { authenticate, authorize } from '../middleware/auth'
import { validate } from '../utils/validation'
import { createPromotionSchema, updatePromotionSchema, validateCouponSchema } from '../utils/validation'

const router = Router()

// Create promotion (admin only)
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createPromotionSchema),
  async (req: Request, res: Response) => {
    try {
      const promotion = await promotionService.createPromotion(req.body)
      res.status(201).json(promotion)
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }
)

// Get all promotions (admin only)
router.get('/', authenticate, authorize('admin'), async (_req: Request, res: Response) => {
  try {
    const promotions = await promotionService.getAllPromotions()
    res.status(200).json(promotions)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get active promotions (public)
router.get('/active', async (_req: Request, res: Response) => {
  try {
    const promotions = await promotionService.getActivePromotions()
    res.status(200).json(promotions)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get single promotion (admin only)
router.get('/:id', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const promotion = await promotionService.getPromotion(req.params.id)

    if (!promotion) {
      res.status(404).json({ error: 'Promotion not found' })
      return
    }

    res.status(200).json(promotion)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Update promotion (admin only)
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(updatePromotionSchema),
  async (req: Request, res: Response) => {
    try {
      const promotion = await promotionService.updatePromotion(req.params.id, req.body)
      res.status(200).json(promotion)
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }
)

// Delete promotion (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    await promotionService.deletePromotion(req.params.id)
    res.status(204).send()
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Validate coupon (authenticated)
router.post(
  '/validate',
  authenticate,
  validate(validateCouponSchema),
  async (req: Request, res: Response) => {
    try {
      const { code, cartTotal } = req.body
      const userId = (req as any).user.id

      const validation = await promotionService.validateCoupon(code, cartTotal, userId)
      res.status(200).json(validation)
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }
)

// Apply coupon (authenticated)
router.post(
  '/apply',
  authenticate,
  validate(validateCouponSchema),
  async (req: Request, res: Response) => {
    try {
      const { code, cartTotal } = req.body
      const userId = (req as any).user.id

      const discount = await promotionService.applyCoupon(userId, code, cartTotal)
      res.status(200).json(discount)
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }
)

export default router
