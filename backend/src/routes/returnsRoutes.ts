import { Router, Response } from 'express'
import { AuthRequest, authenticate, authorize } from '../middleware/auth'
import pool from '../config/database'
import { AppError } from '../middleware/errorHandler'

const router = Router()

// Returns Management API

// GET /api/returns - Get all returns for user (or all for admin)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const userRole = req.user!.role
    const { status, limit = 20, offset = 0 } = req.query
    
    let query = `
      SELECT 
        rr.*,
        o.order_number, o.total_amount as order_total,
        json_build_object(
          'id', o.id,
          'orderNumber', o.order_number,
          'total', o.total_amount,
          'createdAt', o.created_at
        ) as order,
        (SELECT json_agg(json_build_object(
          'id', ri.id,
          'productId', ri.product_id,
          'productName', p.name,
          'productImage', (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1),
          'quantity', ri.quantity,
          'refundAmount', ri.refund_amount
        ))
         FROM return_items ri
         JOIN products p ON p.id = ri.product_id
         WHERE ri.return_id = rr.id
        ) as items
      FROM return_requests rr
      JOIN orders o ON o.id = rr.order_id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (userRole === 'customer') {
      query += ` AND rr.user_id = $${params.length + 1}`
      params.push(userId)
    } else if (userRole === 'seller') {
      // Sellers see returns for their products only
      query += ` AND EXISTS (
        SELECT 1 FROM return_items ri
        JOIN products p ON p.id = ri.product_id
        WHERE ri.return_id = rr.id AND p.seller_id = $${params.length + 1}
      )`
      params.push(userId)
    }
    // Admin sees all (no filter)
    
    if (status) {
      query += ` AND rr.status = $${params.length + 1}`
      params.push(status)
    }
    
    query += ` ORDER BY rr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)
    
    const result = await pool.query(query, params)
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch returns', 500)
  }
})

// POST /api/returns - Initiate return
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const userId = req.user!.userId
    const { orderId, reason, reasonDetails, returnMethod, items } = req.body
    
    // Verify order exists and belongs to user
    const orderCheck = await client.query(
      `SELECT o.*, oi.id as has_items
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1 AND o.user_id = $2 AND o.status IN ('delivered', 'shipped')
       LIMIT 1`,
      [orderId, userId]
    )
    
    if (orderCheck.rows.length === 0) {
      throw new AppError('Order not found or cannot be returned', 404)
    }
    
    // Check if return window has expired (30 days default)
    const orderDate = new Date(orderCheck.rows[0].created_at)
    const daysSinceOrder = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceOrder > 30) {
      throw new AppError('Return window has expired (30 days)', 400)
    }
    
    // Check for existing return on this order
    const existingReturn = await client.query(
      `SELECT id FROM return_requests WHERE order_id = $1 AND status NOT IN ('rejected', 'closed')`,
      [orderId]
    )
    
    if (existingReturn.rows.length > 0) {
      throw new AppError('A return is already in progress for this order', 400)
    }
    
    // Validate items and calculate refund
    let totalRefund = 0
    const returnItems = []
    
    for (const item of items) {
      const itemCheck = await client.query(
        `SELECT oi.*, p.name, p.base_price, 
          (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as image
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.id = $1 AND oi.order_id = $2`,
        [item.orderItemId, orderId]
      )
      
      if (itemCheck.rows.length === 0) {
        throw new AppError(`Invalid order item: ${item.orderItemId}`, 400)
      }
      
      const orderItem = itemCheck.rows[0]
      
      if (item.quantity > orderItem.quantity) {
        throw new AppError(`Cannot return more than purchased quantity for ${orderItem.name}`, 400)
      }
      
      // Check if item was already returned
      const alreadyReturned = await client.query(
        `SELECT COALESCE(SUM(quantity), 0) as returned_qty
         FROM return_items ri
         JOIN return_requests rr ON rr.id = ri.return_id
         WHERE ri.order_item_id = $1 AND rr.status NOT IN ('rejected', 'closed')`,
        [item.orderItemId]
      )
      
      const totalReturned = parseInt(alreadyReturned.rows[0].returned_qty) + item.quantity
      if (totalReturned > orderItem.quantity) {
        throw new AppError(`Item ${orderItem.name} has already been returned or exceeds available quantity`, 400)
      }
      
      const itemRefund = item.quantity * orderItem.unit_price
      totalRefund += itemRefund
      
      returnItems.push({
        orderItemId: item.orderItemId,
        productId: orderItem.product_id,
        variantId: orderItem.variant_id,
        quantity: item.quantity,
        refundAmount: itemRefund
      })
    }
    
    // Create return request
    const returnResult = await client.query(
      `INSERT INTO return_requests (
        order_id, user_id, reason, reason_details, return_method,
        total_items, total_refund_amount, pickup_address_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 
        (SELECT shipping_address_id FROM orders WHERE id = $1)
      )
      RETURNING *`,
      [orderId, userId, reason, reasonDetails, returnMethod || 'pickup', items.length, totalRefund]
    )
    
    const returnId = returnResult.rows[0].id
    
    // Create return items
    for (const item of returnItems) {
      await client.query(
        `INSERT INTO return_items (return_id, order_item_id, product_id, variant_id, quantity, refund_amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [returnId, item.orderItemId, item.productId, item.variantId, item.quantity, item.refundAmount]
      )
    }
    
    await client.query('COMMIT')
    
    res.status(201).json({
      message: 'Return request submitted successfully',
      data: returnResult.rows[0]
    })
  } catch (error) {
    await client.query('ROLLBACK')
    if (error instanceof AppError) throw error
    throw new AppError('Failed to initiate return', 500)
  } finally {
    client.release()
  }
})

// GET /api/returns/:id - Get return details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const userRole = req.user!.role
    const { id } = req.params
    
    let query = `
      SELECT 
        rr.*,
        o.order_number, o.created_at as order_date, o.total_amount as order_total,
        json_build_object(
          'line1', a.address_line1,
          'line2', a.address_line2,
          'city', a.city,
          'state', a.state,
          'postalCode', a.postal_code,
          'country', a.country
        ) as pickup_address,
        (SELECT json_agg(json_build_object(
          'id', ri.id,
          'orderItemId', ri.order_item_id,
          'productId', ri.product_id,
          'productName', p.name,
          'productSlug', p.slug,
          'productImage', (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1),
          'variantName', pv.variant_name,
          'sku', COALESCE(pv.sku, p.sku),
          'quantity', ri.quantity,
          'refundAmount', ri.refund_amount,
          'conditionReceived', ri.condition_received,
          'restockingFee', ri.restocking_fee,
          'notes', ri.notes
        ))
         FROM return_items ri
         JOIN products p ON p.id = ri.product_id
         LEFT JOIN product_variants pv ON pv.id = ri.variant_id
         WHERE ri.return_id = rr.id
        ) as items
      FROM return_requests rr
      JOIN orders o ON o.id = rr.order_id
      LEFT JOIN addresses a ON a.id = rr.pickup_address_id
      WHERE rr.id = $1
    `
    const params = [id]
    
    if (userRole === 'customer') {
      query += ` AND rr.user_id = $2`
      params.push(userId)
    } else if (userRole === 'seller') {
      query += ` AND EXISTS (
        SELECT 1 FROM return_items ri
        JOIN products p ON p.id = ri.product_id
        WHERE ri.return_id = rr.id AND p.seller_id = $2
      )`
      params.push(userId)
    }
    // Admin sees all
    
    const result = await pool.query(query, params)
    
    if (result.rows.length === 0) {
      throw new AppError('Return not found', 404)
    }
    
    res.json({ data: result.rows[0] })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to fetch return details', 500)
  }
})

// Admin/Seller: Update return status
router.put('/:id/status', authenticate, authorize('admin', 'seller'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const userRole = req.user!.role
    const { id } = req.params
    const { status, trackingNumber, notes } = req.body
    
    // For sellers, verify they own products in this return
    if (userRole === 'seller') {
      const checkResult = await pool.query(
        `SELECT 1 FROM return_items ri
         JOIN products p ON p.id = ri.product_id
         WHERE ri.return_id = $1 AND p.seller_id = $2
         LIMIT 1`,
        [id, userId]
      )
      
      if (checkResult.rows.length === 0) {
        throw new AppError('Not authorized to update this return', 403)
      }
    }
    
    const result = await pool.query(
      `UPDATE return_requests 
       SET status = $1,
           tracking_number = COALESCE($2, tracking_number),
           ${status === 'received' ? 'received_at = NOW(),' : ''}
           ${status === 'refunded' ? 'refund_processed_at = NOW(),' : ''}
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, trackingNumber, id]
    )
    
    if (result.rows.length === 0) {
      throw new AppError('Return not found', 404)
    }
    
    // Create notification for customer
    const returnReq = result.rows[0]
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, $2, $3, $4)`,
      [
        returnReq.user_id, 
        'system',
        'Return Status Updated',
        `Your return request #${returnReq.id.substring(0, 8)} status has been updated to: ${status}`
      ]
    ).catch(err => console.error('Failed to send return notification:', err))
    
    res.json({
      message: 'Return status updated',
      data: result.rows[0]
    })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to update return status', 500)
  }
})

// Admin: Inspect returned items
router.post('/:id/inspect', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const { id } = req.params
    const { items, notes } = req.body // items: [{itemId, condition, restockingFee, accepted}]
    
    let totalRefundAdjustment = 0
    
    for (const item of items) {
      await client.query(
        `UPDATE return_items 
         SET condition_received = $1,
             restocking_fee = $2,
             quantity_accepted = CASE WHEN $3 THEN quantity ELSE 0 END,
             quantity_rejected = CASE WHEN $3 THEN 0 ELSE quantity END,
             notes = $4
         WHERE id = $5 AND return_id = $6`,
        [item.condition, item.restockingFee, item.accepted, item.notes, item.itemId, id]
      )
      
      if (!item.accepted) {
        // Adjust refund if item rejected
        const itemResult = await client.query(
          `SELECT refund_amount FROM return_items WHERE id = $1`,
          [item.itemId]
        )
        totalRefundAdjustment += parseFloat(itemResult.rows[0].refund_amount)
      }
    }
    
    // Update return with inspection details
    await client.query(
      `UPDATE return_requests 
       SET inspected_at = NOW(),
           inspected_by = $1,
           inspection_notes = $2,
           total_refund_amount = total_refund_amount - $3,
           updated_at = NOW()
       WHERE id = $4`,
      [req.user!.userId, notes, totalRefundAdjustment, id]
    )
    
    await client.query('COMMIT')
    
    res.json({ message: 'Inspection completed' })
  } catch (error) {
    await client.query('ROLLBACK')
    throw new AppError('Failed to inspect items', 500)
  } finally {
    client.release()
  }
})

// Cancel return (customer only, before shipping)
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    
    const result = await pool.query(
      `UPDATE return_requests 
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'approved')
       RETURNING *`,
      [id, userId]
    )
    
    if (result.rows.length === 0) {
      throw new AppError('Return not found or cannot be cancelled', 400)
    }
    
    res.json({ message: 'Return cancelled', data: result.rows[0] })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to cancel return', 500)
  }
})

// Exchange Requests

// POST /api/returns/:id/exchange - Request exchange instead of return
router.post('/:id/exchange', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const { exchangeItems } = req.body // [{returnItemId, newProductId, newVariantId, quantity}]
    
    // Verify return belongs to user
    const returnCheck = await pool.query(
      `SELECT * FROM return_requests WHERE id = $1 AND user_id = $2 AND status = 'approved'`,
      [id, userId]
    )
    
    if (returnCheck.rows.length === 0) {
      throw new AppError('Return not found or not approved for exchange', 404)
    }
    
    const returnRequest = returnCheck.rows[0]
    
    // Calculate exchange difference
    let totalDifference = 0
    
    for (const item of exchangeItems) {
      // Get current item refund value
      const currentItem = await pool.query(
        `SELECT refund_amount FROM return_items WHERE id = $1 AND return_id = $2`,
        [item.returnItemId, id]
      )
      
      if (currentItem.rows.length === 0) {
        throw new AppError(`Invalid return item: ${item.returnItemId}`, 400)
      }
      
      const refundValue = parseFloat(currentItem.rows[0].refund_amount)
      
      // Get new product price
      const newProduct = await pool.query(
        `SELECT COALESCE(pv.price, p.base_price) as price
         FROM products p
         LEFT JOIN product_variants pv ON pv.id = $2
         WHERE p.id = $1`,
        [item.newProductId, item.newVariantId]
      )
      
      if (newProduct.rows.length === 0) {
        throw new AppError(`Product not found: ${item.newProductId}`, 404)
      }
      
      const newPrice = parseFloat(newProduct.rows[0].price) * item.quantity
      totalDifference += (newPrice - refundValue)
    }
    
    // Create exchange request
    const exchangeResult = await pool.query(
      `INSERT INTO exchange_requests (
        return_id, order_id, user_id, total_items, exchange_difference
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [id, returnRequest.order_id, userId, exchangeItems.length, totalDifference]
    )
    
    const exchangeId = exchangeResult.rows[0].id
    
    // Create exchange items
    for (const item of exchangeItems) {
      const newProduct = await pool.query(
        `SELECT COALESCE(pv.price, p.base_price) as price
         FROM products p
         LEFT JOIN product_variants pv ON pv.id = $2
         WHERE p.id = $1`,
        [item.newProductId, item.newVariantId]
      )
      
      await pool.query(
        `INSERT INTO exchange_items (
          exchange_id, return_item_id, new_product_id, new_variant_id, 
          new_quantity, price_difference
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          exchangeId,
          item.returnItemId,
          item.newProductId,
          item.newVariantId,
          item.quantity,
          parseFloat(newProduct.rows[0].price) * item.quantity
        ]
      )
    }
    
    res.status(201).json({
      message: 'Exchange request created',
      data: exchangeResult.rows[0]
    })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to create exchange request', 500)
  }
})

export default router
