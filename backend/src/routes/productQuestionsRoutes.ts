import { Router, Response } from 'express'
import { AuthRequest, authenticate, optionalAuth, authorize } from '../middleware/auth'
import pool from '../config/database'
import { AppError } from '../middleware/errorHandler'

const router = Router({ mergeParams: true })

// Product Q&A API
// Routes mounted at /api/products/:productId/questions

// GET /api/products/:productId/questions - Get all Q&A for a product
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params
    const { sort = 'votes', answered = 'all' } = req.query
    
    let orderBy = 'q.votes DESC, q.created_at DESC'
    if (sort === 'newest') orderBy = 'q.created_at DESC'
    if (sort === 'answered') orderBy = 'q.is_answered DESC, q.created_at DESC'
    
    let whereClause = 'WHERE q.product_id = ?'
    if (answered === 'answered') whereClause += ' AND q.is_answered = true'
    if (answered === 'unanswered') whereClause += ' AND q.is_answered = false'
    
    const result = await pool.query(
      `SELECT 
        q.*,
        u.first_name as asker_first_name, u.last_name as asker_last_name,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT(
          'id', a.id,
          'answer', a.answer,
          'isOfficial', a.is_official,
          'votes', a.votes,
          'createdAt', a.created_at,
          'author', CASE 
            WHEN a.seller_id IS NOT NULL THEN JSON_OBJECT(
              'type', 'seller',
              'name', sp.store_name,
              'isVerified', sp.is_verified
            )
            ELSE JSON_OBJECT(
              'type', 'customer',
              'firstName', au.first_name,
              'lastName', au.last_name
            )
          END
        ))
         FROM (SELECT * FROM product_answers WHERE question_id = q.id ORDER BY is_official DESC, votes DESC) a
         LEFT JOIN users au ON au.id = a.user_id
         LEFT JOIN seller_profiles sp ON sp.id = a.seller_id
        ) as answers
      FROM product_questions q
      JOIN users u ON u.id = q.user_id
      ${whereClause}
      ORDER BY ${orderBy}`,
      [productId]
    )
    
    // Get stats
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_questions,
        SUM(CASE WHEN is_answered THEN 1 ELSE 0 END) as answered_questions,
        AVG(votes) as avg_votes
      FROM product_questions WHERE product_id = ?`,
      [productId]
    )
    
    res.json({
      data: result.rows,
      stats: statsResult.rows[0]
    })
  } catch (error) {
    throw new AppError('Failed to fetch questions', 500)
  }
})

// POST /api/products/:productId/questions - Ask a question
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params
    const userId = req.user!.userId
    const { question } = req.body
    
    if (!question || question.trim().length < 10) {
      throw new AppError('Question must be at least 10 characters', 400)
    }
    
    // Check if user already asked this question
    const duplicateCheck = await pool.query(
      `SELECT id FROM product_questions 
       WHERE product_id = ? AND user_id = ? AND question LIKE ?`,
      [productId, userId, `%${question}%`]
    )
    
    if (duplicateCheck.rows.length > 0) {
      throw new AppError('You have already asked a similar question', 400)
    }
    
    const id = (await import('crypto')).randomUUID()
    await pool.query(
      `INSERT INTO product_questions (id, product_id, user_id, question)
       VALUES (?, ?, ?, ?)`,
      [id, productId, userId, question.trim()]
    )
    const result = await pool.query('SELECT * FROM product_questions WHERE id = ?', [id])
    
    // Notify seller
    const sellerResult = await pool.query(
      `SELECT user_id FROM seller_profiles sp
       JOIN products p ON p.seller_id = sp.user_id
       WHERE p.id = ?`,
      [productId]
    )
    
    if (sellerResult.rows.length > 0) {
      const targetSellerId = sellerResult.rows[0].user_id
      const notificationId = (await import('crypto')).randomUUID()
      await pool.query(
        `INSERT INTO notifications (id, user_id, type, title, message)
         VALUES (?, ?, ?, ?, ?)`,
        [notificationId, targetSellerId, 'system', 'New Product Question', 'A customer has asked a new question about your product.']
      ).catch(e => console.error('Failed to send question notification'))
    }
    
    res.status(201).json({
      message: 'Question posted successfully',
      data: (result as any[])[0]
    })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to post question', 500)
  }
})

// POST /api/products/:productId/questions/:questionId/vote - Vote on question
router.post('/:questionId/vote', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { questionId } = req.params
    const { vote } = req.body // 1 or -1
    
    await pool.query(
      `UPDATE product_questions SET votes = votes + ? WHERE id = ?`,
      [vote, questionId]
    )
    
    res.json({ message: 'Vote recorded' })
  } catch (error) {
    throw new AppError('Failed to vote', 500)
  }
})

// POST /api/products/:productId/questions/:questionId/answers - Answer a question
router.post('/:questionId/answers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, questionId } = req.params
    const userId = req.user!.userId
    const { answer } = req.body
    
    if (!answer || answer.trim().length < 5) {
      throw new AppError('Answer must be at least 5 characters', 400)
    }
    
    // Check if user is the seller of this product
    const sellerCheck = await pool.query(
      `SELECT sp.id as seller_profile_id
       FROM products p
       JOIN seller_profiles sp ON sp.user_id = ?
       WHERE p.id = ? AND p.seller_id = ?`,
      [userId, productId, userId]
    )
    
    const isSeller = sellerCheck.rows.length > 0
    const sellerProfileId = isSeller ? sellerCheck.rows[0].seller_profile_id : null
    
    const id = (await import('crypto')).randomUUID()
    await pool.query(
      `INSERT INTO product_answers (id, question_id, user_id, seller_id, answer, is_official)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, questionId, userId, sellerProfileId, answer.trim(), isSeller]
    )
    const result = await pool.query('SELECT * FROM product_answers WHERE id = ?', [id])
    
    // Notify question asker
    const questionResult = await pool.query(
      `SELECT user_id FROM product_questions WHERE id = ?`,
      [questionId]
    )
    
    if (questionResult.rows.length > 0 && questionResult.rows[0].user_id !== userId) {
      const askerId = questionResult.rows[0].user_id
      const notificationId = (await import('crypto')).randomUUID()
      await pool.query(
        `INSERT INTO notifications (id, user_id, type, title, message)
         VALUES (?, ?, ?, ?, ?)`,
        [notificationId, askerId, 'system', 'Question Answered', 'Someone has answered your product question.']
      ).catch(e => console.error('Failed to notify question asker:', e))
    }
    
    res.status(201).json({
      message: 'Answer posted successfully',
      data: (result as any[])[0]
    })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to post answer', 500)
  }
})

// POST /api/products/:productId/questions/:questionId/answers/:answerId/vote
router.post('/:questionId/answers/:answerId/vote', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { answerId } = req.params
    const { vote } = req.body
    
    await pool.query(
      `UPDATE product_answers SET votes = votes + ? WHERE id = ?`,
      [vote, answerId]
    )
    
    res.json({ message: 'Vote recorded' })
  } catch (error) {
    throw new AppError('Failed to vote', 500)
  }
})

// DELETE /api/products/:productId/questions/:questionId - Delete question (owner or admin)
router.delete('/:questionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { questionId } = req.params
    const userId = req.user!.userId
    const userRole = req.user!.role
    
    // Check ownership or admin
    const checkResult = await pool.query(
      `SELECT user_id FROM product_questions WHERE id = ?`,
      [questionId]
    )
    
    if (checkResult.rows.length === 0) {
      throw new AppError('Question not found', 404)
    }
    
    const isOwner = checkResult.rows[0].user_id === userId
    const isAdmin = userRole === 'admin'
    
    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to delete this question', 403)
    }
    
    await pool.query(`DELETE FROM product_questions WHERE id = ?`, [questionId])
    
    res.json({ message: 'Question deleted' })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Failed to delete question', 500)
  }
})

// DELETE /api/products/:productId/questions/:questionId/answers/:answerId
router.delete('/:questionId/answers/:answerId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { answerId } = req.params
    const userId = req.user!.userId
    const userRole = req.user!.role
    
    const checkResult = await pool.query(
      `SELECT user_id FROM product_answers WHERE id = ?`,
      [answerId]
    )
    
    if (checkResult.rows.length === 0) {
      throw new AppError('Answer not found', 404)
    }
    
    const isOwner = checkResult.rows[0].user_id === userId
    const isAdmin = userRole === 'admin'
    
    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized', 403)
    }
    
    await pool.query(`DELETE FROM product_answers WHERE id = ?`, [answerId])
    
    res.json({ message: 'Answer deleted' })
  } catch (error) {
    throw new AppError('Failed to delete answer', 500)
  }
})

// GET /api/questions/my-questions - Get all questions asked by user
router.get('/my-questions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    
    const result = await pool.query(
      `SELECT 
        q.*,
        p.name as product_name, p.slug as product_slug,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as product_image,
        (SELECT COUNT(*) FROM product_answers WHERE question_id = q.id) as answer_count
      FROM product_questions q
      JOIN products p ON p.id = q.product_id
      WHERE q.user_id = ?
      ORDER BY q.created_at DESC`,
      [userId]
    )
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch your questions', 500)
  }
})

// GET /api/questions/pending - Get unanswered questions for seller products
router.get('/pending', authenticate, authorize('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.userId
    
    const result = await pool.query(
      `SELECT 
        q.*,
        p.name as product_name, p.slug as product_slug,
        u.first_name, u.last_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as product_image
      FROM product_questions q
      JOIN products p ON p.id = q.product_id
      JOIN users u ON u.id = q.user_id
      WHERE p.seller_id = ? AND q.is_answered = false
      ORDER BY q.created_at ASC`,
      [sellerId]
    )
    
    res.json({ data: result.rows })
  } catch (error) {
    throw new AppError('Failed to fetch pending questions', 500)
  }
})

export default router
