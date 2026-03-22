import bcrypt from 'bcrypt'
import pool from '../src/config/database'
import { v4 as uuidv4 } from 'uuid'

async function seedAdmins() {
  console.log('Starting admin seeding...')
  const password = 'Admin@123'
  const hash = await bcrypt.hash(password, 10)

  const admins = [
    { email: 'banchi@gmail.com', first_name: 'Banchi', last_name: 'Admin' },
    { email: 'tadelech@gmail.com', first_name: 'Tadelech', last_name: 'Admin' },
  ]

  for (const admin of admins) {
    const id = uuidv4()
    try {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_verified, is_active)
         VALUES (?, ?, ?, ?, ?, 'admin', TRUE, TRUE)
         ON DUPLICATE KEY UPDATE
           role = 'admin',
           password_hash = ?,
           is_verified = TRUE,
           is_active = TRUE`,
        [id, admin.email, hash, admin.first_name, admin.last_name, hash]
      )
      console.log(`✓ Admin seeded: ${admin.email}`)
    } catch (err: any) {
      console.error(`✗ Failed to seed ${admin.email}:`, err.message)
    }
  }

  console.log('\n✅ Done! Login credentials:')
  console.log(`   Email: banchi@gmail.com     Password: ${password}`)
  console.log(`   Email: tadelech@gmail.com   Password: ${password}`)
  process.exit(0)
}

seedAdmins()
