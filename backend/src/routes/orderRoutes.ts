import { Router, Response } from 'express'
import orderService from '../services/orderService'
import { AuthRequest, authenticate, authorize } from '../middleware/auth'
import { validate, createOrderSchema, updateOrderStatusSchema } from '../utils/validation'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * @route   POST /api/orders
 * @desc    Create order (checkout)
 * @access  Private
 */
router.post('/', validate(createOrderSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const orderData = {
      ...req.body,
      userId,
    }

    const order = await orderService.createOrder(orderData)

    res.status(201).json({
      message: 'Order created successfully',
      data: order,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes('Cart is empty') ||
        error.message.includes('validation failed') ||
        error.message.includes('Failed to reserve')
      ) {
        res.status(400).json({ error: error.message })
        return
      }
    }
    res.status(500).json({ error: 'Failed to create order' })
  }
})

/**
 * @route   GET /api/orders
 * @desc    List orders (user: own orders, admin: all orders)
 * @access  Private
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.role === 'customer' ? req.user!.userId : undefined
    const status = req.query.status as any
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0

    const result = await orderService.listOrders({
      userId,
      status,
      limit,
      offset,
    })

    res.status(200).json({
      data: result.orders,
      pagination: {
        total: result.total,
        limit,
        offset,
      },
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to list orders' })
  }
})

/**
 * @route   GET /api/orders/:id
 * @desc    Get order details
 * @access  Private
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.role === 'customer' ? req.user!.userId : undefined

    const order = await orderService.getOrderWithItems(id, userId)

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    res.status(200).json({ data: order })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get order' })
  }
})

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (admin only)
 * @access  Private (Admin)
 */
router.put(
  '/:id/status',
  authorize('admin', 'manager'),
  validate(updateOrderStatusSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const { status, notes } = req.body
      const userId = req.user!.userId

      const order = await orderService.updateOrderStatus(id, status, notes, userId)

      res.status(200).json({
        message: 'Order status updated successfully',
        data: order,
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Order not found') {
          res.status(404).json({ error: error.message })
          return
        }
        if (error.message.includes('Invalid status transition')) {
          res.status(400).json({ error: error.message })
          return
        }
      }
      res.status(500).json({ error: 'Failed to update order status' })
    }
  }
)

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private
 */
router.post('/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId
    const { reason } = req.body

    const order = await orderService.cancelOrder(id, userId, reason)

    res.status(200).json({
      message: 'Order cancelled successfully',
      data: order,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Order not found') {
        res.status(404).json({ error: error.message })
        return
      }
      if (error.message.includes('cannot be cancelled')) {
        res.status(400).json({ error: error.message })
        return
      }
    }
    res.status(500).json({ error: 'Failed to cancel order' })
  }
})

export default router
