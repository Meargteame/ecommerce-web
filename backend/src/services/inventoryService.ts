import pool from '../config/database'

interface StockUpdate {
  sku: string
  quantity: number
  operation: 'set' | 'increment' | 'decrement'
}

interface CartItem {
  productId: string
  variantId?: string
  quantity: number
}

interface AvailabilityResult {
  available: boolean
  unavailableItems: Array<{
    productId: string
    variantId?: string
    requested: number
    available: number
  }>
}

interface LowStockItem {
  id: string
  productId: string
  sku: string
  variantName?: string
  productName: string
  stockQuantity: number
  lowStockThreshold: number
}

export class InventoryService {
  async getStock(sku: string): Promise<number> {
    const result = await pool.query(
      'SELECT stock_quantity FROM product_variants WHERE sku = $1',
      [sku]
    )

    if (result.rows.length === 0) {
      throw new Error('SKU not found')
    }

    return result.rows[0].stock_quantity
  }

  async updateStock(sku: string, quantity: number, operation: 'set' | 'increment' | 'decrement' = 'set'): Promise<void> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Get current stock
      const currentStock = await client.query(
        'SELECT stock_quantity FROM product_variants WHERE sku = $1 FOR UPDATE',
        [sku]
      )

      if (currentStock.rows.length === 0) {
        throw new Error('SKU not found')
      }

      let newQuantity: number

      switch (operation) {
        case 'set':
          newQuantity = quantity
          break
        case 'increment':
          newQuantity = currentStock.rows[0].stock_quantity + quantity
          break
        case 'decrement':
          newQuantity = currentStock.rows[0].stock_quantity - quantity
          if (newQuantity < 0) {
            throw new Error('Insufficient stock')
          }
          break
      }

      await client.query(
        'UPDATE product_variants SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE sku = $2',
        [newQuantity, sku]
      )

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async bulkUpdateStock(updates: StockUpdate[]): Promise<void> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      for (const update of updates) {
        await this.updateStock(update.sku, update.quantity, update.operation)
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async reserveStock(sku: string, quantity: number): Promise<boolean> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const result = await client.query(
        'SELECT stock_quantity FROM product_variants WHERE sku = $1 FOR UPDATE',
        [sku]
      )

      if (result.rows.length === 0) {
        await client.query('ROLLBACK')
        return false
      }

      const currentStock = result.rows[0].stock_quantity

      if (currentStock < quantity) {
        await client.query('ROLLBACK')
        return false
      }

      await client.query(
        'UPDATE product_variants SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE sku = $2',
        [quantity, sku]
      )

      await client.query('COMMIT')
      return true
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async releaseStock(sku: string, quantity: number): Promise<void> {
    await pool.query(
      'UPDATE product_variants SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE sku = $2',
      [quantity, sku]
    )
  }

  async checkAvailability(items: CartItem[]): Promise<AvailabilityResult> {
    const unavailableItems: AvailabilityResult['unavailableItems'] = []

    for (const item of items) {
      if (item.variantId) {
        const result = await pool.query(
          'SELECT sku, stock_quantity FROM product_variants WHERE id = $1',
          [item.variantId]
        )

        if (result.rows.length === 0) {
          unavailableItems.push({
            productId: item.productId,
            variantId: item.variantId,
            requested: item.quantity,
            available: 0,
          })
        } else if (result.rows[0].stock_quantity < item.quantity) {
          unavailableItems.push({
            productId: item.productId,
            variantId: item.variantId,
            requested: item.quantity,
            available: result.rows[0].stock_quantity,
          })
        }
      }
    }

    return {
      available: unavailableItems.length === 0,
      unavailableItems,
    }
  }

  async getLowStockItems(threshold?: number): Promise<LowStockItem[]> {
    const query = threshold
      ? `SELECT pv.id, pv.product_id, pv.sku, pv.variant_name, pv.stock_quantity, pv.low_stock_threshold,
                p.name as product_name
         FROM product_variants pv
         JOIN products p ON pv.product_id = p.id
         WHERE pv.stock_quantity <= $1
         ORDER BY pv.stock_quantity ASC`
      : `SELECT pv.id, pv.product_id, pv.sku, pv.variant_name, pv.stock_quantity, pv.low_stock_threshold,
                p.name as product_name
         FROM product_variants pv
         JOIN products p ON pv.product_id = p.id
         WHERE pv.stock_quantity <= pv.low_stock_threshold
         ORDER BY pv.stock_quantity ASC`

    const result = threshold
      ? await pool.query(query, [threshold])
      : await pool.query(query)

    return result.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      sku: row.sku,
      variantName: row.variant_name,
      productName: row.product_name,
      stockQuantity: row.stock_quantity,
      lowStockThreshold: row.low_stock_threshold,
    }))
  }

  async getOutOfStockItems(): Promise<LowStockItem[]> {
    const result = await pool.query(
      `SELECT pv.id, pv.product_id, pv.sku, pv.variant_name, pv.stock_quantity, pv.low_stock_threshold,
              p.name as product_name
       FROM product_variants pv
       JOIN products p ON pv.product_id = p.id
       WHERE pv.stock_quantity = 0
       ORDER BY pv.updated_at DESC`
    )

    return result.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      sku: row.sku,
      variantName: row.variant_name,
      productName: row.product_name,
      stockQuantity: row.stock_quantity,
      lowStockThreshold: row.low_stock_threshold,
    }))
  }

  async getInventoryStatus(): Promise<{
    totalProducts: number
    totalVariants: number
    lowStockCount: number
    outOfStockCount: number
    totalStockValue: number
  }> {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COUNT(pv.id) as total_variants,
        COUNT(CASE WHEN pv.stock_quantity <= pv.low_stock_threshold THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN pv.stock_quantity = 0 THEN 1 END) as out_of_stock_count,
        COALESCE(SUM((p.base_price + COALESCE(pv.price_adjustment, 0)) * pv.stock_quantity), 0) as total_stock_value
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE p.status = 'published'
    `)

    const row = result.rows[0]

    return {
      totalProducts: parseInt(row.total_products),
      totalVariants: parseInt(row.total_variants),
      lowStockCount: parseInt(row.low_stock_count),
      outOfStockCount: parseInt(row.out_of_stock_count),
      totalStockValue: parseFloat(row.total_stock_value),
    }
  }

  async reserveCartItems(items: CartItem[]): Promise<boolean> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      for (const item of items) {
        if (item.variantId) {
          const result = await client.query(
            'SELECT sku, stock_quantity FROM product_variants WHERE id = $1 FOR UPDATE',
            [item.variantId]
          )

          if (result.rows.length === 0 || result.rows[0].stock_quantity < item.quantity) {
            await client.query('ROLLBACK')
            return false
          }

          await client.query(
            'UPDATE product_variants SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [item.quantity, item.variantId]
          )
        }
      }

      await client.query('COMMIT')
      return true
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async releaseCartItems(items: CartItem[]): Promise<void> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      for (const item of items) {
        if (item.variantId) {
          await client.query(
            'UPDATE product_variants SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [item.quantity, item.variantId]
          )
        }
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}

export default new InventoryService()
