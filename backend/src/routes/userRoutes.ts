import { Router, Response } from 'express'
import userService from '../services/userService'
import { AuthRequest, authenticate, authorize } from '../middleware/auth'
import {
  validate,
  updateProfileSchema,
  addressSchema,
  updateAddressSchema,
  addToWishlistSchema,
} from '../utils/validation'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const profile = await userService.getProfile(userId)

    if (!profile) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    res.status(200).json({ data: profile })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' })
  }
})

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', validate(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const profile = await userService.updateProfile(userId, req.body)

    res.status(200).json({
      message: 'Profile updated successfully',
      data: profile,
    })
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

/**
 * @route   GET /api/users/addresses
 * @desc    Get all user addresses
 * @access  Private
 */
router.get('/addresses', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const addresses = await userService.getAddresses(userId)

    res.status(200).json({ data: addresses })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get addresses' })
  }
})

/**
 * @route   GET /api/users/addresses/:id
 * @desc    Get single address
 * @access  Private
 */
router.get('/addresses/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const addressId = req.params.id
    const address = await userService.getAddress(userId, addressId)

    if (!address) {
      res.status(404).json({ error: 'Address not found' })
      return
    }

    res.status(200).json({ data: address })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get address' })
  }
})

/**
 * @route   POST /api/users/addresses
 * @desc    Create new address
 * @access  Private
 */
router.post('/addresses', validate(addressSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const address = await userService.createAddress(userId, req.body)

    res.status(201).json({
      message: 'Address created successfully',
      data: address,
    })
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Failed to create address' })
  }
})

/**
 * @route   PUT /api/users/addresses/:id
 * @desc    Update address
 * @access  Private
 */
router.put('/addresses/:id', validate(updateAddressSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const addressId = req.params.id
    const address = await userService.updateAddress(userId, addressId, req.body)

    res.status(200).json({
      message: 'Address updated successfully',
      data: address,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Address not found') {
        res.status(404).json({ error: error.message })
        return
      }
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Failed to update address' })
  }
})

/**
 * @route   DELETE /api/users/addresses/:id
 * @desc    Delete address
 * @access  Private
 */
router.delete('/addresses/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const addressId = req.params.id
    await userService.deleteAddress(userId, addressId)

    res.status(200).json({ message: 'Address deleted successfully' })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Address not found') {
        res.status(404).json({ error: error.message })
        return
      }
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Failed to delete address' })
  }
})

/**
 * @route   GET /api/users/wishlist
 * @desc    Get user wishlist
 * @access  Private
 */
router.get('/wishlist', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const wishlist = await userService.getWishlist(userId)

    res.status(200).json({ data: wishlist })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get wishlist' })
  }
})

/**
 * @route   POST /api/users/wishlist
 * @desc    Add product to wishlist
 * @access  Private
 */
router.post('/wishlist', validate(addToWishlistSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { productId } = req.body
    await userService.addToWishlist(userId, productId)

    res.status(201).json({ message: 'Product added to wishlist' })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('already in wishlist')) {
        res.status(400).json({ error: error.message })
        return
      }
    }
    res.status(500).json({ error: 'Failed to add to wishlist' })
  }
})

/**
 * @route   DELETE /api/users/wishlist/:id
 * @desc    Remove product from wishlist
 * @access  Private
 */
router.delete('/wishlist/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const wishlistId = req.params.id
    await userService.removeFromWishlist(userId, wishlistId)

    res.status(200).json({ message: 'Product removed from wishlist' })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Wishlist item not found') {
        res.status(404).json({ error: error.message })
        return
      }
    }
    res.status(500).json({ error: 'Failed to remove from wishlist' })
  }
})

/**
 * @route   GET /api/users/orders
 * @desc    Get user order history
 * @access  Private
 */
router.get('/orders', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0

    const orders = await userService.getOrderHistory(userId, limit, offset)

    res.status(200).json({ data: orders })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get order history' })
  }
})

/**
 * @route   POST /api/users/become-seller
 * @desc    Upgrade current user role to seller
 * @access  Private (customer only)
 */
router.post('/become-seller', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { storeName, contactEmail, description } = req.body
    const user = await userService.becomeSeller(userId, storeName, contactEmail, description)
    res.status(200).json({ message: 'You are now a seller!', data: user })
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Failed to upgrade to seller' })
  }
})

/**
 * @route   GET /api/users
 * @desc    Admin: list all users (supports ?role=seller&limit=50&offset=0)
 * @access  Admin
 */
router.get('/', authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const role = req.query.role as string | undefined
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0
    const result = await userService.listUsers(role, limit, offset)
    res.status(200).json({ data: result })
  } catch (error) {
    res.status(500).json({ error: 'Failed to list users' })
  }
})

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Admin: update user account status (active / suspended / banned)
 * @access  Admin
 */
router.patch('/:id/status', authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body
    if (!status) {
      res.status(400).json({ error: 'status is required' })
      return
    }
    const user = await userService.updateUserStatus(req.params.id, status)
    res.status(200).json({ message: 'User status updated', data: user })
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Failed to update user status' })
  }
})

export default router
