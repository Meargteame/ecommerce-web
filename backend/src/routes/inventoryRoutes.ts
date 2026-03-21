import { Router, Response } from 'express'
import inventoryService from '../services/inventoryService'
import { AuthRequest, authenticate, authorize } from '../middleware/auth'

const router = Router()

// All routes require admin authentication
router.use(authenticate)
router.use(authorize('admin', 'manager'))

/**
 * @route   GET /api/inventory/status
 * @desc    Get overall inventory status
 * @access  Private (Admin)
 */
router.get('/status', async (_req: AuthRequest, res: Response) => {
  try {
    const status = await inventoryService.getInventoryStatus()
    res.status(200).json({ data: status })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get inventory status' })
  }
})

/**
 * @route   GET /api/inventory/low-stock
 * @desc    Get low stock items
 * @access  Private (Admin)
 */
router.get('/low-stock', async (req: AuthRequest, res: Response) => {
  try {
    const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : undefined
    const items = await inventoryService.getLowStockItems(threshold)
    res.status(200).json({ data: items })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get low stock items' })
  }
})

/**
 * @route   GET /api/inventory/out-of-stock
 * @desc    Get out of stock items
 * @access  Private (Admin)
 */
router.get('/out-of-stock', async (_req: AuthRequest, res: Response) => {
  try {
    const items = await inventoryService.getOutOfStockItems()
    res.status(200).json({ data: items })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get out of stock items' })
  }
})

/**
 * @route   GET /api/inventory/:sku
 * @desc    Get stock level for a SKU
 * @access  Private (Admin)
 */
router.get('/:sku', async (req: AuthRequest, res: Response) => {
  try {
    const { sku } = req.params
    const stock = await inventoryService.getStock(sku)
    res.status(200).json({ data: { sku, stock } })
  } catch (error) {
    if (error instanceof Error && error.message === 'SKU not found') {
      res.status(404).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Failed to get stock' })
  }
})

/**
 * @route   PUT /api/inventory/:sku
 * @desc    Update stock level for a SKU
 * @access  Private (Admin)
 */
router.put('/:sku', async (req: AuthRequest, res: Response) => {
  try {
    const { sku } = req.params
    const { quantity, operation = 'set' } = req.body

    if (typeof quantity !== 'number' || quantity < 0) {
      res.status(400).json({ error: 'Invalid quantity' })
      return
    }

    if (!['set', 'increment', 'decrement'].includes(operation)) {
      res.status(400).json({ error: 'Invalid operation. Must be set, increment, or decrement' })
      return
    }

    await inventoryService.updateStock(sku, quantity, operation)

    res.status(200).json({ message: 'Stock updated successfully' })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'SKU not found') {
        res.status(404).json({ error: error.message })
        return
      }
      if (error.message === 'Insufficient stock') {
        res.status(400).json({ error: error.message })
        return
      }
    }
    res.status(500).json({ error: 'Failed to update stock' })
  }
})

/**
 * @route   POST /api/inventory/bulk-update
 * @desc    Bulk update stock levels
 * @access  Private (Admin)
 */
router.post('/bulk-update', async (req: AuthRequest, res: Response) => {
  try {
    const { updates } = req.body

    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ error: 'Updates must be a non-empty array' })
      return
    }

    await inventoryService.bulkUpdateStock(updates)

    res.status(200).json({ message: 'Bulk stock update successful' })
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Failed to bulk update stock' })
  }
})

export default router
