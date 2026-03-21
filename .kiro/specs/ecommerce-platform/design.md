# Design Document: E-Commerce Platform

## Overview

This document provides the technical design for a comprehensive e-commerce platform built with Next.js, Node.js/Express, and PostgreSQL. The platform enables businesses to sell products online through a customer-facing storefront, complete shopping and checkout workflows, payment processing, user account management, order fulfillment, inventory tracking, shipping logistics, customer support, review systems, marketing capabilities, analytics, and administrative interfaces.

### System Goals

- Provide a fast, responsive shopping experience for customers
- Support multiple payment gateways (Stripe, PayPal, Flutterwave)
- Enable efficient order and inventory management for business operators
- Ensure security and data protection for customer information
- Scale to support 1000+ concurrent users
- Maintain high availability with backup and disaster recovery

### Technology Stack

- **Frontend**: Next.js 14+ (React 18+, TypeScript)
- **Backend**: Node.js 18+ with Express.js
- **Database**: PostgreSQL 15+
- **Caching**: Redis
- **File Storage**: AWS S3 or compatible object storage
- **Payment Gateways**: Stripe, PayPal, Flutterwave SDKs
- **Email**: SendGrid or AWS SES
- **Analytics**: Google Analytics 4, Hotjar
- **Courier APIs**: DHL, FedEx, UPS

## Architecture

### High-Level Architecture

The platform follows a three-tier architecture with clear separation between presentation, application logic, and data layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js Frontend (SSR/SSG + Client-Side React)      │   │
│  │  - Storefront Pages                                   │   │
│  │  - Customer Account Pages                             │   │
│  │  - Admin Dashboard                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Express.js API Server                                │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Business Logic Services                        │  │   │
│  │  │  - Product Service                              │  │   │
│  │  │  - Cart Service                                 │  │   │
│  │  │  - Order Service                                │  │   │
│  │  │  - Payment Service                              │  │   │
│  │  │  - Inventory Service                            │  │   │
│  │  │  - User Service                                 │  │   │
│  │  │  - Review Service                               │  │   │
│  │  │  - Shipping Service                             │  │   │
│  │  │  - Analytics Service                            │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │   AWS S3     │      │
│  │   Database   │  │    Cache     │  │ File Storage │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Services                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Stripe  │ │  PayPal  │ │Flutterwave│ │ Courier  │       │
│  │    API   │ │   API    │ │    API    │ │   APIs   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ SendGrid │ │  Google  │ │  Hotjar  │                    │
│  │   Email  │ │ Analytics│ │          │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Patterns

**Frontend Architecture (Next.js)**:
- Server-Side Rendering (SSR) for dynamic pages (product details, user accounts)
- Static Site Generation (SSG) for static content (homepage, category pages)
- Client-Side Rendering (CSR) for interactive components (cart, checkout)
- API routes for backend communication
- React Context for global state management (cart, user session)

**Backend Architecture (Express.js)**:
- RESTful API design with resource-based endpoints
- Service layer pattern for business logic encapsulation
- Repository pattern for data access abstraction
- Middleware chain for authentication, validation, error handling
- Event-driven architecture for async operations (order processing, notifications)

**Data Architecture**:
- PostgreSQL for relational data (products, orders, users)
- Redis for session storage and caching (product catalog, cart data)
- S3 for static assets (product images, documents)


## Components and Interfaces

### Frontend Components

#### Storefront Components

**ProductListPage**
- Displays product grid with filtering and sorting
- Integrates with search and filter components
- Implements infinite scroll or pagination
- Props: `category`, `searchQuery`, `filters`

**ProductDetailPage**
- Shows product information, images, reviews
- Handles variant selection
- Integrates AddToCart component
- Props: `productId`

**SearchBar**
- Provides autocomplete suggestions
- Debounces search queries
- Props: `onSearch`, `placeholder`

**FilterPanel**
- Displays filter options (price, brand, rating)
- Emits filter change events
- Props: `filters`, `onFilterChange`

**CartDrawer**
- Displays cart items with quantities
- Allows quantity updates and item removal
- Shows cart total and checkout button
- Props: `isOpen`, `onClose`

**CheckoutFlow**
- Multi-step checkout process
- Steps: Shipping Address → Delivery Method → Payment → Confirmation
- Validates each step before proceeding
- Props: `cartItems`, `onComplete`

#### Admin Dashboard Components

**ProductManagement**
- CRUD operations for products
- Image upload interface
- Category assignment
- Props: `productId` (optional for edit mode)

**OrderManagement**
- Order list with filters
- Order detail view
- Status update controls
- Refund processing interface
- Props: `orderId` (optional)

**InventoryManagement**
- Stock level display and updates
- Low stock alerts
- Bulk import/export
- Props: `filters`

**AnalyticsDashboard**
- Charts for sales, orders, conversion
- Date range selector
- Key metrics cards
- Props: `dateRange`

### Backend Services

#### Product Service

**Interface**:
```typescript
interface ProductService {
  createProduct(data: CreateProductDTO): Promise<Product>
  updateProduct(id: string, data: UpdateProductDTO): Promise<Product>
  deleteProduct(id: string): Promise<void>
  getProduct(id: string): Promise<Product | null>
  listProducts(filters: ProductFilters): Promise<PaginatedResult<Product>>
  searchProducts(query: string, filters: ProductFilters): Promise<PaginatedResult<Product>>
  getProductsByCategory(categoryId: string): Promise<Product[]>
}
```

**Responsibilities**:
- Product CRUD operations
- Product search and filtering
- Category management
- Product image management (S3 integration)
- Cache management for product data

#### Cart Service

**Interface**:
```typescript
interface CartService {
  getCart(userId: string): Promise<Cart>
  addItem(userId: string, item: CartItem): Promise<Cart>
  updateItemQuantity(userId: string, itemId: string, quantity: number): Promise<Cart>
  removeItem(userId: string, itemId: string): Promise<Cart>
  clearCart(userId: string): Promise<void>
  saveForLater(userId: string, itemId: string): Promise<Cart>
}
```

**Responsibilities**:
- Cart state management
- Cart persistence (Redis for active carts, PostgreSQL for saved carts)
- Cart validation (stock availability, price updates)
- Cart total calculation


#### Order Service

**Interface**:
```typescript
interface OrderService {
  createOrder(data: CreateOrderDTO): Promise<Order>
  getOrder(id: string): Promise<Order | null>
  listOrders(filters: OrderFilters): Promise<PaginatedResult<Order>>
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order>
  cancelOrder(id: string): Promise<Order>
  processRefund(id: string, amount: number, reason: string): Promise<Refund>
  getOrderHistory(userId: string): Promise<Order[]>
}
```

**Responsibilities**:
- Order creation and lifecycle management
- Order status transitions with validation
- Order history tracking
- Integration with inventory service for stock updates
- Integration with notification service for status updates

#### Payment Service

**Interface**:
```typescript
interface PaymentService {
  processPayment(orderId: string, paymentMethod: PaymentMethod, details: PaymentDetails): Promise<PaymentResult>
  verifyPayment(transactionId: string): Promise<PaymentStatus>
  processRefund(transactionId: string, amount: number): Promise<RefundResult>
  listPaymentMethods(userId: string): Promise<PaymentMethod[]>
  savePaymentMethod(userId: string, method: PaymentMethod): Promise<void>
}
```

**Responsibilities**:
- Payment gateway integration (Stripe, PayPal, Flutterwave)
- Payment processing and verification
- Refund processing
- Fraud detection integration
- PCI compliance handling (tokenization)

#### Inventory Service

**Interface**:
```typescript
interface InventoryService {
  getStock(sku: string): Promise<number>
  updateStock(sku: string, quantity: number): Promise<void>
  reserveStock(sku: string, quantity: number): Promise<boolean>
  releaseStock(sku: string, quantity: number): Promise<void>
  checkAvailability(items: CartItem[]): Promise<AvailabilityResult>
  getLowStockItems(threshold: number): Promise<Product[]>
}
```

**Responsibilities**:
- Stock quantity tracking
- Stock reservation during checkout
- Stock release on order cancellation
- Low stock alerts
- Stock synchronization across distributed systems

#### User Service

**Interface**:
```typescript
interface UserService {
  register(data: RegisterDTO): Promise<User>
  login(email: string, password: string): Promise<AuthResult>
  logout(userId: string): Promise<void>
  getUser(id: string): Promise<User | null>
  updateProfile(id: string, data: UpdateProfileDTO): Promise<User>
  changePassword(id: string, oldPassword: string, newPassword: string): Promise<void>
  resetPassword(email: string): Promise<void>
  verifyEmail(token: string): Promise<void>
  manageAddresses(userId: string): Promise<Address[]>
  managePaymentMethods(userId: string): Promise<PaymentMethod[]>
}
```

**Responsibilities**:
- User registration and authentication
- Password hashing and validation
- Session management
- Profile management
- Address and payment method management
- Email verification

#### Review Service

**Interface**:
```typescript
interface ReviewService {
  createReview(data: CreateReviewDTO): Promise<Review>
  getReviews(productId: string, pagination: Pagination): Promise<PaginatedResult<Review>>
  updateReview(id: string, data: UpdateReviewDTO): Promise<Review>
  deleteReview(id: string): Promise<void>
  getAverageRating(productId: string): Promise<number>
  verifyPurchase(userId: string, productId: string): Promise<boolean>
  askQuestion(productId: string, question: string): Promise<Question>
  answerQuestion(questionId: string, answer: string): Promise<Answer>
}
```

**Responsibilities**:
- Review CRUD operations
- Rating calculation
- Purchase verification for "Verified Purchase" badges
- Product Q&A management
- Review moderation


#### Shipping Service

**Interface**:
```typescript
interface ShippingService {
  calculateShipping(address: Address, items: CartItem[]): Promise<ShippingOption[]>
  createShipment(orderId: string, courier: string): Promise<Shipment>
  getTrackingInfo(trackingNumber: string): Promise<TrackingInfo>
  updateShipmentStatus(trackingNumber: string, status: ShipmentStatus): Promise<void>
  getSupportedCouriers(): Promise<Courier[]>
}
```

**Responsibilities**:
- Shipping cost calculation based on zone and weight
- Courier API integration (DHL, FedEx, UPS)
- Tracking number generation
- Shipment status tracking
- Delivery time estimation

#### Analytics Service

**Interface**:
```typescript
interface AnalyticsService {
  trackEvent(event: AnalyticsEvent): Promise<void>
  getSalesMetrics(dateRange: DateRange): Promise<SalesMetrics>
  getConversionMetrics(dateRange: DateRange): Promise<ConversionMetrics>
  getCustomerMetrics(dateRange: DateRange): Promise<CustomerMetrics>
  getProductMetrics(productId: string, dateRange: DateRange): Promise<ProductMetrics>
  getTrafficSources(dateRange: DateRange): Promise<TrafficSource[]>
}
```

**Responsibilities**:
- Event tracking (page views, add to cart, purchases)
- Sales analytics (revenue, order count, AOV)
- Conversion tracking (funnel analysis, cart abandonment)
- Customer analytics (LTV, retention, cohorts)
- Integration with Google Analytics and Hotjar

#### Notification Service

**Interface**:
```typescript
interface NotificationService {
  sendEmail(to: string, template: string, data: any): Promise<void>
  sendOrderConfirmation(orderId: string): Promise<void>
  sendOrderStatusUpdate(orderId: string, status: OrderStatus): Promise<void>
  sendShippingNotification(orderId: string, trackingNumber: string): Promise<void>
  sendRefundConfirmation(orderId: string, amount: number): Promise<void>
  sendPasswordReset(email: string, token: string): Promise<void>
  sendLowStockAlert(sku: string, quantity: number): Promise<void>
}
```

**Responsibilities**:
- Email sending via SendGrid/SES
- Email template management
- Transactional email triggers
- Admin notifications
- Email marketing integration

#### Promotion Service

**Interface**:
```typescript
interface PromotionService {
  createPromotion(data: CreatePromotionDTO): Promise<Promotion>
  validateCoupon(code: string, cartTotal: number): Promise<CouponValidation>
  applyCoupon(cartId: string, code: string): Promise<Discount>
  getActivePromotions(): Promise<Promotion[]>
  getFlashSales(): Promise<FlashSale[]>
}
```

**Responsibilities**:
- Promotion and coupon management
- Discount calculation
- Coupon validation (expiry, usage limits)
- Flash sale management
- Promotion scheduling

### API Endpoints

#### Product Endpoints

```
GET    /api/products                    - List products with filters
GET    /api/products/:id                - Get product details
POST   /api/products                    - Create product (admin)
PUT    /api/products/:id                - Update product (admin)
DELETE /api/products/:id                - Delete product (admin)
GET    /api/products/search             - Search products
GET    /api/categories                  - List categories
GET    /api/categories/:id/products     - Get products by category
```

#### Cart Endpoints

```
GET    /api/cart                        - Get current user's cart
POST   /api/cart/items                  - Add item to cart
PUT    /api/cart/items/:id              - Update item quantity
DELETE /api/cart/items/:id              - Remove item from cart
POST   /api/cart/save-for-later/:id     - Save item for later
DELETE /api/cart                        - Clear cart
```


#### Order Endpoints

```
POST   /api/orders                      - Create order (checkout)
GET    /api/orders                      - List orders (user: own, admin: all)
GET    /api/orders/:id                  - Get order details
PUT    /api/orders/:id/status           - Update order status (admin)
POST   /api/orders/:id/cancel           - Cancel order
POST   /api/orders/:id/refund           - Process refund (admin)
GET    /api/orders/:id/tracking         - Get tracking information
```

#### Payment Endpoints

```
POST   /api/payments/process            - Process payment
GET    /api/payments/:id/status         - Get payment status
POST   /api/payments/:id/refund         - Process refund (admin)
GET    /api/payment-methods             - List saved payment methods
POST   /api/payment-methods             - Save payment method
DELETE /api/payment-methods/:id         - Remove payment method
```

#### User Endpoints

```
POST   /api/auth/register               - Register new user
POST   /api/auth/login                  - Login user
POST   /api/auth/logout                 - Logout user
POST   /api/auth/forgot-password        - Request password reset
POST   /api/auth/reset-password         - Reset password with token
GET    /api/users/profile               - Get user profile
PUT    /api/users/profile               - Update user profile
GET    /api/users/addresses             - List user addresses
POST   /api/users/addresses             - Add address
PUT    /api/users/addresses/:id         - Update address
DELETE /api/users/addresses/:id         - Delete address
GET    /api/users/wishlist              - Get wishlist
POST   /api/users/wishlist              - Add to wishlist
DELETE /api/users/wishlist/:id          - Remove from wishlist
```

#### Review Endpoints

```
POST   /api/reviews                     - Create review
GET    /api/reviews/product/:id         - Get product reviews
PUT    /api/reviews/:id                 - Update review
DELETE /api/reviews/:id                 - Delete review
POST   /api/questions                   - Ask product question
POST   /api/questions/:id/answers       - Answer question
```

#### Admin Endpoints

```
GET    /api/admin/dashboard             - Get dashboard metrics
GET    /api/admin/analytics             - Get analytics data
GET    /api/admin/users                 - List all users
PUT    /api/admin/users/:id/status      - Enable/disable user account
POST   /api/admin/users/:id/reset-password - Reset user password
GET    /api/admin/inventory             - Get inventory status
PUT    /api/admin/inventory/:sku        - Update stock quantity
GET    /api/admin/promotions            - List promotions
POST   /api/admin/promotions            - Create promotion
PUT    /api/admin/promotions/:id        - Update promotion
DELETE /api/admin/promotions/:id        - Delete promotion
```

#### Shipping Endpoints

```
POST   /api/shipping/calculate          - Calculate shipping cost
GET    /api/shipping/couriers           - List available couriers
POST   /api/shipping/shipments          - Create shipment (admin)
GET    /api/shipping/track/:number      - Get tracking info
```

#### Support Endpoints

```
GET    /api/support/faq                 - Get FAQ articles
POST   /api/support/tickets             - Create support ticket
GET    /api/support/tickets             - List user's tickets
GET    /api/support/tickets/:id         - Get ticket details
POST   /api/support/tickets/:id/messages - Add message to ticket
```


## Data Models

### Database Schema

#### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  email_verified BOOLEAN DEFAULT FALSE,
  account_status VARCHAR(20) DEFAULT 'active', -- active, disabled, locked
  role VARCHAR(20) DEFAULT 'customer', -- customer, admin, manager, support
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(account_status);
```

#### Addresses Table

```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  address_type VARCHAR(20), -- shipping, billing
  full_name VARCHAR(200),
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(2) NOT NULL, -- ISO country code
  phone VARCHAR(20),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_addresses_user ON addresses(user_id);
```

#### Products Table

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  specifications JSONB,
  base_price DECIMAL(10, 2) NOT NULL,
  category_id UUID REFERENCES categories(id),
  brand VARCHAR(100),
  status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
  average_rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_rating ON products(average_rating);
```

#### Categories Table

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  image_url VARCHAR(500),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
```

#### Product Variants Table

```sql
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(100) UNIQUE NOT NULL,
  variant_name VARCHAR(100), -- e.g., "Red - Large"
  attributes JSONB, -- {"color": "red", "size": "large"}
  price_adjustment DECIMAL(10, 2) DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  weight_grams INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_stock ON product_variants(stock_quantity);
```

#### Product Images Table

```sql
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_images_product ON product_images(product_id);
```


#### Orders Table

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  status VARCHAR(30) NOT NULL, -- placed, payment_confirmed, processing, packed, shipped, delivered, cancelled
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_cost DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  shipping_address JSONB NOT NULL,
  billing_address JSONB NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_created ON orders(created_at);
```

#### Order Items Table

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  product_name VARCHAR(255) NOT NULL,
  variant_name VARCHAR(100),
  sku VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

#### Order Status History Table

```sql
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_status_history_order ON order_status_history(order_id);
```

#### Payments Table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  payment_gateway VARCHAR(50) NOT NULL, -- stripe, paypal, flutterwave
  transaction_id VARCHAR(255) UNIQUE,
  payment_method VARCHAR(50), -- credit_card, debit_card, paypal, bank_transfer, cash_on_delivery
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(30) NOT NULL, -- pending, completed, failed, refunded
  payment_details JSONB, -- tokenized payment info
  fraud_score DECIMAL(5, 2),
  fraud_status VARCHAR(20), -- clean, suspicious, blocked
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_payments_status ON payments(status);
```

#### Refunds Table

```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  status VARCHAR(30) NOT NULL, -- pending, completed, failed
  refund_transaction_id VARCHAR(255),
  processed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refunds_order ON refunds(order_id);
CREATE INDEX idx_refunds_payment ON refunds(payment_id);
```

#### Shipments Table

```sql
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  courier VARCHAR(50) NOT NULL, -- dhl, fedex, ups
  tracking_number VARCHAR(255) UNIQUE NOT NULL,
  shipping_method VARCHAR(100),
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  status VARCHAR(30) NOT NULL, -- pending, in_transit, out_for_delivery, delivered, failed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
```


#### Reviews Table

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id), -- for verified purchase
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'published', -- published, pending, rejected
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_status ON reviews(status);
```

#### Product Questions Table

```sql
CREATE TABLE product_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_questions_product ON product_questions(product_id);
```

#### Product Answers Table

```sql
CREATE TABLE product_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES product_questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  answer TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_answers_question ON product_answers(question_id);
```

#### Promotions Table

```sql
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  type VARCHAR(30) NOT NULL, -- percentage, fixed_amount, flash_sale
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase_amount DECIMAL(10, 2),
  max_discount_amount DECIMAL(10, 2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, expired
  applicable_products JSONB, -- array of product IDs or null for all
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_promotions_code ON promotions(code);
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);
```

#### Carts Table (Persistent)

```sql
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  items JSONB NOT NULL DEFAULT '[]',
  applied_coupon VARCHAR(50),
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX idx_carts_user ON carts(user_id);
CREATE INDEX idx_carts_session ON carts(session_id);
```

#### Wishlists Table

```sql
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wishlists_user ON wishlists(user_id);
CREATE INDEX idx_wishlists_product ON wishlists(product_id);
CREATE UNIQUE INDEX idx_wishlists_unique ON wishlists(user_id, product_id, variant_id);
```

#### Support Tickets Table

```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(30) DEFAULT 'open', -- open, in_progress, resolved, closed
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_assigned ON support_tickets(assigned_to);
```


#### Ticket Messages Table

```sql
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_staff BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_ticket ON ticket_messages(ticket_id);
```

#### Analytics Events Table

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL, -- page_view, add_to_cart, purchase, etc.
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  referrer VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_user ON analytics_events(user_id);
CREATE INDEX idx_events_session ON analytics_events(session_id);
CREATE INDEX idx_events_created ON analytics_events(created_at);
```

#### Email Marketing Subscriptions Table

```sql
CREATE TABLE email_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'subscribed', -- subscribed, unsubscribed
  subscription_source VARCHAR(50),
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP
);

CREATE INDEX idx_subscriptions_email ON email_subscriptions(email);
CREATE INDEX idx_subscriptions_status ON email_subscriptions(status);
```

### Redis Data Structures

**Active Cart Storage** (TTL: 7 days):
```
Key: cart:{userId}
Value: JSON string of cart object
{
  "items": [
    {
      "productId": "uuid",
      "variantId": "uuid",
      "quantity": 2,
      "price": 29.99
    }
  ],
  "appliedCoupon": "SAVE10",
  "discountAmount": 5.00,
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Session Storage** (TTL: 24 hours):
```
Key: session:{sessionId}
Value: JSON string of session data
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "customer",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**Product Cache** (TTL: 1 hour):
```
Key: product:{productId}
Value: JSON string of product object with variants and images
```

**Category Cache** (TTL: 6 hours):
```
Key: category:{categoryId}
Value: JSON string of category with products
```

**Stock Reservation** (TTL: 15 minutes):
```
Key: stock:reserved:{variantId}:{orderId}
Value: quantity reserved
```

**Rate Limiting** (TTL: 1 minute):
```
Key: ratelimit:{ip}:{endpoint}
Value: request count
```


## External Service Integrations

### Payment Gateway Integration

#### Stripe Integration

**Setup**:
- Use Stripe SDK for Node.js
- Store API keys in environment variables
- Use Stripe Checkout for PCI compliance
- Implement webhooks for payment status updates

**Payment Flow**:
1. Frontend creates payment intent via backend API
2. Backend calls Stripe API to create PaymentIntent
3. Frontend displays Stripe Elements for card input
4. Customer submits payment
5. Stripe processes payment and returns result
6. Backend webhook receives payment confirmation
7. Order status updated to payment_confirmed

**Webhook Events**:
- `payment_intent.succeeded` - Payment successful
- `payment_intent.payment_failed` - Payment failed
- `charge.refunded` - Refund processed

**Implementation**:
```typescript
// Payment processing
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createPaymentIntent(amount: number, currency: string, orderId: string) {
  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    metadata: { orderId }
  });
}

async function processRefund(paymentIntentId: string, amount: number) {
  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: Math.round(amount * 100)
  });
}
```

#### PayPal Integration

**Setup**:
- Use PayPal REST API SDK
- Implement OAuth 2.0 authentication
- Configure return and cancel URLs

**Payment Flow**:
1. Backend creates PayPal order
2. Frontend redirects to PayPal for payment
3. Customer completes payment on PayPal
4. PayPal redirects back to platform
5. Backend captures payment
6. Order status updated

**Implementation**:
```typescript
const paypal = require('@paypal/checkout-server-sdk');

async function createPayPalOrder(amount: number, currency: string) {
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: currency,
        value: amount.toFixed(2)
      }
    }]
  });
  return await paypalClient.execute(request);
}
```

#### Flutterwave Integration

**Setup**:
- Use Flutterwave Node.js SDK
- Support multiple African payment methods
- Implement webhook verification

**Payment Flow**:
1. Backend initiates payment with Flutterwave
2. Frontend displays Flutterwave payment modal
3. Customer selects payment method and completes payment
4. Flutterwave webhook notifies backend
5. Backend verifies transaction
6. Order status updated

### Courier API Integration

#### DHL Integration

**Endpoints**:
- Shipment creation
- Tracking information
- Rate calculation

**Implementation**:
```typescript
async function createDHLShipment(shipmentData: ShipmentData) {
  const response = await axios.post(
    'https://api.dhl.com/shipments',
    {
      shipmentDetails: shipmentData,
      accountNumber: process.env.DHL_ACCOUNT_NUMBER
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.DHL_API_KEY}`
      }
    }
  );
  return response.data.trackingNumber;
}

async function getTrackingInfo(trackingNumber: string) {
  const response = await axios.get(
    `https://api.dhl.com/tracking/${trackingNumber}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.DHL_API_KEY}`
      }
    }
  );
  return response.data;
}
```

#### FedEx and UPS Integration

Similar patterns to DHL with respective API endpoints and authentication methods.


### Email Service Integration

#### SendGrid Integration

**Setup**:
- Use SendGrid Node.js SDK
- Create email templates in SendGrid dashboard
- Configure sender authentication (SPF, DKIM)

**Email Types**:
- Order confirmation
- Order status updates
- Shipping notifications
- Password reset
- Welcome emails
- Marketing campaigns

**Implementation**:
```typescript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendOrderConfirmation(order: Order) {
  const msg = {
    to: order.customer_email,
    from: process.env.SENDER_EMAIL,
    templateId: 'd-xxxxxxxxxxxxx',
    dynamicTemplateData: {
      orderNumber: order.order_number,
      items: order.items,
      total: order.total_amount,
      shippingAddress: order.shipping_address
    }
  };
  await sgMail.send(msg);
}
```

### Analytics Integration

#### Google Analytics 4 Integration

**Setup**:
- Install gtag.js on frontend
- Configure measurement ID
- Set up custom events

**Tracked Events**:
- Page views
- Product views
- Add to cart
- Begin checkout
- Purchase
- Search queries

**Implementation**:
```typescript
// Frontend tracking
gtag('event', 'purchase', {
  transaction_id: order.id,
  value: order.total_amount,
  currency: 'USD',
  items: order.items.map(item => ({
    item_id: item.sku,
    item_name: item.product_name,
    price: item.unit_price,
    quantity: item.quantity
  }))
});
```

#### Hotjar Integration

**Setup**:
- Install Hotjar tracking code
- Configure heatmaps and recordings
- Set up feedback polls

**Use Cases**:
- User behavior analysis
- Conversion funnel optimization
- UX issue identification

### Email Marketing Integration

**Supported Platforms**:
- Mailchimp
- SendGrid Marketing
- Klaviyo

**Sync Operations**:
- Customer registration → Add to list
- Purchase → Update customer data
- Unsubscribe → Remove from list

**Implementation**:
```typescript
async function syncToMailchimp(customer: User) {
  const response = await axios.post(
    `https://${process.env.MAILCHIMP_DC}.api.mailchimp.com/3.0/lists/${process.env.MAILCHIMP_LIST_ID}/members`,
    {
      email_address: customer.email,
      status: 'subscribed',
      merge_fields: {
        FNAME: customer.first_name,
        LNAME: customer.last_name
      }
    },
    {
      auth: {
        username: 'anystring',
        password: process.env.MAILCHIMP_API_KEY
      }
    }
  );
  return response.data;
}
```

## Security Architecture

### Authentication and Authorization

#### Password Security

**Hashing**:
- Use bcrypt with salt rounds of 12
- Never store plain text passwords
- Implement password strength validation

**Implementation**:
```typescript
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

function validatePasswordStrength(password: string): boolean {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber;
}
```

#### Session Management

**Strategy**:
- Use JWT tokens for stateless authentication
- Store refresh tokens in httpOnly cookies
- Implement token rotation
- Set appropriate expiration times (access: 15min, refresh: 7 days)

**Implementation**:
```typescript
import jwt from 'jsonwebtoken';

function generateAccessToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token: string): any {
  return jwt.verify(token, process.env.JWT_SECRET);
}
```


#### Role-Based Access Control (RBAC)

**Roles**:
- `customer` - Can browse, purchase, manage own account
- `support` - Can view orders, manage tickets, view customer data
- `manager` - Can manage products, inventory, view analytics
- `admin` - Full system access

**Permission Matrix**:
```typescript
const permissions = {
  customer: ['view_products', 'manage_own_cart', 'place_order', 'view_own_orders'],
  support: ['view_all_orders', 'manage_tickets', 'view_customers'],
  manager: ['manage_products', 'manage_inventory', 'view_analytics', 'manage_promotions'],
  admin: ['*'] // All permissions
};

function hasPermission(userRole: string, permission: string): boolean {
  if (permissions[userRole].includes('*')) return true;
  return permissions[userRole].includes(permission);
}
```

**Middleware**:
```typescript
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

### Data Protection

#### Encryption at Rest

**Strategy**:
- Use AES-256 encryption for sensitive data
- Encrypt PII fields (addresses, phone numbers)
- Use PostgreSQL pgcrypto extension

**Implementation**:
```typescript
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

#### Encryption in Transit

**Requirements**:
- All traffic over HTTPS (TLS 1.3)
- Valid SSL certificates
- HSTS headers
- Secure cookie flags

**Configuration**:
```typescript
// Express security headers
import helmet from 'helmet';

app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"]
    }
  }
}));

// Secure cookies
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true, // No JavaScript access
    sameSite: 'strict', // CSRF protection
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

### Attack Prevention

#### Rate Limiting

**Strategy**:
- Implement rate limiting per IP and per user
- Different limits for different endpoints
- Use Redis for distributed rate limiting

**Implementation**:
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:login:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please slow down'
});

app.post('/api/auth/login', loginLimiter, loginHandler);
app.use('/api/', apiLimiter);
```


#### Account Lockout

**Strategy**:
- Lock account after 5 failed login attempts
- Lockout duration: 15 minutes
- Send email notification on lockout

**Implementation**:
```typescript
async function handleFailedLogin(userId: string) {
  const user = await db.users.findById(userId);
  const attempts = user.failed_login_attempts + 1;
  
  if (attempts >= 5) {
    await db.users.update(userId, {
      failed_login_attempts: attempts,
      account_status: 'locked',
      locked_until: new Date(Date.now() + 15 * 60 * 1000)
    });
    
    await notificationService.sendAccountLockedEmail(user.email);
  } else {
    await db.users.update(userId, {
      failed_login_attempts: attempts
    });
  }
}

async function handleSuccessfulLogin(userId: string) {
  await db.users.update(userId, {
    failed_login_attempts: 0,
    account_status: 'active',
    locked_until: null
  });
}
```

#### SQL Injection Prevention

**Strategy**:
- Use parameterized queries
- Use ORM (e.g., Prisma, TypeORM)
- Validate and sanitize all inputs

**Implementation**:
```typescript
// Using parameterized queries
async function getProductById(id: string) {
  const result = await db.query(
    'SELECT * FROM products WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

// Input validation
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive(),
  description: z.string().max(5000),
  categoryId: z.string().uuid()
});

function validateProductInput(data: any) {
  return productSchema.parse(data);
}
```

#### XSS Prevention

**Strategy**:
- Sanitize user inputs
- Use Content Security Policy headers
- Escape output in templates
- Use React's built-in XSS protection

**Implementation**:
```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}

// In React components, use dangerouslySetInnerHTML only with sanitized content
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userContent) }} />
```

#### CSRF Prevention

**Strategy**:
- Use SameSite cookie attribute
- Implement CSRF tokens for state-changing operations
- Verify Origin and Referer headers

**Implementation**:
```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

app.post('/api/orders', csrfProtection, createOrderHandler);

// Frontend: Include CSRF token in requests
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
fetch('/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'CSRF-Token': csrfToken
  },
  body: JSON.stringify(orderData)
});
```

### PCI DSS Compliance

**Requirements**:
1. Never store full credit card numbers or CVV codes
2. Use tokenization for payment data
3. Encrypt cardholder data in transit
4. Implement strong access controls
5. Regularly test security systems
6. Maintain information security policy

**Implementation Strategy**:
- Use Stripe/PayPal hosted payment forms (reduces PCI scope)
- Store only payment tokens, not card data
- Use payment gateway SDKs for secure communication
- Implement audit logging for payment operations
- Regular security audits and penetration testing

**Payment Token Storage**:
```typescript
// Store only tokens, never actual card data
interface StoredPaymentMethod {
  id: string;
  userId: string;
  gateway: 'stripe' | 'paypal';
  token: string; // Payment gateway token
  last4: string; // Last 4 digits for display
  brand: string; // Visa, Mastercard, etc.
  expiryMonth: number;
  expiryYear: number;
}
```

### Fraud Detection

**Strategy**:
- Analyze transaction patterns
- Check billing/shipping address mismatches
- Verify IP geolocation
- Monitor velocity (multiple orders in short time)
- Integrate with payment gateway fraud tools

**Implementation**:
```typescript
interface FraudCheckResult {
  score: number; // 0-100, higher = more suspicious
  flags: string[];
  recommendation: 'approve' | 'review' | 'block';
}

async function checkForFraud(order: Order, payment: Payment): Promise<FraudCheckResult> {
  const flags: string[] = [];
  let score = 0;
  
  // Check address mismatch
  if (order.billing_address.country !== order.shipping_address.country) {
    flags.push('address_country_mismatch');
    score += 20;
  }
  
  // Check order velocity
  const recentOrders = await getRecentOrders(order.user_id, 24); // Last 24 hours
  if (recentOrders.length > 5) {
    flags.push('high_velocity');
    score += 30;
  }
  
  // Check order amount
  if (order.total_amount > 1000) {
    flags.push('high_value');
    score += 10;
  }
  
  // Check IP geolocation vs shipping address
  const ipCountry = await getCountryFromIP(payment.ip_address);
  if (ipCountry !== order.shipping_address.country) {
    flags.push('ip_location_mismatch');
    score += 25;
  }
  
  let recommendation: 'approve' | 'review' | 'block';
  if (score >= 70) recommendation = 'block';
  else if (score >= 40) recommendation = 'review';
  else recommendation = 'approve';
  
  return { score, flags, recommendation };
}
```


### Data Privacy and GDPR Compliance

**Requirements**:
- Obtain consent for data collection
- Allow data export
- Allow data deletion
- Maintain privacy policy
- Implement data retention policies

**Implementation**:
```typescript
// Data export
async function exportUserData(userId: string): Promise<any> {
  const user = await db.users.findById(userId);
  const orders = await db.orders.findByUser(userId);
  const reviews = await db.reviews.findByUser(userId);
  const addresses = await db.addresses.findByUser(userId);
  
  return {
    personal_info: {
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      phone: user.phone,
      created_at: user.created_at
    },
    orders: orders,
    reviews: reviews,
    addresses: addresses
  };
}

// Data deletion (anonymization)
async function deleteUserData(userId: string): Promise<void> {
  // Anonymize user record (keep for order history integrity)
  await db.users.update(userId, {
    email: `deleted_${userId}@anonymized.local`,
    first_name: 'Deleted',
    last_name: 'User',
    phone: null,
    password_hash: null,
    account_status: 'deleted'
  });
  
  // Delete addresses
  await db.addresses.deleteByUser(userId);
  
  // Anonymize reviews
  await db.reviews.updateByUser(userId, {
    user_id: null
  });
  
  // Keep orders for legal/accounting requirements but anonymize
  await db.orders.updateByUser(userId, {
    customer_email: `deleted_${userId}@anonymized.local`,
    customer_phone: null
  });
}
```

## Performance Optimization

### Caching Strategy

**Multi-Layer Caching**:

1. **Browser Cache**: Static assets (images, CSS, JS)
2. **CDN Cache**: Product images, static pages
3. **Redis Cache**: Product data, category data, session data
4. **Database Query Cache**: PostgreSQL query results

**Cache Invalidation**:
```typescript
// Product cache invalidation
async function updateProduct(id: string, data: UpdateProductDTO) {
  const product = await db.products.update(id, data);
  
  // Invalidate caches
  await redis.del(`product:${id}`);
  await redis.del(`category:${product.category_id}`);
  
  // Invalidate CDN cache
  await cdnService.purge(`/products/${product.slug}`);
  
  return product;
}

// Cache-aside pattern
async function getProduct(id: string): Promise<Product> {
  // Try cache first
  const cached = await redis.get(`product:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Cache miss - fetch from database
  const product = await db.products.findById(id);
  
  // Store in cache (1 hour TTL)
  await redis.setex(`product:${id}`, 3600, JSON.stringify(product));
  
  return product;
}
```

### Database Optimization

**Indexing Strategy**:
- Index all foreign keys
- Index frequently queried columns (status, created_at, email)
- Composite indexes for common query patterns
- Full-text search indexes for product search

**Query Optimization**:
```sql
-- Use EXPLAIN ANALYZE to optimize queries
EXPLAIN ANALYZE
SELECT p.*, pi.image_url, c.name as category_name
FROM products p
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.status = 'published'
  AND p.category_id = 'uuid'
ORDER BY p.created_at DESC
LIMIT 20;

-- Create composite index for common filters
CREATE INDEX idx_products_status_category_created 
ON products(status, category_id, created_at DESC);
```

**Connection Pooling**:
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

### Image Optimization

**Strategy**:
- Compress images on upload
- Generate multiple sizes (thumbnail, medium, large)
- Use WebP format with JPEG fallback
- Lazy load images
- Use CDN for delivery

**Implementation**:
```typescript
import sharp from 'sharp';

async function processProductImage(file: Buffer): Promise<ImageUrls> {
  const sizes = {
    thumbnail: { width: 150, height: 150 },
    medium: { width: 500, height: 500 },
    large: { width: 1200, height: 1200 }
  };
  
  const urls: ImageUrls = {};
  
  for (const [size, dimensions] of Object.entries(sizes)) {
    // Generate WebP
    const webpBuffer = await sharp(file)
      .resize(dimensions.width, dimensions.height, { fit: 'inside' })
      .webp({ quality: 85 })
      .toBuffer();
    
    // Generate JPEG fallback
    const jpegBuffer = await sharp(file)
      .resize(dimensions.width, dimensions.height, { fit: 'inside' })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    // Upload to S3
    urls[`${size}_webp`] = await uploadToS3(webpBuffer, 'image/webp');
    urls[`${size}_jpeg`] = await uploadToS3(jpegBuffer, 'image/jpeg');
  }
  
  return urls;
}
```


### Next.js Optimization

**Static Generation (SSG)**:
```typescript
// Generate static pages for products at build time
export async function getStaticPaths() {
  const products = await getPublishedProducts();
  
  return {
    paths: products.map(p => ({ params: { slug: p.slug } })),
    fallback: 'blocking' // Generate on-demand for new products
  };
}

export async function getStaticProps({ params }) {
  const product = await getProductBySlug(params.slug);
  
  return {
    props: { product },
    revalidate: 3600 // Revalidate every hour
  };
}
```

**Server-Side Rendering (SSR)**:
```typescript
// Use SSR for personalized pages
export async function getServerSideProps(context) {
  const session = await getSession(context);
  const cart = await getCart(session.userId);
  
  return {
    props: { cart }
  };
}
```

**API Route Optimization**:
```typescript
// Implement response caching
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  
  const products = await getProducts();
  res.json(products);
}
```

### Load Balancing and Scaling

**Horizontal Scaling**:
- Deploy multiple API server instances
- Use load balancer (AWS ALB, Nginx)
- Stateless application design
- Session storage in Redis (shared across instances)

**Database Scaling**:
- Read replicas for read-heavy operations
- Connection pooling
- Query optimization
- Partitioning for large tables (orders, analytics_events)

**Architecture**:
```
                    ┌─────────────┐
                    │Load Balancer│
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │ API     │       │ API     │       │ API     │
   │ Server 1│       │ Server 2│       │ Server 3│
   └────┬────┘       └────┬────┘       └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    │   (Shared)  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  PostgreSQL │
                    │   Primary   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  PostgreSQL │
                    │Read Replicas│
                    └─────────────┘
```

## Backup and Disaster Recovery

### Backup Strategy

**Database Backups**:
- Automated daily full backups
- Continuous WAL archiving for point-in-time recovery
- Retention: 30 days
- Geographic redundancy (different region)

**Implementation**:
```bash
# PostgreSQL backup script
#!/bin/bash
BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Create backup
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://backups-bucket/postgres/

# Delete local backups older than 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

# Delete S3 backups older than 30 days
aws s3 ls s3://backups-bucket/postgres/ | \
  awk '{print $4}' | \
  while read file; do
    # Delete logic based on file age
  done
```

**File Storage Backups**:
- S3 versioning enabled
- Cross-region replication
- Lifecycle policies for cost optimization

**Configuration Backups**:
- Version control for all configuration files
- Environment variables stored in secure vault
- Infrastructure as Code (Terraform/CloudFormation)

### Disaster Recovery Plan

**Recovery Time Objective (RTO)**: 4 hours
**Recovery Point Objective (RPO)**: 1 hour

**Recovery Procedures**:

1. **Database Recovery**:
```bash
# Restore from backup
gunzip -c backup_20240115_120000.sql.gz | psql -h $DB_HOST -U $DB_USER $DB_NAME

# Or point-in-time recovery
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME backup_file.dump
```

2. **Application Recovery**:
- Deploy from version control
- Restore environment variables
- Start application servers
- Verify health checks

3. **Data Verification**:
- Run integrity checks
- Verify recent orders
- Test critical workflows
- Monitor error logs

**Testing Schedule**:
- Quarterly disaster recovery drills
- Monthly backup restoration tests
- Annual full failover test


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies and consolidations:

**Redundancies Eliminated**:
- Properties about "displaying information" (2.2, 2.3, 3.2, 4.6, 6.6, 8.1-8.4) can be consolidated into fewer properties about data completeness in rendered output
- Multiple properties about "allowing" operations (3.3, 6.5, 6.7, 7.5, 9.6, 11.4) can be consolidated into properties about operation success
- Properties about admin CRUD operations (16.1-16.3, 16.5-16.6) can be consolidated into a single round-trip property
- Properties about notification sending (7.4, 14.4, 17.5) can be consolidated into one property about event-triggered notifications
- Properties about data persistence (3.1, 9.5, 11.3, 13.5) can be consolidated into round-trip properties

**Consolidations Made**:
- Combined product display properties into comprehensive display completeness properties
- Combined CRUD operations into round-trip properties where applicable
- Combined validation properties for similar input types
- Combined state transition properties into state machine validation

### Property 1: Category Filter Completeness

*For any* category and product catalog, when filtering products by category, all returned products must belong to the selected category and all products in that category must be returned.

**Validates: Requirements 1.2**

### Property 2: Search Result Relevance

*For any* search query and product catalog, all returned search results must match the search query based on product name, description, or specifications.

**Validates: Requirements 1.3**

### Property 3: Multi-Filter Conjunction

*For any* combination of filters (price range, brand, rating, availability) and product catalog, all returned products must satisfy all applied filters simultaneously.

**Validates: Requirements 1.4**

### Property 4: Product List Display Completeness

*For any* product in a list view, the rendered output must contain thumbnail image, name, price, and average rating.

**Validates: Requirements 1.6**

### Property 5: Product Detail Display Completeness

*For any* product detail page, the rendered output must contain all product images, name, price, description, specifications, availability status, reviews, and average rating.

**Validates: Requirements 2.2, 2.3**

### Property 6: Variant Selection Updates Display

*For any* product with variants, selecting a different variant must update the displayed price and availability to match the selected variant.

**Validates: Requirements 2.5**

### Property 7: Cart Addition Preserves Item Data

*For any* product with selected quantity and variant, adding it to the cart must store the exact product ID, variant ID, and quantity specified.

**Validates: Requirements 3.1**

### Property 8: Cart Display Completeness

*For any* cart with items, the cart view must display all items with their images, names, prices, quantities, and subtotals, plus the total.

**Validates: Requirements 3.2**

### Property 9: Cart Quantity Update Correctness

*For any* cart item, updating its quantity must result in the cart containing that item with the new quantity and the subtotal recalculated accordingly.

**Validates: Requirements 3.3**

### Property 10: Cart Persistence Round Trip

*For any* authenticated user with items in cart, logging out and logging back in must preserve all cart items with their quantities and variants.

**Validates: Requirements 3.5**

### Property 11: Save For Later Preserves Item Data

*For any* cart item moved to "saved for later", the item must be removed from the active cart and appear in the saved list with all its data intact.

**Validates: Requirements 3.6**

### Property 12: Address Validation Rejects Incomplete Data

*For any* shipping address with missing required fields (address line, city, postal code, country), the checkout system must reject the address and return a validation error.

**Validates: Requirements 4.2**

### Property 13: Shipping Calculation Returns Options

*For any* valid shipping address and cart, the shipping calculator must return at least one delivery method with cost and estimated delivery time.

**Validates: Requirements 4.3**

### Property 14: Order Summary Displays All Costs

*For any* order at checkout, the order summary must display itemized product costs, shipping cost, tax amount, discount amount (if any), and total amount.

**Validates: Requirements 4.6**

### Property 15: Order Confirmation Creates Records

*For any* completed checkout, the system must create both a payment record and an order record with matching order IDs and amounts.

**Validates: Requirements 4.7**

### Property 16: Successful Payment Returns Confirmation

*For any* successful payment transaction, the payment gateway must return a confirmation code that is stored with the payment record.

**Validates: Requirements 5.3**

### Property 17: Failed Payment Returns Error

*For any* failed payment transaction, the payment gateway must return a descriptive error message explaining the failure reason.

**Validates: Requirements 5.4**

### Property 18: Fraud Detection Analyzes All Transactions

*For any* payment transaction, the fraud detection system must analyze it and assign a fraud score before the payment is finalized.

**Validates: Requirements 5.6**

### Property 19: High Fraud Score Blocks Transaction

*For any* transaction with fraud score above the blocking threshold, the system must block the transaction and create an admin notification.

**Validates: Requirements 5.7**

### Property 20: Registration Round Trip

*For any* valid email and password meeting strength requirements, registering a user and then logging in with those credentials must succeed.

**Validates: Requirements 6.1, 6.3**

### Property 21: Email and Password Validation

*For any* registration attempt with invalid email format or weak password (less than 8 characters, missing uppercase, lowercase, or number), the system must reject the registration with a validation error.

**Validates: Requirements 6.2**

### Property 22: Invalid Login Returns Error

*For any* login attempt with incorrect email or password, the authentication system must return an error message and not create a session.

**Validates: Requirements 6.4**

### Property 23: Profile Update Round Trip

*For any* user profile field (name, phone, address, payment method), updating the field and then retrieving the profile must return the updated value.

**Validates: Requirements 6.5**

### Property 24: Order History Completeness

*For any* user with orders, viewing order history must display all orders with order numbers, dates, statuses, and totals.

**Validates: Requirements 6.6**

### Property 25: Wishlist Round Trip

*For any* product added to a user's wishlist, the product must appear in the wishlist and can be retrieved with all its data intact.

**Validates: Requirements 6.7**

### Property 26: New Order Initial Status

*For any* newly created order, the order status must be set to "placed" at creation time.

**Validates: Requirements 7.1**

### Property 27: Payment Confirmation Triggers Status Transition

*For any* order with status "placed", confirming payment must transition the order status to "payment_confirmed".

**Validates: Requirements 7.2**

### Property 28: Valid State Transitions Only

*For any* order, the system must only allow state transitions that follow the valid sequence: placed → payment_confirmed → processing → packed → shipped → delivered, and must reject invalid transitions (e.g., placed → shipped).

**Validates: Requirements 7.3**

### Property 29: Status Change Triggers Notification

*For any* order status change, the notification system must send an email to the customer with the new status.

**Validates: Requirements 7.4**

### Property 30: Status Transitions Record Timestamps

*For any* order status transition, the system must record a timestamp for when the transition occurred.

**Validates: Requirements 7.6**

### Property 31: Inventory Decrement on Order

*For any* product ordered with quantity Q, the inventory system must decrement the stock quantity by Q for that SKU.

**Validates: Requirements 9.2**

### Property 32: Out of Stock Display

*For any* product variant with stock quantity of zero, the storefront must display "Out of Stock" status for that variant.

**Validates: Requirements 9.3**

### Property 33: Low Stock Alert Generation

*For any* product variant where stock quantity falls below its configured threshold, the inventory system must generate a low-stock alert.

**Validates: Requirements 9.4**

### Property 34: Product Creation Round Trip

*For any* product created with SKU, name, description, price, and stock quantity, retrieving the product by ID must return all the same field values.

**Validates: Requirements 9.5, 16.1**

### Property 35: Stock Update Round Trip

*For any* SKU, updating its stock quantity to value Q and then retrieving it must return quantity Q.

**Validates: Requirements 9.6**

### Property 36: Shipping Cost Varies by Zone and Weight

*For any* two different shipping addresses in different zones or two carts with different weights, the calculated shipping costs must differ (unless both qualify for free shipping).

**Validates: Requirements 10.1**

### Property 37: Multiple Delivery Methods Available

*For any* valid shipping address and cart, the shipping calculator must return at least two different delivery methods with different costs or delivery times.

**Validates: Requirements 10.2**

### Property 38: Free Shipping Promotion Applies

*For any* cart that meets free shipping promotion criteria (e.g., total over threshold), the shipping calculator must return zero shipping cost.

**Validates: Requirements 10.4**

### Property 39: Shipped Order Has Tracking Number

*For any* order marked as shipped, the order must have an associated tracking number and courier name stored.

**Validates: Requirements 11.2, 11.3**

### Property 40: Review Submission Stores All Data

*For any* review submitted with rating (1-5) and comment text, the review must be stored with the exact rating and comment.

**Validates: Requirements 12.1**

### Property 41: Verified Purchase Badge Logic

*For any* review submitted by a user who has purchased the product, the review must be marked with "Verified Purchase" badge.

**Validates: Requirements 12.2**

### Property 42: Reviews Sorted by Recency

*For any* product with multiple reviews, the reviews must be displayed in descending order by creation timestamp (most recent first).

**Validates: Requirements 12.3**

### Property 43: Average Rating Calculation

*For any* product with N reviews having ratings R1, R2, ..., RN, the displayed average rating must equal (R1 + R2 + ... + RN) / N.

**Validates: Requirements 12.4**

### Property 44: Product Q&A Round Trip

*For any* question asked about a product and any answer submitted, retrieving the question must return the question text and all associated answers.

**Validates: Requirements 12.5, 12.6**

### Property 45: Valid Coupon Application

*For any* valid, non-expired coupon code applied to a cart meeting minimum purchase requirements, the system must apply the discount and reduce the total by the discount amount.

**Validates: Requirements 13.2**

### Property 46: Invalid Coupon Rejection

*For any* invalid, expired, or already-used-to-limit coupon code, the system must reject the coupon and return an error message without applying any discount.

**Validates: Requirements 13.3**

### Property 47: Discount Display in Cart

*For any* cart with an applied coupon, both the cart view and checkout summary must display the discount amount.

**Validates: Requirements 13.4**

### Property 48: Promotion Creation Round Trip

*For any* promotion created with code, discount value, start date, and end date, retrieving the promotion must return all the same field values.

**Validates: Requirements 13.5**

### Property 49: Support Ticket Creation

*For any* support ticket submitted with subject and description, the system must create a ticket with a unique ticket number and send a confirmation email.

**Validates: Requirements 14.3, 14.4**

### Property 50: Ticket Visibility to Customer

*For any* ticket created by a user, that user must be able to view the ticket status and all messages in the ticket.

**Validates: Requirements 14.5**

### Property 51: Sales Metrics Calculation

*For any* date range, the analytics system must calculate total sales as the sum of all order totals, order count as the number of orders, and average order value as total sales divided by order count.

**Validates: Requirements 15.1**

### Property 52: Conversion Rate Calculation

*For any* date range with V visits and P purchases, the conversion rate must equal P / V.

**Validates: Requirements 15.2**

### Property 53: Cart Abandonment Rate Calculation

*For any* date range with C carts created and O orders completed, the cart abandonment rate must equal (C - O) / C.

**Validates: Requirements 15.3**

### Property 54: Customer Lifetime Value Calculation

*For any* customer, the lifetime value must equal the sum of all their order totals.

**Validates: Requirements 15.4**

### Property 55: Traffic Source Tracking

*For any* page visit with a referrer, the analytics system must record the referrer as a traffic source.

**Validates: Requirements 15.5**

### Property 56: Product Update Round Trip

*For any* product field (name, description, price, specifications), updating the field and then retrieving the product must return the updated value.

**Validates: Requirements 16.2**

### Property 57: Product Deletion Removes Product

*For any* product that is deleted, subsequent attempts to retrieve that product by ID must return null or not found.

**Validates: Requirements 16.3**

### Property 58: Multiple Image Upload

*For any* product with N images uploaded, retrieving the product must return all N image URLs.

**Validates: Requirements 16.4**

### Property 59: Product Category Assignment

*For any* product assigned to a category, retrieving products by that category must include the product.

**Validates: Requirements 16.5**

### Property 60: Product Visibility Control

*For any* product set to "draft" status, the product must not appear in public storefront listings, but products set to "published" must appear.

**Validates: Requirements 16.6**

### Property 61: Order Filtering Correctness

*For any* order list filtered by status, date range, or customer, all returned orders must match all applied filter criteria.

**Validates: Requirements 17.1**

### Property 62: Order Detail Completeness

*For any* order viewed by admin, the order details must include all products, customer information, shipping address, billing address, and payment information.

**Validates: Requirements 17.2**

### Property 63: Refund Processing

*For any* refund processed (full or partial), the system must create a refund record, call the payment gateway refund API, and send a confirmation email to the customer.

**Validates: Requirements 17.3, 17.4, 17.5**

### Property 64: Customer Search and Filter

*For any* customer list filtered by search term or criteria, all returned customers must match the filter criteria.

**Validates: Requirements 18.1**

### Property 65: Customer Detail Completeness

*For any* customer viewed by admin, the details must include profile information, complete order history, and account status.

**Validates: Requirements 18.2**

### Property 66: Account Status Toggle

*For any* customer account, an admin changing the status from "active" to "disabled" must prevent that customer from logging in, and changing back to "active" must restore login capability.

**Validates: Requirements 18.3**

### Property 67: Admin Password Reset

*For any* customer account, when an admin resets the password, the old password must no longer work and a new temporary password must be generated.

**Validates: Requirements 18.4**

### Property 68: Role-Based Access Control

*For any* user with role R and any operation O, the system must allow the operation only if role R has permission for operation O according to the permission matrix.

**Validates: Requirements 18.5**

### Property 69: Password Hashing

*For any* user account, the stored password must be a bcrypt hash, not plain text, and must verify correctly against the original password.

**Validates: Requirements 19.2**

### Property 70: Secure Cookie Attributes

*For any* session cookie, the cookie must have the secure, httpOnly, and sameSite attributes set.

**Validates: Requirements 19.3**

### Property 71: Password Strength Enforcement

*For any* password that doesn't meet requirements (minimum 8 characters, at least one uppercase, one lowercase, one number), the system must reject it with a validation error.

**Validates: Requirements 19.4**

### Property 72: Login Rate Limiting

*For any* IP address or user account, making more than the rate limit of login requests within the time window must result in subsequent requests being blocked with a rate limit error.

**Validates: Requirements 19.5**

### Property 73: Account Lockout After Failed Attempts

*For any* user account with 5 consecutive failed login attempts, the account must be locked for 15 minutes and login attempts during lockout must be rejected.

**Validates: Requirements 19.6**

### Property 74: No Card Data Storage

*For any* payment processed, the database must not contain the full credit card number or CVV code, only payment tokens from the gateway.

**Validates: Requirements 19.8**

### Property 75: Sensitive Data Encryption

*For any* sensitive data field (addresses, phone numbers) stored in the database, the stored value must be encrypted and decryption must return the original value.

**Validates: Requirements 20.1**

### Property 76: Data Export Completeness

*For any* user requesting data export, the exported data must include all personal information, order history, reviews, and saved addresses.

**Validates: Requirements 20.2**

### Property 77: Account Deletion Anonymization

*For any* user requesting account deletion, after processing, all personal data must be anonymized or deleted, and the user must not be able to log in.

**Validates: Requirements 20.4**

### Property 78: Consent-Based Data Collection

*For any* non-essential data collection, the system must only collect the data if the user has provided explicit consent.

**Validates: Requirements 20.6**

### Property 79: Email List Subscription with Consent

*For any* user registration, the user must be added to the email marketing list only if they provided consent during registration.

**Validates: Requirements 21.2**

### Property 80: Customer Data Sync

*For any* customer in the system, their name, email, and purchase history must be synced to the email marketing service.

**Validates: Requirements 21.3**

### Property 81: Semantic HTML Heading Hierarchy

*For any* page, the HTML must have a single h1 tag, and heading levels must not skip (e.g., h1 → h3 without h2).

**Validates: Requirements 22.1**

### Property 82: Meta Tags Presence

*For any* product or category page, the HTML must include both a meta description tag and a title tag.

**Validates: Requirements 22.2**

### Property 83: Sitemap Completeness

*For any* published product or category, its URL must appear in the generated XML sitemap.

**Validates: Requirements 22.3**

### Property 84: Structured Data Markup

*For any* product page, the HTML must include Schema.org structured data markup for the product, and pages with reviews must include review markup.

**Validates: Requirements 22.4**

### Property 85: SEO-Friendly URL Format

*For any* product or category, the URL must include the product/category name in slug format (lowercase, hyphens instead of spaces).

**Validates: Requirements 22.5**

### Property 86: Canonical Tag Presence

*For any* page that could have duplicate content, the HTML must include a canonical tag pointing to the preferred URL.

**Validates: Requirements 22.6**

### Property 87: Image Compression

*For any* image uploaded to the platform, the stored image must be compressed to reduce file size while maintaining acceptable visual quality.

**Validates: Requirements 23.3**

### Property 88: Responsive Display Range

*For any* page viewed at screen widths between 320px and 2560px, the page must display correctly without horizontal scrolling or broken layouts.

**Validates: Requirements 24.1**

### Property 89: Touch Target Minimum Size

*For any* interactive element (button, link) on mobile, the touch target must be at least 44px in both width and height.

**Validates: Requirements 24.2**

### Property 90: Mobile Image Optimization

*For any* image served to mobile devices, the system must serve a mobile-optimized version with reduced file size compared to the desktop version.

**Validates: Requirements 24.3**


## Error Handling

### Error Categories

**Validation Errors (400 Bad Request)**:
- Invalid input format
- Missing required fields
- Business rule violations
- Example: Invalid email format, weak password, empty cart checkout

**Authentication Errors (401 Unauthorized)**:
- Missing authentication token
- Invalid or expired token
- Example: Accessing protected resource without login

**Authorization Errors (403 Forbidden)**:
- Insufficient permissions
- Role-based access denial
- Example: Customer trying to access admin endpoints

**Not Found Errors (404 Not Found)**:
- Resource doesn't exist
- Example: Product ID not found, order not found

**Conflict Errors (409 Conflict)**:
- Resource state conflict
- Concurrent modification
- Example: Insufficient stock, duplicate email registration

**Rate Limit Errors (429 Too Many Requests)**:
- Exceeded rate limit
- Example: Too many login attempts, API request throttling

**Server Errors (500 Internal Server Error)**:
- Unexpected system errors
- Database connection failures
- External service failures
- Example: Payment gateway timeout, database crash

### Error Response Format

All API errors follow a consistent JSON format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```


### Error Handling Implementation

**Global Error Handler**:
```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.id || generateRequestId();
  
  // Log error
  logger.error({
    error: err.message,
    stack: err.stack,
    requestId,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });
  
  // Determine error type and status code
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details = [];
  
  if (err instanceof ValidationError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.message;
    details = err.details;
  } else if (err instanceof AuthenticationError) {
    statusCode = 401;
    errorCode = 'AUTHENTICATION_ERROR';
    message = err.message;
  } else if (err instanceof AuthorizationError) {
    statusCode = 403;
    errorCode = 'AUTHORIZATION_ERROR';
    message = err.message;
  } else if (err instanceof NotFoundError) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = err.message;
  } else if (err instanceof ConflictError) {
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = err.message;
  }
  
  // Send error response
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId
    }
  });
});
```

**Service-Level Error Handling**:
```typescript
async function createOrder(data: CreateOrderDTO): Promise<Order> {
  try {
    // Check stock availability
    const availability = await inventoryService.checkAvailability(data.items);
    if (!availability.allAvailable) {
      throw new ConflictError('Some items are out of stock', {
        unavailableItems: availability.unavailableItems
      });
    }
    
    // Reserve stock
    await inventoryService.reserveStock(data.items);
    
    // Process payment
    const payment = await paymentService.processPayment(data.payment);
    if (payment.status === 'failed') {
      // Release reserved stock
      await inventoryService.releaseStock(data.items);
      throw new PaymentError(payment.errorMessage);
    }
    
    // Create order
    const order = await db.orders.create({
      ...data,
      paymentId: payment.id,
      status: 'placed'
    });
    
    // Send confirmation email
    await notificationService.sendOrderConfirmation(order.id);
    
    return order;
  } catch (error) {
    // Log and rethrow
    logger.error('Order creation failed', { error, data });
    throw error;
  }
}
```

### Retry Logic

**Exponential Backoff for External Services**:
```typescript
async function callExternalService<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
```

### Circuit Breaker Pattern

**Prevent Cascading Failures**:
```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
    }
  }
}
```


## Testing Strategy

### Dual Testing Approach

The platform requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
**Property Tests**: Verify universal properties across all inputs

Together, these approaches provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Property-Based Testing

**Library Selection**:
- **JavaScript/TypeScript**: fast-check
- **Reason**: Mature, well-maintained, excellent TypeScript support, integrates with Jest/Vitest

**Configuration**:
```typescript
import fc from 'fast-check';

// Configure to run minimum 100 iterations per test
fc.configureGlobal({
  numRuns: 100,
  verbose: true
});
```

**Property Test Structure**:

Each correctness property from the design document must be implemented as a single property-based test with a comment tag referencing the design property.

**Example Property Tests**:

```typescript
// Feature: ecommerce-platform, Property 1: Category Filter Completeness
test('category filter returns only products from selected category', () => {
  fc.assert(
    fc.property(
      fc.uuid(), // categoryId
      fc.array(productArbitrary()), // product catalog
      (categoryId, products) => {
        // Setup: Assign some products to the category
        const categoryProducts = products.filter(p => p.categoryId === categoryId);
        
        // Execute: Filter by category
        const result = filterProductsByCategory(products, categoryId);
        
        // Verify: All results belong to category
        expect(result.every(p => p.categoryId === categoryId)).toBe(true);
        
        // Verify: All category products are included
        expect(result.length).toBe(categoryProducts.length);
      }
    )
  );
});

// Feature: ecommerce-platform, Property 10: Cart Persistence Round Trip
test('cart persists across sessions for authenticated users', () => {
  fc.assert(
    fc.property(
      fc.uuid(), // userId
      fc.array(cartItemArbitrary(), { minLength: 1, maxLength: 10 }),
      async (userId, items) => {
        // Setup: Add items to cart
        for (const item of items) {
          await cartService.addItem(userId, item);
        }
        
        // Execute: Simulate logout/login (clear cache, fetch from DB)
        await clearUserCache(userId);
        const retrievedCart = await cartService.getCart(userId);
        
        // Verify: All items preserved
        expect(retrievedCart.items).toHaveLength(items.length);
        for (const item of items) {
          const found = retrievedCart.items.find(
            i => i.productId === item.productId && i.variantId === item.variantId
          );
          expect(found).toBeDefined();
          expect(found.quantity).toBe(item.quantity);
        }
      }
    )
  );
});

// Feature: ecommerce-platform, Property 43: Average Rating Calculation
test('average rating equals sum of ratings divided by count', () => {
  fc.assert(
    fc.property(
      fc.uuid(), // productId
      fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 100 }),
      async (productId, ratings) => {
        // Setup: Create reviews with ratings
        for (const rating of ratings) {
          await reviewService.createReview({
            productId,
            userId: generateUuid(),
            rating,
            comment: 'Test review'
          });
        }
        
        // Execute: Get average rating
        const avgRating = await reviewService.getAverageRating(productId);
        
        // Verify: Correct calculation
        const expectedAvg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        expect(avgRating).toBeCloseTo(expectedAvg, 2);
      }
    )
  );
});
```

**Custom Arbitraries**:

```typescript
// Generate random products
const productArbitrary = () => fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  price: fc.double({ min: 0.01, max: 10000, noNaN: true }),
  categoryId: fc.uuid(),
  status: fc.constantFrom('draft', 'published', 'archived'),
  stock: fc.integer({ min: 0, max: 1000 })
});

// Generate random cart items
const cartItemArbitrary = () => fc.record({
  productId: fc.uuid(),
  variantId: fc.option(fc.uuid(), { nil: null }),
  quantity: fc.integer({ min: 1, max: 10 })
});

// Generate random addresses
const addressArbitrary = () => fc.record({
  addressLine1: fc.string({ minLength: 5, maxLength: 100 }),
  city: fc.string({ minLength: 2, maxLength: 50 }),
  postalCode: fc.string({ minLength: 3, maxLength: 10 }),
  country: fc.constantFrom('US', 'UK', 'CA', 'AU', 'DE', 'FR')
});

// Generate random emails
const emailArbitrary = () => fc.emailAddress();

// Generate random passwords (valid)
const validPasswordArbitrary = () => fc.string({ minLength: 8, maxLength: 50 })
  .filter(s => /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s));

// Generate random passwords (invalid)
const invalidPasswordArbitrary = () => fc.oneof(
  fc.string({ maxLength: 7 }), // Too short
  fc.string({ minLength: 8 }).filter(s => !/[A-Z]/.test(s)), // No uppercase
  fc.string({ minLength: 8 }).filter(s => !/[a-z]/.test(s)), // No lowercase
  fc.string({ minLength: 8 }).filter(s => !/[0-9]/.test(s))  // No number
);
```


### Unit Testing

**Testing Framework**: Jest or Vitest
**Coverage Target**: 80% code coverage minimum

**Unit Test Focus Areas**:

1. **Specific Examples**: Concrete test cases that demonstrate correct behavior
2. **Edge Cases**: Boundary conditions, empty inputs, maximum values
3. **Error Conditions**: Invalid inputs, system failures, external service errors
4. **Integration Points**: Component interactions, API contracts

**Example Unit Tests**:

```typescript
describe('ProductService', () => {
  describe('createProduct', () => {
    it('should create a product with valid data', async () => {
      const productData = {
        name: 'Test Product',
        description: 'A test product',
        price: 29.99,
        categoryId: 'cat-123',
        sku: 'TEST-001'
      };
      
      const product = await productService.createProduct(productData);
      
      expect(product.id).toBeDefined();
      expect(product.name).toBe(productData.name);
      expect(product.price).toBe(productData.price);
    });
    
    it('should reject product with negative price', async () => {
      const productData = {
        name: 'Test Product',
        price: -10,
        categoryId: 'cat-123',
        sku: 'TEST-001'
      };
      
      await expect(productService.createProduct(productData))
        .rejects.toThrow(ValidationError);
    });
    
    it('should reject product with duplicate SKU', async () => {
      const productData = {
        name: 'Test Product',
        price: 29.99,
        categoryId: 'cat-123',
        sku: 'EXISTING-SKU'
      };
      
      await expect(productService.createProduct(productData))
        .rejects.toThrow(ConflictError);
    });
  });
});

describe('CartService', () => {
  describe('addItem', () => {
    it('should add item to empty cart', async () => {
      const userId = 'user-123';
      const item = {
        productId: 'prod-456',
        variantId: 'var-789',
        quantity: 2
      };
      
      const cart = await cartService.addItem(userId, item);
      
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0]).toMatchObject(item);
    });
    
    it('should increase quantity if item already in cart', async () => {
      const userId = 'user-123';
      const item = {
        productId: 'prod-456',
        variantId: 'var-789',
        quantity: 2
      };
      
      await cartService.addItem(userId, item);
      const cart = await cartService.addItem(userId, { ...item, quantity: 3 });
      
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(5);
    });
    
    it('should reject adding out-of-stock item', async () => {
      const userId = 'user-123';
      const item = {
        productId: 'out-of-stock-product',
        variantId: 'var-789',
        quantity: 1
      };
      
      await expect(cartService.addItem(userId, item))
        .rejects.toThrow(ConflictError);
    });
  });
});

describe('OrderService', () => {
  describe('createOrder', () => {
    it('should create order with valid data', async () => {
      const orderData = {
        userId: 'user-123',
        items: [{ productId: 'prod-456', quantity: 2, price: 29.99 }],
        shippingAddress: validAddress,
        paymentMethod: 'credit_card'
      };
      
      const order = await orderService.createOrder(orderData);
      
      expect(order.id).toBeDefined();
      expect(order.status).toBe('placed');
      expect(order.total_amount).toBe(59.98);
    });
    
    it('should fail if payment processing fails', async () => {
      const orderData = {
        userId: 'user-123',
        items: [{ productId: 'prod-456', quantity: 2, price: 29.99 }],
        shippingAddress: validAddress,
        paymentMethod: 'invalid_card'
      };
      
      await expect(orderService.createOrder(orderData))
        .rejects.toThrow(PaymentError);
    });
  });
});
```

### Integration Testing

**Focus**: Test interactions between components and external services

**Example Integration Tests**:

```typescript
describe('Checkout Flow Integration', () => {
  it('should complete full checkout process', async () => {
    // Setup: Create user and add items to cart
    const user = await createTestUser();
    await cartService.addItem(user.id, testCartItem);
    
    // Execute: Complete checkout
    const order = await checkoutService.processCheckout({
      userId: user.id,
      shippingAddress: testAddress,
      paymentMethod: testPaymentMethod
    });
    
    // Verify: Order created
    expect(order.status).toBe('payment_confirmed');
    
    // Verify: Inventory decremented
    const stock = await inventoryService.getStock(testCartItem.sku);
    expect(stock).toBe(initialStock - testCartItem.quantity);
    
    // Verify: Cart cleared
    const cart = await cartService.getCart(user.id);
    expect(cart.items).toHaveLength(0);
    
    // Verify: Email sent
    expect(emailService.sendOrderConfirmation).toHaveBeenCalledWith(order.id);
  });
});

describe('Payment Gateway Integration', () => {
  it('should process payment through Stripe', async () => {
    const payment = await paymentService.processPayment({
      amount: 100.00,
      currency: 'USD',
      paymentMethod: 'stripe',
      token: testStripeToken
    });
    
    expect(payment.status).toBe('completed');
    expect(payment.transactionId).toBeDefined();
  });
});
```

### End-to-End Testing

**Framework**: Playwright or Cypress
**Focus**: Test complete user workflows through the UI

**Example E2E Tests**:

```typescript
test('customer can complete purchase', async ({ page }) => {
  // Navigate to product page
  await page.goto('/products/test-product');
  
  // Add to cart
  await page.click('[data-testid="add-to-cart"]');
  
  // Go to cart
  await page.click('[data-testid="cart-icon"]');
  expect(await page.locator('[data-testid="cart-item"]').count()).toBe(1);
  
  // Proceed to checkout
  await page.click('[data-testid="checkout-button"]');
  
  // Fill shipping address
  await page.fill('[name="address"]', '123 Test St');
  await page.fill('[name="city"]', 'Test City');
  await page.fill('[name="postalCode"]', '12345');
  await page.click('[data-testid="continue-to-payment"]');
  
  // Fill payment details
  await page.fill('[name="cardNumber"]', '4242424242424242');
  await page.fill('[name="expiry"]', '12/25');
  await page.fill('[name="cvv"]', '123');
  
  // Complete order
  await page.click('[data-testid="place-order"]');
  
  // Verify confirmation
  await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
  const orderNumber = await page.locator('[data-testid="order-number"]').textContent();
  expect(orderNumber).toMatch(/^ORD-\d+$/);
});
```

### Performance Testing

**Tools**: k6, Artillery, or Apache JMeter
**Focus**: Load testing, stress testing, endurance testing

**Test Scenarios**:
- 1000 concurrent users browsing products
- 500 concurrent checkout processes
- Database query performance under load
- API response times under various loads

**Example k6 Test**:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 500 }, // Ramp up to 500 users
    { duration: '5m', target: 500 }, // Stay at 500 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.01'],    // Less than 1% failures
  },
};

export default function () {
  // Browse products
  const productsRes = http.get('https://api.example.com/products');
  check(productsRes, {
    'products loaded': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 2000,
  });
  
  sleep(1);
  
  // View product detail
  const productRes = http.get('https://api.example.com/products/123');
  check(productRes, {
    'product loaded': (r) => r.status === 200,
  });
  
  sleep(2);
}
```

### Test Data Management

**Strategy**:
- Use factories for test data generation
- Seed database with consistent test data
- Clean up after tests
- Use transactions for test isolation

**Example Test Factories**:

```typescript
export const productFactory = (overrides = {}) => ({
  id: generateUuid(),
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: parseFloat(faker.commerce.price()),
  categoryId: generateUuid(),
  sku: faker.string.alphanumeric(10).toUpperCase(),
  status: 'published',
  stock: faker.number.int({ min: 0, max: 100 }),
  ...overrides
});

export const userFactory = (overrides = {}) => ({
  id: generateUuid(),
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  passwordHash: hashPassword('Test123!'),
  role: 'customer',
  ...overrides
});

export const orderFactory = (overrides = {}) => ({
  id: generateUuid(),
  orderNumber: `ORD-${Date.now()}`,
  userId: generateUuid(),
  status: 'placed',
  subtotal: 100.00,
  shippingCost: 10.00,
  taxAmount: 11.00,
  totalAmount: 121.00,
  ...overrides
});
```

### Continuous Integration

**CI Pipeline**:
1. Run linting (ESLint, Prettier)
2. Run unit tests with coverage
3. Run property-based tests
4. Run integration tests
5. Run E2E tests (on staging)
6. Generate coverage report
7. Fail build if coverage < 80%

**GitHub Actions Example**:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Run property tests
        run: npm run test:property
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
      
      - name: Check coverage threshold
        run: npm run test:coverage-check
```

