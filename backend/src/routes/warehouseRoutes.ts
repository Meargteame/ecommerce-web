import { Router, Response } from 'express'
import { AuthRequest, authenticate, authorize } from '../middleware/auth'
import pool from '../config/database'
import { AppError } from '../middleware/errorHandler'
import crypto from 'crypto'

const router = Router()

// GET /api/seller/warehouses - Get seller's warehouses
router.get('/', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.userId
    
    const result = await pool.query(
      `SELECT sw.*,
        (SELECT COUNT(*) FROM warehouse_inventory WHERE warehouse_id = sw.id) as product_count,
        (SELECT COUNT(*) FROM warehouse_inventory WHERE warehouse_id = sw.id AND quantity_available <= reorder_point) as low_stock_count
      FROM seller_warehouses sw
      WHERE sw.seller_id = (SELECT id FROM seller_profiles WHERE user_id = ?)
      ORDER BY sw.is_default DESC, sw.created_at DESC`,
      [sellerId]
    )
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch warehouses', 500)
  }
})

// POST /api/seller/warehouses - Create warehouse
router.post('/', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.userId
    const {
      name, code, isDefault, addressLine1, addressLine2, city, state, 
      postalCode, country, phone, email, contactName,
      handlingTime, cutoffTime, operatesWeekends, operatesHolidays,
      latitude, longitude
    } = req.body
    
    // Get seller profile id
    const sellerProfile = await pool.query(
      `SELECT id FROM seller_profiles WHERE user_id = ?`,
      [sellerId]
    )
    
    if (sellerProfile.rows.length === 0) {
      throw new AppError('Seller profile not found', 404)
    }
    
    const sellerProfileId = sellerProfile.rows[0].id
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await pool.query(
        `UPDATE seller_warehouses SET is_default = false WHERE seller_id = ?`,
        [sellerProfileId]
      )
    }
    
    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO seller_warehouses (
        id, seller_id, name, code, is_default, address_line1, address_line2,
        city, state, postal_code, country, phone, email, contact_name,
        handling_time, cutoff_time, operates_weekends, operates_holidays,
        latitude, longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, sellerProfileId, name, code || `WH-${Date.now()}`, isDefault || false,
        addressLine1, addressLine2, city, state, postalCode, country || 'US',
        phone, email, contactName, handlingTime || 1, cutoffTime || '14:00',
        operatesWeekends || false, operatesHolidays || false, latitude, longitude
      ]
    )
    
    const result = await pool.query('SELECT * FROM seller_warehouses WHERE id = ?', [id])
    
    res.status(201).json({
      message: 'Warehouse created',
      data: result.rows[0]
    })
  } catch (error) {
    if ((error as any).code === 'ER_DUP_ENTRY' || (error as any).code === '23505') {
      throw new AppError('Warehouse code already exists', 400)
    }
    throw new AppError('Failed to create warehouse', 500)
  }
})

// GET /api/seller/warehouses/:id - Get warehouse details with inventory
router.get('/:id', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.userId
    const { id } = req.params
    
    // Get warehouse
    const warehouseResult = await pool.query(
      `SELECT sw.* FROM seller_warehouses sw
       JOIN seller_profiles sp ON sp.id = sw.seller_id
       WHERE sw.id = ? AND sp.user_id = ?`,
      [id, sellerId]
    )
    
    if (warehouseResult.rows.length === 0) {
      throw new AppError('Warehouse not found', 404)
    }
    
    // Get inventory
    const inventoryResult = await pool.query(
      `SELECT wi.*,
        p.name as product_name, p.slug, p.sku as product_sku,
        pv.variant_name, pv.sku as variant_sku,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image
      FROM warehouse_inventory wi
      JOIN products p ON p.id = wi.product_id
      LEFT JOIN product_variants pv ON pv.id = wi.variant_id
      WHERE wi.warehouse_id = ?
      ORDER BY wi.quantity_available ASC
      LIMIT 100`,
      [id]
    )
    
    res.json({
      data: {
        ...warehouseResult.rows[0],
        inventory: inventoryResult.rows
      }
    })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to fetch warehouse', 500)
  }
})

// PUT /api/seller/warehouses/:id - Update warehouse
router.put('/:id', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.userId
    const { id } = req.params
    const updateData = req.body
    
    // Verify ownership
    const checkResult = await pool.query(
      `SELECT sw.id FROM seller_warehouses sw
       JOIN seller_profiles sp ON sp.id = sw.seller_id
       WHERE sw.id = ? AND sp.user_id = ?`,
      [id, sellerId]
    )
    
    if (checkResult.rows.length === 0) {
      throw new AppError('Warehouse not found', 404)
    }
    
    // Handle default warehouse change
    if (updateData.isDefault) {
      const sellerProfileResult = await pool.query(
        `SELECT id FROM seller_profiles WHERE user_id = ?`,
        [sellerId]
      )
      const sellerProfileId = sellerProfileResult.rows[0].id
      
      await pool.query(
        `UPDATE seller_warehouses SET is_default = false WHERE seller_id = ? AND id != ?`,
        [sellerProfileId, id]
      )
    }
    
    const allowedFields = [
      'name', 'is_default', 'address_line1', 'address_line2', 'city', 'state',
      'postal_code', 'country', 'phone', 'email', 'contact_name', 'is_active',
      'handling_time', 'cutoff_time', 'operates_weekends', 'operates_holidays',
      'latitude', 'longitude'
    ]
    
    const updates: string[] = []
    const values: any[] = []
    
    for (const [key, value] of Object.entries(updateData)) {
      const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      if (allowedFields.includes(dbField)) {
        updates.push(`${dbField} = ?`)
        values.push(value)
      }
    }
    
    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400)
    }
    
    values.push(id)
    
    await pool.query(
      `UPDATE seller_warehouses SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = ?`,
      values
    )
    
    const result = await pool.query('SELECT * FROM seller_warehouses WHERE id = ?', [id])
    res.json({ message: 'Warehouse updated', data: result.rows[0] })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to update warehouse', 500)
  }
})

// DELETE /api/seller/warehouses/:id - Delete warehouse
router.delete('/:id', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.userId
    const { id } = req.params
    
    // Check if warehouse has inventory
    const inventoryCheck = await pool.query(
      `SELECT COALESCE(SUM(quantity_available), 0) as total_qty
       FROM warehouse_inventory wi
       JOIN seller_warehouses sw ON sw.id = wi.warehouse_id
       JOIN seller_profiles sp ON sp.id = sw.seller_id
       WHERE wi.warehouse_id = ? AND sp.user_id = ?`,
      [id, sellerId]
    )
    
    if (parseInt(inventoryCheck.rows[0].total_qty) > 0) {
      throw new AppError('Cannot delete warehouse with inventory. Transfer inventory first.', 400)
    }
    
    // Check if it's the default warehouse
    const defaultCheck = await pool.query(
      `SELECT is_default FROM seller_warehouses sw
       JOIN seller_profiles sp ON sp.id = sw.seller_id
       WHERE sw.id = ? AND sp.user_id = ?`,
      [id, sellerId]
    )
    
    if (defaultCheck.rows[0]?.is_default) {
      throw new AppError('Cannot delete default warehouse. Set another warehouse as default first.', 400)
    }
    
    const result = await pool.query(
      `DELETE sw FROM seller_warehouses sw
       INNER JOIN seller_profiles sp ON sw.seller_id = sp.id
       WHERE sw.id = ? AND sp.user_id = ?`,
      [id, sellerId]
    )
    
    if (result.rowCount === 0) {
      throw new AppError('Warehouse not found', 404)
    }
    
    res.json({ message: 'Warehouse deleted' })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to delete warehouse', 500)
  }
})

// PUT /api/seller/warehouses/:id/inventory/:productId - Update inventory for product
router.put('/:id/inventory/:productId', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.userId
    const { id, productId } = req.params
    const { variantId, quantity, reorderPoint, reorderQuantity, locationCode } = req.body
    
    // Verify warehouse ownership and product ownership
    const checkResult = await pool.query(
      `SELECT 1 FROM seller_warehouses sw
       JOIN seller_profiles sp ON sp.id = sw.seller_id
       JOIN products p ON p.seller_id = sp.user_id
       WHERE sw.id = ? AND sp.user_id = ? AND p.id = ?`,
      [id, sellerId, productId]
    )
    
    if (checkResult.rows.length === 0) {
      throw new AppError('Warehouse or product not found', 404)
    }
    
    const invId = crypto.randomUUID()
    await pool.query(
      `INSERT INTO warehouse_inventory (
        id, warehouse_id, product_id, variant_id, quantity_available,
        reorder_point, reorder_quantity, location_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        quantity_available = VALUES(quantity_available),
        reorder_point = COALESCE(VALUES(reorder_point), reorder_point),
        reorder_quantity = COALESCE(VALUES(reorder_quantity), reorder_quantity),
        location_code = COALESCE(VALUES(location_code), location_code),
        updated_at = NOW()`,
      [invId, id, productId, variantId || null, quantity, reorderPoint, reorderQuantity, locationCode]
    )
    
    const result = await pool.query('SELECT * FROM warehouse_inventory WHERE warehouse_id = ? AND product_id = ? AND variant_id <=> ?', [id, productId, variantId || null])
    
    res.json({ message: 'Inventory updated', data: result.rows[0] })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to update inventory', 500)
  }
})

// POST /api/seller/warehouses/:id/transfer - Transfer inventory between warehouses
router.post('/:id/transfer', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  const client = await pool.getConnection()
  
  try {
    await client.beginTransaction()
    
    const sellerId = req.user!.userId
    const { id } = req.params
    const { targetWarehouseId, items } = req.body
    
    // Verify both warehouses belong to seller
    const warehouseCheck = await client.query(
      `SELECT sw.id FROM seller_warehouses sw
       JOIN seller_profiles sp ON sp.id = sw.seller_id
       WHERE sw.id IN (?, ?) AND sp.user_id = ?`,
      [id, targetWarehouseId, sellerId]
    )
    
    if ((warehouseCheck as any).rows.length !== 2) {
      throw new AppError('One or more warehouses not found', 404)
    }
    
    // Process each item transfer
    for (const item of items) {
      // Check source has enough quantity
      const sourceCheck = await client.query(
        `SELECT quantity_available FROM warehouse_inventory
         WHERE warehouse_id = ? AND product_id = ? AND variant_id <=> ?`,
        [id, item.productId, item.variantId || null]
      )
      
      if ((sourceCheck as any).rows.length === 0 || (sourceCheck as any).rows[0].quantity_available < item.quantity) {
        throw new AppError(`Insufficient quantity for product ${item.productId}`, 400)
      }
      
      // Decrease source
      await client.query(
        `UPDATE warehouse_inventory 
         SET quantity_available = quantity_available - ?,
             updated_at = NOW()
         WHERE warehouse_id = ? AND product_id = ? AND variant_id <=> ?`,
        [item.quantity, id, item.productId, item.variantId || null]
      )
      
      // Increase target
      const invId = crypto.randomUUID()
      await client.query(
        `INSERT INTO warehouse_inventory (id, warehouse_id, product_id, variant_id, quantity_available)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity_available = warehouse_inventory.quantity_available + VALUES(quantity_available),
                      updated_at = NOW()`,
        [invId, targetWarehouseId, item.productId, item.variantId || null, item.quantity]
      )
    }
    
    await client.commit()
    
    res.json({ message: 'Inventory transferred successfully' })
  } catch (error) {
    await client.rollback()
    if (error instanceof AppError) throw error
    throw new AppError('Failed to transfer inventory', 500)
  } finally {
    client.release()
  }
})

// GET /api/seller/warehouses/:id/inventory/low-stock - Get low stock items
router.get('/:id/inventory/low-stock', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.userId
    const { id } = req.params
    
    const result = await pool.query(
      `SELECT wi.*,
        p.name as product_name, p.slug, p.sku,
        pv.variant_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image
      FROM warehouse_inventory wi
      JOIN products p ON p.id = wi.product_id
      LEFT JOIN product_variants pv ON pv.id = wi.variant_id
      JOIN seller_warehouses sw ON sw.id = wi.warehouse_id
      JOIN seller_profiles sp ON sp.id = sw.seller_id
      WHERE wi.warehouse_id = ? AND sp.user_id = ?
        AND wi.quantity_available <= wi.reorder_point
      ORDER BY wi.quantity_available ASC`,
      [id, sellerId]
    )
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch low stock items', 500)
  }
})

// GET /api/seller/warehouses/:id/inventory/history - Get inventory history
router.get('/:id/inventory/history', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.userId
    const { id } = req.params
    const { limit = 50, offset = 0 } = req.query
    
    const limitNum = parseInt(limit as string)
    const offsetNum = parseInt(offset as string)
    const result = await pool.query(
      `SELECT * FROM inventory_transactions
       WHERE warehouse_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [id, limitNum, offsetNum]
    )
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch inventory history', 500)
  }
})

export default router
