import { Router, Response } from 'express'
import wishlistService from '../services/wishlistService'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// All wishlist routes require authentication
router.use(authenticate)

// Get user's wishlist
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const wishlist = await wishlistService.getWishlist(userId)
    res.status(200).json({ data: wishlist })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Add product to wishlist
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { productId } = req.body
    
    if (!productId) {
      res.status(400).json({ error: 'Product ID is required' })
      return
    }

    const item = await wishlistService.addProduct(userId, productId)
    res.status(201).json({ data: item, message: 'Added to wishlist' })
  } catch (error: any) {
    if (error.message === 'Product already in wishlist') {
      res.status(400).json({ error: error.message })
    } else {
      res.status(500).json({ error: 'Failed to add to wishlist' })
    }
  }
})

// Remove product from wishlist
router.delete('/:productId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { productId } = req.params

    await wishlistService.removeProduct(userId, productId)
    res.status(200).json({ message: 'Removed from wishlist' })
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to remove from wishlist' })
  }
})

export default router
