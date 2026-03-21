import { Router, Request, Response } from 'express'
import reviewService from '../services/reviewService'
import { authenticate } from '../middleware/auth'
import { validate } from '../utils/validation'
import { createReviewSchema, updateReviewSchema, createQuestionSchema, createAnswerSchema } from '../utils/validation'

const router = Router()

// Create review (authenticated)
router.post(
  '/',
  authenticate,
  validate(createReviewSchema),
  async (req: Request, res: Response) => {
    try {
      const review = await reviewService.createReview({
        ...req.body,
        userId: (req as any).user.id,
      })
      res.status(201).json(review)
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }
)

// Get reviews for a product (public)
router.get('/product/:productId', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10
    const offset = parseInt(req.query.offset as string) || 0

    const result = await reviewService.getReviews(req.params.productId, { limit, offset })
    res.status(200).json(result)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get single review (public)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const review = await reviewService.getReviewById(req.params.id)

    if (!review) {
      res.status(404).json({ error: 'Review not found' })
      return
    }

    res.status(200).json(review)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Update review (authenticated, owner only)
router.put(
  '/:id',
  authenticate,
  validate(updateReviewSchema),
  async (req: Request, res: Response) => {
    try {
      const review = await reviewService.updateReview(
        req.params.id,
        (req as any).user.id,
        req.body
      )
      res.status(200).json(review)
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }
)

// Delete review (authenticated, owner only)
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    await reviewService.deleteReview(req.params.id, (req as any).user.id)
    res.status(204).send()
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Mark review as helpful (public)
router.post('/:id/helpful', async (req: Request, res: Response) => {
  try {
    await reviewService.markReviewHelpful(req.params.id)
    res.status(200).json({ message: 'Review marked as helpful' })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get average rating for a product (public)
router.get('/product/:productId/rating', async (req: Request, res: Response) => {
  try {
    const rating = await reviewService.getAverageRating(req.params.productId)
    res.status(200).json({ rating })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Verify purchase (authenticated)
router.get('/verify-purchase/:productId', authenticate, async (req: Request, res: Response) => {
  try {
    const verified = await reviewService.verifyPurchase(
      (req as any).user.id,
      req.params.productId
    )
    res.status(200).json({ verified })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Product Q&A endpoints

// Create question (authenticated)
router.post(
  '/questions',
  authenticate,
  validate(createQuestionSchema),
  async (req: Request, res: Response) => {
    try {
      const question = await reviewService.createQuestion({
        ...req.body,
        userId: (req as any).user.id,
      })
      res.status(201).json(question)
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }
)

// Get questions for a product (public)
router.get('/questions/product/:productId', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10
    const offset = parseInt(req.query.offset as string) || 0

    const result = await reviewService.getQuestions(req.params.productId, { limit, offset })
    res.status(200).json(result)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Create answer (authenticated)
router.post(
  '/answers',
  authenticate,
  validate(createAnswerSchema),
  async (req: Request, res: Response) => {
    try {
      const answer = await reviewService.createAnswer({
        ...req.body,
        userId: (req as any).user.id,
      })
      res.status(201).json(answer)
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }
)

// Mark answer as helpful (public)
router.post('/answers/:id/helpful', async (req: Request, res: Response) => {
  try {
    await reviewService.markAnswerHelpful(req.params.id)
    res.status(200).json({ message: 'Answer marked as helpful' })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

export default router
