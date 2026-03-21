import { createClient } from 'redis'
import dotenv from 'dotenv'

dotenv.config()

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    reconnectStrategy: false,
  },
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB || '0'),
})

let redisAvailable = false

redisClient.on('connect', () => {
  redisAvailable = true
  console.log('Redis connected successfully')
})

redisClient.on('error', () => {
  // suppress repeated error spam
})

export const connectRedis = async () => {
  try {
    await redisClient.connect()
    redisAvailable = true
  } catch {
    console.warn('Redis unavailable — running without cache (dev mode)')
    redisAvailable = false
  }
}

// Safe wrappers — silently no-op when Redis is down
export const cache = {
  get: async (key: string): Promise<string | null> => {
    if (!redisAvailable) return null
    try { return await redisClient.get(key) } catch { return null }
  },
  set: async (key: string, ttl: number, value: string): Promise<void> => {
    if (!redisAvailable) return
    try { await redisClient.setEx(key, ttl, value) } catch { /* ignore */ }
  },
  del: async (...keys: string[]): Promise<void> => {
    if (!redisAvailable) return
    try { if (keys.length > 0) await redisClient.del(keys) } catch { /* ignore */ }
  },
}

export default redisClient
