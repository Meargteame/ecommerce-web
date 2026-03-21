import { Router, Request, Response } from 'express'
import analyticsService from '../services/analyticsService'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()

// Helper to parse date range from query params
function parseDateRange(req: Request): { startDate: Date; endDate: Date } {
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date()
  const startDate = req.query.startDate
    ? new Date(req.query.startDate as string)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days

  return { startDate, endDate }
}

// Track event (public - called from frontend)
router.post('/events', async (req: Request, res: Response) => {
  try {
    const { eventType, eventData, sessionId } = req.body

    if (!eventType || !sessionId) {
      res.status(400).json({ error: 'Missing required fields: eventType, sessionId' })
      return
    }

    await analyticsService.trackEvent({
      userId: (req as any).user?.id,
      sessionId,
      eventType,
      eventData,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'] as string,
    })

    res.status(200).json({ tracked: true })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get dashboard metrics (admin only)
router.get('/dashboard', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req)
    const metrics = await analyticsService.getDashboardMetrics(dateRange)
    res.status(200).json(metrics)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get sales metrics (admin only)
router.get('/sales', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req)
    const metrics = await analyticsService.getSalesMetrics(dateRange)
    res.status(200).json(metrics)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get conversion metrics (admin only)
router.get('/conversions', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req)
    const metrics = await analyticsService.getConversionMetrics(dateRange)
    res.status(200).json(metrics)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get customer metrics (admin only)
router.get('/customers', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req)
    const metrics = await analyticsService.getCustomerMetrics(dateRange)
    res.status(200).json(metrics)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get product metrics (admin only)
router.get('/products/:productId', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req)
    const metrics = await analyticsService.getProductMetrics(req.params.productId, dateRange)
    res.status(200).json(metrics)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Get traffic sources (admin only)
router.get('/traffic', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const dateRange = parseDateRange(req)
    const sources = await analyticsService.getTrafficSources(dateRange)
    res.status(200).json(sources)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

export default router
