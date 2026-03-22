import pool from '../config/database'
import crypto from 'crypto'

interface CreateReviewDTO {
  productId: string
  userId: string
  orderId?: string
  rating: number
  title?: string
  comment?: string
}

interface UpdateReviewDTO {
  rating?: number
  title?: string
  comment?: string
}

interface Review {
  id: string
  productId: string
  userId: string
  orderId?: string
  rating: number
  title?: string
  comment?: string
  isVerifiedPurchase: boolean
  isApproved: boolean
  helpfulCount: number
  user?: {
    firstName?: string
    lastName?: string
  }
  createdAt: Date
  updatedAt: Date
}

interface CreateQuestionDTO {
  productId: string
  userId: string
  question: string
}

interface Question {
  id: string
  productId: string
  userId: string
  question: string
  isAnswered: boolean
  isApproved: boolean
  answers: Answer[]
  user?: {
    firstName?: string
    lastName?: string
  }
  createdAt: Date
  updatedAt: Date
}

interface CreateAnswerDTO {
  questionId: string
  userId: string
  answer: string
  isSeller?: boolean
}

interface Answer {
  id: string
  questionId: string
  userId: string
  answer: string
  isSeller: boolean
  isApproved: boolean
  helpfulCount: number
  user?: {
    firstName?: string
    lastName?: string
  }
  createdAt: Date
  updatedAt: Date
}

interface Pagination {
  limit: number
  offset: number
}

interface PaginatedResult<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

export class ReviewService {
  async createReview(data: CreateReviewDTO): Promise<Review> {
    const client = await pool.getConnection()

    try {
      await client.beginTransaction()

      // Check if user already reviewed this product
      const [existing] = await client.query(
        'SELECT id FROM reviews WHERE product_id = ? AND user_id = ?',
        [data.productId, data.userId]
      )
      const existingReviews = existing as any[]

      if (existingReviews.length > 0) {
        throw new Error('You have already reviewed this product')
      }

      // Verify purchase if orderId provided
      let isVerifiedPurchase = false
      if (data.orderId) {
        const [purchase] = await client.query(
          `SELECT oi.id FROM order_items oi
           JOIN orders o ON oi.order_id = o.id
           WHERE o.id = ? AND o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered'`,
          [data.orderId, data.userId, data.productId]
        )
        isVerifiedPurchase = (purchase as any[]).length > 0
      }

      // Create review
      const id = crypto.randomUUID()
      await client.query(
        `INSERT INTO reviews (
          id, product_id, user_id, order_id, rating, title, comment, is_verified_purchase
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.productId,
          data.userId,
          data.orderId || null,
          data.rating,
          data.title || null,
          data.comment || null,
          isVerifiedPurchase,
        ]
      )

      // Update product average rating
      await this.updateProductRating(data.productId, client)

      await client.commit()

      const review = await this.getReviewById(id)
      if (!review) throw new Error('Failed to retrieve review after creation')
      return review
    } catch (error) {
      await client.rollback()
      throw error
    } finally {
      client.release()
    }
  }

  async getReviews(
    productId: string,
    pagination: Pagination
  ): Promise<PaginatedResult<Review>> {
    const { limit, offset } = pagination

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM reviews WHERE product_id = ? AND is_approved = true',
      [productId]
    )
    const total = parseInt((countResult.rows[0] as any).count)

    // Get reviews with user info
    const reviewsResult = await pool.query(
      `SELECT r.*, u.first_name, u.last_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ? AND r.is_approved = true
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [productId, limit, offset]
    )

    const reviews = reviewsResult.rows.map((row: any) => ({
      ...this.mapReview(row),
      user: {
        firstName: row.first_name,
        lastName: row.last_name,
      },
    }))

    return {
      data: reviews,
      total,
      limit,
      offset,
    }
  }

  async getReviewById(id: string): Promise<Review | null> {
    const result = await pool.query(
      `SELECT r.*, u.first_name, u.last_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [id]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      ...this.mapReview(row),
      user: {
        firstName: row.first_name,
        lastName: row.last_name,
      },
    }
  }

  async updateReview(id: string, userId: string, data: UpdateReviewDTO): Promise<Review> {
    const client = await pool.getConnection()

    try {
      await client.beginTransaction()

      // Verify ownership
      const [check] = await client.query(
        'SELECT product_id FROM reviews WHERE id = ? AND user_id = ?',
        [id, userId]
      )
      const rows = check as any[]

      if (rows.length === 0) {
        throw new Error('Review not found or unauthorized')
      }

      const productId = rows[0].product_id

      // Build update query
      const updates: string[] = []
      const values: any[] = []

      if (data.rating !== undefined) {
        updates.push('rating = ?')
        values.push(data.rating)
      }

      if (data.title !== undefined) {
        updates.push('title = ?')
        values.push(data.title)
      }

      if (data.comment !== undefined) {
        updates.push('comment = ?')
        values.push(data.comment)
      }

      if (updates.length === 0) {
        throw new Error('No fields to update')
      }

      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      await client.query(
        `UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`,
        values
      )

      // Update product average rating if rating changed
      if (data.rating !== undefined) {
        await this.updateProductRating(productId, client)
      }

      await client.commit()

      const review = await this.getReviewById(id)
      if (!review) throw new Error('Review not found after update')
      return review
    } catch (error) {
      await client.rollback()
      throw error
    } finally {
      client.release()
    }
  }

  async deleteReview(id: string, userId: string): Promise<void> {
    const client = await pool.getConnection()

    try {
      await client.beginTransaction()

      // Get product_id before deleting
      const [review] = await client.query(
        'SELECT product_id FROM reviews WHERE id = ? AND user_id = ?',
        [id, userId]
      )
      const rows = review as any[]

      if (rows.length === 0) {
        throw new Error('Review not found or unauthorized')
      }

      const productId = rows[0].product_id

      // Delete review
      await client.query('DELETE FROM reviews WHERE id = ?', [id])

      // Update product average rating
      await this.updateProductRating(productId, client)

      await client.commit()
    } catch (error) {
      await client.rollback()
      throw error
    } finally {
      client.release()
    }
  }

  async markReviewHelpful(id: string): Promise<void> {
    await pool.query(
      'UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?',
      [id]
    )
  }

  async getAverageRating(productId: string): Promise<number> {
    const result = await pool.query(
      'SELECT ROUND(AVG(rating), 2) as avg_rating FROM reviews WHERE product_id = ? AND is_approved = true',
      [productId]
    )

    return parseFloat((result.rows[0] as any).avg_rating) || 0
  }

  async verifyPurchase(userId: string, productId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT oi.id FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered'
       LIMIT 1`,
      [userId, productId]
    )

    return result.rows.length > 0
  }

  // Product Q&A methods
  async createQuestion(data: CreateQuestionDTO): Promise<Question> {
    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO product_questions (id, product_id, user_id, question)
       VALUES (?, ?, ?, ?)`,
      [id, data.productId, data.userId, data.question]
    )

    const question = await this.getQuestionById(id)
    if (!question) throw new Error('Failed to create question')
    return question
  }

  async getQuestionById(id: string): Promise<Question | null> {
    const result = await pool.query(
      `SELECT q.*, u.first_name, u.last_name
       FROM product_questions q
       LEFT JOIN users u ON q.user_id = u.id
       WHERE q.id = ?`,
      [id]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      ...this.mapQuestion(row),
      user: {
        firstName: row.first_name,
        lastName: row.last_name,
      },
    }
  }

  async getQuestions(
    productId: string,
    pagination: Pagination
  ): Promise<PaginatedResult<Question>> {
    const { limit, offset } = pagination

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM product_questions WHERE product_id = ? AND is_approved = true',
      [productId]
    )
    const total = parseInt((countResult.rows[0] as any).count)

    // Get questions with user info and answers
    const questionsResult = await pool.query(
      `SELECT q.*, u.first_name, u.last_name
       FROM product_questions q
       LEFT JOIN users u ON q.user_id = u.id
       WHERE q.product_id = ? AND q.is_approved = true
       ORDER BY q.created_at DESC
       LIMIT ? OFFSET ?`,
      [productId, limit, offset]
    )

    const questions: Question[] = []

    for (const row of questionsResult.rows) {
      // Get answers for each question
      const answersResult = await pool.query(
        `SELECT a.*, u.first_name, u.last_name
         FROM product_answers a
         LEFT JOIN users u ON a.user_id = u.id
         WHERE a.question_id = ? AND a.is_approved = true
         ORDER BY a.is_seller DESC, a.created_at ASC`,
        [row.id]
      )

      const answers = answersResult.rows.map((answerRow: any) => ({
        ...this.mapAnswer(answerRow),
        user: {
          firstName: answerRow.first_name,
          lastName: answerRow.last_name,
        },
      }))

      questions.push({
        ...this.mapQuestion(row),
        answers,
        user: {
          firstName: row.first_name,
          lastName: row.last_name,
        },
      })
    }

    return {
      data: questions,
      total,
      limit,
      offset,
    }
  }

  async createAnswer(data: CreateAnswerDTO): Promise<Answer> {
    const client = await pool.getConnection()

    try {
      await client.beginTransaction()

      const id = crypto.randomUUID()
      await client.query(
        `INSERT INTO product_answers (id, question_id, user_id, answer, is_seller)
         VALUES (?, ?, ?, ?, ?)`,
        [id, data.questionId, data.userId, data.answer, data.isSeller || false]
      )

      // Mark question as answered
      await client.query(
        'UPDATE product_questions SET is_answered = true WHERE id = ?',
        [data.questionId]
      )

      await client.commit()

      const [result] = await client.query('SELECT * FROM product_answers WHERE id = ?', [id])
      return this.mapAnswer((result as any[])[0])
    } catch (error) {
      await client.rollback()
      throw error
    } finally {
      client.release()
    }
  }

  async markAnswerHelpful(id: string): Promise<void> {
    await pool.query(
      'UPDATE product_answers SET helpful_count = helpful_count + 1 WHERE id = ?',
      [id]
    )
  }

  private async updateProductRating(productId: string, client: any): Promise<void> {
    const [rating] = await client.query(
      `SELECT ROUND(AVG(rating), 2) as avg_rating, COUNT(*) as review_count
       FROM reviews
       WHERE product_id = ? AND is_approved = true`,
      [productId]
    )
    const ratingResult = rating as any[]

    const avgRating = parseFloat(ratingResult[0].avg_rating) || 0
    const reviewCount = parseInt(ratingResult[0].review_count)

    await client.query(
      'UPDATE products SET average_rating = ?, review_count = ? WHERE id = ?',
      [avgRating, reviewCount, productId]
    )
  }

  private mapReview(row: any): Review {
    return {
      id: row.id,
      productId: row.product_id,
      userId: row.user_id,
      orderId: row.order_id,
      rating: row.rating,
      title: row.title,
      comment: row.comment,
      isVerifiedPurchase: row.is_verified_purchase,
      isApproved: row.is_approved,
      helpfulCount: row.helpful_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapQuestion(row: any): Question {
    return {
      id: row.id,
      productId: row.product_id,
      userId: row.user_id,
      question: row.question,
      isAnswered: row.is_answered,
      isApproved: row.is_approved,
      answers: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapAnswer(row: any): Answer {
    return {
      id: row.id,
      questionId: row.question_id,
      userId: row.user_id,
      answer: row.answer,
      isSeller: row.is_seller,
      isApproved: row.is_approved,
      helpfulCount: row.helpful_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

export default new ReviewService()
