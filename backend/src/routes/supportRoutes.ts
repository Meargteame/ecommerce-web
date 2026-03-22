import { Router, Response } from 'express'
import { AuthRequest, authenticate } from '../middleware/auth'
import pool from '../config/database'
import crypto from 'crypto'

const router = Router()
router.use(authenticate)

// GET /api/support/tickets — list current user's tickets
router.get('/tickets', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const result = await pool.query(
      `SELECT id, subject, message, status, priority, admin_response, created_at, updated_at
       FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    )
    res.json({ data: { tickets: result.rows } })
  } catch {
    res.status(500).json({ error: 'Failed to fetch tickets' })
  }
})

// POST /api/support/tickets — create a new ticket
router.post('/tickets', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const { subject, message, priority = 'medium' } = req.body
    if (!subject || !message) {
      res.status(400).json({ error: 'subject and message are required' })
      return
    }
    
    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO support_tickets (id, user_id, subject, message, priority, status)
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [id, userId, subject, message, priority]
    )
    
    const result = await pool.query(
      `SELECT id, subject, message, status, priority, admin_response, created_at, updated_at
       FROM support_tickets WHERE id = ?`,
      [id]
    )
    
    res.status(201).json({ data: result.rows[0] })
  } catch {
    res.status(500).json({ error: 'Failed to create ticket' })
  }
})

// GET /api/support/tickets/:id — get single ticket
router.get('/tickets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const result = await pool.query(
      `SELECT id, subject, message, status, priority, admin_response, created_at, updated_at
       FROM support_tickets WHERE id = ? AND user_id = ?`,
      [req.params.id, userId]
    )
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Ticket not found' })
      return
    }
    res.json({ data: result.rows[0] })
  } catch {
    res.status(500).json({ error: 'Failed to fetch ticket' })
  }
})

export default router
