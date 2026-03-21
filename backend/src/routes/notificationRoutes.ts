import { Router, Request, Response } from 'express'
import notificationService from '../services/notificationService'
import orderService from '../services/orderService'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import pool from '../config/database'
import { AppError } from '../middleware/errorHandler'

const router = Router()

// Send test email (admin only)
router.post('/test', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { to, subject, message } = req.body

    if (!to || !subject || !message) {
      res.status(400).json({ error: 'Missing required fields: to, subject, message' })
      return
    }

    await notificationService.sendEmail(to, subject, `<p>${message}</p>`, message)
    res.status(200).json({ message: 'Test email sent successfully' })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Resend order confirmation (authenticated, owner or admin)
router.post('/order-confirmation/:orderId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params
    const user = req.user!

    if (user.role !== 'admin') {
      const order = await orderService.getOrder(orderId, user.userId)
      if (!order) {
        res.status(403).json({ error: 'Order not found or access denied' })
        return
      }
    }

    await notificationService.sendOrderConfirmation(orderId)
    res.status(200).json({ message: 'Order confirmation email sent' })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Send password reset email (public)
router.post('/password-reset', async (req: Request, res: Response) => {
  try {
    const { email, token } = req.body

    if (!email || !token) {
      res.status(400).json({ error: 'Missing required fields: email, token' })
      return
    }

    await notificationService.sendPasswordReset(email, token)
    res.status(200).json({ message: 'Password reset email sent' })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Send welcome email (internal use)
router.post('/welcome', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { email, firstName } = req.body

    if (!email) {
      res.status(400).json({ error: 'Missing required field: email' })
      return
    }

    await notificationService.sendWelcomeEmail(email, firstName)
    res.status(200).json({ message: 'Welcome email sent' })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// Send low stock alert (admin only)
router.post('/low-stock-alert', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { sku, quantity } = req.body

    if (!sku || quantity === undefined) {
      res.status(400).json({ error: 'Missing required fields: sku, quantity' })
      return
    }

    await notificationService.sendLowStockAlert(sku, quantity)
    res.status(200).json({ message: 'Low stock alert sent' })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

// ============================================
// Notification Preferences API
// ============================================

// GET /api/notifications/preferences - Get user's notification preferences
router.get('/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    
    // Get user's current preferences
    const result = await pool.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [userId]
    )
    
    // Define default preferences structure
    const defaultPreferences = {
      email: {
        order_updates: true,
        shipping_updates: true,
        promotions: true,
        price_alerts: true,
        back_in_stock: true,
        review_reminders: true,
        account_security: true,
        newsletter: true,
        product_recommendations: true
      },
      sms: {
        order_updates: false,
        shipping_updates: true,
        delivery_updates: true,
        promotional: false,
        security_alerts: true
      },
      push: {
        order_updates: true,
        shipping_updates: true,
        price_alerts: true,
        back_in_stock: true,
        promotions: false,
        messages: true
      },
      whatsapp: {
        order_updates: false,
        shipping_updates: false,
        delivery_updates: true,
        support: true
      }
    }
    
    // Merge with user preferences
    const userPrefs = result.rows.reduce((acc: any, row: any) => {
      if (!acc[row.channel]) acc[row.channel] = {}
      acc[row.channel][row.type] = row.is_enabled
      return acc
    }, {})
    
    // Deep merge defaults with user prefs
    const merge = (obj1: any, obj2: any) => {
      const result = { ...obj1 }
      for (const key in obj2) {
        if (typeof obj2[key] === 'object' && obj2[key] !== null) {
          result[key] = merge(obj1[key] || {}, obj2[key])
        } else {
          result[key] = obj2[key]
        }
      }
      return result
    }
    
    const preferences = merge(defaultPreferences, userPrefs)
    
    // Get user's communication preferences from users table
    const userResult = await pool.query(
      `SELECT marketing_consent, sms_consent, whatsapp_consent, language, timezone
       FROM users WHERE id = $1`,
      [userId]
    )
    
    res.json({
      data: {
        channels: preferences,
        globalSettings: userResult.rows[0] || {}
      }
    })
  } catch (error) {
    throw new AppError('Failed to fetch preferences', 500)
  }
})

// PUT /api/notifications/preferences - Update preferences
router.put('/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const userId = req.user!.userId
    const { channels, globalSettings } = req.body
    
    // Update channel-specific preferences
    if (channels) {
      for (const [channel, types] of Object.entries(channels)) {
        for (const [type, enabled] of Object.entries(types as any)) {
          await client.query(
            `INSERT INTO notification_preferences (user_id, channel, type, is_enabled)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, channel, type) 
             DO UPDATE SET is_enabled = EXCLUDED.is_enabled, updated_at = NOW()`,
            [userId, channel, type, enabled]
          )
        }
      }
    }
    
    // Update global settings
    if (globalSettings) {
      const updates: string[] = []
      const values: any[] = []
      let paramIndex = 1
      
      if ('marketingConsent' in globalSettings) {
        updates.push(`marketing_consent = $${paramIndex++}`)
        values.push(globalSettings.marketingConsent)
      }
      if ('smsConsent' in globalSettings) {
        updates.push(`sms_consent = $${paramIndex++}`)
        values.push(globalSettings.smsConsent)
      }
      if ('whatsappConsent' in globalSettings) {
        updates.push(`whatsapp_consent = $${paramIndex++}`)
        values.push(globalSettings.whatsappConsent)
      }
      if ('language' in globalSettings) {
        updates.push(`language = $${paramIndex++}`)
        values.push(globalSettings.language)
      }
      if ('timezone' in globalSettings) {
        updates.push(`timezone = $${paramIndex++}`)
        values.push(globalSettings.timezone)
      }
      
      if (updates.length > 0) {
        values.push(userId)
        await client.query(
          `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          values
        )
      }
    }
    
    await client.query('COMMIT')
    
    res.json({ message: 'Preferences updated successfully' })
  } catch (error) {
    await client.query('ROLLBACK')
    throw new AppError('Failed to update preferences', 500)
  } finally {
    client.release()
  }
})

// POST /api/notifications/push/subscribe - Subscribe to push notifications
router.post('/push/subscribe', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { deviceId, pushToken, deviceType, deviceName } = req.body
    
    // Update or create device with push token
    await pool.query(
      `UPDATE user_devices 
       SET push_token = $1, push_enabled = true, updated_at = NOW()
       WHERE user_id = $2 AND device_id = $3`,
      [pushToken, userId, deviceId]
    )
    
    // If no rows updated, create device
    await pool.query(
      `INSERT INTO user_devices (user_id, device_id, device_type, device_name, push_token, push_enabled)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (user_id, device_id) 
       DO UPDATE SET push_token = EXCLUDED.push_token, push_enabled = true`,
      [userId, deviceId, deviceType, deviceName, pushToken]
    )
    
    res.json({ message: 'Push notifications enabled' })
  } catch (error) {
    throw new AppError('Failed to subscribe', 500)
  }
})

// POST /api/notifications/push/unsubscribe - Unsubscribe from push
router.post('/push/unsubscribe', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { deviceId } = req.body
    
    await pool.query(
      `UPDATE user_devices SET push_enabled = false, push_token = null WHERE user_id = $1 AND device_id = $2`,
      [userId, deviceId]
    )
    
    res.json({ message: 'Push notifications disabled' })
  } catch (error) {
    throw new AppError('Failed to unsubscribe', 500)
  }
})

// ============================================
// Back-in-Stock Alerts API
// ============================================

// GET /api/notifications/back-in-stock - Get user's back-in-stock alerts
router.get('/back-in-stock', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    
    const result = await pool.query(
      `SELECT bis.*,
        p.name as product_name, p.slug, 
        pv.variant_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image,
        (SELECT CASE WHEN quantity_available > 0 THEN true ELSE false END 
         FROM product_variants WHERE id = bis.variant_id) as is_in_stock
      FROM back_in_stock_alerts bis
      JOIN products p ON p.id = bis.product_id
      LEFT JOIN product_variants pv ON pv.id = bis.variant_id
      WHERE bis.user_id = $1 AND bis.is_active = true
      ORDER BY bis.created_at DESC`,
      [userId]
    )
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch alerts', 500)
  }
})

// POST /api/notifications/back-in-stock - Create back-in-stock alert
router.post('/back-in-stock', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { productId, variantId, email } = req.body
    
    // Get user's email if not provided
    let alertEmail = email
    if (!alertEmail) {
      const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId])
      alertEmail = userResult.rows[0]?.email
    }
    
    const result = await pool.query(
      `INSERT INTO back_in_stock_alerts (user_id, product_id, variant_id, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, product_id, variant_id)
       DO UPDATE SET is_active = true, email = EXCLUDED.email, created_at = NOW()
       RETURNING *`,
      [userId, productId, variantId || null, alertEmail]
    )
    
    res.status(201).json({
      message: 'You will be notified when this item is back in stock',
      data: result.rows[0]
    })
  } catch (error) {
    throw new AppError('Failed to create alert', 500)
  }
})

// DELETE /api/notifications/back-in-stock/:id - Remove alert
router.delete('/back-in-stock/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    
    await pool.query(
      `DELETE FROM back_in_stock_alerts WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    
    res.json({ message: 'Alert removed' })
  } catch (error) {
    throw new AppError('Failed to remove alert', 500)
  }
})

// ============================================
// Admin Notification Management
// ============================================

// POST /api/notifications/admin/broadcast - Send broadcast notification (admin only)
router.post('/admin/broadcast', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { target, segment, title, message, channels, scheduledFor } = req.body
    
    // TODO: Create broadcast job
    // - Target: 'all', 'customers', 'sellers', 'segment'
    // - Channels: ['email', 'sms', 'push', 'in_app']
    // - Schedule immediately or for later
    
    res.json({ message: 'Broadcast scheduled' })
  } catch (error) {
    throw new AppError('Failed to schedule broadcast', 500)
  }
})

// GET /api/notifications/admin/broadcasts - Get broadcast history
router.get('/admin/broadcasts', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Return broadcast history with stats
    res.json({ data: [] })
  } catch (error) {
    throw new AppError('Failed to fetch broadcasts', 500)
  }
})

export default router
