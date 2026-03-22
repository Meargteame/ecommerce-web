import { Router, Response } from 'express'
import { AuthRequest, authenticate } from '../middleware/auth'
import pool from '../config/database'
import { AppError } from '../middleware/errorHandler'

const router = Router()

// GET /api/payment-methods
router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.userId
    
    const result = await pool.query(
      `SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`,
      [userId]
    )
    
    res.json({ data: result.rows })
  } catch (error) {
    next(new AppError('Failed to fetch payment methods', 500))
  }
})

// POST /api/payment-methods
router.post('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.userId
    const { type, provider, providerToken, lastFour, brand, expiryMonth, expiryYear, holderName, isDefault, billingAddressId } = req.body
    
    const client = await pool.getConnection()
    
    try {
      await client.beginTransaction()
      
      if (isDefault) {
        await client.query(
          `UPDATE payment_methods SET is_default = false WHERE user_id = ?`,
          [userId]
        )
      }
      
      const id = (await import('crypto')).randomUUID()
      await client.query(
        `INSERT INTO payment_methods 
         (id, user_id, type, provider, provider_token, last_four, brand, expiry_month, expiry_year, holder_name, is_default, billing_address_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, type, provider, providerToken, lastFour, brand, expiryMonth, expiryYear, holderName, isDefault || false, billingAddressId]
      )
      
      await client.commit()
      
      const result = await client.query('SELECT * FROM payment_methods WHERE id = ?', [id])
      
      res.status(201).json({
        message: 'Payment method added successfully',
        data: result.rows[0]
      })
    } catch (e) {
      await client.rollback()
      throw e
    } finally {
      client.release()
    }
  } catch (error) {
    next(new AppError('Failed to add payment method', 500))
  }
})

// DELETE /api/payment-methods/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    
    const result = await pool.query(
      `DELETE FROM payment_methods WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    
    if (result.rowCount === 0) {
       return next(new AppError('Payment method not found', 404))
    }
    
    res.json({ message: 'Payment method removed' })
  } catch (error) {
    next(new AppError('Failed to remove payment method', 500))
  }
})

export default router;
