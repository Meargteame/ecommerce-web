import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'

const router = Router()

router.get('/run', async (req, res) => {
  try {
    const hostValue = process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? process.env.DB_HOST : '127.0.0.1'
    
    // Normal pool for multiple statements (batch execution)
    const pool = mysql.createPool({
      host: hostValue,
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'u854501207_ecommerce',
      user: process.env.DB_USER || 'u854501207_u12345_ecommer',
      password: process.env.DB_PASSWORD || 'Thisis1yearplan@2025',
      multipleStatements: true
    })

    // Single statement pool for triggers (MySQL server fails if multipleStatements is on)
    const triggerPool = mysql.createPool({
      host: hostValue,
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'u854501207_ecommerce',
      user: process.env.DB_USER || 'u854501207_u12345_ecommer',
      password: process.env.DB_PASSWORD || 'Thisis1yearplan@2025',
      multipleStatements: false
    })
    
    let log = ''

    if (req.query.reset === 'true') {
      log += 'Dropping all existing tables due to ?reset=true...<br>'
      const [tables]: any = await pool.query('SHOW TABLES')
      await pool.query('SET FOREIGN_KEY_CHECKS = 0')
      for (const tableRow of tables) {
        const tableName = Object.values(tableRow)[0]
        await pool.query(`DROP TABLE IF EXISTS \`${tableName}\``)
        log += `Dropped table ${tableName}<br>`
      }
      await pool.query('SET FOREIGN_KEY_CHECKS = 1')
    }

    const migrationsDir = path.join(process.cwd(), 'migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    for (const file of files) {
      log += `Processing ${file}...<br>`
      const filePath = path.join(migrationsDir, file)
      const content = fs.readFileSync(filePath, 'utf8')
      
      if (content.includes('DELIMITER //')) {
        const parts = content.split('DELIMITER //')
        
        if (parts[0].trim()) {
           await pool.query(parts[0])
        }
        
        for (let i = 1; i < parts.length; i++) {
          let blockContent = parts[i]
          let afterDelimiter = ''
          let triggersBlock = blockContent

          if (blockContent.includes('DELIMITER ;')) {
            const subParts = blockContent.split('DELIMITER ;')
            triggersBlock = subParts[0]
            afterDelimiter = subParts[1] || ''
          }
          
          const triggers = triggersBlock.split('//')
          for (const trigger of triggers) {
            if (trigger.trim()) {
              await triggerPool.query(trigger.trim())
            }
          }
          
          if (afterDelimiter.trim()) {
            await pool.query(afterDelimiter.trim())
          }
        }
      } else {
        if (content.trim()) {
          await pool.query(content)
        }
      }
    }
    
    res.status(200).send(`<h1>Success!</h1><p>All database tables and triggers have been created successfully on Hostinger.</p><p>Details:</p><pre>${log}</pre>`)
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to run migrations', details: error.message })
  }
})

export default router
