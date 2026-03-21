import { Router, Request, Response } from 'express'
import shippingService from '../services/shippingService'
import { authenticate, authorize } from '../middleware/auth'
import { validate } from '../utils/validation'
import { calculateShippingSchema, createShipmentSchema, updateShipmentStatusSchema } from '../utils/validation'

const router = Router()

// Calculate shipping cost (public)
router.post(
  '/calculate',
  validate(calculateShippingSchema),
  async (req: Request, res: Response) => {
    try {
      const { address, items } = req.body
      const options = await shippingService.calculateShipping(address, items)
      res.status(200).json(options)
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }
)

// Get supported couriers (public)
router.get('/couriers', (_req: Request, res: Response) => {
  try {
    const couriers = shippingService.getSupportedCouriers()
    res.status(200).json(couriers)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Create shipment (admin only)
router.post(
  '/shipments',
  authenticate,
  authorize('admin'),
  validate(createShipmentSchema),
  async (req: Request, res: Response) => {
    try {
      const shipment = await shippingService.createShipment(req.body)
      res.status(201).json(shipment)
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }
)

// Get tracking information (public)
router.get('/track/:trackingNumber', async (req: Request, res: Response) => {
  try {
    const trackingInfo = await shippingService.getTrackingInfo(req.params.trackingNumber)

    if (!trackingInfo) {
      res.status(404).json({ error: 'Tracking information not found' })
      return
    }

    res.status(200).json(trackingInfo)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get shipment by order ID (authenticated)
router.get('/order/:orderId', authenticate, async (req: Request, res: Response) => {
  try {
    const shipment = await shippingService.getShipmentByOrderId(req.params.orderId)

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' })
      return
    }

    res.status(200).json(shipment)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Update shipment status (admin only)
router.patch(
  '/shipments/:trackingNumber/status',
  authenticate,
  authorize('admin'),
  validate(updateShipmentStatusSchema),
  async (req: Request, res: Response) => {
    try {
      const { status, notes } = req.body
      const shipment = await shippingService.updateShipmentStatus(
        req.params.trackingNumber,
        status,
        notes
      )
      res.status(200).json(shipment)
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }
)

export default router
