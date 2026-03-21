import rateLimit from 'express-rate-limit'

const isDev = process.env.NODE_ENV === 'development'

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 200,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

// Login: 5 req/min in prod, relaxed in dev
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 100 : 5,
  message: 'Too many login attempts, please try again in a minute',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
})

// Register: 3 req/min in prod
export const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 100 : 3,
  message: 'Too many registration attempts, please try again in a minute',
  standardHeaders: true,
  legacyHeaders: false,
})

// Password reset: 3 req/hour
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 50 : 3,
  message: 'Too many password reset requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

// General API limiter
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 500 : 60,
  message: 'API rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
})

// Keep old name for backward compat
export const authLimiter = loginLimiter
