import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'

const router = Router()

router.get('/run', async (req, res) => {
  try {
    // Create a temporary pool with multipleStatements enabled to run the large SQL file
    const hostValue = process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? process.env.DB_HOST : '127.0.0.1'
    
    const pool = mysql.createPool({
      host: hostValue,
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'u854501207_ecommerce',
      user: process.env.DB_USER || 'u854501207_u12345_ecommer',
      password: process.env.DB_PASSWORD || 'Thisis1yearplan@2025',
      multipleStatements: true // This is required to run a full SQL dump
    })
    
    const sqlPath = path.join(process.cwd(), 'all_migrations.sql')
    
    if (!fs.existsSync(sqlPath)) {
      res.status(404).json({ error: 'all_migrations.sql file not found in the root backend directory. Did you commit and push it?' })
      return
    }

    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    await pool.query(sql)
    
    res.status(200).send('<h1>Success!</h1><p>All database tables have been created successfully on Hostinger.</p><p>You can now go to Vercel and your app will work.</p>')
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to run migrations', details: error.message })
  }
})

export default router
