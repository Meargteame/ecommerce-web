const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ecommerce_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
})

async function run() {
  const client = await pool.connect()
  try {
    console.log('Running migration 011...')
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email_verification_token
        ON users(email_verification_token)
        WHERE email_verification_token IS NOT NULL;
    `)
    console.log('Migration 011 applied successfully.')

    // Also run 012 just in case
    console.log('Running migration 012...')
    await client.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES users(id) ON DELETE SET NULL;
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id) WHERE seller_id IS NOT NULL;
    `)
    console.log('Migration 012 applied successfully.')

    // Verify
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('email_verification_token', 'email_verification_expires')
    `)
    console.log('Verified columns:', result.rows.map(r => r.column_name))
  } catch (err) {
    console.error('Migration error:', err.message)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
