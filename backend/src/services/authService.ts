import bcrypt from 'bcrypt'
import pool from '../config/database'
import { generateAccessToken, generateRefreshToken } from '../utils/jwt'
import crypto from 'crypto'

interface RegisterDTO {
  email: string
  password: string
  firstName?: string
  lastName?: string
  phone?: string
  role?: 'customer' | 'seller'
}

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  emailVerified: boolean
  accountStatus: string
  role: string
  createdAt: Date
  updatedAt: Date
}

interface AuthResult {
  user: User
  accessToken: string
  refreshToken: string
}

export class AuthService {
  private readonly bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10')
  private readonly maxLoginAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5')
  private readonly lockoutDuration = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15')

  async register(data: RegisterDTO): Promise<AuthResult & { verificationToken: string }> {
    const { email, password, firstName, lastName, phone, role = 'customer' } = data

    const existing = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()])
    if (existing.rows.length > 0) throw new Error('User with this email already exists')

    const passwordHash = await bcrypt.hash(password, this.bcryptRounds)

    // Generate email verification token
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 3600 * 1000) // 24 hours
    const id = crypto.randomUUID()

    await pool.query(
      `INSERT INTO users (
        id, email, password_hash, first_name, last_name, phone, role,
        email_verification_token, email_verification_expires
      ) VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, email.toLowerCase(), passwordHash, firstName || null, lastName || null, phone || null,
       role, tokenHash, tokenExpiry]
    )

    const profile = await this.getUserById(id)
    if (!profile) throw new Error('User not found after registration')
    
    const user = profile
    const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role })
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role })

    return { user, accessToken, refreshToken, verificationToken: rawToken }
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, phone, email_verified, account_status, role, created_at, updated_at
       FROM users WHERE id = ?`,
      [id]
    )
    if (result.rows.length === 0) return null
    return this.mapUser(result.rows[0])
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const result = await pool.query(
      `SELECT id FROM users
       WHERE email_verification_token = ?
         AND email_verification_expires > CURRENT_TIMESTAMP
         AND email_verified = FALSE`,
      [tokenHash]
    )

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired verification token')
    }

    await pool.query(
      `UPDATE users
       SET email_verified = TRUE,
           email_verification_token = NULL,
           email_verification_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [result.rows[0].id]
    )
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const result = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name, phone,
              email_verified, account_status, is_active, role,
              failed_login_attempts, locked_until, created_at, updated_at
       FROM users WHERE email = ?`,
      [email.toLowerCase()]
    )

    if (result.rows.length === 0) throw new Error('Invalid email or password')

    const row = result.rows[0]

    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 60000)
      throw new Error(`Account is locked. Try again in ${mins} minutes`)
    }

    if (row.account_status === 'suspended' || row.account_status === 'banned' || row.is_active === false) {
      throw new Error('Account is disabled. Please contact support')
    }

    const valid = await bcrypt.compare(password, row.password_hash)
    if (!valid) {
      await this.handleFailedLogin(row.id, row.failed_login_attempts)
      throw new Error('Invalid email or password')
    }

    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
      [row.id]
    )

    const user = this.mapUser(row)
    const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role })
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role })

    return { user, accessToken, refreshToken }
  }

  async refreshToken(userId: string, email: string, role: string): Promise<{ accessToken: string }> {
    const result = await pool.query(
      'SELECT account_status, is_active FROM users WHERE id = ?', [userId]
    )
    if (result.rows.length === 0) throw new Error('User not found')

    const { account_status, is_active } = result.rows[0]
    if (account_status === 'suspended' || account_status === 'banned' || is_active === false) {
      throw new Error('User account is not active')
    }

    return { accessToken: generateAccessToken({ userId, email, role }) }
  }

  async requestPasswordReset(email: string): Promise<string> {
      const result = await pool.query(
        'SELECT id FROM users WHERE email = ?', [email.toLowerCase()]
      )

      if (result.rows.length === 0) {
        return 'If an account exists with this email, a password reset link has been sent'
      }

      const rawToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
      const expiry = new Date(Date.now() + 3600000) // 1 hour

      await pool.query(
        'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
        [tokenHash, expiry, result.rows[0].id]
      )

      // Send password reset email (non-blocking)
      const { default: notificationService } = await import('./notificationService')
      notificationService.sendPasswordReset(email, rawToken).catch((err: Error) =>
        console.error('Password reset email failed:', err)
      )

      return 'If an account exists with this email, a password reset link has been sent'
    }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const result = await pool.query(
      `SELECT id FROM users
       WHERE password_reset_token = ? AND password_reset_expires > CURRENT_TIMESTAMP`,
      [tokenHash]
    )
    if (result.rows.length === 0) throw new Error('Invalid or expired reset token')

    const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds)
    await pool.query(
      `UPDATE users
       SET password_hash = ?, password_reset_token = NULL,
           password_reset_expires = NULL, failed_login_attempts = 0, locked_until = NULL
       WHERE id = ?`,
      [passwordHash, result.rows[0].id]
    )
  }

  async resendVerification(email: string): Promise<void> {
    const result = await pool.query(
      'SELECT id, email_verified FROM users WHERE email = ?', [email.toLowerCase()]
    )
    if (result.rows.length === 0 || result.rows[0].email_verified) return
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiry = new Date(Date.now() + 24 * 3600 * 1000)
    await pool.query(
      'UPDATE users SET email_verification_token=?, email_verification_expires=? WHERE id=?',
      [tokenHash, expiry, result.rows[0].id]
    )
    const { default: notificationService } = await import('./notificationService')
    notificationService.sendVerificationEmail(email.toLowerCase(), rawToken).catch(() => {})
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = ?', [userId]
    )
    if (result.rows.length === 0) throw new Error('User not found')

    const valid = await bcrypt.compare(oldPassword, result.rows[0].password_hash)
    if (!valid) throw new Error('Current password is incorrect')

    const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds)
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId])
  }

  private async handleFailedLogin(userId: string, currentAttempts: number): Promise<void> {
    const newAttempts = currentAttempts + 1
    if (newAttempts >= this.maxLoginAttempts) {
      const lockUntil = new Date(Date.now() + this.lockoutDuration * 60000)
      await pool.query(
        'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
        [newAttempts, lockUntil, userId]
      )
    } else {
      await pool.query(
        'UPDATE users SET failed_login_attempts = ? WHERE id = ?',
        [newAttempts, userId]
      )
    }
  }

  private mapUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      emailVerified: row.email_verified,
      accountStatus: row.account_status,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

export default new AuthService()
