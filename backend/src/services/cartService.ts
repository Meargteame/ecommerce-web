import pool from '../config/database'
import { cache } from '../config/redis'

interface CartItem {
  productId: string
  variantId?: string
  quantity: number
}

interface CartItemResponse extends CartItem {
  id: string
  product: {
    name: string
    slug: string
    basePrice: number
    imageUrl?: string
    status: string
  }
  variant?: {
    sku: string
    variantName: string
    priceAdjustment: number
    stockQuantity: number
  }
  unitPrice: number
  subtotal: number
}

interface Cart {
  userId: string
  items: CartItemResponse[]
  subtotal: number
  itemCount: number
}

export class CartService {
  private readonly CART_CACHE_TTL = 3600 // 1 hour

  private getCartCacheKey(userId: string): string {
    return `cart:${userId}`
  }

  async getCart(userId: string): Promise<Cart> {
    // Try cache first
    const cacheKey = this.getCartCacheKey(userId)
    const cached = await cache.get(cacheKey)

    if (cached) {
      return JSON.parse(cached)
    }

    // Get from database
    const result = await pool.query(
      `SELECT ci.id, ci.product_id, ci.variant_id, ci.quantity,
              p.name, p.slug, p.base_price, p.status as product_status,
              pv.sku, pv.variant_name, pv.price_adjustment, pv.stock_quantity,
              (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) as image_url,
              u.account_status as seller_status
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       JOIN users u ON u.id = p.seller_id
       LEFT JOIN product_variants pv ON ci.variant_id = pv.id
       WHERE ci.user_id = ?`,
      [userId]
    )

    const items: CartItemResponse[] = result.rows.map((row: any) => {
      const basePrice = parseFloat(row.base_price)
      const priceAdjustment = row.price_adjustment ? parseFloat(row.price_adjustment) : 0
      const unitPrice = basePrice + priceAdjustment

      return {
        id: row.id,
        productId: row.product_id,
        variantId: row.variant_id,
        quantity: row.quantity,
        product: {
          name: row.name,
          slug: row.slug,
          basePrice,
          imageUrl: row.image_url,
          status: row.seller_status === 'active' ? row.product_status : 'unavailable',
        },
        variant: row.variant_id
          ? {
              sku: row.sku,
              variantName: row.variant_name,
              priceAdjustment,
              stockQuantity: row.stock_quantity,
            }
          : undefined,
        unitPrice,
        subtotal: unitPrice * row.quantity,
      }
    })

    const cart: Cart = {
      userId,
      items,
      subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    }

    // Cache the cart
    await cache.set(cacheKey, this.CART_CACHE_TTL, JSON.stringify(cart))

    return cart
  }

  async addItem(userId: string, item: CartItem): Promise<Cart> {
    const { productId, variantId, quantity } = item

    // Validate product exists and is published
    const productCheck = await pool.query(
      'SELECT p.id, p.status, u.account_status FROM products p JOIN users u ON u.id = p.seller_id WHERE p.id = ?',
      [productId]
    )

    if (productCheck.rows.length === 0) {
      throw new Error('Product not found')
    }

    if (productCheck.rows[0].status !== 'published' || productCheck.rows[0].account_status !== 'active') {
      throw new Error('Product is not available')
    }

    // If variant specified, validate it exists and has stock
    if (variantId) {
      const variantCheck = await pool.query(
        'SELECT stock_quantity FROM product_variants WHERE id = ? AND product_id = ?',
        [variantId, productId]
      )

      if (variantCheck.rows.length === 0) {
        throw new Error('Product variant not found')
      }

      if (variantCheck.rows[0].stock_quantity < quantity) {
        throw new Error('Insufficient stock')
      }
    }

    // Check if item already exists in cart
    const existingResult = await pool.query(
      `SELECT id, quantity FROM cart_items 
       WHERE user_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))`,
      [userId, productId, variantId || null, variantId || null]
    )

    if (existingResult.rows.length > 0) {
      // Update quantity
      const newQuantity = existingResult.rows[0].quantity + quantity
      await pool.query(
        'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newQuantity, existingResult.rows[0].id]
      )
    } else {
      // Add new item
      const { id = require('crypto').randomUUID() } = item as any
      await pool.query(
        'INSERT INTO cart_items (id, user_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?, ?)',
        [id, userId, productId, variantId || null, quantity]
      )
    }

    // Invalidate cache
    await cache.del(this.getCartCacheKey(userId))

    return this.getCart(userId)
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number): Promise<Cart> {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0')
    }

    // Verify item belongs to user
    const itemCheck = await pool.query(
      `SELECT ci.id, ci.variant_id, pv.stock_quantity
       FROM cart_items ci
       LEFT JOIN product_variants pv ON ci.variant_id = pv.id
       WHERE ci.id = ? AND ci.user_id = ?`,
      [itemId, userId]
    )

    if (itemCheck.rows.length === 0) {
      throw new Error('Cart item not found')
    }

    // Check stock if variant exists
    if (itemCheck.rows[0].variant_id && itemCheck.rows[0].stock_quantity < quantity) {
      throw new Error('Insufficient stock')
    }

    await pool.query(
      'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [quantity, itemId]
    )

    // Invalidate cache
    await cache.del(this.getCartCacheKey(userId))

    return this.getCart(userId)
  }

  async removeItem(userId: string, itemId: string): Promise<Cart> {
    const result = await pool.query(
      'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
      [itemId, userId]
    )

    if ((result as any).affectedRows === 0) {
      throw new Error('Cart item not found')
    }

    // Invalidate cache
    await cache.del(this.getCartCacheKey(userId))

    return this.getCart(userId)
  }

  async clearCart(userId: string): Promise<void> {
    await pool.query('DELETE FROM cart_items WHERE user_id = ?', [userId])

    // Invalidate cache
    await cache.del(this.getCartCacheKey(userId))
  }

  async saveForLater(userId: string, itemId: string): Promise<Cart> {
    // Verify item belongs to user
    const itemCheck = await pool.query(
      'SELECT product_id FROM cart_items WHERE id = ? AND user_id = ?',
      [itemId, userId]
    )

    if (itemCheck.rows.length === 0) {
      throw new Error('Cart item not found')
    }

    const { product_id } = itemCheck.rows[0]

    // Check if already in wishlist
    const wishlistCheck = await pool.query(
      'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    )

    if (wishlistCheck.rows.length === 0) {
      // Add to wishlist
      await pool.query(
        'INSERT INTO wishlists (id, user_id, product_id) VALUES (?, ?, ?)',
        [require('crypto').randomUUID(), userId, product_id]
      )
    }

    // Remove from cart
    await pool.query('DELETE FROM cart_items WHERE id = ?', [itemId])

    // Invalidate cache
    await cache.del(this.getCartCacheKey(userId))

    return this.getCart(userId)
  }

  async checkAvailability(userId: string): Promise<{ available: boolean; unavailableItems: string[] }> {
    const cart = await this.getCart(userId)
    const unavailableItems: string[] = []

    for (const item of cart.items) {
      // Check if product is still published
      if (item.product.status !== 'published') {
        unavailableItems.push(item.product.name)
        continue
      }

      // Check stock for variants
      if (item.variant && item.variant.stockQuantity < item.quantity) {
        unavailableItems.push(`${item.product.name} (${item.variant.variantName})`)
      }
    }

    return {
      available: unavailableItems.length === 0,
      unavailableItems,
    }
  }

  async validateCart(userId: string): Promise<{ valid: boolean; errors: string[] }> {
    const cart = await this.getCart(userId)
    const errors: string[] = []

    if (cart.items.length === 0) {
      errors.push('Cart is empty')
    }

    for (const item of cart.items) {
      // Check if product is still published
      if (item.product.status !== 'published') {
        errors.push(`${item.product.name} is no longer available`)
      }

      // Check stock for variants
      if (item.variant && item.variant.stockQuantity < item.quantity) {
        errors.push(`Insufficient stock for ${item.product.name} (${item.variant.variantName})`)
      }

      // Check quantity is valid
      if (item.quantity <= 0) {
        errors.push(`Invalid quantity for ${item.product.name}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export default new CartService()
