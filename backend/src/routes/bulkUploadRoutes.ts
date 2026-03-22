import { Router, Response } from 'express'
import { AuthRequest, authenticate, authorize } from '../middleware/auth'
import pool from '../config/database'
import { AppError } from '../middleware/errorHandler'
import crypto from 'crypto'

const router = Router()

// GET /api/seller/bulk-uploads - Get upload history
router.get('/', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.userId
    const { limit = 20, offset = 0, status } = req.query
    
    let query = `
      SELECT * FROM bulk_upload_jobs
      WHERE seller_id = ?
    `
    const params: any[] = [sellerId]
    
    if (status) {
      query += ` AND status = ?`
      params.push(status)
    }
    
    const limitNum = parseInt(limit as string)
    const offsetNum = parseInt(offset as string)
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    params.push(limitNum, offsetNum)
    
    const result = await pool.query(query, params)
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch upload history', 500)
  }
})

// POST /api/seller/bulk-uploads/products - Upload products via CSV
router.post('/products', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.userId
    const { fileUrl, products } = req.body
    
    // Create job record
    const jobId = crypto.randomUUID()
    await pool.query(
      `INSERT INTO bulk_upload_jobs (job_id, seller_id, type, file_name, file_url, total_rows, status)
       VALUES (?, ?, 'products', ?, ?, ?, 'pending')`,
      [jobId, sellerId, fileUrl?.split('/').pop() || 'products.csv', fileUrl, products.length]
    )
    
    // Process asynchronously
    processProductsUpload(jobId, sellerId, products)
    
    res.status(202).json({
      message: 'Product upload started',
      data: {
        jobId,
        status: 'pending',
        totalProducts: products.length
      }
    })
  } catch (error) {
    throw new AppError('Failed to start upload', 500)
  }
})

// POST /api/seller/bulk-uploads/inventory - Update inventory via CSV
router.post('/inventory', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.userId
    const { fileUrl, inventoryUpdates } = req.body
    
    const jobId = crypto.randomUUID()
    await pool.query(
      `INSERT INTO bulk_upload_jobs (job_id, seller_id, type, file_name, file_url, total_rows, status)
       VALUES (?, ?, 'inventory', ?, ?, ?, 'pending')`,
      [jobId, sellerId, fileUrl?.split('/').pop() || 'inventory.csv', fileUrl, inventoryUpdates.length]
    )
    
    // Process asynchronously
    processInventoryUpload(jobId, sellerId, inventoryUpdates)
    
    res.status(202).json({
      message: 'Inventory upload started',
      data: {
        jobId,
        status: 'pending',
        totalUpdates: inventoryUpdates.length
      }
    })
  } catch (error) {
    throw new AppError('Failed to start upload', 500)
  }
})

// POST /api/seller/bulk-uploads/prices - Update prices via CSV
router.post('/prices', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.userId
    const { fileUrl, priceUpdates } = req.body
    
    const jobId = crypto.randomUUID()
    await pool.query(
      `INSERT INTO bulk_upload_jobs (job_id, seller_id, type, file_name, file_url, total_rows, status)
       VALUES (?, ?, 'prices', ?, ?, ?, 'pending')`,
      [jobId, sellerId, fileUrl?.split('/').pop() || 'prices.csv', fileUrl, priceUpdates.length]
    )
    
    // Process asynchronously
    processPriceUpload(jobId, sellerId, priceUpdates)
    
    res.status(202).json({
      message: 'Price update started',
      data: {
        jobId,
        status: 'pending',
        totalUpdates: priceUpdates.length
      }
    })
  } catch (error) {
    throw new AppError('Failed to start upload', 500)
  }
})

// GET /api/seller/bulk-uploads/:jobId - Get upload job status
router.get('/:jobId', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.userId
    const { jobId } = req.params
    
    const result = await pool.query(
      `SELECT * FROM bulk_upload_jobs
       WHERE job_id = ? AND seller_id = ?`,
      [jobId, sellerId]
    )
    
    if (result.rows.length === 0) {
      throw new AppError('Job not found', 404)
    }
    
    res.json({ data: result.rows[0] })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to fetch job status', 500)
  }
})

// GET /api/seller/bulk-uploads/:jobId/errors - Get detailed errors
router.get('/:jobId/errors', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.userId
    const { jobId } = req.params
    
    const result = await pool.query(
      `SELECT error_log, result_summary FROM bulk_upload_jobs
       WHERE job_id = ? AND seller_id = ?`,
      [jobId, sellerId]
    )
    
    if (result.rows.length === 0) {
      throw new AppError('Job not found', 404)
    }
    
    res.json({
      errors: result.rows[0].error_log || [],
      summary: result.rows[0].result_summary || {}
    })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to fetch errors', 500)
  }
})

// POST /api/seller/bulk-uploads/template - Get CSV template
router.get('/template/:type', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params
    
    const templates: Record<string, any> = {
      products: {
        headers: ['name', 'slug', 'description', 'base_price', 'category_id', 'brand', 'sku', 'status', 'images', 'specifications'],
        sample: [
          'Wireless Headphones', 'wireless-headphones', 'Premium wireless headphones', '99.99', 'electronics', 'AudioTech', 'SKU-001', 'published', 'https://example.com/img1.jpg', '{"color": "black"}'
        ]
      },
      inventory: {
        headers: ['sku', 'warehouse_code', 'quantity', 'reorder_point', 'reorder_quantity'],
        sample: ['SKU-001', 'WH-001', '100', '10', '50']
      },
      prices: {
        headers: ['sku', 'new_price', 'sale_price', 'sale_start', 'sale_end'],
        sample: ['SKU-001', '89.99', '79.99', '2024-01-01', '2024-01-31']
      }
    }
    
    if (!templates[type]) {
      throw new AppError('Invalid template type', 400)
    }
    
    res.json({ data: templates[type] })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to get template', 500)
  }
})

// Async processing functions
async function processProductsUpload(jobId: string, sellerId: string, products: any[]) {
  const client = await pool.getConnection()
  
  try {
    await client.beginTransaction()
    
    await client.query(
      `UPDATE bulk_upload_jobs SET status = 'processing', started_at = NOW() WHERE job_id = ?`,
      [jobId]
    )
    
    let processed = 0
    let successful = 0
    let failed = 0
    const errors: any[] = []
    
    for (const product of products) {
      try {
        // Validate required fields
        if (!product.name || !product.base_price) {
          throw new Error('Name and base_price are required')
        }
        
        // Check for duplicate slug
        const slugCheck = await client.query(
          `SELECT id FROM products WHERE slug = ?`,
          [product.slug || product.name.toLowerCase().replace(/\s+/g, '-')]
        )
        
        let slug = product.slug || product.name.toLowerCase().replace(/\s+/g, '-')
        if (slugCheck.rows.length > 0) {
          slug += `-${Date.now()}`
        }
        
        // Create product
        const id = crypto.randomUUID()
        await client.query(
          `INSERT INTO products (
            id, name, slug, description, base_price, category_id, brand, sku, status, seller_id, specifications
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, product.name, slug, product.description, product.base_price,
            product.category_id, product.brand, product.sku || `SKU-${Date.now()}`,
            product.status || 'draft', sellerId, product.specifications ? (typeof product.specifications === 'string' ? product.specifications : JSON.stringify(product.specifications)) : '{}'
          ]
        )
        
        successful++
      } catch (err: any) {
        failed++
        errors.push({
          row: processed + 1,
          product: product.name || 'Unknown',
          error: err.message
        })
      }
      
      processed++
    }
    
    const status = failed === 0 ? 'completed' : (successful > 0 ? 'partial' : 'failed')
    
    await client.query(
      `UPDATE bulk_upload_jobs 
       SET status = ?, 
           processed_rows = ?,
           successful_rows = ?,
           failed_rows = ?,
           error_log = ?,
           completed_at = NOW()
       WHERE job_id = ?`,
      [status, processed, successful, failed, JSON.stringify(errors), jobId]
    )
    
    await client.commit()
  } catch (error) {
    await client.rollback()
    await client.query(
      `UPDATE bulk_upload_jobs SET status = 'failed', error_log = ? WHERE job_id = ?`,
      [JSON.stringify([{ error: 'Processing failed' }]), jobId]
    ).catch((e: any) => console.error('Failed to update job status to failed:', e))
  } finally {
    client.release()
  }
}

async function processInventoryUpload(jobId: string, sellerId: string, updates: any[]) {
  const client = await pool.getConnection()
  
  try {
    await client.beginTransaction()
    
    await client.query(
      `UPDATE bulk_upload_jobs SET status = 'processing', started_at = NOW() WHERE job_id = ?`,
      [jobId]
    )
    
    let processed = 0
    let successful = 0
    let failed = 0
    const errors: any[] = []
    
    for (const update of updates) {
      try {
        // Find product by SKU
        const productResult = await client.query(
          `SELECT p.id, pv.id as variant_id
           FROM products p
           LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.sku = ?
           WHERE p.sku = ? OR pv.sku = ?`,
          [update.sku, update.sku, update.sku]
        )
        
        if (productResult.rows.length === 0) {
          throw new Error(`Product with SKU ${update.sku} not found`)
        }
        
        const productId = productResult.rows[0].id
        const variantId = productResult.rows[0].variant_id
        
        // Find warehouse
        const warehouseResult = await client.query(
          `SELECT sw.id FROM seller_warehouses sw
           JOIN seller_profiles sp ON sp.id = sw.seller_id
           WHERE sw.code = ? AND sp.user_id = ?`,
          [update.warehouse_code, sellerId]
        )
        
        if (warehouseResult.rows.length === 0) {
          throw new Error(`Warehouse ${update.warehouse_code} not found`)
        }
        
        // Update inventory
        const id = crypto.randomUUID()
        await client.query(
          `INSERT INTO warehouse_inventory (
            id, warehouse_id, product_id, variant_id, quantity_available,
            reorder_point, reorder_quantity
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            quantity_available = VALUES(quantity_available),
            reorder_point = COALESCE(VALUES(reorder_point), reorder_point),
            reorder_quantity = COALESCE(VALUES(reorder_quantity), reorder_quantity),
            updated_at = NOW()`,
          [
            id, warehouseResult.rows[0].id, productId, variantId,
            update.quantity, update.reorder_point, update.reorder_quantity
          ]
        )
        
        successful++
      } catch (err: any) {
        failed++
        errors.push({
          row: processed + 1,
          sku: update.sku,
          error: err.message
        })
      }
      
      processed++
    }
    
    const status = failed === 0 ? 'completed' : (successful > 0 ? 'partial' : 'failed')
    
    await client.query(
      `UPDATE bulk_upload_jobs 
       SET status = ?, 
           processed_rows = ?,
           successful_rows = ?,
           failed_rows = ?,
           error_log = ?,
           completed_at = NOW()
       WHERE job_id = ?`,
      [status, processed, successful, failed, JSON.stringify(errors), jobId]
    )
    
    await client.commit()
  } catch (error) {
    await client.rollback()
    await client.query(
      `UPDATE bulk_upload_jobs SET status = 'failed', error_log = ? WHERE job_id = ?`,
      [JSON.stringify([{ error: 'Processing failed' }]), jobId]
    ).catch((e: any) => console.error('Failed to update job status to failed:', e))
  } finally {
    client.release()
  }
}

async function processPriceUpload(jobId: string, sellerId: string, updates: any[]) {
  const client = await pool.getConnection()
  
  try {
    await client.beginTransaction()
    
    await client.query(
      `UPDATE bulk_upload_jobs SET status = 'processing', started_at = NOW() WHERE job_id = ?`,
      [jobId]
    )
    
    let processed = 0
    let successful = 0
    let failed = 0
    const errors: any[] = []
    
    for (const update of updates) {
      try {
        // Find product by SKU
        const productResult = await client.query(
          `SELECT p.id FROM products p
           WHERE p.sku = ? AND p.seller_id = ?`,
          [update.sku, sellerId]
        )
        
        if (productResult.rows.length === 0) {
          throw new Error(`Product with SKU ${update.sku} not found or not owned by you`)
        }
        
        // Update price
        await client.query(
          `UPDATE products 
           SET base_price = ?,
               sale_price = ?,
               sale_starts_at = ?,
               sale_ends_at = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [
            update.new_price, update.sale_price, update.sale_start,
            update.sale_end, productResult.rows[0].id
          ]
        )
        
        successful++
      } catch (err: any) {
        failed++
        errors.push({
          row: processed + 1,
          sku: update.sku,
          error: err.message
        })
      }
      
      processed++
    }
    
    const status = failed === 0 ? 'completed' : (successful > 0 ? 'partial' : 'failed')
    
    await client.query(
      `UPDATE bulk_upload_jobs 
       SET status = ?, 
           processed_rows = ?,
           successful_rows = ?,
           failed_rows = ?,
           error_log = ?,
           completed_at = NOW()
       WHERE job_id = ?`,
      [status, processed, successful, failed, JSON.stringify(errors), jobId]
    )
    
    await client.commit()
  } catch (error) {
    await client.rollback()
    await client.query(
      `UPDATE bulk_upload_jobs SET status = 'failed', error_log = ? WHERE job_id = ?`,
      [JSON.stringify([{ error: 'Processing failed' }]), jobId]
    ).catch((e: any) => console.error('Failed to update job status to failed:', e))
  } finally {
    client.release()
  }
}

export default router
