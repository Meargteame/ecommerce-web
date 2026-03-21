import pool from '../config/database'

interface UpdateProfileDTO {
  firstName?: string
  lastName?: string
  phone?: string
  avatarUrl?: string
}

interface AddressDTO {
  addressType: 'shipping' | 'billing'
  fullName: string
  addressLine1: string
  addressLine2?: string
  city: string
  state?: string
  postalCode: string
  country: string
  phone?: string
  isDefault?: boolean
}

interface Address extends AddressDTO {
  id: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  avatarUrl?: string
  emailVerified: boolean
  accountStatus: string
  role: string
  createdAt: Date
  updatedAt: Date
}

export class UserService {
  async getProfile(userId: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, phone, avatar_url, email_verified,
              account_status, role, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    )
    if (result.rows.length === 0) return null
    return this.mapUser(result.rows[0])
  }

  async updateProfile(userId: string, data: UpdateProfileDTO): Promise<User> {
    const { firstName, lastName, phone, avatarUrl } = data
    const updates: string[] = []
    const values: any[] = []
    let p = 1

    if (firstName !== undefined) { updates.push(`first_name = $${p++}`); values.push(firstName) }
    if (lastName !== undefined)  { updates.push(`last_name = $${p++}`);  values.push(lastName) }
    if (phone !== undefined)     { updates.push(`phone = $${p++}`);      values.push(phone) }
    if (avatarUrl !== undefined) { updates.push(`avatar_url = $${p++}`); values.push(avatarUrl) }

    if (updates.length === 0) throw new Error('No fields to update')

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(userId)

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${p}
       RETURNING id, email, first_name, last_name, phone, avatar_url, email_verified,
                 account_status, role, created_at, updated_at`,
      values
    )
    return this.mapUser(result.rows[0])
  }

  async becomeSeller(userId: string, storeName?: string, contactEmail?: string, description?: string): Promise<User> {
    const current = await pool.query('SELECT role FROM users WHERE id = $1', [userId])
    if (current.rows.length === 0) throw new Error('User not found')
    if (current.rows[0].role === 'seller' || current.rows[0].role === 'admin') {
      throw new Error('User is already a seller or admin')
    }
    const result = await pool.query(
      `UPDATE users SET role = 'seller', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, first_name, last_name, phone, avatar_url, email_verified,
                 account_status, role, created_at, updated_at`,
      [userId]
    )
    try {
      await pool.query(
        `INSERT INTO seller_profiles (user_id, store_name, contact_email, store_description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET store_name = EXCLUDED.store_name`,
        [userId, storeName || 'My Store', contactEmail || null, description || null]
      )
    } catch {
      // seller_profiles table may not exist yet — ignore
    }
    return this.mapUser(result.rows[0])
  }

  async getAddresses(userId: string): Promise<Address[]> {
    const result = await pool.query(
      `SELECT id, user_id, address_type, full_name, address_line1, address_line2,
              city, state, postal_code, country, phone, is_default, created_at, updated_at
       FROM addresses WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    )
    return result.rows.map(this.mapAddress)
  }

  async getAddress(userId: string, addressId: string): Promise<Address | null> {
    const result = await pool.query(
      `SELECT id, user_id, address_type, full_name, address_line1, address_line2,
              city, state, postal_code, country, phone, is_default, created_at, updated_at
       FROM addresses WHERE id = $1 AND user_id = $2`,
      [addressId, userId]
    )
    if (result.rows.length === 0) return null
    return this.mapAddress(result.rows[0])
  }

  async createAddress(userId: string, data: AddressDTO): Promise<Address> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      if (data.isDefault) {
        await client.query(
          'UPDATE addresses SET is_default = FALSE WHERE user_id = $1 AND address_type = $2',
          [userId, data.addressType]
        )
      }
      const result = await client.query(
        `INSERT INTO addresses (
          user_id, address_type, full_name, address_line1, address_line2,
          city, state, postal_code, country, phone, is_default
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING id, user_id, address_type, full_name, address_line1, address_line2,
                  city, state, postal_code, country, phone, is_default, created_at, updated_at`,
        [
          userId, data.addressType, data.fullName, data.addressLine1,
          data.addressLine2 || null, data.city, data.state || null,
          data.postalCode, data.country, data.phone || null, data.isDefault || false,
        ]
      )
      await client.query('COMMIT')
      return this.mapAddress(result.rows[0])
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async updateAddress(userId: string, addressId: string, data: Partial<AddressDTO>): Promise<Address> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const checkResult = await client.query(
        'SELECT id, address_type FROM addresses WHERE id = $1 AND user_id = $2',
        [addressId, userId]
      )
      if (checkResult.rows.length === 0) throw new Error('Address not found')

      const addressType = checkResult.rows[0].address_type
      if (data.isDefault) {
        await client.query(
          'UPDATE addresses SET is_default = FALSE WHERE user_id = $1 AND address_type = $2 AND id != $3',
          [userId, addressType, addressId]
        )
      }

      const updates: string[] = []
      const values: any[] = []
      let p = 1

      const fieldMap: [keyof AddressDTO, string][] = [
        ['addressType', 'address_type'], ['fullName', 'full_name'],
        ['addressLine1', 'address_line1'], ['addressLine2', 'address_line2'],
        ['city', 'city'], ['state', 'state'], ['postalCode', 'postal_code'],
        ['country', 'country'], ['phone', 'phone'], ['isDefault', 'is_default'],
      ]

      for (const [field, col] of fieldMap) {
        if (data[field] !== undefined) {
          updates.push(`${col} = $${p++}`)
          values.push(data[field])
        }
      }

      if (updates.length === 0) throw new Error('No fields to update')
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(addressId, userId)

      const result = await client.query(
        `UPDATE addresses SET ${updates.join(', ')}
         WHERE id = $${p} AND user_id = $${p + 1}
         RETURNING id, user_id, address_type, full_name, address_line1, address_line2,
                   city, state, postal_code, country, phone, is_default, created_at, updated_at`,
        values
      )
      await client.query('COMMIT')
      return this.mapAddress(result.rows[0])
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const result = await pool.query(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    )
    if (result.rowCount === 0) throw new Error('Address not found')
  }

  async getWishlist(userId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT w.id, w.product_id, w.created_at,
              p.name, p.slug, p.base_price, p.status, p.average_rating,
              (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) as image_url
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    )
    return result.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      createdAt: row.created_at,
      product: {
        name: row.name,
        slug: row.slug,
        basePrice: parseFloat(row.base_price),
        status: row.status,
        averageRating: row.average_rating ? parseFloat(row.average_rating) : null,
        imageUrl: row.image_url,
      },
    }))
  }

  async addToWishlist(userId: string, productId: string): Promise<void> {
    const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [productId])
    if (productCheck.rows.length === 0) throw new Error('Product not found')

    const existingCheck = await pool.query(
      'SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    )
    if (existingCheck.rows.length > 0) throw new Error('Product already in wishlist')

    await pool.query('INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2)', [userId, productId])
  }

  async removeFromWishlist(userId: string, wishlistId: string): Promise<void> {
    const result = await pool.query(
      'DELETE FROM wishlists WHERE id = $1 AND user_id = $2',
      [wishlistId, userId]
    )
    if (result.rowCount === 0) throw new Error('Wishlist item not found')
  }

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    )
    return result.rows.length > 0
  }

  async getOrderHistory(userId: string, limit = 20, offset = 0): Promise<any[]> {
    const result = await pool.query(
      `SELECT id, order_number, status, subtotal, shipping_cost, tax_amount,
              discount_amount, total_amount, currency, created_at, updated_at
       FROM orders WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )
    return result.rows.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      subtotal: parseFloat(row.subtotal),
      shippingCost: parseFloat(row.shipping_cost),
      taxAmount: parseFloat(row.tax_amount),
      discountAmount: parseFloat(row.discount_amount),
      totalAmount: parseFloat(row.total_amount),
      currency: row.currency,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  async listUsers(role?: string, limit = 50, offset = 0): Promise<{ users: User[]; total: number }> {
    const conditions: string[] = []
    const values: any[] = []
    let p = 1

    if (role) { conditions.push(`role = $${p++}`); values.push(role) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [usersResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, email, first_name, last_name, phone, avatar_url, email_verified,
                account_status, role, created_at, updated_at
         FROM users ${where}
         ORDER BY created_at DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        [...values, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM users ${where}`, values),
    ])

    return {
      users: usersResult.rows.map(this.mapUser),
      total: parseInt(countResult.rows[0].count),
    }
  }

  async updateUserStatus(userId: string, status: string): Promise<User> {
    const allowed = ['active', 'suspended', 'banned']
    if (!allowed.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${allowed.join(', ')}`)
    }
    const result = await pool.query(
      `UPDATE users SET account_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, first_name, last_name, phone, avatar_url, email_verified,
                 account_status, role, created_at, updated_at`,
      [status, userId]
    )
    if (result.rows.length === 0) throw new Error('User not found')
    return this.mapUser(result.rows[0])
  }

  private mapUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      emailVerified: row.email_verified,
      accountStatus: row.account_status,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapAddress(row: any): Address {
    return {
      id: row.id,
      userId: row.user_id,
      addressType: row.address_type,
      fullName: row.full_name,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      country: row.country,
      phone: row.phone,
      isDefault: row.is_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

export default new UserService()
