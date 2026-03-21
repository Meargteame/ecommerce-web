import jwt from 'jsonwebtoken'

interface TokenPayload {
  userId: string
  email: string
  role: string
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as jwt.SignOptions['expiresIn'],
  })
}

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  })
}

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload
}

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload
}
