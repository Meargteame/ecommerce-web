import pool from '../config/database'
import crypto from 'crypto'

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
  product?: any;
}

export class WishlistService {
  async getWishlist(userId: string): Promise<WishlistItem[]> {
    const result = await pool.query(`
      SELECT w.id, w.user_id as userId, w.product_id as productId, w.created_at as createdAt,
             JSON_OBJECT(
               'id', p.id,
               'name', p.name,
               'slug', p.slug,
               'price', p.price,
               'compareAtPrice', p.compare_at_price,
               'averageRating', p.average_rating,
               'reviewCount', p.review_count,
               'imageUrl', (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1)
             ) as product
      FROM wishlists w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `, [userId]);
    return result.rows;
  }

  async addProduct(userId: string, productId: string): Promise<WishlistItem> {
    try {
      const id = crypto.randomUUID()
      await pool.query(
        'INSERT INTO wishlists (id, user_id, product_id) VALUES (?, ?, ?)',
        [id, userId, productId]
      );
      
      const [result] = await pool.query(
        'SELECT id, user_id as userId, product_id as productId, created_at as createdAt FROM wishlists WHERE id = ?',
        [id]
      )
      return (result as any[])[0];
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') { 
         throw new Error('Product already in wishlist');
      }
      throw error;
    }
  }

  async removeProduct(userId: string, productId: string): Promise<void> {
    await pool.query(
      'DELETE FROM wishlists WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
  }
}

export default new WishlistService();
