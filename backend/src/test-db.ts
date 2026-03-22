import pool from './config/database'

async function testConnection() {
  try {
    const result = await pool.query('SELECT 1 + 1 as result')
    console.log('Connected to database')
    console.log('Result of 1 + 1:', result.rows[0].result)
    process.exit(0)
  } catch (error: any) {
    console.error('Failed to connect to database:', error.message)
    process.exit(1)
  }
}

testConnection()
