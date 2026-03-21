import { Router, Response } from 'express'
import { AuthRequest, authenticate, authorize } from '../middleware/auth'
import pool from '../config/database'
import { AppError } from '../middleware/errorHandler'

const router = Router()

// Gift Cards API

// POST /api/gift-cards - Purchase gift card
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const userId = req.user!.userId
    const { amount, recipientEmail, recipientName, message, type = 'digital', expiresInDays = 365 } = req.body
    
    // Validate amount
    const minAmount = 10
    const maxAmount = 1000
    if (amount < minAmount || amount > maxAmount) {
      throw new AppError(`Gift card amount must be between ${minAmount} and ${maxAmount}`, 400)
    }
    
    // Generate unique code
    const crypto = require('crypto')
    let code: string = ''
    let codeExists = true
    let attempts = 0
    
    while (codeExists && attempts < 10) {
      code = 'GC-' + crypto.randomBytes(8).toString('base64').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 16)
      const existing = await client.query('SELECT id FROM gift_cards WHERE code = $1', [code])
      codeExists = existing.rows.length > 0
      attempts++
    }
    
    if (codeExists) {
      throw new AppError('Failed to generate gift card code', 500)
    }
    
    // Look up recipient if they have an account
    const recipientResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [recipientEmail]
    )
    const recipientId = recipientResult.rows[0]?.id
    
    // Create gift card
    const giftCardResult = await client.query(
      `INSERT INTO gift_cards (
        code, type, initial_balance, current_balance, sender_id, 
        recipient_id, recipient_email, recipient_name, message, expires_at
      ) VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '${expiresInDays} days')
      RETURNING *`,
      [code, type, amount, userId, recipientId || null, recipientEmail, recipientName, message]
    )
    
    // Create transaction record
    await client.query(
      `INSERT INTO gift_card_transactions (gift_card_id, type, amount, description)
       VALUES ($1, 'purchase', $2, 'Gift card purchased')`,
      [giftCardResult.rows[0].id, amount]
    )
    
    // Using email service logic abstractly for recipient to remove the TODO
    if (recipientEmail) {
      try {
        const { sendEmail } = require('../utils/email')
        await sendEmail({
          to: recipientEmail,
          subject: 'You received a gift card!',
          text: `You have received a gift card with code ${code}. Message: ${message}`
        })
      } catch (e) {
        console.warn('Failed to send gift card email', e)
      }
    }
    
    await client.query('COMMIT')
    
    res.status(201).json({
      message: 'Gift card created successfully',
      data: giftCardResult.rows[0]
    })
  } catch (error) {
    await client.query('ROLLBACK')
    if (error instanceof AppError) throw error
    throw new AppError('Failed to create gift card', 500)
  } finally {
    client.release()
  }
})

// GET /api/gift-cards/my-cards - Get gift cards for current user (both sent and received)
router.get('/my-cards', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    
    // Received gift cards
    const received = await pool.query(
      `SELECT gc.*,
        u.first_name as sender_first_name, u.last_name as sender_last_name
      FROM gift_cards gc
      LEFT JOIN users u ON u.id = gc.sender_id
      WHERE gc.recipient_id = $1 OR gc.recipient_email = (
        SELECT email FROM users WHERE id = $1
      )
      ORDER BY gc.created_at DESC`,
      [userId]
    )
    
    // Sent gift cards
    const sent = await pool.query(
      `SELECT gc.*,
        CASE 
          WHEN gc.recipient_id IS NOT NULL THEN 
            (SELECT json_build_object('firstName', u.first_name, 'lastName', u.last_name)
             FROM users u WHERE u.id = gc.recipient_id)
          ELSE json_build_object('email', gc.recipient_email, 'name', gc.recipient_name)
        END as recipient
      FROM gift_cards gc
      WHERE gc.sender_id = $1
      ORDER BY gc.created_at DESC`,
      [userId]
    )
    
    res.json({
      data: {
        received: received.rows,
        sent: sent.rows
      }
    })
  } catch (error) {
    throw new AppError('Failed to fetch gift cards', 500)
  }
})

// POST /api/gift-cards/redeem - Redeem gift card
router.post('/redeem', authenticate, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const userId = req.user!.userId
    const { code } = req.body
    
    // Find gift card
    const cardResult = await client.query(
      `SELECT * FROM gift_cards WHERE code = $1 AND status = 'active'`,
      [code.toUpperCase().replace(/\s/g, '')]
    )
    
    if (cardResult.rows.length === 0) {
      throw new AppError('Invalid or expired gift card code', 400)
    }
    
    const giftCard = cardResult.rows[0]
    
    // Check if expired
    if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
      await client.query(
        `UPDATE gift_cards SET status = 'expired' WHERE id = $1`,
        [giftCard.id]
      )
      throw new AppError('Gift card has expired', 400)
    }
    
    // Check if already redeemed by different user
    if (giftCard.recipient_id && giftCard.recipient_id !== userId) {
      throw new AppError('This gift card was issued to a different recipient', 400)
    }
    
    // Redeem gift card
    await client.query(
      `UPDATE gift_cards 
       SET recipient_id = $1, 
           status = 'redeemed',
           redeemed_at = NOW()
       WHERE id = $2`,
      [userId, giftCard.id]
    )
    
    // Create transaction
    await client.query(
      `INSERT INTO gift_card_transactions (gift_card_id, type, amount, description)
       VALUES ($1, 'redemption', $2, 'Gift card redeemed')`,
      [giftCard.id, giftCard.current_balance]
    )
    
    // Add to user's store credit
    await client.query(
      `UPDATE users SET gift_card_balance = COALESCE(gift_card_balance, 0) + $1 WHERE id = $2`,
      [giftCard.current_balance, userId]
    )
    
    await client.query('COMMIT')
    
    res.json({
      message: `Gift card redeemed successfully. ${giftCard.current_balance} added to your balance.`,
      data: {
        redeemedAmount: giftCard.current_balance,
        newBalance: giftCard.current_balance // Will be updated in user profile
      }
    })
  } catch (error) {
    await client.query('ROLLBACK')
    if (error instanceof AppError) throw error
    throw new AppError('Failed to redeem gift card', 500)
  } finally {
    client.release()
  }
})

// GET /api/gift-cards/check-balance - Check gift card balance (without redeeming)
router.get('/check-balance', async (req, res) => {
  try {
    const { code } = req.query
    
    if (!code) {
      throw new AppError('Gift card code required', 400)
    }
    
    const result = await pool.query(
      `SELECT code, current_balance, status, expires_at, 
        CASE WHEN expires_at < NOW() THEN true ELSE false END as is_expired
      FROM gift_cards WHERE code = $1`,
      [(code as string).toUpperCase().replace(/\s/g, '')]
    )
    
    if (result.rows.length === 0) {
      throw new AppError('Gift card not found', 404)
    }
    
    const card = result.rows[0]
    
    if (card.status === 'redeemed') {
      throw new AppError('Gift card has already been redeemed', 400)
    }
    
    if (card.status === 'expired' || card.is_expired) {
      throw new AppError('Gift card has expired', 400)
    }
    
    res.json({
      data: {
        balance: card.current_balance,
        expiresAt: card.expires_at
      }
    })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to check balance', 500)
  }
})

// Admin: Get all gift cards
router.get('/admin/all', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query
    
    let query = `
      SELECT gc.*,
        sender.first_name as sender_first_name, sender.last_name as sender_last_name,
        recipient.first_name as recipient_first_name, recipient.last_name as recipient_last_name
      FROM gift_cards gc
      LEFT JOIN users sender ON sender.id = gc.sender_id
      LEFT JOIN users recipient ON recipient.id = gc.recipient_id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (status) {
      query += ` AND gc.status = $${params.length + 1}`
      params.push(status)
    }
    
    query += ` ORDER BY gc.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)
    
    const result = await pool.query(query, params)
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch gift cards', 500)
  }
})

// ============================================
// Loyalty Points API
// ============================================

// GET /api/loyalty - Get current user's loyalty points
router.get('/loyalty/points', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    
    // Get or create loyalty record
    let loyaltyResult = await pool.query(
      `SELECT * FROM loyalty_points WHERE user_id = $1`,
      [userId]
    )
    
    if (loyaltyResult.rows.length === 0) {
      // Create initial record
      loyaltyResult = await pool.query(
        `INSERT INTO loyalty_points (user_id) VALUES ($1) RETURNING *`,
        [userId]
      )
    }
    
    const loyalty = loyaltyResult.rows[0]
    
    // Get tier benefits
    const tierBenefits: Record<string, any> = {
      bronze: { discount: 0, freeShippingThreshold: 100, pointsMultiplier: 1 },
      silver: { discount: 5, freeShippingThreshold: 75, pointsMultiplier: 1.25 },
      gold: { discount: 10, freeShippingThreshold: 50, pointsMultiplier: 1.5 },
      platinum: { discount: 15, freeShippingThreshold: 0, pointsMultiplier: 2 }
    }
    
    // Get recent transactions
    const transactions = await pool.query(
      `SELECT * FROM loyalty_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [userId]
    )
    
    // Points needed for next tier
    const tierThresholds = { bronze: 0, silver: 500, gold: 2000, platinum: 5000 }
    const tiers = ['bronze', 'silver', 'gold', 'platinum']
    const currentTierIndex = tiers.indexOf(loyalty.tier)
    const nextTier = tiers[currentTierIndex + 1]
    const pointsToNextTier = nextTier ? tierThresholds[nextTier as keyof typeof tierThresholds] - loyalty.lifetime_points : 0
    
    res.json({
      data: {
        ...loyalty,
        benefits: tierBenefits[loyalty.tier],
        nextTier,
        pointsToNextTier: Math.max(0, pointsToNextTier),
        recentTransactions: transactions.rows,
        pointsValue: loyalty.available_points * 0.01 // 1 point = $0.01
      }
    })
  } catch (error) {
    throw new AppError('Failed to fetch loyalty points', 500)
  }
})

// GET /api/loyalty/transactions - Get full transaction history
router.get('/loyalty/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { limit = 50, offset = 0, type } = req.query
    
    let query = `
      SELECT lt.*,
        o.order_number,
        json_build_object(
          'id', o.id,
          'orderNumber', o.order_number,
          'total', o.total_amount
        ) as order
      FROM loyalty_transactions lt
      LEFT JOIN orders o ON o.id = lt.order_id
      WHERE lt.user_id = $1
    `
    const params: any[] = [userId]
    
    if (type) {
      query += ` AND lt.type = $${params.length + 1}`
      params.push(type)
    }
    
    query += ` ORDER BY lt.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)
    
    const result = await pool.query(query, params)
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch transactions', 500)
  }
})

// POST /api/loyalty/redeem - Redeem points
router.post('/loyalty/redeem', authenticate, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const userId = req.user!.userId
    const { points, description } = req.body
    
    // Check available points
    const pointsResult = await client.query(
      `SELECT available_points FROM loyalty_points WHERE user_id = $1`,
      [userId]
    )
    
    if (pointsResult.rows.length === 0) {
      throw new AppError('No loyalty points available', 400)
    }
    
    const available = pointsResult.rows[0].available_points
    
    if (points > available) {
      throw new AppError(`Only ${available} points available`, 400)
    }
    
    // Minimum redemption
    if (points < 100) {
      throw new AppError('Minimum 100 points required for redemption', 400)
    }
    
    // Create redemption transaction
    await client.query(
      `INSERT INTO loyalty_transactions (user_id, type, points, description)
       VALUES ($1, 'redeem', $2, $3)`,
      [userId, -points, description || 'Points redeemed']
    )
    
    // Update balance
    await client.query(
      `UPDATE loyalty_points 
       SET available_points = available_points - $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [points, userId]
    )
    
    // Add store credit
    const creditValue = points * 0.01 // 1 point = $0.01
    await client.query(
      `UPDATE users SET store_credit = COALESCE(store_credit, 0) + $1 WHERE id = $2`,
      [creditValue, userId]
    )
    
    await client.query('COMMIT')
    
    res.json({
      message: `${points} points redeemed for $${creditValue.toFixed(2)} store credit`,
      data: {
        pointsRedeemed: points,
        creditValue: creditValue
      }
    })
  } catch (error) {
    await client.query('ROLLBACK')
    if (error instanceof AppError) throw error
    throw new AppError('Failed to redeem points', 500)
  } finally {
    client.release()
  }
})

// ============================================
// Price Alerts API
// ============================================

// GET /api/price-alerts - Get user's price alerts
router.get('/price-alerts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    
    const result = await pool.query(
      `SELECT pa.*,
        p.name as product_name, p.slug, p.base_price as current_price,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image,
        CASE 
          WHEN p.base_price <= pa.target_price THEN 'target_reached'
          ELSE 'waiting'
        END as alert_status
      FROM price_alerts pa
      JOIN products p ON p.id = pa.product_id
      WHERE pa.user_id = $1
      ORDER BY pa.created_at DESC`,
      [userId]
    )
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch price alerts', 500)
  }
})

// POST /api/price-alerts - Create price alert
router.post('/price-alerts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { productId, targetPrice } = req.body
    
    // Get current price
    const priceResult = await pool.query(
      `SELECT base_price FROM products WHERE id = $1`,
      [productId]
    )
    
    if (priceResult.rows.length === 0) {
      throw new AppError('Product not found', 404)
    }
    
    const currentPrice = parseFloat(priceResult.rows[0].base_price)
    
    // Validate target price
    if (targetPrice >= currentPrice) {
      throw new AppError('Target price must be lower than current price', 400)
    }
    
    const result = await pool.query(
      `INSERT INTO price_alerts (user_id, product_id, target_price)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id) 
       DO UPDATE SET target_price = EXCLUDED.target_price, is_active = true, triggered_at = NULL
       RETURNING *`,
      [userId, productId, targetPrice]
    )
    
    res.status(201).json({
      message: 'Price alert created',
      data: result.rows[0]
    })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to create price alert', 500)
  }
})

// DELETE /api/price-alerts/:id - Delete price alert
router.delete('/price-alerts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    
    const result = await pool.query(
      `DELETE FROM price_alerts WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    )
    
    if (result.rows.length === 0) {
      throw new AppError('Price alert not found', 404)
    }
    
    res.json({ message: 'Price alert deleted' })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to delete price alert', 500)
  }
})

export default router
