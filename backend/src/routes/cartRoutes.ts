import { Router, Response } from 'express'
import cartService from '../services/cartService'
import { AuthRequest, authenticate } from '../middleware/auth'
import { validate, addToCartSchema, updateCartItemSchema } from '../utils/validation'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * @route   GET /api/cart
 * @desc    Get user's cart
 * @access  Private
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const cart = await cartService.getCart(userId)

    res.status(200).json({ data: cart })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cart' })
  }
})

/**
 * @route   POST /api/cart/items
 * @desc    Add item to cart
 * @access  Private
 */
router.post('/items', validate(addToCartSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const cart = await cartService.addItem(userId, req.body)

    res.status(201).json({
      message: 'Item added to cart',
      data: cart,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('not available') ||
        error.message.includes('Insufficient stock')
      ) {
        res.status(400).json({ error: error.message })
        return
      }
    }
    console.error('Cart add item error:', error)
    res.status(500).json({ error: 'Failed to add item to cart' })
  }
})

/**
 * @route   PUT /api/cart/items/:id
 * @desc    Update cart item quantity
 * @access  Private
 */
router.put('/items/:id', validate(updateCartItemSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const itemId = req.params.id
    const { quantity } = req.body

    const cart = await cartService.updateItemQuantity(userId, itemId, quantity)

    res.status(200).json({
      message: 'Cart item updated',
      data: cart,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Cart item not found') {
        res.status(404).json({ error: error.message })
        return
      }
      if (error.message.includes('Quantity') || error.message.includes('stock')) {
        res.status(400).json({ error: error.message })
        return
      }
    }
    res.status(500).json({ error: 'Failed to update cart item' })
  }
})

/**
 * @route   DELETE /api/cart/items/:id
 * @desc    Remove item from cart
 * @access  Private
 */
router.delete('/items/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const itemId = req.params.id

    const cart = await cartService.removeItem(userId, itemId)

    res.status(200).json({
      message: 'Item removed from cart',
      data: cart,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Cart item not found') {
        res.status(404).json({ error: error.message })
        return
      }
    }
    res.status(500).json({ error: 'Failed to remove item from cart' })
  }
})

/**
 * @route   POST /api/cart/save-for-later/:id
 * @desc    Move item from cart to wishlist
 * @access  Private
 */
router.post('/save-for-later/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const itemId = req.params.id

    const cart = await cartService.saveForLater(userId, itemId)

    res.status(200).json({
      message: 'Item saved for later',
      data: cart,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Cart item not found') {
        res.status(404).json({ error: error.message })
        return
      }
    }
    res.status(500).json({ error: 'Failed to save item for later' })
  }
})

/**
 * @route   DELETE /api/cart
 * @desc    Clear cart
 * @access  Private
 */
router.delete('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    await cartService.clearCart(userId)

    res.status(200).json({ message: 'Cart cleared' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cart' })
  }
})

/**
 * @route   GET /api/cart/validate
 * @desc    Validate cart (check availability and stock)
 * @access  Private
 */
router.get('/validate', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const validation = await cartService.validateCart(userId)

    res.status(200).json({ data: validation })
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate cart' })
  }
})

export default router
