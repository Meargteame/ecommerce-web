import pool from '../config/database'
import { cache } from '../config/redis'
import crypto from 'crypto'

interface CreatePromotionDTO {
  code: string
  name: string
  description?: string
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping'
  discountValue: number
  minPurchaseAmount?: number
  maxDiscountAmount?: number
  usageLimit?: number
  perUserLimit?: number
  startDate: Date
  endDate: Date
}

interface UpdatePromotionDTO {
  name?: string
  description?: string
  discountValue?: number
  minPurchaseAmount?: number
  maxDiscountAmount?: number
  usageLimit?: number
  perUserLimit?: number
  startDate?: Date
  endDate?: Date
  isActive?: boolean
}

interface Promotion {
  id: string
  code: string
  name: string
  description?: string
  discountType: string
  discountValue: number
  minPurchaseAmount: number
  maxDiscountAmount?: number
  usageLimit?: number
  usageCount: number
  perUserLimit: number
  startDate: Date
  endDate: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface CouponValidation {
  valid: boolean
  message?: string
  discount?: number
  promotion?: Promotion
}

interface Discount {
  promotionId: string
  code: string
  discountType: string
  discountAmount: number
  originalTotal: number
  finalTotal: number
}

export class PromotionService {
  async createPromotion(data: CreatePromotionDTO): Promise<Promotion> {
    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO promotions (
        id, code, name, description, discount_type, discount_value,
        min_purchase_amount, max_discount_amount, usage_limit, per_user_limit,
        start_date, end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.code.toUpperCase(),
        data.name,
        data.description || null,
        data.discountType,
        data.discountValue,
        data.minPurchaseAmount || 0,
        data.maxDiscountAmount || null,
        data.usageLimit || null,
        data.perUserLimit || 1,
        data.startDate,
        data.endDate,
      ]
    )

    const promotion = await this.getPromotion(id)
    if (!promotion) throw new Error('Failed to create promotion')

    // Clear cache
    await this.clearPromotionCache()

    return promotion
  }

  async updatePromotion(id: string, data: UpdatePromotionDTO): Promise<Promotion> {
    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }

    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description)
    }

    if (data.discountValue !== undefined) {
      updates.push('discount_value = ?')
      values.push(data.discountValue)
    }

    if (data.minPurchaseAmount !== undefined) {
      updates.push('min_purchase_amount = ?')
      values.push(data.minPurchaseAmount)
    }

    if (data.maxDiscountAmount !== undefined) {
      updates.push('max_discount_amount = ?')
      values.push(data.maxDiscountAmount)
    }

    if (data.usageLimit !== undefined) {
      updates.push('usage_limit = ?')
      values.push(data.usageLimit)
    }

    if (data.perUserLimit !== undefined) {
      updates.push('per_user_limit = ?')
      values.push(data.perUserLimit)
    }

    if (data.startDate !== undefined) {
      updates.push('start_date = ?')
      values.push(data.startDate)
    }

    if (data.endDate !== undefined) {
      updates.push('end_date = ?')
      values.push(data.endDate)
    }

    if (data.isActive !== undefined) {
      updates.push('is_active = ?')
      values.push(data.isActive)
    }

    if (updates.length === 0) {
      throw new Error('No fields to update')
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const result = await pool.query(
      `UPDATE promotions SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    if ((result as any).affectedRows === 0) {
      throw new Error('Promotion not found')
    }

    const promotion = await this.getPromotion(id)
    if (!promotion) throw new Error('Promotion not found after update')

    // Clear cache
    await this.clearPromotionCache()

    return promotion
  }

  async deletePromotion(id: string): Promise<void> {
    const result = await pool.query('DELETE FROM promotions WHERE id = ?', [id])

    if ((result as any).affectedRows === 0) {
      throw new Error('Promotion not found')
    }

    // Clear cache
    await this.clearPromotionCache()
  }

  async getPromotion(id: string): Promise<Promotion | null> {
    const result = await pool.query('SELECT * FROM promotions WHERE id = ?', [id])

    if (result.rows.length === 0) {
      return null
    }

    return this.mapPromotion(result.rows[0])
  }

  async getPromotionByCode(code: string): Promise<Promotion | null> {
    // Try cache first
    const cacheKey = `promotion:${code.toUpperCase()}`
    const cached = await cache.get(cacheKey)

    if (cached) {
      return JSON.parse(cached)
    }

    const result = await pool.query('SELECT * FROM promotions WHERE code = ?', [
      code.toUpperCase(),
    ])

    if (result.rows.length === 0) {
      return null
    }

    const promotion = this.mapPromotion(result.rows[0])

    // Cache for 1 hour
    await cache.set(cacheKey, 3600, JSON.stringify(promotion))

    return promotion
  }

  async getActivePromotions(): Promise<Promotion[]> {
    // Try cache first
    const cacheKey = 'promotions:active'
    const cached = await cache.get(cacheKey)

    if (cached) {
      return JSON.parse(cached)
    }

    const result = await pool.query(
      `SELECT * FROM promotions
       WHERE is_active = true
       AND start_date <= CURRENT_TIMESTAMP
       AND end_date >= CURRENT_TIMESTAMP
       ORDER BY created_at DESC`
    )

    const promotions = result.rows.map((row: any) => this.mapPromotion(row))

    // Cache for 10 minutes
    await cache.set(cacheKey, 600, JSON.stringify(promotions))

    return promotions
  }

  async getAllPromotions(): Promise<Promotion[]> {
    const result = await pool.query('SELECT * FROM promotions ORDER BY created_at DESC')
    return result.rows.map((row: any) => this.mapPromotion(row))
  }

  async validateCoupon(
    code: string,
    cartTotal: number,
    userId?: string
  ): Promise<CouponValidation> {
    const promotion = await this.getPromotionByCode(code)

    if (!promotion) {
      return {
        valid: false,
        message: 'Invalid coupon code',
      }
    }

    // Check if active
    if (!promotion.isActive) {
      return {
        valid: false,
        message: 'This coupon is no longer active',
      }
    }

    // Check date range
    const now = new Date()
    if (now < promotion.startDate) {
      return {
        valid: false,
        message: 'This coupon is not yet valid',
      }
    }

    if (now > promotion.endDate) {
      return {
        valid: false,
        message: 'This coupon has expired',
      }
    }

    // Check usage limit
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      return {
        valid: false,
        message: 'This coupon has reached its usage limit',
      }
    }

    // Check per-user limit
    if (userId) {
      const userUsageResult = await pool.query(
        `SELECT COUNT(*) as count FROM orders
         WHERE user_id = ?
         AND id IN (
           SELECT order_id FROM carts WHERE promotion_id = ?
         )`,
        [userId, promotion.id]
      )

      const userUsageCount = parseInt(userUsageResult.rows[0].count)

      if (userUsageCount >= promotion.perUserLimit) {
        return {
          valid: false,
          message: 'You have already used this coupon the maximum number of times',
        }
      }
    }

    // Check minimum purchase amount
    if (cartTotal < promotion.minPurchaseAmount) {
      return {
        valid: false,
        message: `Minimum purchase amount of $${promotion.minPurchaseAmount.toFixed(2)} required`,
      }
    }

    // Calculate discount
    const discount = this.calculateDiscount(promotion, cartTotal)

    return {
      valid: true,
      discount,
      promotion,
    }
  }

  async applyCoupon(userId: string, code: string, cartTotal: number): Promise<Discount> {
    const validation = await this.validateCoupon(code, cartTotal, userId)

    if (!validation.valid) {
      throw new Error(validation.message || 'Invalid coupon')
    }

    const discount = validation.discount!
    const promotion = validation.promotion!

    return {
      promotionId: promotion.id,
      code: promotion.code,
      discountType: promotion.discountType,
      discountAmount: discount,
      originalTotal: cartTotal,
      finalTotal: Math.max(0, cartTotal - discount),
    }
  }

  async incrementUsageCount(promotionId: string): Promise<void> {
    await pool.query(
      'UPDATE promotions SET usage_count = usage_count + 1 WHERE id = ?',
      [promotionId]
)

    // Clear cache
    await this.clearPromotionCache()
  }

  private calculateDiscount(promotion: Promotion, cartTotal: number): number {
    let discount = 0

    if (promotion.discountType === 'percentage') {
      discount = (cartTotal * promotion.discountValue) / 100
    } else if (promotion.discountType === 'fixed_amount') {
      discount = promotion.discountValue
    } else if (promotion.discountType === 'free_shipping') {
      // Free shipping discount would be calculated based on shipping cost
      // For now, return 0 as shipping cost is calculated separately
      discount = 0
    }

    // Apply max discount limit if set
    if (promotion.maxDiscountAmount && discount > promotion.maxDiscountAmount) {
      discount = promotion.maxDiscountAmount
    }

    // Ensure discount doesn't exceed cart total
    if (discount > cartTotal) {
      discount = cartTotal
    }

    return Math.round(discount * 100) / 100
  }

  private async clearPromotionCache(): Promise<void> {
    await cache.del('promotions:active')
  }

  private mapPromotion(row: any): Promotion {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      discountType: row.discount_type,
      discountValue: parseFloat(row.discount_value),
      minPurchaseAmount: parseFloat(row.min_purchase_amount),
      maxDiscountAmount: row.max_discount_amount ? parseFloat(row.max_discount_amount) : undefined,
      usageLimit: row.usage_limit,
      usageCount: row.usage_count,
      perUserLimit: row.per_user_limit,
      startDate: row.start_date,
      endDate: row.end_date,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

export default new PromotionService()
