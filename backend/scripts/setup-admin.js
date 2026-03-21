const { Pool } = require('pg')
const bcrypt = require('bcrypt')
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ecommerce_db',
  user: 'postgres',
  password: 'postgres',
})

const OUTPUT = path.join(__dirname, '..', '..', 'admin_setup_result.txt')

async function run() {
  const client = await pool.connect()
  const lines = []
  try {
    // Apply migrations first
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;
    `)
    lines.push('Migrations OK')

    const email = 'admin@shophub.com'
    const password = 'Admin@123456'

    const existing = await client.query('SELECT id, role FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      const u = existing.rows[0]
      if (u.role !== 'admin') {
        await client.query("UPDATE users SET role = 'admin', email_verified = true, account_status = 'active' WHERE id = $1", [u.id])
        lines.push('Upgraded to admin: ' + email)
      } else {
        lines.push('Admin already exists: ' + email)
      }
    } else {
      const hash = await bcrypt.hash(password, 10)
      const r = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified, account_status)
         VALUES ($1, $2, 'Admin', 'ShopHub', 'admin', true, 'active') RETURNING id, email, role`,
        [email, hash]
      )
      lines.push('Created admin: ' + r.rows[0].email + ' | id: ' + r.rows[0].id)
    }

    lines.push('Email: ' + email)
    lines.push('Password: ' + password)
    lines.push('Login: http://localhost:3000')
  } catch (e) {
    lines.push('ERROR: ' + e.message)
  } finally {
    client.release()
    await pool.end()
    fs.writeFileSync(OUTPUT, lines.join('\n'))
  }
}

run()
