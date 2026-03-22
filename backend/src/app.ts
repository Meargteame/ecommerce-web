import express, { Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import path from 'path'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { generalLimiter } from './middleware/rateLimiter'

const app: Application = express()

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://js.stripe.com'],
      frameSrc: ["'self'", 'https://js.stripe.com'],
      connectSrc: ["'self'", 'https://api.stripe.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}))
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))

// Rate limiting
app.use(generalLimiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// Compression middleware
app.use(compression())

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// Serve local uploads (fallback when S3 is not configured)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// API routes
import authRoutes from './routes/authRoutes'
import userRoutes from './routes/userRoutes'
import productRoutes from './routes/productRoutes'
import categoryRoutes from './routes/categoryRoutes'
import cartRoutes from './routes/cartRoutes'
import inventoryRoutes from './routes/inventoryRoutes'
import orderRoutes from './routes/orderRoutes'
import paymentRoutes from './routes/paymentRoutes'
import paymentMethodRoutes from './routes/paymentMethodRoutes'
import shippingRoutes from './routes/shippingRoutes'
import reviewRoutes from './routes/reviewRoutes'
import notificationRoutes from './routes/notificationRoutes'
import promotionRoutes from './routes/promotionRoutes'
import analyticsRoutes from './routes/analyticsRoutes'
import uploadRoutes from './routes/uploadRoutes'
import sellerRoutes from './routes/sellerRoutes'
import adminRoutes from './routes/adminRoutes'
import supportRoutes from './routes/supportRoutes'
import wishlistRoutes from './routes/wishlistRoutes'
import shoppingListRoutes from './routes/shoppingListRoutes'
import saveForLaterRoutes from './routes/saveForLaterRoutes'
import comparisonRoutes from './routes/comparisonRoutes'
import returnsRoutes from './routes/returnsRoutes'
import giftCardAndLoyaltyRoutes from './routes/giftCardAndLoyaltyRoutes'
import productQuestionsRoutes from './routes/productQuestionsRoutes'
import warehouseRoutes from './routes/warehouseRoutes'
import bulkUploadRoutes from './routes/bulkUploadRoutes'
import cmsAdminRoutes from './routes/cmsAdminRoutes'
import pool from './config/database'

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/payment-methods', paymentMethodRoutes)
app.use('/api/shipping', shippingRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/promotions', promotionRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/seller', sellerRoutes)
app.use('/api/seller/warehouses', warehouseRoutes)
app.use('/api/seller/bulk-uploads', bulkUploadRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/cms', cmsAdminRoutes)
app.use('/api/support', supportRoutes)
app.use('/api/wishlists', wishlistRoutes)
app.use('/api/shopping-lists', shoppingListRoutes)
app.use('/api/saved-for-later', saveForLaterRoutes)
app.use('/api/comparison', comparisonRoutes)
app.use('/api/returns', returnsRoutes)
app.use('/api/gift-cards', giftCardAndLoyaltyRoutes)
app.use('/api/loyalty', giftCardAndLoyaltyRoutes)
app.use('/api/price-alerts', giftCardAndLoyaltyRoutes)
app.use('/api/products/:productId/questions', productQuestionsRoutes)

// Public seller profile (used on product detail page)
app.get('/api/sellers/:id/profile', async (req, res) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT store_name, store_description, store_logo_url, rating, total_sales, is_verified
       FROM seller_profiles WHERE id = ?`,
      [req.params.id]
    )
    if (rows.length === 0) { res.status(404).json({ error: 'Seller not found' }); return }
    res.json({ data: rows[0] })
  } catch { res.status(500).json({ error: 'Failed to fetch seller' }) }
})

// 404 handler
app.use(notFoundHandler)

// Error handler (must be last)
app.use(errorHandler)

export default app
