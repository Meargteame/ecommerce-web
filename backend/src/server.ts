import dotenv from 'dotenv'
import app from './app'
import pool from './config/database'
import { connectRedis } from './config/redis'

// Load environment variables
dotenv.config()

const PORT = process.env.PORT || 5000

// Test database connection
const testDatabaseConnection = async () => {
  try {
    const client = await pool.connect()
    console.log('Database connection test successful')
    client.release()
  } catch (error) {
    console.error('Database connection test failed:', error)
    process.exit(1)
  }
}

// Run pending schema migrations safely (idempotent)
const runMigrations = async () => {
  const client = await pool.connect()
  try {
    // 011: email verification columns
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;
    `)
    // 012: seller_id on products
    await client.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES users(id) ON DELETE SET NULL;
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id) WHERE seller_id IS NOT NULL;
    `)
    console.log('Schema migrations applied successfully')
  } catch (err: any) {
    // Non-fatal — log and continue
    console.warn('Migration warning:', err.message)
  } finally {
    client.release()
  }
}

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testDatabaseConnection()

    // Apply pending migrations
    await runMigrations()
    
    // Connect to Redis
    await connectRedis()
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Promise Rejection:', err)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully')
  await pool.end()
  process.exit(0)
})

startServer()
