import { Router, Response } from 'express'
import authService from '../services/authService'
import { AuthRequest, authenticate } from '../middleware/auth'
import {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from '../utils/validation'
import { verifyRefreshToken } from '../utils/jwt'
import { loginLimiter, registerLimiter, passwordResetLimiter } from '../middleware/rateLimiter'

const router = Router()

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerLimiter, validate(registerSchema), async (req, res: Response) => {
  try {
    const result = await authService.register(req.body)

    res.status(201).json({
      message: 'User registered successfully',
      data: result,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        res.status(409).json({ error: error.message })
        return
      }
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Registration failed' })
  }
})

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginLimiter, validate(loginSchema), async (req, res: Response) => {
  try {
    const { email, password } = req.body
    const result = await authService.login(email, password)

    res.status(200).json({
      message: 'Login successful',
      data: result,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('locked')) {
        res.status(423).json({ error: error.message })
        return
      }
      if (error.message.includes('disabled')) {
        res.status(403).json({ error: error.message })
        return
      }
      res.status(401).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Login failed' })
  }
})

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    // In a stateless JWT system, logout is handled client-side by removing the token
    // If using Redis for token blacklisting, add token to blacklist here
    res.status(200).json({
      message: 'Logout successful',
    })
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' })
  }
})

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh-token', validate(refreshTokenSchema), async (req, res: Response) => {
  try {
    const { refreshToken } = req.body

    const decoded = verifyRefreshToken(refreshToken)
    const result = await authService.refreshToken(decoded.userId, decoded.email, decoded.role)

    res.status(200).json({
      message: 'Token refreshed successfully',
      data: result,
    })
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({ error: 'Invalid or expired refresh token' })
      return
    }
    res.status(500).json({ error: 'Token refresh failed' })
  }
})

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  async (req, res: Response) => {
    try {
      const { email } = req.body
      const message = await authService.requestPasswordReset(email)

      res.status(200).json({
        message,
      })
    } catch (error) {
      res.status(500).json({ error: 'Password reset request failed' })
    }
  }
)

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', validate(resetPasswordSchema), async (req, res: Response) => {
  try {
    const { token, newPassword } = req.body
    await authService.resetPassword(token, newPassword)

    res.status(200).json({
      message: 'Password reset successful',
    })
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Password reset failed' })
  }
})

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated user)
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { oldPassword, newPassword } = req.body
      const userId = req.user!.userId

      await authService.changePassword(userId, oldPassword, newPassword)

      res.status(200).json({
        message: 'Password changed successfully',
      })
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message })
        return
      }
      res.status(500).json({ error: 'Password change failed' })
    }
  }
)

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address with token
 * @access  Public
 */
router.post('/verify-email', async (req, res: Response) => {
  try {
    const { token } = req.body
    if (!token) {
      res.status(400).json({ error: 'Verification token is required' })
      return
    }
    await authService.verifyEmail(token)
    res.status(200).json({ message: 'Email verified successfully' })
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Email verification failed' })
  }
})

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
router.post('/resend-verification', async (req, res: Response) => {
  try {
    const { email } = req.body
    if (!email) { res.status(400).json({ error: 'Email required' }); return }
    await authService.resendVerification(email)
    res.json({ message: 'If eligible, a verification email has been sent' })
  } catch {
    res.status(500).json({ error: 'Failed to resend verification' })
  }
})

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json({
      data: req.user,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info' })
  }
})

export default router
