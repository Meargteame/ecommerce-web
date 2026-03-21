const { Pool } = require('pg')
const fs = require('fs')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ecommerce_db',
  user: 'postgres',
  password: 'postgres',
})

async function check() {
  const client = await pool.connect()
  try {
    const result = await client.query(
      "SELECT id, email, role, account_status, email_verified FROM users WHERE email = 'admin@shophub.com'"
    )
    const output = result.rows.length > 0
      ? JSON.stringify(result.rows[0], null, 2)
      : 'NOT FOUND'
    fs.writeFileSync('/tmp/admin_check.txt', output)
  } finally {
    client.release()
    await pool.end()
  }
}

check().catch(e => fs.writeFileSync('/tmp/admin_check.txt', 'ERROR: ' + e.message))
