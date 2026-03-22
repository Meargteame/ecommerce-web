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
      'SELECT stock_quantity FROM product_variants WHERE sku = ?',
      [sku]
    )

    if (result.rows.length === 0) {
      throw new Error('SKU not found')
    }

    return result.rows[0].stock_quantity
  }

  async updateStock(sku: string, quantity: number, operation: 'set' | 'increment' | 'decrement' = 'set'): Promise<void> {
    const client = await pool.getConnection()

    try {
      await client.beginTransaction()

      // Get current stock
      const currentStockResult = await client.query(
        'SELECT stock_quantity FROM product_variants WHERE sku = ? FOR UPDATE',
        [sku]
      )
      const currentStock = currentStockResult[0] as any[]

      if (currentStock.length === 0) {
        throw new Error('SKU not found')
      }

      let newQuantity: number

      switch (operation) {
        case 'set':
          newQuantity = quantity
          break
        case 'increment':
          newQuantity = currentStock[0].stock_quantity + quantity
          break
        case 'decrement':
          newQuantity = currentStock[0].stock_quantity - quantity
          if (newQuantity < 0) {
            throw new Error('Insufficient stock')
          }
          break
        default:
          newQuantity = currentStock[0].stock_quantity
      }

      await client.query(
        'UPDATE product_variants SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE sku = ?',
        [newQuantity, sku]
      )

      await client.commit()
    } catch (error) {
      await client.rollback()
      throw error
    } finally {
      client.release()
    }
  }

  async bulkUpdateStock(updates: StockUpdate[]): Promise<void> {
    const client = await pool.getConnection()

    try {
      await client.beginTransaction()

      for (const update of updates) {
        // Reuse inner logic or call method but pass client if needed. 
        // For simplicity here, we re-implement the logic within the transaction.
        const [current] = await client.query('SELECT stock_quantity FROM product_variants WHERE sku = ? FOR UPDATE', [update.sku])
        const rows = current as any[]
        if (rows.length === 0) throw new Error(`SKU ${update.sku} not found`)
        
        let n: number
        if (update.operation === 'set') n = update.quantity
        else if (update.operation === 'increment') n = rows[0].stock_quantity + update.quantity
        else {
          n = rows[0].stock_quantity - update.quantity
          if (n < 0) throw new Error(`Insufficient stock for ${update.sku}`)
        }
        
        await client.query('UPDATE product_variants SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE sku = ?', [n, update.sku])
      }

      await client.commit()
    } catch (error) {
      await client.rollback()
      throw error
    } finally {
      client.release()
    }
  }

  async reserveStock(sku: string, quantity: number): Promise<boolean> {
    const client = await pool.getConnection()

    try {
      await client.beginTransaction()

      const [rows] = await client.query(
        'SELECT stock_quantity FROM product_variants WHERE sku = ? FOR UPDATE',
        [sku]
      )
      const result = rows as any[]

      if (result.length === 0) {
        await client.rollback()
        return false
      }

      const currentStock = result[0].stock_quantity

      if (currentStock < quantity) {
        await client.rollback()
        return false
      }

      await client.query(
        'UPDATE product_variants SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE sku = ?',
        [quantity, sku]
      )

      await client.commit()
      return true
    } catch (error) {
      await client.rollback()
      throw error
    } finally {
      client.release()
    }
  }

  async releaseStock(sku: string, quantity: number): Promise<void> {
    await pool.query(
      'UPDATE product_variants SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE sku = ?',
      [quantity, sku]
    )
  }

  async checkAvailability(items: CartItem[]): Promise<AvailabilityResult> {
    const unavailableItems: AvailabilityResult['unavailableItems'] = []

    for (const item of items) {
      if (item.variantId) {
        const result = await pool.query(
          'SELECT sku, stock_quantity FROM product_variants WHERE id = ?',
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
         WHERE pv.stock_quantity <= ?
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

    return result.rows.map((row: any) => ({
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

    return result.rows.map((row: any) => ({
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
    const client = await pool.getConnection()

    try {
      await client.beginTransaction()

      for (const item of items) {
        if (item.variantId) {
          const [rows] = await client.query(
            'SELECT sku, stock_quantity FROM product_variants WHERE id = ? FOR UPDATE',
            [item.variantId]
          )
          const result = rows as any[]

          if (result.length === 0 || result[0].stock_quantity < item.quantity) {
            await client.rollback()
            return false
          }

          await client.query(
            'UPDATE product_variants SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [item.quantity, item.variantId]
          )
        }
      }

      await client.commit()
      return true
    } catch (error) {
      await client.rollback()
      throw error
    } finally {
      client.release()
    }
  }

  async releaseCartItems(items: CartItem[]): Promise<void> {
    const client = await pool.getConnection()

    try {
      await client.beginTransaction()

      for (const item of items) {
        if (item.variantId) {
          await client.query(
            'UPDATE product_variants SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [item.quantity, item.variantId]
          )
        }
      }

      await client.commit()
    } catch (error) {
      await client.rollback()
      throw error
    } finally {
      client.release()
    }
  }
}

export default new InventoryService()
