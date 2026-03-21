import pool from '../config/database'
import { cache } from '../config/redis'

interface CreateProductDTO {
  name: string
  slug: string
  description?: string
  specifications?: Record<string, any>
  basePrice: number
  categoryId: string
  brand?: string
  status?: 'draft' | 'published' | 'archived'
  sellerId?: string
  sku?: string
}

interface UpdateProductDTO extends Partial<CreateProductDTO> {}

interface ProductFilters {
  categoryId?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  status?: string
  search?: string
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular'
  limit?: number
  offset?: number
}

interface Product {
  id: string
  name: string
  slug: string
  description?: string
  specifications?: Record<string, any>
  basePrice: number
  categoryId: string
  brand?: string
  status: string
  averageRating: number
  reviewCount: number
  viewCount: number
  createdAt: Date
  updatedAt: Date
}

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  parentId?: string
  imageUrl?: string
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export class ProductService {
  private readonly CACHE_TTL = 3600 // 1 hour for products
  private readonly CATEGORY_CACHE_TTL = 21600 // 6 hours for categories

  // Product CRUD
  async createProduct(data: CreateProductDTO): Promise<Product> {
    const {
      name,
      slug,
      description,
      specifications,
      basePrice,
      categoryId,
      brand,
      status = 'draft',
      sellerId,
    } = data

    // Auto-generate SKU if not provided
    const sku = data.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Check if slug already exists
    const slugCheck = await pool.query('SELECT id FROM products WHERE slug = $1', [slug])

    if (slugCheck.rows.length > 0) {
      throw new Error('Product with this slug already exists')
    }

    // Verify category exists
    const categoryCheck = await pool.query('SELECT id FROM categories WHERE id = $1', [categoryId])

    if (categoryCheck.rows.length === 0) {
      throw new Error('Category not found')
    }

    // Use provided sellerId or get first admin user as fallback
    let resolvedSellerId = sellerId
    if (!resolvedSellerId) {
      const adminResult = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
      if (adminResult.rows.length === 0) {
        throw new Error('No admin user found to assign as seller')
      }
      resolvedSellerId = adminResult.rows[0].id
    }

    const result = await pool.query(
      `INSERT INTO products (seller_id, name, slug, description, specifications, base_price, price, sku, category_id, brand, status)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10)
       RETURNING *`,
      [resolvedSellerId, name, slug, description || null, JSON.stringify(specifications || {}), basePrice, sku, categoryId, brand || null, status]
    )

    return this.mapProduct(result.rows[0])
  }

  async getProduct(id: string, incrementView = false): Promise<Product | null> {
    // Try cache first
    const cacheKey = `product:${id}`
    const cached = await cache.get(cacheKey)

    if (cached) {
      const product = JSON.parse(cached)
      
      // Increment view count asynchronously if needed
      if (incrementView) {
        pool.query('UPDATE products SET view_count = view_count + 1 WHERE id = $1', [id]).catch(() => {})
      }

      return product
    }

    // Get from database
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return null
    }

    const product = this.mapProduct(result.rows[0])

    // Cache the product
    await cache.set(cacheKey, this.CACHE_TTL, JSON.stringify(product))

    // Increment view count if needed
    if (incrementView) {
      await pool.query('UPDATE products SET view_count = view_count + 1 WHERE id = $1', [id])
    }

    return product
  }

  async getProductBySlug(slug: string, incrementView = false): Promise<Product | null> {
    const result = await pool.query('SELECT * FROM products WHERE slug = $1', [slug])

    if (result.rows.length === 0) {
      return null
    }

    const product = this.mapProduct(result.rows[0])

    // Increment view count if needed
    if (incrementView) {
      await pool.query('UPDATE products SET view_count = view_count + 1 WHERE id = $1', [product.id])
    }

    return product
  }

  async updateProduct(id: string, data: UpdateProductDTO): Promise<Product> {
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    const fields: (keyof UpdateProductDTO)[] = [
      'name',
      'slug',
      'description',
      'specifications',
      'basePrice',
      'categoryId',
      'brand',
      'status',
    ]

    const dbFields = [
      'name',
      'slug',
      'description',
      'specifications',
      'base_price',
      'category_id',
      'brand',
      'status',
    ]

    fields.forEach((field, index) => {
      if (data[field] !== undefined) {
        updates.push(`${dbFields[index]} = $${paramCount}`)
        
        if (field === 'specifications') {
          values.push(JSON.stringify(data[field]))
        } else {
          values.push(data[field])
        }
        
        paramCount++
      }
    })

    if (updates.length === 0) {
      throw new Error('No fields to update')
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const result = await pool.query(
      `UPDATE products 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      throw new Error('Product not found')
    }

    const product = this.mapProduct(result.rows[0])

    // Invalidate cache
    await cache.del(`product:${id}`)

    return product
  }

  async deleteProduct(id: string): Promise<void> {
    const result = await pool.query('DELETE FROM products WHERE id = $1', [id])

    if (result.rowCount === 0) {
      throw new Error('Product not found')
    }

    // Invalidate cache
    await cache.del(`product:${id}`)
  }

  async listProducts(filters: ProductFilters): Promise<{ products: Product[]; total: number }> {
    const {
      categoryId, brand, minPrice, maxPrice, minRating,
      status = 'published', search, sortBy = 'newest',
      limit = 20, offset = 0,
    } = filters

    // Cache key — 10 min TTL
    const cacheKey = 'products:list:' + JSON.stringify({ categoryId, brand, minPrice, maxPrice, minRating, status, search, sortBy, limit, offset })
    const cached = await cache.get(cacheKey)
    if (cached) return JSON.parse(cached)

    // Build conditions with p. prefix for use in JOIN queries
    const conditions: string[] = []
    const values: any[] = []
    let p = 1

    if (status)                  { conditions.push(`p.status = $${p++}`);           values.push(status) }
    if (categoryId)              { conditions.push(`p.category_id = $${p++}`);      values.push(categoryId) }
    if (brand)                   { conditions.push(`p.brand = $${p++}`);            values.push(brand) }
    if (minPrice !== undefined)  { conditions.push(`p.base_price >= $${p++}`);      values.push(minPrice) }
    if (maxPrice !== undefined)  { conditions.push(`p.base_price <= $${p++}`);      values.push(maxPrice) }
    if (minRating !== undefined) { conditions.push(`p.average_rating >= $${p++}`);  values.push(minRating) }
    if (search) {
      conditions.push(`(p.name ILIKE $${p} OR p.description ILIKE $${p})`)
      values.push('%' + search + '%')
      p++
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    let orderBy = 'ORDER BY p.created_at DESC'
    switch (sortBy) {
      case 'price_asc':  orderBy = 'ORDER BY p.base_price ASC'; break
      case 'price_desc': orderBy = 'ORDER BY p.base_price DESC'; break
      case 'rating':     orderBy = 'ORDER BY p.average_rating DESC, p.review_count DESC'; break
      case 'popular':    orderBy = 'ORDER BY p.view_count DESC'; break
    }

    // Count query — uses same conditions (already p. prefixed)
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM products p ${whereClause}`,
      values
    )
    const total = parseInt(countResult.rows[0].total)

    // Main query with images and category
    values.push(limit, offset)
    const result = await pool.query(
      `SELECT p.*, c.name as category_name,
              (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1) as image_url
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${whereClause}
       ${orderBy}
       LIMIT $${p} OFFSET $${p + 1}`,
      values
    )

    const products = result.rows.map((row) => ({
      ...this.mapProduct(row),
      image_url: row.image_url,
      category_name: row.category_name,
    }))
    const payload = { products, total }

    await cache.set(cacheKey, 600, JSON.stringify(payload))

    return payload
  }

  async searchProducts(query: string, filters: ProductFilters = {}): Promise<{ products: Product[]; total: number }> {
    return this.listProducts({ ...filters, search: query })
  }

  async createCategory(data: { name: string; slug: string; description?: string; parentId?: string; imageUrl?: string; displayOrder?: number }): Promise<Category> {
    const result = await pool.query(
      `INSERT INTO categories (name, slug, description, parent_id, image_url, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.name, data.slug, data.description || null, data.parentId || null, data.imageUrl || null, data.displayOrder || 0]
    )

    // Invalidate categories cache
    await cache.del('categories:all')

    return this.mapCategory(result.rows[0])
  }

  // Category Management
  async getCategories(): Promise<Category[]> {
    // Try cache first
    const cacheKey = 'categories:all'
    const cached = await cache.get(cacheKey)

    if (cached) {
      return JSON.parse(cached)
    }

    const result = await pool.query(
      'SELECT * FROM categories ORDER BY display_order ASC, name ASC'
    )

    const categories = result.rows.map(this.mapCategory)

    // Cache categories
    await cache.set(cacheKey, this.CATEGORY_CACHE_TTL, JSON.stringify(categories))

    return categories
  }

  async getCategory(id: string): Promise<Category | null> {
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return null
    }

    return this.mapCategory(result.rows[0])
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const result = await pool.query('SELECT * FROM categories WHERE slug = $1', [slug])

    if (result.rows.length === 0) {
      return null
    }

    return this.mapCategory(result.rows[0])
  }

  async getProductsByCategory(categoryId: string, filters: ProductFilters = {}): Promise<{ products: Product[]; total: number }> {
    return this.listProducts({ ...filters, categoryId })
  }

  // Product Images
  async getProductImages(productId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT id, product_id, url as image_url, alt_text, display_order, is_primary, created_at
       FROM product_images 
       WHERE product_id = $1
       ORDER BY is_primary DESC, display_order ASC`,
      [productId]
    )

    return result.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      imageUrl: row.image_url,
      altText: row.alt_text,
      displayOrder: row.display_order,
      isPrimary: row.is_primary,
      createdAt: row.created_at,
    }))
  }

  // Product Variants
  async getProductVariants(productId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT id, product_id, sku, variant_name, attributes, price_adjustment,
              stock_quantity, low_stock_threshold, weight_grams, created_at, updated_at
       FROM product_variants 
       WHERE product_id = $1
       ORDER BY variant_name ASC`,
      [productId]
    )

    return result.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      sku: row.sku,
      variantName: row.variant_name,
      attributes: row.attributes,
      priceAdjustment: parseFloat(row.price_adjustment),
      stockQuantity: row.stock_quantity,
      lowStockThreshold: row.low_stock_threshold,
      weightGrams: row.weight_grams,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  // Create product variant
  async createVariant(productId: string, data: {
    sku: string
    variantName: string
    priceAdjustment?: number
    stockQuantity?: number
    weight?: number
    attributes?: Record<string, any>
  }): Promise<any> {
    // Verify product exists
    const productCheck = await pool.query('SELECT id, base_price, price FROM products WHERE id = $1', [productId])
    if (productCheck.rows.length === 0) {
      throw new Error('Product not found')
    }

    const basePrice = parseFloat(productCheck.rows[0].base_price || productCheck.rows[0].price || 0)
    const priceAdjustment = data.priceAdjustment || 0
    const variantPrice = basePrice + priceAdjustment

    const result = await pool.query(
      `INSERT INTO product_variants 
        (product_id, sku, name, variant_name, price, price_adjustment, stock_quantity, weight, weight_grams, attributes)
       VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        productId,
        data.sku,
        data.variantName,
        variantPrice,
        priceAdjustment,
        data.stockQuantity || 0,
        data.weight ? data.weight / 1000 : null, // grams to kg
        data.weight || null,
        JSON.stringify(data.attributes || {}),
      ]
    )

    const row = result.rows[0]
    return {
      id: row.id,
      productId: row.product_id,
      sku: row.sku,
      variantName: row.variant_name || row.name,
      priceAdjustment: parseFloat(row.price_adjustment || 0),
      stockQuantity: row.stock_quantity,
      weight: row.weight,
      weightGrams: row.weight_grams,
      attributes: row.attributes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  // Get brands
  async getBrands(): Promise<string[]> {
    const result = await pool.query(
      `SELECT DISTINCT brand FROM products 
       WHERE brand IS NOT NULL AND status = 'published'
       ORDER BY brand ASC`
    )

    return result.rows.map((row) => row.brand)
  }

  private mapProduct(row: any): Product & { stockQuantity: number; price: number; sku?: string } {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      specifications: row.specifications,
      basePrice: parseFloat(row.base_price),
      price: parseFloat(row.price || row.base_price), // sale price or base price
      stockQuantity: parseInt(row.stock_quantity) || 0,
      sku: row.sku,
      categoryId: row.category_id,
      brand: row.brand,
      status: row.status,
      averageRating: row.average_rating ? parseFloat(row.average_rating) : 0,
      reviewCount: row.review_count || 0,
      viewCount: row.view_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapCategory(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      parentId: row.parent_id,
      imageUrl: row.image_url,
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

export default new ProductService()
