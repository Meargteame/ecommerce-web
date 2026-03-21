import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'
import pool from '../config/database'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    email: string
    role: string
  }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' })
      return
    }

    const token = authHeader.substring(7)

    try {
      const decoded = verifyAccessToken(token)
      req.user = decoded
      next()
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' })
    return
  }
}

/**
 * authorize — checks roles against the LIVE DB role, not just the JWT claim.
 * This means role upgrades (customer → seller) take effect immediately
 * without requiring the user to re-login.
 */
export const authorize = (...roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    // Fast path: token role already satisfies requirement
    if (roles.includes(req.user.role)) {
      next()
      return
    }

    // Slow path: re-check DB role (handles role upgrades without re-login)
    try {
      const result = await pool.query(
        'SELECT role FROM users WHERE id = $1 AND account_status = $2',
        [req.user.userId, 'active']
      )
      if (result.rows.length === 0) {
        res.status(403).json({ error: 'Account not found or inactive' })
        return
      }
      const dbRole = result.rows[0].role
      // Update the request user object with the live role
      req.user = { ...req.user, role: dbRole }

      if (!roles.includes(dbRole)) {
        res.status(403).json({ error: 'Insufficient permissions' })
        return
      }
      next()
    } catch {
      res.status(500).json({ error: 'Authorization error' })
    }
  }
}

export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const decoded = verifyAccessToken(token)
        req.user = decoded
      } catch {
        // invalid token — ignore for optional auth
      }
    }
    next()
  } catch {
    next()
  }
}
