import dotenv from 'dotenv'
import app from './app'
import pool from './config/database'
import { connectRedis } from './config/redis'

// Load environment variables
dotenv.config({ override: false })

const PORT = process.env.PORT || 5000
console.log(`Debug: process.env.PORT is ${process.env.PORT || 'undefined (using fallback 5000)'}`)

// Test database connection
const testDatabaseConnection = async () => {
  try {
    const client = await pool.getConnection()
    console.log('Database connection test successful')
    client.release()
  } catch (error) {
    console.error('Database connection test failed:', error)
    process.exit(1)
  }
}

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testDatabaseConnection()

    // Connect to Redis (optional — server runs without it)
    try {
      await connectRedis()
    } catch {
      console.warn('Redis unavailable — running without cache')
    }
    
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
