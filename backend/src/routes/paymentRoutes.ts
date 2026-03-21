import { Router, Request, Response } from 'express'
import express from 'express'
import paymentService from '../services/paymentService'
import { AuthRequest, authenticate, authorize } from '../middleware/auth'

const router = Router()

/**
 * POST /api/payments/create-intent
 * Create a Stripe PaymentIntent for an order.
 * Returns clientSecret for Stripe Elements on the frontend.
 */
router.post('/create-intent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, currency } = req.body
    if (!orderId) {
      res.status(400).json({ error: 'orderId is required' })
      return
    }
    const result = await paymentService.createPaymentIntent({ orderId, currency })
    res.status(200).json({ message: 'PaymentIntent created', data: result })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

/**
 * POST /api/payments/confirm
 * Confirm payment after Stripe Elements succeeds.
 */
router.post('/confirm', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, paymentIntentId } = req.body
    if (!orderId || !paymentIntentId) {
      res.status(400).json({ error: 'orderId and paymentIntentId are required' })
      return
    }
    const payment = await paymentService.confirmPayment({ orderId, paymentIntentId })
    res.status(200).json({ message: 'Payment confirmed', data: payment })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

/**
 * GET /api/payments/order/:orderId
 * Get payment record for an order.
 */
router.get('/order/:orderId', authenticate, async (req: Request, res: Response) => {
  try {
    const payment = await paymentService.getPaymentByOrderId(req.params.orderId)
    if (!payment) {
      res.status(404).json({ error: 'Payment not found' })
      return
    }
    res.status(200).json({ data: payment })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

/**
 * POST /api/payments/:id/refund
 * Issue a refund (admin only).
 */
router.post('/:id/refund', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { amount, reason } = req.body
    if (!amount || !reason) {
      res.status(400).json({ error: 'amount and reason are required' })
      return
    }
    const refund = await paymentService.processRefund({
      paymentId: req.params.id,
      amount,
      reason,
      processedBy: req.user!.userId,
    })
    res.status(200).json({ message: 'Refund processed', data: refund })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

/**
 * POST /api/payments/webhook/stripe
 * Stripe webhook — must use raw body for signature verification.
 */
router.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string
    try {
      await paymentService.handleStripeWebhook(req.body as Buffer, sig)
      res.status(200).json({ received: true })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }
)

export default router
