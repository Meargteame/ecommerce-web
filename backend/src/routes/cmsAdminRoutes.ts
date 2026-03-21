import { Router, Response } from 'express'
import { AuthRequest, authenticate, authorize } from '../middleware/auth'
import pool from '../config/database'
import { AppError } from '../middleware/errorHandler'

const router = Router()

// ============================================
// CMS Pages Management
// ============================================

// GET /api/admin/cms/pages - Get all CMS pages
router.get('/cms/pages', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query
    
    let query = `SELECT * FROM cms_pages WHERE 1=1`
    const params: any[] = []
    
    if (status) {
      query += ` AND status = $${params.length + 1}`
      params.push(status)
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)
    
    const result = await pool.query(query, params)
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch CMS pages', 500)
  }
})

// POST /api/admin/cms/pages - Create CMS page
router.post('/cms/pages', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const {
      title, slug, content, metaTitle, metaDescription, metaKeywords,
      template, status, showInHeader, showInFooter, headerPosition, footerPosition
    } = req.body
    
    // Generate slug if not provided
    const finalSlug = slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    
    const result = await pool.query(
      `INSERT INTO cms_pages (
        title, slug, content, meta_title, meta_description, meta_keywords,
        template, status, show_in_header, show_in_footer, header_position, footer_position,
        author_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        title, finalSlug, content, metaTitle, metaDescription, metaKeywords ? `{${metaKeywords.join(',')}}` : null,
        template || 'default', status || 'draft', showInHeader || false, showInFooter || false,
        headerPosition, footerPosition, userId
      ]
    )
    
    res.status(201).json({
      message: 'CMS page created',
      data: result.rows[0]
    })
  } catch (error) {
    if ((error as any).code === '23505') {
      throw new AppError('Page with this slug already exists', 400)
    }
    throw new AppError('Failed to create page', 500)
  }
})

// GET /api/admin/cms/pages/:id - Get page details
router.get('/cms/pages/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    
    const result = await pool.query(
      `SELECT cp.*,
        a.first_name as author_first_name, a.last_name as author_last_name,
        p.first_name as published_by_first_name, p.last_name as published_by_last_name
      FROM cms_pages cp
      LEFT JOIN users a ON a.id = cp.author_id
      LEFT JOIN users p ON p.id = cp.published_by
      WHERE cp.id = $1`,
      [id]
    )
    
    if (result.rows.length === 0) {
      throw new AppError('Page not found', 404)
    }
    
    res.json({ data: result.rows[0] })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to fetch page', 500)
  }
})

// PUT /api/admin/cms/pages/:id - Update page
router.put('/cms/pages/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const updateData = req.body
    
    const allowedFields = [
      'title', 'slug', 'content', 'meta_title', 'meta_description', 'meta_keywords',
      'template', 'status', 'show_in_header', 'show_in_footer', 'header_position', 'footer_position',
      'target_audience', 'target_markets'
    ]
    
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1
    
    for (const [key, value] of Object.entries(updateData)) {
      const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      if (allowedFields.includes(dbField)) {
        if (key === 'metaKeywords' && Array.isArray(value)) {
          updates.push(`${dbField} = $${paramIndex++}`)
          values.push(`{${value.join(',')}}`)
        } else {
          updates.push(`${dbField} = $${paramIndex++}`)
          values.push(value)
        }
      }
    }
    
    // Handle publish
    if (updateData.status === 'published') {
      updates.push(`published_at = COALESCE(published_at, NOW())`)
      updates.push(`published_by = $${paramIndex++}`)
      values.push(userId)
    }
    
    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400)
    }
    
    values.push(id)
    
    const result = await pool.query(
      `UPDATE cms_pages SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )
    
    if (result.rows.length === 0) {
      throw new AppError('Page not found', 404)
    }
    
    res.json({ message: 'Page updated', data: result.rows[0] })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to update page', 500)
  }
})

// DELETE /api/admin/cms/pages/:id - Delete page
router.delete('/cms/pages/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    
    const result = await pool.query(
      `DELETE FROM cms_pages WHERE id = $1 RETURNING *`,
      [id]
    )
    
    if (result.rows.length === 0) {
      throw new AppError('Page not found', 404)
    }
    
    res.json({ message: 'Page deleted' })
  } catch (error) {
    throw new AppError('Failed to delete page', 500)
  }
})

// ============================================
// CMS Blocks Management
// ============================================

router.get('/cms/blocks', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM cms_blocks ORDER BY position, sort_order`
    )
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch blocks', 500)
  }
})

router.post('/cms/blocks', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, identifier, type, content, position, sortOrder } = req.body
    
    const result = await pool.query(
      `INSERT INTO cms_blocks (name, identifier, type, content, position, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, identifier, type, content, position, sortOrder || 0]
    )
    
    res.status(201).json({ data: result.rows[0] })
  } catch (error) {
    throw new AppError('Failed to create block', 500)
  }
})

// ============================================
// Banner Management
// ============================================

router.get('/banners', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { position, isActive, limit = 50 } = req.query
    
    let query = `SELECT b.*,
      c.name as category_name
      FROM banners b
      LEFT JOIN categories c ON c.id = b.target_category_id
      WHERE 1=1`
    const params: any[] = []
    
    if (position) {
      query += ` AND b.position = $${params.length + 1}`
      params.push(position)
    }
    
    if (isActive !== undefined) {
      query += ` AND b.is_active = $${params.length + 1}`
      params.push(isActive === 'true')
    }
    
    query += ` ORDER BY b.priority DESC, b.created_at DESC LIMIT $${params.length + 1}`
    params.push(limit)
    
    const result = await pool.query(query, params)
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch banners', 500)
  }
})

router.post('/banners', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, title, subtitle, imageUrl, mobileImageUrl, ctaText, ctaUrl,
      position, targetCategoryId, startDate, endDate, priority,
      targetAudience, targetDevice
    } = req.body
    
    const result = await pool.query(
      `INSERT INTO banners (
        name, title, subtitle, image_url, mobile_image_url, cta_text, cta_url,
        position, target_category_id, start_date, end_date, priority,
        target_audience, target_device
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        name, title, subtitle, imageUrl, mobileImageUrl, ctaText, ctaUrl,
        position, targetCategoryId, startDate, endDate, priority || 0,
        targetAudience || 'all', targetDevice || 'all'
      ]
    )
    
    res.status(201).json({ data: result.rows[0] })
  } catch (error) {
    throw new AppError('Failed to create banner', 500)
  }
})

router.put('/banners/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const updateData = req.body
    
    const allowedFields = [
      'name', 'title', 'subtitle', 'image_url', 'mobile_image_url', 'cta_text', 'cta_url',
      'position', 'target_category_id', 'start_date', 'end_date', 'priority',
      'target_audience', 'target_device', 'is_active', 'text_alignment', 'text_color'
    ]
    
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1
    
    for (const [key, value] of Object.entries(updateData)) {
      const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      if (allowedFields.includes(dbField)) {
        updates.push(`${dbField} = $${paramIndex++}`)
        values.push(value)
      }
    }
    
    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400)
    }
    
    values.push(id)
    
    const result = await pool.query(
      `UPDATE banners SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )
    
    res.json({ data: result.rows[0] })
  } catch (error) {
    throw new AppError('Failed to update banner', 500)
  }
})

router.delete('/banners/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await pool.query(`DELETE FROM banners WHERE id = $1`, [id])
    res.json({ message: 'Banner deleted' })
  } catch (error) {
    throw new AppError('Failed to delete banner', 500)
  }
})

// ============================================
// SEO Management
// ============================================

router.get('/seo/redirects', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM seo_redirects WHERE is_active = true ORDER BY hit_count DESC`
    )
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch redirects', 500)
  }
})

router.post('/seo/redirects', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { oldUrl, newUrl, type = '301' } = req.body
    
    const result = await pool.query(
      `INSERT INTO seo_redirects (old_url, new_url, type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [oldUrl, newUrl, type]
    )
    
    res.status(201).json({ data: result.rows[0] })
  } catch (error) {
    throw new AppError('Failed to create redirect', 500)
  }
})

router.get('/seo/url-rewrites', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM seo_url_rewrites ORDER BY created_at DESC`
    )
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch rewrites', 500)
  }
})

// ============================================
// Tax Management
// ============================================

router.get('/tax/rules', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM tax_rules WHERE is_active = true ORDER BY priority DESC, country_code`
    )
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch tax rules', 500)
  }
})

router.post('/tax/rules', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, rate, countryCode, stateCode, postalCodePattern,
      applyTo, productTypes, minOrderAmount, maxOrderAmount
    } = req.body
    
    const result = await pool.query(
      `INSERT INTO tax_rules (
        name, rate, country_code, state_code, postal_code_pattern,
        apply_to, product_types, min_order_amount, max_order_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        name, rate, countryCode, stateCode, postalCodePattern,
        applyTo, productTypes ? `{${productTypes.join(',')}}` : null,
        minOrderAmount, maxOrderAmount
      ]
    )
    
    res.status(201).json({ data: result.rows[0] })
  } catch (error) {
    throw new AppError('Failed to create tax rule', 500)
  }
})

// ============================================
// Fraud Detection Management
// ============================================

router.get('/fraud/rules', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM fraud_rules WHERE is_active = true ORDER BY priority DESC`
    )
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch fraud rules', 500)
  }
})

router.post('/fraud/rules', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, type, condition, scoreImpact, action } = req.body
    
    const result = await pool.query(
      `INSERT INTO fraud_rules (name, description, type, condition, score_impact, action)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description, type, condition, scoreImpact, action]
    )
    
    res.status(201).json({ data: result.rows[0] })
  } catch (error) {
    throw new AppError('Failed to create fraud rule', 500)
  }
})

router.get('/fraud/risk-scores', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { level, limit = 50 } = req.query
    
    let query = `SELECT * FROM risk_scores WHERE 1=1`
    const params: any[] = []
    
    if (level) {
      query += ` AND risk_level = $${params.length + 1}`
      params.push(level)
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
    params.push(limit)
    
    const result = await pool.query(query, params)
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch risk scores', 500)
  }
})

// ============================================
// System Settings
// ============================================

router.get('/settings', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    // Get system configuration
    const settings = {
      siteName: process.env.SITE_NAME || 'ShopHub',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@shophub.com',
      currency: process.env.DEFAULT_CURRENCY || 'USD',
      timezone: process.env.DEFAULT_TIMEZONE || 'UTC',
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      features: {
        giftCards: true,
        loyaltyProgram: true,
        b2bAccounts: true,
        multiCurrency: false,
        liveChat: true
      }
    }
    
    res.json({ data: settings })
  } catch (error) {
    throw new AppError('Failed to fetch settings', 500)
  }
})

export default router
