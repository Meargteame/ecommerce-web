const { Pool } = require('pg')
const bcrypt = require('bcrypt')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ecommerce_db',
  user: 'postgres',
  password: 'postgres',
})

async function createAdmin() {
  const email = 'admin@shophub.com'
  const password = 'Admin@123456'
  const firstName = 'Admin'
  const lastName = 'ShopHub'

  const client = await pool.connect()
  try {
    // Check if already exists
    const existing = await client.query('SELECT id, role FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      const user = existing.rows[0]
      if (user.role === 'admin') {
        console.log('Admin already exists:', email)
        console.log('Email:', email)
        console.log('Password:', password)
        return
      }
      // Upgrade existing user to admin
      await client.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id])
      console.log('Upgraded existing user to admin:', email)
      return
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified, account_status)
       VALUES ($1, $2, $3, $4, 'admin', true, 'active')
       RETURNING id, email, role`,
      [email, passwordHash, firstName, lastName]
    )

    console.log('✅ Admin account created successfully!')
    console.log('─────────────────────────────────')
    console.log('Email   :', email)
    console.log('Password:', password)
    console.log('Role    :', result.rows[0].role)
    console.log('ID      :', result.rows[0].id)
    console.log('─────────────────────────────────')
    console.log('Login at: http://localhost:3000 → click Sign In')
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    client.release()
    await pool.end()
  }
}

createAdmin()
