import pool from '../config/database'

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
      SELECT w.id, w.user_id as "userId", w.product_id as "productId", w.created_at as "createdAt",
             json_build_object(
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
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
    `, [userId]);
    return result.rows;
  }

  async addProduct(userId: string, productId: string): Promise<WishlistItem> {
    try {
      const result = await pool.query(
        'INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2) RETURNING id, user_id as "userId", product_id as "productId", created_at as "createdAt"',
        [userId, productId]
      );
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') { // unique violation constraint
         throw new Error('Product already in wishlist');
      }
      throw error;
    }
  }

  async removeProduct(userId: string, productId: string): Promise<void> {
    await pool.query(
      'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );
  }
}

export default new WishlistService();
