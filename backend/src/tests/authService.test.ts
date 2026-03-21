import bcrypt from 'bcrypt'

// Mock the database pool
jest.mock('../config/database', () => ({
  default: { query: jest.fn() },
  __esModule: true,
}))

// Mock JWT utils
jest.mock('../utils/jwt', () => ({
  generateAccessToken: jest.fn(() => 'mock-access-token'),
  generateRefreshToken: jest.fn(() => 'mock-refresh-token'),
}))

import pool from '../config/database'
import { AuthService } from '../services/authService'

const mockPool = pool as jest.Mocked<typeof pool>
const authService = new AuthService()

describe('AuthService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('register', () => {
    it('throws if email already exists', async () => {
      ;(mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'existing-id' }], rowCount: 1 })

      await expect(
        authService.register({ email: 'test@example.com', password: 'Password1!' })
      ).rejects.toThrow('already exists')
    })

    it('creates a new user and returns tokens', async () => {
      ;(mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // no existing user
        .mockResolvedValueOnce({
          rows: [{
            id: 'new-user-id', email: 'test@example.com',
            first_name: 'Test', last_name: 'User', phone: null,
            email_verified: false, account_status: 'active',
            role: 'customer', created_at: new Date(), updated_at: new Date(),
          }],
          rowCount: 1,
        })

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password1!',
        firstName: 'Test',
        lastName: 'User',
      })

      expect(result.user.email).toBe('test@example.com')
      expect(result.accessToken).toBe('mock-access-token')
      expect(result.refreshToken).toBe('mock-refresh-token')
      expect(result.verificationToken).toBeDefined()
    })
  })

  describe('login', () => {
    it('throws on invalid email', async () => {
      ;(mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 })
      await expect(authService.login('bad@example.com', 'pass')).rejects.toThrow('Invalid email or password')
    })

    it('throws on locked account', async () => {
      const lockedUntil = new Date(Date.now() + 60000)
      ;(mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'u1', email: 'test@example.com', password_hash: 'hash',
          first_name: null, last_name: null, phone: null,
          email_verified: true, account_status: 'active', is_active: true,
          role: 'customer', failed_login_attempts: 5,
          locked_until: lockedUntil, created_at: new Date(), updated_at: new Date(),
        }],
        rowCount: 1,
      })

      await expect(authService.login('test@example.com', 'pass')).rejects.toThrow('locked')
    })

    it('returns tokens on valid credentials', async () => {
      const hash = await bcrypt.hash('Password1!', 10)
      ;(mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: 'u1', email: 'test@example.com', password_hash: hash,
            first_name: 'Test', last_name: 'User', phone: null,
            email_verified: true, account_status: 'active', is_active: true,
            role: 'customer', failed_login_attempts: 0,
            locked_until: null, created_at: new Date(), updated_at: new Date(),
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // reset attempts

      const result = await authService.login('test@example.com', 'Password1!')
      expect(result.accessToken).toBe('mock-access-token')
      expect(result.user.email).toBe('test@example.com')
    })
  })

  describe('verifyEmail', () => {
    it('throws on invalid token', async () => {
      ;(mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 })
      await expect(authService.verifyEmail('bad-token')).rejects.toThrow('Invalid or expired')
    })

    it('marks email as verified', async () => {
      ;(mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'u1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await expect(authService.verifyEmail('valid-token')).resolves.toBeUndefined()
    })
  })
})
