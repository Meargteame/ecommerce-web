import { z } from 'zod'

// Password validation schema
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

// Email validation schema
const emailSchema = z.string().email('Invalid email address').toLowerCase()

// Registration validation schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(100).optional(),
  lastName: z.string().min(1, 'Last name is required').max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
  role: z.enum(['customer', 'seller']).optional(),
})

// Login validation schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

// Password reset request schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

// Password reset schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
})

// Change password schema
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
})

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

// Update profile schema
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
})

// Address schema
export const addressSchema = z.object({
  addressType: z.enum(['shipping', 'billing']),
  fullName: z.string().min(1, 'Full name is required').max(200),
  addressLine1: z.string().min(1, 'Address line 1 is required').max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  country: z.string().length(2, 'Country must be 2-letter ISO code'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
  isDefault: z.boolean().optional(),
})

// Update address schema (all fields optional)
export const updateAddressSchema = addressSchema.partial()

// Add to wishlist schema
export const addToWishlistSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
})

// Product schemas
export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  specifications: z.record(z.any()).optional(),
  basePrice: z.number().positive('Price must be positive'),
  categoryId: z.string().uuid('Invalid category ID'),
  brand: z.string().max(100).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
  price: z.number().positive().optional(),
})

export const updateProductSchema = createProductSchema.partial()

export const productFiltersSchema = z.object({
  categoryId: z.string().uuid().optional(),
  brand: z.string().optional(),
  minPrice: z.string().transform(Number).pipe(z.number().nonnegative()).optional(),
  maxPrice: z.string().transform(Number).pipe(z.number().nonnegative()).optional(),
  minRating: z.string().transform(Number).pipe(z.number().min(0).max(5)).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'rating', 'newest', 'popular']).optional(),
  limit: z.string().transform(Number).pipe(z.number().positive().max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().nonnegative()).optional(),
})

// Cart schemas
export const addToCartSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  variantId: z.string().uuid('Invalid variant ID').optional(),
  quantity: z.number().int().positive('Quantity must be positive'),
})

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive('Quantity must be positive'),
})

// Order schemas
const orderAddressSchema = z.object({
  fullName: z.string().min(1).max(200),
  addressLine1: z.string().min(1).max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
})

export const createOrderSchema = z.object({
  shippingAddress: orderAddressSchema,
  billingAddress: orderAddressSchema,
  customerEmail: z.string().email(),
  customerPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  promoCode: z.string().optional(),
  notes: z.string().max(500).optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(['placed', 'payment_confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled']),
  notes: z.string().max(500).optional(),
})

// Payment schemas
export const processPaymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  paymentMethod: z.enum(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery']),
  paymentGateway: z.enum(['stripe', 'paypal', 'flutterwave']),
  paymentDetails: z.record(z.any()).optional(),
})

export const refundSchema = z.object({
  amount: z.number().positive('Refund amount must be positive'),
  reason: z.string().min(1, 'Refund reason is required').max(500),
})

// Shipping schemas
export const calculateShippingSchema = z.object({
  address: z.object({
    country: z.string().length(2, 'Country must be 2-letter ISO code'),
    state: z.string().max(100).optional(),
    city: z.string().min(1).max(100),
    postalCode: z.string().min(1).max(20),
  }),
  items: z.array(
    z.object({
      productId: z.string().uuid('Invalid product ID'),
      quantity: z.number().int().positive('Quantity must be positive'),
      weight: z.number().positive().optional(),
    })
  ).min(1, 'At least one item is required'),
})

export const createShipmentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  courier: z.enum(['dhl', 'fedex', 'ups', 'usps']),
  weight: z.number().positive('Weight must be positive'),
  weightUnit: z.enum(['kg', 'lb']).optional(),
  notes: z.string().max(500).optional(),
})

export const updateShipmentStatusSchema = z.object({
  status: z.enum(['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned']),
  notes: z.string().max(500).optional(),
})

// Review schemas
export const createReviewSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  orderId: z.string().uuid('Invalid order ID').optional(),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  title: z.string().max(255).optional(),
  comment: z.string().max(2000).optional(),
})

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(255).optional(),
  comment: z.string().max(2000).optional(),
})

export const createQuestionSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  question: z.string().min(1, 'Question is required').max(500),
})

export const createAnswerSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  answer: z.string().min(1, 'Answer is required').max(1000),
  isSeller: z.boolean().optional(),
})

// Promotion schemas
export const createPromotionSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50).regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, underscores, and hyphens'),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  discountType: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
  discountValue: z.number().positive('Discount value must be positive'),
  minPurchaseAmount: z.number().nonnegative().optional(),
  maxDiscountAmount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

export const updatePromotionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  discountValue: z.number().positive().optional(),
  minPurchaseAmount: z.number().nonnegative().optional(),
  maxDiscountAmount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
})

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  cartTotal: z.number().nonnegative('Cart total must be non-negative'),
})

// Validation middleware factory
export const validate = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        })
        return
      }
      next(error)
    }
  }
}

// Query validation middleware
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      req.query = schema.parse(req.query)
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        })
        return
      }
      next(error)
    }
  }
}
