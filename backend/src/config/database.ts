import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ override: false })

const hostValue = process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? process.env.DB_HOST : '127.0.0.1';

const rawPool = mysql.createPool({
  host: hostValue,
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'u854501207_ecommerce',
  user: process.env.DB_USER || 'u854501207_u12345_ecommer',
  password: process.env.DB_PASSWORD || 'Thisis1yearplan@2025',
  connectionLimit: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  waitForConnections: true,
  queueLimit: 0,
})

// Compatibility wrapper to make mysql2 behave like pg (returning { rows })
const pool = {
  // Pass through most properties
  ...rawPool,
  
  // Override query to return { rows, rowCount }
  query: async (sql: string, params?: any[]) => {
    const [rows]: any = await rawPool.query(sql, params)
    if (rows && !Array.isArray(rows) && rows.affectedRows !== undefined) {
      return { rows: [], rowCount: rows.affectedRows, affectedRows: rows.affectedRows }
    }
    return { rows: rows as any[], rowCount: (rows as any[])?.length || 0 }
  },

  // Override execute to return { rows, rowCount }
  execute: async (sql: string, params?: any[]) => {
    const [rows]: any = await rawPool.execute(sql, params)
    if (rows && !Array.isArray(rows) && rows.affectedRows !== undefined) {
      return { rows: [], rowCount: rows.affectedRows, affectedRows: rows.affectedRows }
    }
    return { rows: rows as any[], rowCount: (rows as any[])?.length || 0 }
  },

  // Override getConnection to return a wrapped connection
  getConnection: async () => {
    const conn = await rawPool.getConnection()
    const originalQuery = conn.query.bind(conn)
    const originalExecute = conn.execute.bind(conn)
    
    const wrappedConn = {
      ...conn,
      query: async (sql: string, params?: any[]) => {
        const [rows]: any = await originalQuery(sql, params)
        if (rows && !Array.isArray(rows) && rows.affectedRows !== undefined) {
          return { rows: [], rowCount: rows.affectedRows, affectedRows: rows.affectedRows }
        }
        return { rows: rows as any[], rowCount: (rows as any[])?.length || 0 }
      },
      execute: async (sql: string, params?: any[]) => {
        const [rows]: any = await originalExecute(sql, params)
        if (rows && !Array.isArray(rows) && rows.affectedRows !== undefined) {
          return { rows: [], rowCount: rows.affectedRows, affectedRows: rows.affectedRows }
        }
        return { rows: rows as any[], rowCount: (rows as any[])?.length || 0 }
      },
      release: () => conn.release(),
      beginTransaction: () => conn.beginTransaction(),
      commit: () => conn.commit(),
      rollback: () => conn.rollback()
    }
    
    return wrappedConn as any
  }
}

export const query = pool.query
export default pool as any
