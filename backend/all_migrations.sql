-- --- Migration: 001_create_core_tables.sql ---
-- Migration: Create Core Tables
-- Description: Users, Addresses, Categories, Products, Product Variants, Product Images

-- Users table
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'seller', 'admin')),
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP NULL,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Addresses table
CREATE TABLE addresses (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  address_type VARCHAR(20) DEFAULT 'shipping' CHECK (address_type IN ('shipping', 'billing', 'both')),
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_addresses_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_is_default ON addresses(is_default);

-- Categories table
CREATE TABLE categories (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  parent_id CHAR(36),
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_parent_id FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_is_active ON categories(is_active);

-- Products table
CREATE TABLE products (
  id CHAR(36) PRIMARY KEY,
  seller_id CHAR(36) NOT NULL,
  category_id CHAR(36),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  sku VARCHAR(100) UNIQUE NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  compare_at_price DECIMAL(10, 2) CHECK (compare_at_price >= 0),
  cost_per_item DECIMAL(10, 2) CHECK (cost_per_item >= 0),
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER DEFAULT 10,
  weight DECIMAL(10, 2),
  weight_unit VARCHAR(10) DEFAULT 'kg',
  brand VARCHAR(100),
  `condition` VARCHAR(20) DEFAULT 'new' CHECK (`condition` IN ('new', 'used', 'refurbished')),
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  average_rating DECIMAL(3, 2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
  review_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_products_category_id FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_products_average_rating ON products(average_rating);

-- Product Variants table
CREATE TABLE product_variants (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  compare_at_price DECIMAL(10, 2) CHECK (compare_at_price >= 0),
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  weight DECIMAL(10, 2),
  option1_name VARCHAR(50),
  option1_value VARCHAR(100),
  option2_name VARCHAR(50),
  option2_value VARCHAR(100),
  option3_name VARCHAR(50),
  option3_value VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_variants_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
CREATE INDEX idx_product_variants_is_active ON product_variants(is_active);

-- Product Images table
CREATE TABLE product_images (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_images_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_is_primary ON product_images(is_primary);
CREATE INDEX idx_product_images_display_order ON product_images(display_order);


-- --- Migration: 002_create_order_tables.sql ---
-- Migration: Create Order Tables
-- Description: Orders, Order Items, Order Status History

-- Orders table
CREATE TABLE orders (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'placed', 'confirmed', 'payment_confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  
  -- Pricing
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  shipping_cost DECIMAL(10, 2) DEFAULT 0 CHECK (shipping_cost >= 0),
  tax_amount DECIMAL(10, 2) DEFAULT 0 CHECK (tax_amount >= 0),
  discount_amount DECIMAL(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
  
  -- Shipping Address
  shipping_full_name VARCHAR(200) NOT NULL,
  shipping_phone VARCHAR(20) NOT NULL,
  shipping_address_line1 VARCHAR(255) NOT NULL,
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(100) NOT NULL,
  shipping_state VARCHAR(100) NOT NULL,
  shipping_postal_code VARCHAR(20) NOT NULL,
  shipping_country VARCHAR(100) NOT NULL,
  
  -- Billing Address
  billing_full_name VARCHAR(200) NOT NULL,
  billing_phone VARCHAR(20) NOT NULL,
  billing_address_line1 VARCHAR(255) NOT NULL,
  billing_address_line2 VARCHAR(255),
  billing_city VARCHAR(100) NOT NULL,
  billing_state VARCHAR(100) NOT NULL,
  billing_postal_code VARCHAR(20) NOT NULL,
  billing_country VARCHAR(100) NOT NULL,
  
  -- Additional Info
  customer_notes TEXT,
  admin_notes TEXT,
  
  -- Timestamps
  confirmed_at TIMESTAMP NULL,
  shipped_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Order Items table
CREATE TABLE order_items (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  product_variant_id CHAR(36),
  
  -- Product snapshot at time of order
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100) NOT NULL,
  variant_name VARCHAR(255),
  
  -- Pricing
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  
  -- Additional Info
  product_image_url VARCHAR(500),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_order_items_variant_id FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Order Status History table
CREATE TABLE order_status_history (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL,
  notes TEXT,
  changed_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_osh_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_osh_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON order_status_history(created_at);


-- --- Migration: 003_create_payment_shipping_tables.sql ---
-- Migration: Create Payment and Shipping Tables
-- Description: Payments, Refunds, Shipments

-- Payments table
CREATE TABLE payments (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) UNIQUE NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('stripe', 'paypal', 'flutterwave', 'bank_transfer', 'cash', 'card', 'wallet', 'other')),
  payment_provider_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Payment Details
  card_last4 VARCHAR(4),
  card_brand VARCHAR(20),
  
  -- Metadata
  metadata JSON,
  error_message TEXT,
  
  -- Timestamps
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Order ID index is covered by the UNIQUE constraint above
CREATE INDEX idx_payments_payment_provider_id ON payments(payment_provider_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Refunds table
CREATE TABLE refunds (
  id CHAR(36) PRIMARY KEY,
  payment_id CHAR(36) NOT NULL,
  order_id CHAR(36) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  refund_provider_id VARCHAR(255),
  processed_by CHAR(36),
  
  -- Timestamps
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_refunds_payment_id FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_refunds_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_refunds_processed_by FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_created_at ON refunds(created_at);

-- Shipments table
CREATE TABLE shipments (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  courier VARCHAR(50) NOT NULL,
  tracking_number VARCHAR(100) UNIQUE NOT NULL,
  tracking_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned')),
  
  -- Shipping Details
  weight DECIMAL(10, 2),
  weight_unit VARCHAR(10) DEFAULT 'kg',
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Metadata
  metadata JSON,
  notes TEXT,
  
  -- Timestamps
  shipped_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_shipments_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_created_at ON shipments(created_at);


-- --- Migration: 004_create_review_support_tables.sql ---
-- Migration: Create Review and Support Tables
-- Description: Reviews, Product Questions/Answers, Support Tickets

-- Reviews table
CREATE TABLE reviews (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  order_id CHAR(36),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT TRUE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE(product_id, user_id, order_id),
  CONSTRAINT fk_reviews_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_is_approved ON reviews(is_approved);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- Product Questions table
CREATE TABLE product_questions (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  question TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pq_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_pq_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_questions_product_id ON product_questions(product_id);
CREATE INDEX idx_product_questions_user_id ON product_questions(user_id);
CREATE INDEX idx_product_questions_is_answered ON product_questions(is_answered);
CREATE INDEX idx_product_questions_created_at ON product_questions(created_at);

-- Product Answers table
CREATE TABLE product_answers (
  id CHAR(36) PRIMARY KEY,
  question_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  answer TEXT NOT NULL,
  is_seller BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT TRUE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pa_question_id FOREIGN KEY (question_id) REFERENCES product_questions(id) ON DELETE CASCADE,
  CONSTRAINT fk_pa_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_answers_question_id ON product_answers(question_id);
CREATE INDEX idx_product_answers_user_id ON product_answers(user_id);
CREATE INDEX idx_product_answers_created_at ON product_answers(created_at);

-- Support Tickets table
CREATE TABLE support_tickets (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  order_id CHAR(36),
  subject VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('order', 'product', 'payment', 'shipping', 'account', 'other')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  assigned_to CHAR(36),
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_st_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_st_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_st_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_order_id ON support_tickets(order_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);

-- Ticket Messages table
CREATE TABLE ticket_messages (
  id CHAR(36) PRIMARY KEY,
  ticket_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  message TEXT NOT NULL,
  is_staff BOOLEAN DEFAULT FALSE,
  attachments JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tm_ticket_id FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_tm_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_user_id ON ticket_messages(user_id);
CREATE INDEX idx_ticket_messages_created_at ON ticket_messages(created_at);


-- --- Migration: 005_create_marketing_analytics_tables.sql ---
-- Migration: Create Marketing and Analytics Tables
-- Description: Promotions, Carts, Wishlists, Analytics Events, Email Subscriptions

-- Promotions table
CREATE TABLE promotions (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value >= 0),
  min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
  max_discount_amount DECIMAL(10, 2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_promotions_code ON promotions(code);
CREATE INDEX idx_promotions_is_active ON promotions(is_active);
CREATE INDEX idx_promotions_start_date ON promotions(start_date);
CREATE INDEX idx_promotions_end_date ON promotions(end_date);

-- Carts table
CREATE TABLE carts (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  session_id VARCHAR(255),
  promotion_id CHAR(36),
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE(user_id),
  UNIQUE(session_id),
  CONSTRAINT fk_carts_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_carts_promotion_id FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE SET NULL
);

CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_carts_session_id ON carts(session_id);
CREATE INDEX idx_carts_expires_at ON carts(expires_at);

-- Cart Items table
CREATE TABLE cart_items (
  id CHAR(36) PRIMARY KEY,
  cart_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  product_variant_id CHAR(36),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  is_saved_for_later BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE(cart_id, product_id, product_variant_id),
  CONSTRAINT fk_ci_cart_id FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_variant_id FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX idx_cart_items_is_saved_for_later ON cart_items(is_saved_for_later);

-- Wishlists table
CREATE TABLE wishlists (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id),
  CONSTRAINT fk_wishlist_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_wishlist_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX idx_wishlists_product_id ON wishlists(product_id);
CREATE INDEX idx_wishlists_created_at ON wishlists(created_at);

-- Analytics Events table
CREATE TABLE analytics_events (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  session_id VARCHAR(255),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('page_view', 'product_view', 'add_to_cart', 'remove_from_cart', 'checkout_start', 'checkout_complete', 'search', 'click')),
  event_data JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ae_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);

-- Email Subscriptions table
CREATE TABLE email_subscriptions (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  user_id CHAR(36),
  is_subscribed BOOLEAN DEFAULT TRUE,
  subscription_type VARCHAR(50) DEFAULT 'newsletter' CHECK (subscription_type IN ('newsletter', 'promotions', 'product_updates', 'all')),
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_es_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_subscriptions_email ON email_subscriptions(email);
CREATE INDEX idx_email_subscriptions_user_id ON email_subscriptions(user_id);
CREATE INDEX idx_email_subscriptions_is_subscribed ON email_subscriptions(is_subscribed);


-- --- Migration: 006_add_password_reset_fields.sql ---
-- Migration: Add password reset fields to users table
-- Description: Adds password_reset_token and password_reset_expires columns for password reset functionality

-- Add password reset fields
ALTER TABLE users 
ADD COLUMN password_reset_token VARCHAR(255),
ADD COLUMN password_reset_expires TIMESTAMP NULL;

-- Create index for password reset token lookups
CREATE INDEX idx_users_reset_token ON users(password_reset_token);


-- --- Migration: 007_align_schema_with_services.sql ---
-- Migration: Align Schema with Service Layer
-- Description: Adds missing columns and renames columns to match service expectations

-- ============================================================
-- USERS TABLE: add email_verified, account_status columns
-- ============================================================
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN account_status VARCHAR(20) DEFAULT 'active' 
  CHECK (account_status IN ('active', 'disabled', 'suspended'));

-- Sync existing is_verified -> email_verified
UPDATE users SET email_verified = is_verified WHERE email_verified != is_verified;

-- ============================================================
-- PRODUCTS TABLE: add base_price, status, specifications columns
-- ============================================================
ALTER TABLE products ADD COLUMN base_price DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN status VARCHAR(20) DEFAULT 'draft' 
  CHECK (status IN ('draft', 'published', 'archived'));
ALTER TABLE products ADD COLUMN specifications JSON;

-- Sync existing price -> base_price
UPDATE products SET base_price = price WHERE base_price IS NULL;

-- Sync is_active -> status
UPDATE products SET status = CASE WHEN is_active = TRUE THEN 'published' ELSE 'archived' END 
  WHERE status = 'draft';

-- ============================================================
-- PRODUCT VARIANTS TABLE: add variant_name, price_adjustment, 
-- low_stock_threshold, weight_grams columns
-- ============================================================
ALTER TABLE product_variants ADD COLUMN variant_name VARCHAR(255);
ALTER TABLE product_variants ADD COLUMN price_adjustment DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE product_variants ADD COLUMN low_stock_threshold INTEGER DEFAULT 10;
ALTER TABLE product_variants ADD COLUMN weight_grams INTEGER;
ALTER TABLE product_variants ADD COLUMN attributes JSON;

-- Sync existing name -> variant_name
UPDATE product_variants SET variant_name = name WHERE variant_name IS NULL;

-- Sync weight (kg) -> weight_grams
UPDATE product_variants SET weight_grams = CAST(weight * 1000 AS SIGNED) WHERE weight IS NOT NULL AND weight_grams IS NULL;

-- ============================================================
-- ORDERS TABLE: add JSON address columns, currency, customer_email,
-- customer_phone, notes; fix status values
-- ============================================================
ALTER TABLE orders ADD COLUMN shipping_address JSON;
ALTER TABLE orders ADD COLUMN billing_address JSON;
ALTER TABLE orders ADD COLUMN currency VARCHAR(10) DEFAULT 'USD';
ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255);
ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN notes TEXT;

-- Backfill JSON address from flat columns (for existing rows)
UPDATE orders SET shipping_address = JSON_OBJECT(
  'fullName', shipping_full_name,
  'addressLine1', shipping_address_line1,
  'addressLine2', shipping_address_line2,
  'city', shipping_city,
  'state', shipping_state,
  'postalCode', shipping_postal_code,
  'country', shipping_country
) WHERE shipping_address IS NULL;

UPDATE orders SET billing_address = JSON_OBJECT(
  'fullName', billing_full_name,
  'addressLine1', billing_address_line1,
  'addressLine2', billing_address_line2,
  'city', billing_city,
  'state', billing_state,
  'postalCode', billing_postal_code,
  'country', billing_country
) WHERE billing_address IS NULL;

-- Add new status values to orders
-- Note: MySQL doesn't have partial INDEX or direct CHECK constraint replacement during ALTER in pure SQL without specialized scripts, 
-- but MySQL 8.0 support CHECK.
-- Note: Status check constraint was already updated in migration 002

-- ============================================================
-- ORDER ITEMS TABLE: fix column name variant_id vs product_variant_id
-- ============================================================
ALTER TABLE order_items ADD COLUMN variant_id CHAR(36);
ALTER TABLE order_items ADD COLUMN sku VARCHAR(100);

-- Sync product_variant_id -> variant_id
UPDATE order_items SET variant_id = product_variant_id WHERE variant_id IS NULL AND product_variant_id IS NOT NULL;
UPDATE order_items SET sku = product_sku WHERE sku IS NULL;

ALTER TABLE order_items ADD CONSTRAINT fk_oi_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT;

-- ============================================================
-- ORDER STATUS HISTORY: fix created_by vs changed_by
-- ============================================================
ALTER TABLE order_status_history ADD COLUMN created_by CHAR(36);
UPDATE order_status_history SET created_by = changed_by WHERE created_by IS NULL AND changed_by IS NOT NULL;

ALTER TABLE order_status_history ADD CONSTRAINT fk_osh_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- CART ITEMS TABLE: ensure it exists with correct columns
-- ============================================================
DROP TABLE IF EXISTS cart_items;
CREATE TABLE cart_items (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  variant_id CHAR(36),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ci_user_id_new FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_product_id_new FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_variant_id_new FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);



-- --- Migration: 009_fix_payments_table.sql ---
-- Migration: Fix payments table to match service expectations

-- Add missing columns
ALTER TABLE payments ADD COLUMN payment_gateway VARCHAR(50);
ALTER TABLE payments ADD COLUMN transaction_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN payment_details JSON;
ALTER TABLE payments ADD COLUMN fraud_score DECIMAL(5,2);
ALTER TABLE payments ADD COLUMN fraud_status VARCHAR(20);

-- Sync payment_provider_id -> transaction_id
UPDATE payments SET transaction_id = payment_provider_id WHERE transaction_id IS NULL AND payment_provider_id IS NOT NULL;

-- Sync metadata -> payment_details
UPDATE payments SET payment_details = metadata WHERE payment_details IS NULL AND metadata IS NOT NULL;

-- Drop the restrictive payment_method check constraint
ALTER TABLE payments MODIFY COLUMN payment_method VARCHAR(50) NOT NULL;

-- Add a more permissive constraint
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check 
  CHECK (payment_method IN ('stripe', 'paypal', 'flutterwave', 'bank_transfer', 'credit_card', 'debit_card', 'cash_on_delivery'));

-- Fix refunds table - add missing columns
ALTER TABLE refunds ADD COLUMN refund_transaction_id VARCHAR(255);


-- --- Migration: 011_add_email_verification.sql ---
-- Migration 011: Add email verification token fields
ALTER TABLE users
  ADD COLUMN email_verification_token VARCHAR(255),
  ADD COLUMN email_verification_expires TIMESTAMP NULL;

CREATE INDEX idx_users_email_verification_token
  ON users(email_verification_token);


-- --- Migration: 012_add_seller_id_to_products.sql ---
-- Migration 012: Add seller_id to products for multi-vendor support

-- Products table already includes seller_id from migration 001

-- Seller profile table
CREATE TABLE IF NOT EXISTS seller_profiles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  store_name VARCHAR(255) NOT NULL,
  store_description TEXT,
  store_logo_url TEXT,
  store_banner_url TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  payout_email VARCHAR(255),
  total_sales DECIMAL(12,2) DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  rating DECIMAL(3,2),
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_seller_profiles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_seller_profiles_user_id ON seller_profiles(user_id);


-- --- Migration: 013_add_seller_response_to_reviews.sql ---
-- Add seller response fields to reviews table
ALTER TABLE reviews
  ADD COLUMN seller_response TEXT,
  ADD COLUMN seller_response_at TIMESTAMP NULL;


-- --- Migration: 014_add_tracking_number_to_orders.sql ---
-- Migration 014: Add tracking_number to orders
ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(255);


-- --- Migration: 015_admin_platform_tables.sql ---
-- Migration 015: Platform settings and support tickets

CREATE TABLE IF NOT EXISTS platform_settings (
  id CHAR(36) PRIMARY KEY,
  `key` VARCHAR(100) UNIQUE NOT NULL,
  `value` TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Note: support_tickets table might already exist from migration 004 if it was merged, 
-- but this migration looks like it might be redefining it or it was added later.
-- In migration 004 it was already created. I'll use CREATE TABLE IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS support_tickets (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, closed
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  category VARCHAR(50) DEFAULT 'general', -- general, order, payment, refund, dispute
  order_id CHAR(36),
  admin_response TEXT,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_st_user_id_v2 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_st_order_id_v2 FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Seed default platform settings
INSERT IGNORE INTO platform_settings (`key`, `value`, description, id) VALUES
  ('commission_rate', '10', 'Platform commission percentage (%)', 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1'),
  ('tax_rate', '0', 'Default tax rate (%)', 't1t1t1t1-t1t1-t1t1-t1t1-t1t1t1t1t1t1'),
  ('free_shipping_threshold', '50', 'Order amount for free shipping ($)', 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1'),
  ('maintenance_mode', 'false', 'Enable maintenance mode', 'm1m1m1m1-m1m1-m1m1-m1m1-m1m1m1m1m1m1'),
  ('allow_seller_registration', 'true', 'Allow new seller registrations', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  ('max_products_per_seller', '500', 'Maximum products per seller', 'p1p1p1p1-p1p1-p1p1-p1p1-p1p1p1p1p1p1'),
  ('stripe_enabled', 'true', 'Enable Stripe payments', 's1s1s1s1-s1s1-s1s1-s1s1-s1s1s1s1s1s1'),
  ('email_notifications', 'true', 'Enable email notifications', 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1');

-- Note: account_status was already added in migration 007


-- --- Migration: 016_customer_experience_tables.sql ---
-- Migration 016: Complete Customer Experience Enhancement
-- Adds: Shopping lists, Save for later, Product Q&A, Payment methods, Gift cards, Price alerts, Back-in-stock alerts

-- Shopping Lists (Multiple named wishlists)
CREATE TABLE IF NOT EXISTS shopping_lists (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(64) UNIQUE,
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(user_id, name),
    CONSTRAINT fk_sl_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT 'Multiple named wishlists per user';

CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX idx_shopping_lists_share_token ON shopping_lists(share_token);

-- Shopping List Items
CREATE TABLE IF NOT EXISTS shopping_list_items (
    id CHAR(36) PRIMARY KEY,
    list_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    priority INTEGER DEFAULT 0,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(list_id, product_id, variant_id),
    CONSTRAINT fk_sli_list_id FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE,
    CONSTRAINT fk_sli_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_sli_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(list_id);
CREATE INDEX idx_shopping_list_items_product_id ON shopping_list_items(product_id);

-- Saved for Later (Cart extension)
CREATE TABLE IF NOT EXISTS saved_for_later (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    quantity INTEGER DEFAULT 1,
    price_at_save DECIMAL(10,2),
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id, variant_id),
    CONSTRAINT fk_sfl_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sfl_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_sfl_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
) COMMENT 'Items saved from cart for later purchase';

CREATE INDEX idx_saved_for_later_user_id ON saved_for_later(user_id);

-- Product Questions (Q&A)
CREATE TABLE IF NOT EXISTS product_questions (
    id CHAR(36) PRIMARY KEY,
    product_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    question TEXT NOT NULL,
    votes INTEGER DEFAULT 0,
    is_answered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pq_product_id_v2 FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_pq_user_id_v2 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT 'Customer questions about products';

CREATE INDEX idx_product_questions_product_id_v2 ON product_questions(product_id);
CREATE INDEX idx_product_questions_user_id_v2 ON product_questions(user_id);

-- Product Answers
CREATE TABLE IF NOT EXISTS product_answers (
    id CHAR(36) PRIMARY KEY,
    question_id CHAR(36) NOT NULL,
    user_id CHAR(36),
    seller_id CHAR(36),
    answer TEXT NOT NULL,
    is_official BOOLEAN DEFAULT FALSE,
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pa_question_id_v2 FOREIGN KEY (question_id) REFERENCES product_questions(id) ON DELETE CASCADE,
    CONSTRAINT fk_pa_user_id_v2 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_pa_seller_id FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_product_answers_question_id_v2 ON product_answers(question_id);

-- Payment Methods (Stored securely)
CREATE TABLE IF NOT EXISTS payment_methods (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'card', 'paypal', 'apple_pay', 'google_pay', 'cod'
    provider VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', etc.
    provider_token VARCHAR(255), -- Encrypted token from provider
    last_four VARCHAR(4),
    brand VARCHAR(50), -- 'visa', 'mastercard', etc.
    expiry_month INTEGER,
    expiry_year INTEGER,
    holder_name VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    billing_address_id CHAR(36),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pm_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_pm_address_id FOREIGN KEY (billing_address_id) REFERENCES addresses(id) ON DELETE SET NULL
) COMMENT 'Stored payment methods for one-click checkout';

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);

-- Gift Cards
CREATE TABLE IF NOT EXISTS gift_cards (
    id CHAR(36) PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'digital', -- 'digital', 'physical'
    initial_balance DECIMAL(10,2) NOT NULL,
    current_balance DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'redeemed', 'expired', 'cancelled'
    sender_id CHAR(36),
    recipient_id CHAR(36),
    recipient_email VARCHAR(255),
    recipient_name VARCHAR(100),
    message TEXT,
    expires_at TIMESTAMP NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    redeemed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_gc_sender_id FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_gc_recipient_id FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL
) COMMENT 'Gift cards with balance tracking';

CREATE INDEX idx_gift_cards_code ON gift_cards(code);
CREATE INDEX idx_gift_cards_recipient_id ON gift_cards(recipient_id);
CREATE INDEX idx_gift_cards_sender_id ON gift_cards(sender_id);

-- Gift Card Transactions
CREATE TABLE IF NOT EXISTS gift_card_transactions (
    id CHAR(36) PRIMARY KEY,
    gift_card_id CHAR(36) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'purchase', 'redemption', 'refund', 'adjustment'
    amount DECIMAL(10,2) NOT NULL,
    order_id CHAR(36),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gct_card_id FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_gct_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX idx_gift_card_transactions_card_id ON gift_card_transactions(gift_card_id);

-- Loyalty Points
CREATE TABLE IF NOT EXISTS loyalty_points (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL UNIQUE,
    total_points INTEGER DEFAULT 0,
    available_points INTEGER DEFAULT 0,
    pending_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
    tier_updated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_lp_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT 'Customer loyalty program points';

CREATE INDEX idx_loyalty_points_user_id ON loyalty_points(user_id);
CREATE INDEX idx_loyalty_points_tier ON loyalty_points(tier);

-- Loyalty Points Transactions
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'earn', 'redeem', 'expire', 'adjustment', 'bonus'
    points INTEGER NOT NULL,
    order_id CHAR(36),
    description TEXT,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lt_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_lt_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);

-- Price Alerts
CREATE TABLE IF NOT EXISTS price_alerts (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    target_price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMP NULL,
    triggered_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id),
    CONSTRAINT fk_pal_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_pal_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) COMMENT 'Price drop notifications';

CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_product_id ON price_alerts(product_id);
CREATE INDEX idx_price_alerts_active ON price_alerts(is_active);

-- Back in Stock Alerts
CREATE TABLE IF NOT EXISTS back_in_stock_alerts (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    email VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id, variant_id),
    CONSTRAINT fk_bis_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bis_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_bis_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

CREATE INDEX idx_back_in_stock_user_id ON back_in_stock_alerts(user_id);
CREATE INDEX idx_back_in_stock_product_id ON back_in_stock_alerts(product_id);
CREATE INDEX idx_back_in_stock_active ON back_in_stock_alerts(is_active);

-- Product Comparison Sets
CREATE TABLE IF NOT EXISTS product_comparison_sets (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    session_id VARCHAR(128), -- For guest comparisons
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY)),
    CONSTRAINT fk_pcs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_comparison_sets_user_id ON product_comparison_sets(user_id);
CREATE INDEX idx_comparison_sets_session ON product_comparison_sets(session_id);

-- Product Comparison Items
CREATE TABLE IF NOT EXISTS product_comparison_items (
    id CHAR(36) PRIMARY KEY,
    set_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(set_id, product_id),
    CONSTRAINT fk_pci_set_id FOREIGN KEY (set_id) REFERENCES product_comparison_sets(id) ON DELETE CASCADE,
    CONSTRAINT fk_pci_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_comparison_items_set_id ON product_comparison_items(set_id);

-- Update existing tables
ALTER TABLE users 
    ADD COLUMN loyalty_points_balance INTEGER DEFAULT 0,
    ADD COLUMN loyalty_tier VARCHAR(20) DEFAULT 'bronze',
    ADD COLUMN gift_card_balance DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN store_credit DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN preferred_payment_method_id CHAR(36),
    ADD COLUMN default_currency VARCHAR(3) DEFAULT 'USD',
    ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC',
    ADD COLUMN language VARCHAR(10) DEFAULT 'en',
    ADD COLUMN marketing_consent BOOLEAN DEFAULT TRUE,
    ADD COLUMN sms_consent BOOLEAN DEFAULT FALSE,
    ADD COLUMN whatsapp_consent BOOLEAN DEFAULT FALSE;

-- Notification Preferences (granular)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'whatsapp'
    type VARCHAR(50) NOT NULL, -- 'order_updates', 'promotions', 'price_alerts', etc.
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(user_id, channel, type),
    CONSTRAINT fk_np_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notification_prefs_user_id ON notification_preferences(user_id);

-- MySQL Triggers (Individual per table since there's no generic plpgsql)

-- Update shopping list item count
DELIMITER //
CREATE TRIGGER tr_sli_insert AFTER INSERT ON shopping_list_items
FOR EACH ROW
BEGIN
    UPDATE shopping_lists SET item_count = item_count + 1 WHERE id = NEW.list_id;
END;
//

CREATE TRIGGER tr_sli_delete AFTER DELETE ON shopping_list_items
FOR EACH ROW
BEGIN
    UPDATE shopping_lists SET item_count = item_count - 1 WHERE id = OLD.list_id;
END;
//

-- Mark question as answered
CREATE TRIGGER tr_pa_insert AFTER INSERT ON product_answers
FOR EACH ROW
BEGIN
    UPDATE product_questions SET is_answered = TRUE WHERE id = NEW.question_id;
END;
//
DELIMITER ;


-- --- Migration: 017_returns_exchanges_tables.sql ---
-- Migration 017: Returns, Exchanges, and Advanced Order Management
-- Adds: Return requests, exchanges, order tracking, delivery scheduling

-- Return Requests
CREATE TABLE IF NOT EXISTS return_requests (
    id CHAR(36) PRIMARY KEY,
    return_number VARCHAR(32) UNIQUE NOT NULL,
    order_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'received', 'refunded', 'closed'
    reason VARCHAR(50) NOT NULL, -- 'defective', 'wrong_item', 'not_as_described', 'changed_mind', 'arrived_late', 'other'
    reason_details TEXT,
    return_method VARCHAR(20) DEFAULT 'pickup', -- 'pickup', 'dropoff', 'mail'
    refund_method VARCHAR(20) DEFAULT 'original', -- 'original', 'store_credit', 'exchange'
    total_items INTEGER NOT NULL,
    total_refund_amount DECIMAL(10,2),
    shipping_label_url TEXT,
    tracking_number VARCHAR(100),
    pickup_address_id CHAR(36),
    scheduled_pickup_date DATE,
    received_at TIMESTAMP NULL,
    inspected_at TIMESTAMP NULL,
    inspected_by CHAR(36),
    inspection_notes TEXT,
    refund_processed_at TIMESTAMP NULL,
    refund_transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rr_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_address_id FOREIGN KEY (pickup_address_id) REFERENCES addresses(id) ON DELETE SET NULL,
    CONSTRAINT fk_rr_inspector FOREIGN KEY (inspected_by) REFERENCES users(id) ON DELETE SET NULL
) COMMENT 'Customer return requests with RMA workflow';

CREATE INDEX idx_return_requests_order_id ON return_requests(order_id);
CREATE INDEX idx_return_requests_user_id ON return_requests(user_id);
CREATE INDEX idx_return_requests_status ON return_requests(status);
CREATE INDEX idx_return_requests_number ON return_requests(return_number);

-- Return Items
CREATE TABLE IF NOT EXISTS return_items (
    id CHAR(36) PRIMARY KEY,
    return_id CHAR(36) NOT NULL,
    order_item_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    quantity INTEGER NOT NULL,
    return_reason VARCHAR(50),
    condition_received VARCHAR(30), -- 'new', 'opened', 'damaged', 'incomplete'
    refund_amount DECIMAL(10,2),
    restocking_fee DECIMAL(10,2) DEFAULT 0,
    is_exchange_eligible BOOLEAN DEFAULT TRUE,
    images JSON, -- Changed from TEXT[] to JSON
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ri_return_id FOREIGN KEY (return_id) REFERENCES return_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_ri_order_item_id FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_ri_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_ri_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX idx_return_items_return_id ON return_items(return_id);
CREATE INDEX idx_return_items_order_item_id ON return_items(order_item_id);

-- Exchange Requests
CREATE TABLE IF NOT EXISTS exchange_requests (
    id CHAR(36) PRIMARY KEY,
    exchange_number VARCHAR(32) UNIQUE NOT NULL,
    return_id CHAR(36),
    order_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'shipped', 'delivered', 'cancelled'
    total_items INTEGER NOT NULL,
    exchange_difference DECIMAL(10,2) DEFAULT 0, -- Amount customer needs to pay or be refunded
    shipping_label_url TEXT,
    tracking_number VARCHAR(100),
    new_tracking_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_er_return_id FOREIGN KEY (return_id) REFERENCES return_requests(id) ON DELETE SET NULL,
    CONSTRAINT fk_er_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_er_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT 'Product exchange requests';

CREATE INDEX idx_exchange_requests_return_id ON exchange_requests(return_id);
CREATE INDEX idx_exchange_requests_order_id ON exchange_requests(order_id);
CREATE INDEX idx_exchange_requests_user_id ON exchange_requests(user_id);

-- Exchange Items
CREATE TABLE IF NOT EXISTS exchange_items (
    id CHAR(36) PRIMARY KEY,
    exchange_id CHAR(36) NOT NULL,
    return_item_id CHAR(36) NOT NULL,
    new_product_id CHAR(36) NOT NULL,
    new_variant_id CHAR(36),
    new_quantity INTEGER NOT NULL,
    price_difference DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ei_exchange_id FOREIGN KEY (exchange_id) REFERENCES exchange_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_ei_return_item_id FOREIGN KEY (return_item_id) REFERENCES return_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_ei_product_id FOREIGN KEY (new_product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_ei_variant_id FOREIGN KEY (new_variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX idx_exchange_items_exchange_id ON exchange_items(exchange_id);

-- Order Tracking Updates (Real-time GPS tracking)
CREATE TABLE IF NOT EXISTS order_tracking_updates (
    id CHAR(36) PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    shipment_id CHAR(36),
    status VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    description TEXT,
    estimated_delivery TIMESTAMP NULL,
    carrier_status_code VARCHAR(50),
    raw_data JSON, -- Carrier API response
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_otu_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_otu_shipment_id FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
) COMMENT 'Real-time shipment tracking updates';

CREATE INDEX idx_order_tracking_order_id ON order_tracking_updates(order_id);
CREATE INDEX idx_order_tracking_shipment_id ON order_tracking_updates(shipment_id);
CREATE INDEX idx_order_tracking_created ON order_tracking_updates(created_at);

-- Delivery Scheduling
CREATE TABLE IF NOT EXISTS delivery_schedules (
    id CHAR(36) PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    shipment_id CHAR(36),
    preferred_date DATE NOT NULL,
    preferred_time_start TIME,
    preferred_time_end TIME,
    is_scheduled BOOLEAN DEFAULT FALSE,
    scheduled_date DATE,
    scheduled_time_start TIME,
    scheduled_time_end TIME,
    delivery_instructions TEXT,
    leave_at_door BOOLEAN DEFAULT FALSE,
    call_before_delivery BOOLEAN DEFAULT FALSE,
    building_name VARCHAR(100),
    apartment_number VARCHAR(20),
    floor_number VARCHAR(10),
    landmark VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(order_id, shipment_id),
    CONSTRAINT fk_ds_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_ds_shipment_id FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

CREATE INDEX idx_delivery_schedules_order_id ON delivery_schedules(order_id);

-- Order Modification Requests (Before shipment)
CREATE TABLE IF NOT EXISTS order_modifications (
    id CHAR(36) PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'address_change', 'item_cancel', 'quantity_change', 'shipping_upgrade'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'processed'
    request_details JSON NOT NULL,
    admin_notes TEXT,
    processed_by CHAR(36),
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_om_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_om_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_om_processor FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_order_modifications_order_id ON order_modifications(order_id);
CREATE INDEX idx_order_modifications_status ON order_modifications(status);

-- Delivery Photos (Proof of delivery)
CREATE TABLE IF NOT EXISTS delivery_photos (
    id CHAR(36) PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    shipment_id CHAR(36),
    photo_url TEXT NOT NULL,
    photo_type VARCHAR(30) DEFAULT 'delivery', -- 'delivery', 'pickup', 'exception'
    taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dp_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_dp_shipment_id FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

CREATE INDEX idx_delivery_photos_order_id ON delivery_photos(order_id);

-- Update orders table with new fields
ALTER TABLE orders
    ADD COLUMN can_modify_until TIMESTAMP NULL,
    ADD COLUMN modification_count INTEGER DEFAULT 0,
    ADD COLUMN delivery_photo_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN signature_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN adult_signature_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN insurance_amount DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN is_gift BOOLEAN DEFAULT FALSE,
    ADD COLUMN gift_message TEXT,
    ADD COLUMN gift_wrap BOOLEAN DEFAULT FALSE,
    ADD COLUMN gift_wrap_charge DECIMAL(10,2) DEFAULT 0;

-- Subscribe & Save (Recurring orders)
CREATE TABLE IF NOT EXISTS subscriptions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    subscription_number VARCHAR(32) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'cancelled', 'expired'
    frequency VARCHAR(20) NOT NULL, -- 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly'
    interval_days INTEGER NOT NULL,
    next_delivery_date DATE NOT NULL,
    shipping_address_id CHAR(36) NOT NULL,
    payment_method_id CHAR(36),
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    is_gift BOOLEAN DEFAULT FALSE,
    gift_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason TEXT,
    CONSTRAINT fk_sub_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sub_address_id FOREIGN KEY (shipping_address_id) REFERENCES addresses(id) ON DELETE CASCADE,
    CONSTRAINT fk_sub_pm_id FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
) COMMENT 'Subscribe & Save recurring orders';

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_delivery ON subscriptions(next_delivery_date);

-- Subscription Items
CREATE TABLE IF NOT EXISTS subscription_items (
    id CHAR(36) PRIMARY KEY,
    subscription_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subscription_discount DECIMAL(5,2) DEFAULT 0, -- Percentage discount for subscription
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_si_sub_id FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    CONSTRAINT fk_si_prod_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_si_var_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX idx_subscription_items_subscription_id ON subscription_items(subscription_id);

-- Subscription Orders (Linking subscriptions to generated orders)
CREATE TABLE IF NOT EXISTS subscription_orders (
    id CHAR(36) PRIMARY KEY,
    subscription_id CHAR(36) NOT NULL,
    order_id CHAR(36) NOT NULL,
    cycle_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscription_id, cycle_number),
    CONSTRAINT fk_so_sub_id FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    CONSTRAINT fk_so_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscription_orders_subscription_id ON subscription_orders(subscription_id);

-- MySQL Triggers for numbers (Random suffixes)
DELIMITER //
CREATE TRIGGER tr_rr_insert BEFORE INSERT ON return_requests
FOR EACH ROW
BEGIN
    SET NEW.return_number = CONCAT('RET-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', SUBSTRING(MD5(RAND()), 1, 6));
END;
//

CREATE TRIGGER tr_er_insert BEFORE INSERT ON exchange_requests
FOR EACH ROW
BEGIN
    SET NEW.exchange_number = CONCAT('EXC-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', SUBSTRING(MD5(RAND()), 1, 6));
END;
//

CREATE TRIGGER tr_sub_insert BEFORE INSERT ON subscriptions
FOR EACH ROW
BEGIN
    SET NEW.subscription_number = CONCAT('SUB-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', SUBSTRING(MD5(RAND()), 1, 8));
END;
//
DELIMITER ;


-- --- Migration: 018_seller_enhancement_tables.sql ---
-- Migration 018: Seller Enhancement - Warehouses, Bulk Operations, Pricing Rules
-- Adds: Multi-warehouse support, bulk upload tracking, pricing rules, competitor monitoring

-- Seller Warehouses
CREATE TABLE IF NOT EXISTS seller_warehouses (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(2) NOT NULL DEFAULT 'US',
    phone VARCHAR(20),
    email VARCHAR(255),
    contact_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    handling_time INTEGER DEFAULT 1, -- Days to prepare order
    cutoff_time TIME DEFAULT '14:00', -- Order cutoff for same-day processing
    operates_weekends BOOLEAN DEFAULT FALSE,
    operates_holidays BOOLEAN DEFAULT FALSE,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sw_seller_id FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE
) COMMENT 'Multi-location inventory management for sellers';

CREATE INDEX idx_seller_warehouses_seller_id ON seller_warehouses(seller_id);
CREATE INDEX idx_seller_warehouses_code ON seller_warehouses(code);

-- Inventory by Warehouse (multi-location inventory)
CREATE TABLE IF NOT EXISTS warehouse_inventory (
    id CHAR(36) PRIMARY KEY,
    warehouse_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    quantity_available INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    quantity_incoming INTEGER NOT NULL DEFAULT 0, -- From inbound shipments
    reorder_point INTEGER DEFAULT 10,
    reorder_quantity INTEGER DEFAULT 50,
    location_code VARCHAR(50), -- Bin/shelf location
    last_counted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, product_id, variant_id),
    CONSTRAINT fk_wi_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES seller_warehouses(id) ON DELETE CASCADE,
    CONSTRAINT fk_wi_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_wi_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

CREATE INDEX idx_warehouse_inventory_warehouse_id ON warehouse_inventory(warehouse_id);
CREATE INDEX idx_warehouse_inventory_product_id ON warehouse_inventory(product_id);
CREATE INDEX idx_warehouse_inventory_low_stock ON warehouse_inventory(quantity_available);

-- Inbound Shipments (to warehouses)
CREATE TABLE IF NOT EXISTS inbound_shipments (
    id CHAR(36) PRIMARY KEY,
    shipment_number VARCHAR(32) UNIQUE NOT NULL,
    seller_id CHAR(36) NOT NULL,
    warehouse_id CHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'in_transit', -- 'in_transit', 'received', 'partially_received', 'cancelled'
    carrier VARCHAR(50),
    tracking_number VARCHAR(100),
    expected_arrival DATE,
    actual_arrival TIMESTAMP NULL,
    total_items INTEGER NOT NULL,
    received_items INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_is_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_is_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES seller_warehouses(id) ON DELETE CASCADE
);

CREATE INDEX idx_inbound_shipments_seller_id ON inbound_shipments(seller_id);
CREATE INDEX idx_inbound_shipments_warehouse_id ON inbound_shipments(warehouse_id);
CREATE INDEX idx_inbound_shipments_tracking ON inbound_shipments(tracking_number);

-- Inbound Shipment Items
CREATE TABLE IF NOT EXISTS inbound_shipment_items (
    id CHAR(36) PRIMARY KEY,
    shipment_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    expected_quantity INTEGER NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    damaged_quantity INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2),
    batch_number VARCHAR(50),
    expiry_date DATE,
    received_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_isi_shipment_id FOREIGN KEY (shipment_id) REFERENCES inbound_shipments(id) ON DELETE CASCADE,
    CONSTRAINT fk_isi_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_isi_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX idx_inbound_shipment_items_shipment_id ON inbound_shipment_items(shipment_id);

-- Bulk Upload Jobs
CREATE TABLE IF NOT EXISTS bulk_upload_jobs (
    id CHAR(36) PRIMARY KEY,
    job_id VARCHAR(64) UNIQUE NOT NULL,
    seller_id CHAR(36) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'products', 'inventory', 'prices', 'images'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'partial'
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    successful_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    error_log JSON,
    result_summary JSON,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_buj_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_bulk_upload_jobs_seller_id ON bulk_upload_jobs(seller_id);
CREATE INDEX idx_bulk_upload_jobs_status ON bulk_upload_jobs(status);

-- Pricing Rules (Dynamic pricing)
CREATE TABLE IF NOT EXISTS pricing_rules (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'competitor_match', 'percentage_markup', 'fixed_markup', 'volume_discount', 'time_based'
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- Higher number = higher priority
    
    -- Product selection
    apply_to VARCHAR(20) DEFAULT 'all', -- 'all', 'category', 'brand', 'products', 'tags'
    category_id CHAR(36),
    brand VARCHAR(100),
    product_ids JSON, -- Changed from UUID[] to JSON
    tags JSON, -- Changed from TEXT[] to JSON
    
    -- Rule conditions
    condition_type VARCHAR(30), -- 'always', 'inventory_level', 'competitor_price', 'time_range', 'customer_group'
    condition_value JSON,
    
    -- Pricing calculation
    base_price_source VARCHAR(30) DEFAULT 'cost', -- 'cost', 'msrp', 'current_price'
    adjustment_type VARCHAR(20) NOT NULL, -- 'fixed_amount', 'percentage', 'match_competitor', 'formula'
    adjustment_value DECIMAL(10,4),
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    
    -- Time constraints
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    schedule_cron VARCHAR(50), -- Cron expression for recurring rules
    
    -- Competitor matching (for competitor_match type)
    competitor_url TEXT,
    competitor_name VARCHAR(100),
    match_strategy VARCHAR(20) DEFAULT 'match', -- 'match', 'beat_by_amount', 'beat_by_percent', 'stay_above'
    match_difference DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_applied_at TIMESTAMP NULL,
    applied_count INTEGER DEFAULT 0,
    CONSTRAINT fk_pr_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_pr_category_id FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) COMMENT 'Automated pricing strategies for sellers';

CREATE INDEX idx_pricing_rules_seller_id ON pricing_rules(seller_id);
CREATE INDEX idx_pricing_rules_active ON pricing_rules(is_active);
CREATE INDEX idx_pricing_rules_type ON pricing_rules(type);

-- Competitor Price Monitoring
CREATE TABLE IF NOT EXISTS competitor_prices (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    competitor_name VARCHAR(100) NOT NULL,
    competitor_url TEXT,
    competitor_price DECIMAL(10,2) NOT NULL,
    competitor_currency VARCHAR(3) DEFAULT 'USD',
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    availability VARCHAR(30) DEFAULT 'in_stock', -- 'in_stock', 'out_of_stock', 'backorder'
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_lowest BOOLEAN DEFAULT FALSE,
    price_difference DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cp_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cp_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_competitor_prices_seller_id ON competitor_prices(seller_id);
CREATE INDEX idx_competitor_prices_product_id ON competitor_prices(product_id);
CREATE INDEX idx_competitor_prices_scraped ON competitor_prices(scraped_at);

-- Product Bundles
CREATE TABLE IF NOT EXISTS product_bundles (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'draft'
    base_product_id CHAR(36) NOT NULL,
    bundle_price DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(10,2) NOT NULL, -- Sum of individual prices
    savings_amount DECIMAL(10,2) NOT NULL,
    savings_percentage DECIMAL(5,2),
    is_featured BOOLEAN DEFAULT FALSE,
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pb_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_pb_product_id FOREIGN KEY (base_product_id) REFERENCES products(id) ON DELETE CASCADE
) COMMENT 'Product bundling for increased AOV';

CREATE INDEX idx_product_bundles_seller_id ON product_bundles(seller_id);
CREATE INDEX idx_product_bundles_status ON product_bundles(status);

-- Bundle Items
CREATE TABLE IF NOT EXISTS bundle_items (
    id CHAR(36) PRIMARY KEY,
    bundle_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bi_bundle_id FOREIGN KEY (bundle_id) REFERENCES product_bundles(id) ON DELETE CASCADE,
    CONSTRAINT fk_bi_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_bi_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX idx_bundle_items_bundle_id ON bundle_items(bundle_id);

-- Shipping Templates (Seller-defined shipping rules)
CREATE TABLE IF NOT EXISTS shipping_templates (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    processing_time INTEGER DEFAULT 1, -- Business days
    
    -- Domestic shipping
    domestic_free_shipping BOOLEAN DEFAULT FALSE,
    domestic_free_shipping_threshold DECIMAL(10,2),
    domestic_flat_rate DECIMAL(10,2),
    domestic_calculation VARCHAR(20) DEFAULT 'flat', -- 'flat', 'weight_based', 'price_based', 'carrier_calculated'
    domestic_carrier_preferences JSON, -- Changed from TEXT[] to JSON
    
    -- International shipping
    ships_internationally BOOLEAN DEFAULT FALSE,
    international_free_shipping BOOLEAN DEFAULT FALSE,
    international_free_shipping_threshold DECIMAL(10,2),
    international_flat_rate DECIMAL(10,2),
    international_calculation VARCHAR(20) DEFAULT 'flat',
    international_destinations JSON, -- Changed from TEXT[] to JSON
    
    -- Restrictions
    max_weight_kg DECIMAL(8,2),
    max_dimensions_cm JSON, -- {length, width, height}
    excluded_regions JSON, -- Changed from TEXT[] to JSON
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_st_seller_id_v2 FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_shipping_templates_seller_id ON shipping_templates(seller_id);

-- Product-Shipping Template Assignment
CREATE TABLE IF NOT EXISTS product_shipping_templates (
    id CHAR(36) PRIMARY KEY,
    product_id CHAR(36) NOT NULL,
    template_id CHAR(36) NOT NULL,
    is_overridden BOOLEAN DEFAULT FALSE,
    override_flat_rate DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, template_id),
    CONSTRAINT fk_pst_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_pst_template_id FOREIGN KEY (template_id) REFERENCES shipping_templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_shipping_templates_product_id ON product_shipping_templates(product_id);

-- Seller Customer Messages
CREATE TABLE IF NOT EXISTS seller_customer_messages (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    customer_id CHAR(36) NOT NULL,
    order_id CHAR(36),
    product_id CHAR(36),
    subject VARCHAR(255),
    direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    attachments JSON, -- Changed from TEXT[] to JSON
    metadata JSON, -- {order_number, product_name, etc.}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_scm_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_scm_customer_id FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_scm_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    CONSTRAINT fk_scm_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX idx_seller_messages_seller_id ON seller_customer_messages(seller_id);
CREATE INDEX idx_seller_messages_customer_id ON seller_customer_messages(customer_id);
CREATE INDEX idx_seller_messages_order_id ON seller_customer_messages(order_id);
CREATE INDEX idx_seller_messages_unread ON seller_customer_messages(is_read);

-- Seller Performance Metrics (denormalized for quick access)
CREATE TABLE IF NOT EXISTS seller_performance_metrics (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    
    -- Order metrics
    total_orders INTEGER DEFAULT 0,
    shipped_on_time INTEGER DEFAULT 0,
    late_shipments INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    
    -- Quality metrics
    valid_tracking_rate DECIMAL(5,2) DEFAULT 0,
    late_shipment_rate DECIMAL(5,2) DEFAULT 0,
    pre_fulfillment_cancel_rate DECIMAL(5,2) DEFAULT 0,
    order_defect_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Customer metrics
    positive_feedback INTEGER DEFAULT 0,
    neutral_feedback INTEGER DEFAULT 0,
    negative_feedback INTEGER DEFAULT 0,
    response_time_hours DECIMAL(6,2),
    
    -- Policy compliance
    policy_violations INTEGER DEFAULT 0,
    intellectual_property_complaints INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(seller_id, `date`),
    CONSTRAINT fk_spm_seller_id FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_seller_performance_seller_id ON seller_performance_metrics(seller_id);
CREATE INDEX idx_seller_performance_date ON seller_performance_metrics(`date`);

-- MySQL Triggers
DELIMITER //
CREATE TRIGGER tr_is_insert BEFORE INSERT ON inbound_shipments
FOR EACH ROW
BEGIN
    SET NEW.shipment_number = CONCAT('INB-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', SUBSTRING(MD5(RAND()), 1, 6));
END;
//

-- Inventory update trigger
CREATE TRIGGER tr_isi_update AFTER UPDATE ON inbound_shipment_items
FOR EACH ROW
BEGIN
    IF NEW.received_quantity > 0 AND NEW.received_quantity != OLD.received_quantity THEN
        UPDATE warehouse_inventory 
        SET quantity_available = quantity_available + (NEW.received_quantity - OLD.received_quantity),
            quantity_incoming = quantity_incoming - (NEW.received_quantity - OLD.received_quantity),
            last_counted_at = NOW()
        WHERE warehouse_id = (SELECT warehouse_id FROM inbound_shipments WHERE id = NEW.shipment_id)
          AND product_id = NEW.product_id
          AND (variant_id = NEW.variant_id OR (variant_id IS NULL AND NEW.variant_id IS NULL));
    END IF;
END;
//
DELIMITER ;


-- --- Migration: 019_advertising_platform_tables.sql ---
-- Migration 019: Advertising Platform and Advanced Marketing
-- Adds: Sponsored products, advertising campaigns, coupons, deals

-- Advertising Campaigns
CREATE TABLE IF NOT EXISTS advertising_campaigns (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'sponsored_products', 'sponsored_brands', 'sponsored_display', 'stores'
    status VARCHAR(20) DEFAULT 'paused', -- 'active', 'paused', 'ended', 'archived'
    
    -- Budget settings
    daily_budget DECIMAL(10,2) NOT NULL,
    total_budget DECIMAL(10,2),
    spent_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Bidding strategy
    bidding_strategy VARCHAR(20) DEFAULT 'manual', -- 'manual', 'automatic', 'enhanced'
    default_bid DECIMAL(8,4) NOT NULL, -- Cost per click
    
    -- Targeting
    targeting_type VARCHAR(20) DEFAULT 'keyword', -- 'keyword', 'product', 'category', 'audience', 'automatic'
    
    -- Schedule
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NULL,
    day_parting JSON, -- {monday: [{start: '09:00', end: '17:00'}], ...}
    
    -- Performance
    total_impressions INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_sales DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ac_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT 'Pay-per-click advertising campaigns';

CREATE INDEX idx_ad_campaigns_seller_id ON advertising_campaigns(seller_id);
CREATE INDEX idx_ad_campaigns_status ON advertising_campaigns(status);
CREATE INDEX idx_ad_campaigns_type ON advertising_campaigns(type);

-- Ad Groups (within campaigns)
CREATE TABLE IF NOT EXISTS ad_groups (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    default_bid DECIMAL(8,4) NOT NULL,
    
    -- Targeting settings
    match_type VARCHAR(20) DEFAULT 'broad', -- 'broad', 'phrase', 'exact'
    negative_keywords JSON, -- Changed from TEXT[] to JSON
    negative_product_ids JSON, -- Changed from UUID[] to JSON
    
    -- Placement settings
    placement_strategy JSON, -- {top_of_search: 1.5, product_pages: 1.0, rest_of_search: 0.5}
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ag_campaign_id FOREIGN KEY (campaign_id) REFERENCES advertising_campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_ad_groups_campaign_id ON ad_groups(campaign_id);

-- Ad Group Products (what products are advertised)
CREATE TABLE IF NOT EXISTS ad_group_products (
    id CHAR(36) PRIMARY KEY,
    ad_group_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    custom_bid DECIMAL(8,4),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused'
    is_eligible BOOLEAN DEFAULT TRUE, -- Based on buy box, inventory, etc.
    ineligibility_reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_agp_ad_group_id FOREIGN KEY (ad_group_id) REFERENCES ad_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_agp_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_ad_group_products_ad_group_id ON ad_group_products(ad_group_id);
CREATE INDEX idx_ad_group_products_product_id ON ad_group_products(product_id);

-- Ad Keywords (for keyword targeting)
CREATE TABLE IF NOT EXISTS ad_keywords (
    id CHAR(36) PRIMARY KEY,
    ad_group_id CHAR(36) NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    match_type VARCHAR(20) NOT NULL, -- 'exact', 'phrase', 'broad'
    bid DECIMAL(8,4),
    status VARCHAR(20) DEFAULT 'active',
    
    -- Performance metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    sales DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(ad_group_id, keyword, match_type),
    CONSTRAINT fk_ak_ad_group_id FOREIGN KEY (ad_group_id) REFERENCES ad_groups(id) ON DELETE CASCADE
);

CREATE INDEX idx_ad_keywords_ad_group_id ON ad_keywords(ad_group_id);
CREATE INDEX idx_ad_keywords_keyword ON ad_keywords(keyword);

-- Ad Search Terms (what customers actually searched)
CREATE TABLE IF NOT EXISTS ad_search_terms (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36) NOT NULL,
    ad_group_id CHAR(36) NOT NULL,
    search_term VARCHAR(255) NOT NULL,
    keyword_id CHAR(36),
    
    -- Match info
    matched_keyword VARCHAR(255),
    match_type VARCHAR(20),
    
    -- Performance
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    sales DECIMAL(10,2) DEFAULT 0,
    
    `date` DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, search_term, `date`),
    CONSTRAINT fk_ast_campaign_id FOREIGN KEY (campaign_id) REFERENCES advertising_campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_ast_ad_group_id FOREIGN KEY (ad_group_id) REFERENCES ad_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_ast_keyword_id FOREIGN KEY (keyword_id) REFERENCES ad_keywords(id) ON DELETE SET NULL
);

CREATE INDEX idx_ad_search_terms_campaign_id ON ad_search_terms(campaign_id);
CREATE INDEX idx_ad_search_terms_date ON ad_search_terms(`date`);

-- Ad Daily Performance
CREATE TABLE IF NOT EXISTS ad_daily_performance (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36) NOT NULL,
    ad_group_id CHAR(36),
    product_id CHAR(36),
    
    `date` DATE NOT NULL,
    
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    ctr DECIMAL(6,4) DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    cpc DECIMAL(8,4) DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(6,4) DEFAULT 0,
    sales DECIMAL(10,2) DEFAULT 0,
    acos DECIMAL(6,4) DEFAULT 0, -- Advertising Cost of Sales (spend/sales)
    roas DECIMAL(6,2) DEFAULT 0, -- Return on Ad Spend (sales/spend)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, ad_group_id, product_id, `date`),
    CONSTRAINT fk_adp_campaign_id FOREIGN KEY (campaign_id) REFERENCES advertising_campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_adp_ad_group_id FOREIGN KEY (ad_group_id) REFERENCES ad_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_adp_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_ad_daily_performance_campaign_id ON ad_daily_performance(campaign_id);
CREATE INDEX idx_ad_daily_performance_date ON ad_daily_performance(`date`);

-- Sponsored Brands (Headline Search Ads)
CREATE TABLE IF NOT EXISTS sponsored_brand_ads (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36) NOT NULL,
    
    -- Creative
    headline VARCHAR(100) NOT NULL,
    logo_url TEXT,
    custom_image_url TEXT,
    
    -- Landing
    landing_page_type VARCHAR(30) DEFAULT 'store', -- 'store', 'product_list', 'custom_url'
    landing_page_url TEXT,
    
    -- Products featured (up to 3)
    featured_product_ids JSON, -- Changed from UUID[] to JSON
    
    -- Performance
    brand_store_views INTEGER DEFAULT 0,
    new_to_brand_customers INTEGER DEFAULT 0,
    new_to_brand_sales DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sba_campaign_id FOREIGN KEY (campaign_id) REFERENCES advertising_campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_sponsored_brand_ads_campaign_id ON sponsored_brand_ads(campaign_id);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    
    -- Coupon details
    code VARCHAR(50), -- NULL for automatic coupons (clip & save)
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Discount settings
    type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping'
    discount_value DECIMAL(10,2) NOT NULL, -- Percentage or amount
    min_purchase_amount DECIMAL(10,2) DEFAULT 0,
    max_discount_amount DECIMAL(10,2),
    
    -- Eligibility
    apply_to VARCHAR(20) DEFAULT 'all', -- 'all', 'category', 'products'
    category_id CHAR(36),
    product_ids JSON, -- Changed from UUID[] to JSON
    exclude_discounted_products BOOLEAN DEFAULT TRUE,
    
    -- Limits
    usage_limit_per_customer INTEGER DEFAULT 1,
    total_usage_limit INTEGER,
    total_used INTEGER DEFAULT 0,
    
    -- Schedule
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'active', 'paused', 'expired'
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Performance
    budget DECIMAL(10,2),
    budget_spent DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_c_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_c_category_id FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) COMMENT 'Discount coupons and promotional codes';

CREATE INDEX idx_coupons_seller_id ON coupons(seller_id);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_status ON coupons(status);

-- Coupon Usage
CREATE TABLE IF NOT EXISTS coupon_usage (
    id CHAR(36) PRIMARY KEY,
    coupon_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    order_id CHAR(36) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cu_coupon_id FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    CONSTRAINT fk_cu_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cu_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user_id ON coupon_usage(user_id);

-- Lightning Deals / Flash Sales
CREATE TABLE IF NOT EXISTS lightning_deals (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    
    -- Deal details
    original_price DECIMAL(10,2) NOT NULL,
    deal_price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) GENERATED ALWAYS AS 
        (ROUND((original_price - deal_price) / original_price * 100, 2)) STORED,
    
    -- Inventory
    quantity_available INTEGER NOT NULL,
    quantity_claimed INTEGER DEFAULT 0,
    quantity_sold INTEGER DEFAULT 0,
    max_quantity_per_customer INTEGER DEFAULT 1,
    
    -- Schedule
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending_review', -- 'pending_review', 'approved', 'rejected', 'active', 'ended', 'cancelled'
    rejection_reason TEXT,
    
    -- Performance
    waitlist_count INTEGER DEFAULT 0,
    
    -- Review
    reviewed_by CHAR(36),
    reviewed_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(product_id, variant_id, start_time),
    CONSTRAINT fk_ld_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ld_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_ld_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ld_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) COMMENT 'Time-limited flash sales with limited inventory';

CREATE INDEX idx_lightning_deals_seller_id ON lightning_deals(seller_id);
CREATE INDEX idx_lightning_deals_status ON lightning_deals(status);
CREATE INDEX idx_lightning_deals_active_time ON lightning_deals(start_time, end_time);

-- Lightning Deal Waitlist
CREATE TABLE IF NOT EXISTS lightning_deal_waitlist (
    id CHAR(36) PRIMARY KEY,
    deal_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    notification_sent BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(deal_id, user_id),
    CONSTRAINT fk_ldw_deal_id FOREIGN KEY (deal_id) REFERENCES lightning_deals(id) ON DELETE CASCADE,
    CONSTRAINT fk_ldw_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_lightning_deal_waitlist_deal_id ON lightning_deal_waitlist(deal_id);

-- Store/Brand Pages
CREATE TABLE IF NOT EXISTS seller_stores (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    
    -- Store customization
    store_name VARCHAR(200) NOT NULL,
    headline VARCHAR(200),
    description TEXT,
    
    -- Branding
    logo_url TEXT,
    hero_image_url TEXT,
    banner_images JSON, -- Changed from TEXT[] to JSON
    
    -- Theme
    primary_color VARCHAR(7) DEFAULT '#000000',
    secondary_color VARCHAR(7) DEFAULT '#FFFFFF',
    font_family VARCHAR(50) DEFAULT 'Inter',
    
    -- Layout
    layout_template VARCHAR(50) DEFAULT 'standard', -- 'standard', 'featured', 'grid', 'carousel'
    featured_products JSON, -- Changed from UUID[] to JSON
    featured_categories JSON, -- Changed from UUID[] to JSON
    
    -- SEO
    meta_title VARCHAR(100),
    meta_description VARCHAR(300),
    slug VARCHAR(255) UNIQUE,
    
    -- Status
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP NULL,
    
    -- Analytics
    total_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ss_seller_id FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE
) COMMENT 'Custom brand/store pages for sellers';

CREATE INDEX idx_seller_stores_seller_id ON seller_stores(seller_id);
CREATE INDEX idx_seller_stores_slug ON seller_stores(slug);

-- Store Page Modules (Custom content blocks)
CREATE TABLE IF NOT EXISTS store_page_modules (
    id CHAR(36) PRIMARY KEY,
    store_id CHAR(36) NOT NULL,
    
    type VARCHAR(30) NOT NULL, -- 'hero', 'product_grid', 'text', 'image', 'video', 'carousel', 'category_grid'
    title VARCHAR(200),
    content JSON, -- Type-specific content
    
    -- Styling
    background_color VARCHAR(7),
    text_color VARCHAR(7),
    padding VARCHAR(20),
    
    -- Layout
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_spm_store_id FOREIGN KEY (store_id) REFERENCES seller_stores(id) ON DELETE CASCADE
);

CREATE INDEX idx_store_modules_store_id ON store_page_modules(store_id);
CREATE INDEX idx_store_modules_sort_order ON store_page_modules(sort_order);


-- --- Migration: 020_admin_platform_tables.sql ---
-- Migration 020: Admin Platform - CMS, SEO, Tax, Fraud, Chat
-- Adds: CMS pages, banners, SEO redirects, tax rules, fraud detection, live chat

-- CMS Pages (Content Management System)
CREATE TABLE IF NOT EXISTS cms_pages (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content LONGTEXT, -- LONGTEXT for large content
    meta_title VARCHAR(100),
    meta_description VARCHAR(300),
    meta_keywords JSON, -- Changed from TEXT[] to JSON
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE, -- Cannot be deleted
    layout VARCHAR(50) DEFAULT 'default',
    sidebar_id CHAR(36),
    parent_id CHAR(36),
    sort_order INTEGER DEFAULT 0,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cms_parent FOREIGN KEY (parent_id) REFERENCES cms_pages(id) ON DELETE SET NULL
) COMMENT 'Content management system for static pages';

CREATE INDEX idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX idx_cms_pages_active ON cms_pages(is_active);

-- CMS Blocks (Reusable content pieces)
CREATE TABLE IF NOT EXISTS cms_blocks (
    id CHAR(36) PRIMARY KEY,
    identifier VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    content LONGTEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_cms_blocks_identifier ON cms_blocks(identifier);

-- CMS Banners (Promotional banners)
CREATE TABLE IF NOT EXISTS cms_banners (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    placement VARCHAR(50) NOT NULL, -- 'home_hero', 'home_sidebar', 'category_top', 'product_sidebar'
    type VARCHAR(20) DEFAULT 'image', -- 'image', 'html', 'video', 'carousel'
    content JSON NOT NULL, -- {image_url, link_url, alt_text, title, etc.}
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    impression_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_cms_banners_placement ON cms_banners(placement);
CREATE INDEX idx_cms_banners_active ON cms_banners(is_active);

-- SEO Redirects (301/302 redirects)
CREATE TABLE IF NOT EXISTS seo_redirects (
    id CHAR(36) PRIMARY KEY,
    source_url VARCHAR(500) UNIQUE NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    http_code INTEGER DEFAULT 301, -- 301, 302
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_seo_redirects_source ON seo_redirects(source_url);

-- Tax Rules
CREATE TABLE IF NOT EXISTS tax_rules (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(2) NOT NULL DEFAULT 'US',
    state VARCHAR(50),
    postal_code VARCHAR(20),
    city VARCHAR(100),
    rate DECIMAL(6,4) NOT NULL, -- e.g., 0.0825 for 8.25%
    is_compound BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 0,
    tax_class VARCHAR(50) DEFAULT 'standard', -- 'standard', 'reduced', 'zero', 'exempt'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(country, state, postal_code, city, tax_class)
) COMMENT 'Regional tax configuration';

CREATE INDEX idx_tax_rules_location ON tax_rules(country, state);

-- Fraud Detection Rules
CREATE TABLE IF NOT EXISTS fraud_rules (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'velocity', 'blacklist', 'amount', 'geolocation', 'score'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'test', 'disabled'
    action VARCHAR(20) NOT NULL, -- 'flag', 'hold', 'reject', 'require_review'
    conditions JSON NOT NULL, -- {max_orders_per_hour: 5, etc.}
    score_impact INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Fraud Blacklist
CREATE TABLE IF NOT EXISTS fraud_blacklist (
    id CHAR(36) PRIMARY KEY,
    type VARCHAR(20) NOT NULL, -- 'email', 'ip', 'fingerprint', 'phone', 'address'
    `value` VARCHAR(255) NOT NULL,
    reason TEXT,
    added_by CHAR(36),
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, `value`),
    CONSTRAINT fk_fb_added_by FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_fraud_blacklist_value ON fraud_blacklist(`value`);

-- Live Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    visitor_id VARCHAR(64), -- For guest chats
    agent_id CHAR(36),
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'active', 'closed', 'transferred'
    subject VARCHAR(200),
    priority VARCHAR(10) DEFAULT 'normal',
    department VARCHAR(50),
    user_ip VARCHAR(45), -- INET compatible
    user_agent TEXT,
    closed_at TIMESTAMP NULL,
    closed_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_cs_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_cs_closed_by FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL
) COMMENT 'Customer support live chat sessions';

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_agent ON chat_sessions(agent_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id CHAR(36) PRIMARY KEY,
    session_id CHAR(36) NOT NULL,
    sender_type VARCHAR(10) NOT NULL, -- 'user', 'agent', 'system', 'bot'
    sender_id CHAR(36),
    message LONGTEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    metadata JSON, -- {attachments, links, etc.}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cm_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);

-- Admin Activity Logs (Audit trail)
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id CHAR(36) PRIMARY KEY,
    admin_id CHAR(36) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'product', 'user', 'order', 'setting'
    entity_id CHAR(36),
    description TEXT,
    original_data JSON,
    new_data JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_aal_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT 'System-wide admin action audit trail';

CREATE INDEX idx_admin_logs_admin ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_logs_entity ON admin_activity_logs(entity_type, entity_id);

-- System Health Monitoring
CREATE TABLE IF NOT EXISTS system_health_logs (
    id CHAR(36) PRIMARY KEY,
    component VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'healthy', 'warning', 'critical'
    message TEXT,
    metrics JSON, -- {cpu: 80, memory: 90, etc.}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_health_logs_component ON system_health_logs(component);
CREATE INDEX idx_health_logs_created ON system_health_logs(created_at);

-- Update users table with admin flags
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS permissions JSON,
    ADD COLUMN IF NOT EXISTS last_admin_login TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active';

-- MySQL Triggers
DELIMITER //

-- Update cms_pages updated_at (redundant but matches PG logic)
-- Actually managed by CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

-- Notification for fraud rejection
CREATE TRIGGER tr_fr_insert AFTER INSERT ON fraud_blacklist
FOR EACH ROW
BEGIN
    -- This would normally trigger an event or log
    INSERT INTO admin_activity_logs (id, admin_id, action, entity_type, entity_id, description)
    VALUES ((UUID()), NEW.added_by, 'BLACKLIST_ADD', 'fraud_blacklist', NEW.id, 
            CONCAT('Added ', NEW.type, ': ', NEW.value, ' to blacklist'));
END;
//

DELIMITER ;


-- --- Migration: 021_security_enhancement_tables.sql ---
-- Migration 021: Security, Device Management, and User Enhancements
-- Adds: Device management, login history, 2FA, social auth

-- User Devices (for device management and trust)
CREATE TABLE IF NOT EXISTS user_devices (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    
    -- Device info
    device_id VARCHAR(255) NOT NULL, -- Unique device identifier
    device_type VARCHAR(30) NOT NULL, -- 'mobile', 'tablet', 'desktop', 'smart_tv', 'unknown'
    device_name VARCHAR(100),
    brand VARCHAR(50),
    model VARCHAR(100),
    os VARCHAR(50),
    os_version VARCHAR(30),
    browser VARCHAR(50),
    browser_version VARCHAR(30),
    
    -- Security
    is_trusted BOOLEAN DEFAULT FALSE,
    is_current BOOLEAN DEFAULT FALSE,
    trust_granted_at TIMESTAMP NULL,
    
    -- Location (last known)
    last_ip VARCHAR(45),
    last_country VARCHAR(2),
    last_city VARCHAR(100),
    last_latitude DECIMAL(10,8),
    last_longitude DECIMAL(11,8),
    
    -- Activity
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    login_count INTEGER DEFAULT 1,
    
    -- 2FA for this device
    requires_2fa BOOLEAN DEFAULT TRUE,
    last_2fa_at TIMESTAMP NULL,
    
    -- Push notifications
    push_token TEXT,
    push_enabled BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_id),
    CONSTRAINT fk_ud_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_current ON user_devices(is_current); -- MySQL doesn't support WHERE in index

-- Login History
CREATE TABLE IF NOT EXISTS login_history (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    device_id CHAR(36),
    
    -- Authentication method
    method VARCHAR(30) NOT NULL, -- 'password', '2fa', 'social_google', 'social_facebook', 'social_apple', 'magic_link', 'biometric'
    social_provider VARCHAR(20), -- 'google', 'facebook', 'apple', 'amazon'
    
    -- Status
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'blocked', 'requires_2fa', 'suspicious'
    failure_reason VARCHAR(100), -- 'invalid_password', 'account_locked', 'invalid_2fa', 'expired_token'
    
    -- Location
    ip_address VARCHAR(45) NOT NULL,
    country VARCHAR(2),
    city VARCHAR(100),
    region VARCHAR(100),
    timezone VARCHAR(50),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Device context
    user_agent TEXT,
    fingerprint VARCHAR(64), -- Browser fingerprint hash
    
    -- Session info
    session_token VARCHAR(255),
    session_expires_at TIMESTAMP NULL,
    logout_at TIMESTAMP NULL,
    logout_method VARCHAR(20), -- 'user', 'timeout', 'remote', 'password_change', 'suspicious_activity'
    
    -- Security flags
    is_suspicious BOOLEAN DEFAULT FALSE,
    suspicious_reason TEXT,
    reviewed_by CHAR(36),
    reviewed_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lh_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_lh_device_id FOREIGN KEY (device_id) REFERENCES user_devices(id) ON DELETE SET NULL,
    CONSTRAINT fk_lh_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_created ON login_history(created_at);
CREATE INDEX idx_login_history_ip ON login_history(ip_address);
CREATE INDEX idx_login_history_status ON login_history(status);

-- Two-Factor Authentication
CREATE TABLE IF NOT EXISTS user_2fa_settings (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    
    -- 2FA Method
    method VARCHAR(20) NOT NULL, -- 'authenticator_app', 'sms', 'email', 'security_key'
    
    -- Status
    is_enabled BOOLEAN DEFAULT FALSE,
    enabled_at TIMESTAMP NULL,
    
    -- TOTP settings (for authenticator apps)
    totp_secret_encrypted TEXT,
    totp_verified BOOLEAN DEFAULT FALSE,
    backup_codes JSON, -- Changed from TEXT[] to JSON
    backup_codes_used JSON, -- Changed from INTEGER[] to JSON
    
    -- SMS settings
    phone_number VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,
    
    -- Security Key (WebAuthn)
    webauthn_credential_id TEXT,
    webauthn_public_key TEXT,
    webauthn_counter INTEGER DEFAULT 0,
    
    -- Settings
    require_2fa_for_device_trust BOOLEAN DEFAULT TRUE,
    trust_duration_days INTEGER DEFAULT 30,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(user_id, method),
    CONSTRAINT fk_2fa_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_2fa_settings_user_id ON user_2fa_settings(user_id);

-- Social Authentication Connections
CREATE TABLE IF NOT EXISTS user_social_connections (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    
    provider VARCHAR(20) NOT NULL, -- 'google', 'facebook', 'apple', 'amazon', 'microsoft'
    provider_user_id VARCHAR(255) NOT NULL,
    
    -- Profile data (cached)
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    raw_profile JSON,
    
    -- Tokens (encrypted)
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP NULL,
    
    -- Settings
    is_primary_connection BOOLEAN DEFAULT FALSE,
    can_login BOOLEAN DEFAULT TRUE,
    
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id),
    CONSTRAINT fk_usc_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_social_connections_user_id ON user_social_connections(user_id);
CREATE INDEX idx_user_social_connections_provider ON user_social_connections(provider);

-- Security Alerts
CREATE TABLE IF NOT EXISTS security_alerts (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    
    type VARCHAR(50) NOT NULL, -- 'new_device', 'suspicious_login', 'password_changed', 'email_changed', '2fa_enabled', '2fa_disabled'
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'critical'
    
    -- Details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Context
    ip_address VARCHAR(45),
    location VARCHAR(255),
    device_info TEXT,
    
    -- Actions taken
    action_required BOOLEAN DEFAULT FALSE,
    action_taken VARCHAR(50), -- 'none', 'blocked', 'verified', 'password_reset_sent'
    
    -- User interaction
    acknowledged_at TIMESTAMP NULL,
    dismissed_at TIMESTAMP NULL,
    
    -- Notifications sent
    email_sent_at TIMESTAMP NULL,
    sms_sent_at TIMESTAMP NULL,
    push_sent_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sa_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_security_alerts_user_id ON security_alerts(user_id);
CREATE INDEX idx_security_alerts_type ON security_alerts(type);
CREATE INDEX idx_security_alerts_created ON security_alerts(created_at);

-- Password History (prevent password reuse)
CREATE TABLE IF NOT EXISTS password_history (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Previous password hash
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_reason VARCHAR(50) DEFAULT 'user_initiated', -- 'user_initiated', 'expired', 'breach', 'admin_reset'
    CONSTRAINT fk_ph_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_password_history_user_id ON password_history(user_id);
CREATE INDEX idx_password_history_changed ON password_history(changed_at);

-- API Keys (for integrations)
CREATE TABLE IF NOT EXISTS user_api_keys (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(8) NOT NULL, -- First 8 chars of key for identification
    key_hash VARCHAR(255) NOT NULL, -- Full key hash
    
    -- Permissions
    scopes JSON, -- Changed from TEXT[] to JSON
    
    -- Rate limiting
    rate_limit INTEGER DEFAULT 1000, -- Requests per hour
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_ip VARCHAR(45),
    revoked_at TIMESTAMP NULL,
    revoked_reason TEXT,
    CONSTRAINT fk_uak_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_prefix ON user_api_keys(key_prefix);

-- User Sessions (Active session management)
CREATE TABLE IF NOT EXISTS user_sessions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    device_id CHAR(36),
    login_history_id CHAR(36),
    
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Session info
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    
    -- Timing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    refresh_expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    invalidated_at TIMESTAMP NULL,
    invalidation_reason VARCHAR(50),
    
    -- 2FA status for this session
    is_2fa_verified BOOLEAN DEFAULT FALSE,
    verified_2fa_at TIMESTAMP NULL,
    CONSTRAINT fk_us_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_us_device_id FOREIGN KEY (device_id) REFERENCES user_devices(id) ON DELETE SET NULL,
    CONSTRAINT fk_us_login_history_id FOREIGN KEY (login_history_id) REFERENCES login_history(id) ON DELETE SET NULL
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_refresh ON user_sessions(refresh_token);

-- User Activity Log (Audit trail)
CREATE TABLE IF NOT EXISTS user_activity_log (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    session_id CHAR(36),
    
    action VARCHAR(50) NOT NULL, -- 'view', 'create', 'update', 'delete', 'download', 'share', 'purchase'
    entity_type VARCHAR(50), -- 'product', 'order', 'address', 'profile', 'payment_method'
    entity_id CHAR(36),
    
    -- Details
    description TEXT,
    metadata JSON,
    
    -- Context
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ual_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ual_session_id FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_action ON user_activity_log(action);
CREATE INDEX idx_user_activity_log_entity ON user_activity_log(entity_type, entity_id);

-- Account Recovery Requests
CREATE TABLE IF NOT EXISTS account_recovery_requests (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    
    -- Request details
    request_type VARCHAR(30) NOT NULL, -- 'forgot_password', 'account_hacked', 'lost_2fa'
    verification_method VARCHAR(20) NOT NULL, -- 'email', 'sms', 'backup_email'
    
    -- Tokens
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'completed', 'expired', 'cancelled'
    
    -- Verification attempts
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Completion
    completed_at TIMESTAMP NULL,
    new_device_id CHAR(36),
    
    -- Security
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_arr_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_arr_device_id FOREIGN KEY (new_device_id) REFERENCES user_devices(id) ON DELETE SET NULL
);

CREATE INDEX idx_account_recovery_user_id ON account_recovery_requests(user_id);
CREATE INDEX idx_account_recovery_token ON account_recovery_requests(token_hash);
CREATE INDEX idx_account_recovery_status ON account_recovery_requests(status);

-- Update users table with security fields
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS require_password_change BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS max_session_duration INTEGER DEFAULT 30, -- Days
    ADD COLUMN IF NOT EXISTS simultaneous_sessions_allowed INTEGER DEFAULT 5,
    ADD COLUMN IF NOT EXISTS login_notifications_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS security_email_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS trusted_devices_only BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS suspicious_login_block BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS account_recovery_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS backup_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS backup_email_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS backup_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS backup_phone_verified BOOLEAN DEFAULT FALSE;

-- MySQL Triggers
DELIMITER //

-- Function to check for suspicious login
CREATE TRIGGER tr_lh_insert BEFORE INSERT ON login_history
FOR EACH ROW
BEGIN
    DECLARE last_country VARCHAR(2);
    DECLARE last_ip VARCHAR(45);
    DECLARE is_new_country BOOLEAN DEFAULT FALSE;
    DECLARE is_new_ip BOOLEAN DEFAULT TRUE;
    
    -- Get last successful login location
    SELECT country, ip_address INTO last_country, last_ip
    FROM login_history
    WHERE user_id = NEW.user_id AND status = 'success'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Check if new country
    IF last_country IS NOT NULL AND NEW.country != last_country THEN
        SET is_new_country = TRUE;
    END IF;
    
    -- Check if we've seen this IP before
    IF EXISTS (
        SELECT 1 FROM login_history 
        WHERE user_id = NEW.user_id AND ip_address = NEW.ip_address AND status = 'success'
    ) THEN
        SET is_new_ip = FALSE;
    END IF;
    
    -- Flag suspicious if new country or completely new IP pattern
    IF is_new_country OR (is_new_ip AND last_ip IS NOT NULL) THEN
        SET NEW.is_suspicious = TRUE;
        SET NEW.suspicious_reason = CASE 
            WHEN is_new_country THEN CONCAT('Login from new country: ', NEW.country)
            ELSE 'Login from new IP address'
        END;
    END IF;
END;
//

-- Log password change
CREATE TRIGGER tr_users_password_update BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    IF OLD.password_hash != NEW.password_hash THEN
        INSERT INTO password_history (id, user_id, password_hash, changed_at, changed_reason)
        VALUES ((UUID()), NEW.id, OLD.password_hash, NOW(), 'user_initiated');
        
        SET NEW.last_password_change = NOW();
    END IF;
END;
//

DELIMITER ;


-- --- Migration: 022_b2b_features_tables.sql ---
-- Migration 022: B2B Features and Advanced Order Features
-- Adds: Business accounts, quotes, purchase orders, and bulk buying

-- Business Accounts (B2B customers)
CREATE TABLE IF NOT EXISTS business_accounts (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    
    -- Company details
    company_name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(200),
    company_number VARCHAR(100),
    vat_number VARCHAR(50),
    tax_id VARCHAR(50),
    
    -- Industry
    industry VARCHAR(100),
    company_size VARCHAR(30), -- '1-10', '11-50', '51-200', '201-500', '500+'
    annual_revenue DECIMAL(15,2),
    
    -- Contact
    company_email VARCHAR(255),
    company_phone VARCHAR(20),
    website VARCHAR(255),
    
    -- Billing
    payment_terms VARCHAR(30) DEFAULT 'net_30', -- 'immediate', 'net_15', 'net_30', 'net_60'
    credit_limit DECIMAL(12,2) DEFAULT 0,
    credit_used DECIMAL(12,2) DEFAULT 0,
    credit_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended'
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verification_documents JSON, -- Changed from TEXT[] to JSON
    verified_by CHAR(36),
    verified_at TIMESTAMP NULL,
    
    -- Settings
    requires_approval BOOLEAN DEFAULT FALSE,
    approver_ids JSON, -- Changed from UUID[] to JSON
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'closed'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    CONSTRAINT fk_ba_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ba_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) COMMENT 'B2B customer accounts with credit and approval workflows';

CREATE INDEX idx_business_accounts_user_id ON business_accounts(user_id);
CREATE INDEX idx_business_accounts_status ON business_accounts(status);
CREATE INDEX idx_business_accounts_credit_status ON business_accounts(credit_status);

-- Business Account Users (Multiple employees per account)
CREATE TABLE IF NOT EXISTS business_account_users (
    id CHAR(36) PRIMARY KEY,
    business_account_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    
    role VARCHAR(30) NOT NULL, -- 'admin', 'buyer', 'approver', 'viewer'
    can_purchase BOOLEAN DEFAULT FALSE,
    can_approve BOOLEAN DEFAULT FALSE,
    purchase_limit DECIMAL(12,2),
    
    -- Approval chain
    requires_approval_from JSON, -- Changed from UUID[] to JSON
    
    is_active BOOLEAN DEFAULT TRUE,
    invited_by CHAR(36),
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP NULL,
    
    UNIQUE(business_account_id, user_id),
    CONSTRAINT fk_bau_account_id FOREIGN KEY (business_account_id) REFERENCES business_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_bau_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bau_invited_by FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_business_account_users_account_id ON business_account_users(business_account_id);
CREATE INDEX idx_business_account_users_user_id ON business_account_users(user_id);

-- Purchase Orders (B2B formal ordering)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id CHAR(36) PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    
    business_account_id CHAR(36) NOT NULL,
    buyer_user_id CHAR(36) NOT NULL,
    
    -- Supplier/Seller info
    seller_id CHAR(36),
    
    -- Status
    status VARCHAR(30) DEFAULT 'draft', -- 'draft', 'sent', 'acknowledged', 'partially_fulfilled', 'fulfilled', 'cancelled', 'rejected'
    
    -- Financial
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    shipping_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Delivery
    delivery_address_id CHAR(36),
    billing_address_id CHAR(36),
    requested_delivery_date DATE,
    
    -- Approval workflow
    submitted_for_approval_at TIMESTAMP NULL,
    approved_by CHAR(36),
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    
    -- Notes
    internal_notes TEXT,
    supplier_notes TEXT,
    
    -- Linked order
    order_id CHAR(36),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_po_account_id FOREIGN KEY (business_account_id) REFERENCES business_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_po_buyer_id FOREIGN KEY (buyer_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_po_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_po_deliv_addr FOREIGN KEY (delivery_address_id) REFERENCES addresses(id) ON DELETE SET NULL,
    CONSTRAINT fk_po_bill_addr FOREIGN KEY (billing_address_id) REFERENCES addresses(id) ON DELETE SET NULL,
    CONSTRAINT fk_po_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_po_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) COMMENT 'Formal purchase orders for B2B transactions';

CREATE INDEX idx_purchase_orders_business_account ON purchase_orders(business_account_id);
CREATE INDEX idx_purchase_orders_seller_id ON purchase_orders(seller_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id CHAR(36) PRIMARY KEY,
    purchase_order_id CHAR(36) NOT NULL,
    
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    unit_of_measure VARCHAR(50), -- 'each', 'case', 'pallet', 'kg', 'meter'
    
    -- Fulfillment tracking
    quantity_received INTEGER DEFAULT 0,
    quantity_accepted INTEGER DEFAULT 0,
    quantity_rejected INTEGER DEFAULT 0,
    
    total DECIMAL(10,2) NOT NULL,
    
    -- Delivery
    requested_delivery_date DATE,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_poi_po_id FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_poi_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_poi_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX idx_po_items_po_id ON purchase_order_items(purchase_order_id);

-- Quotes / RFQ (Request for Quote)
CREATE TABLE IF NOT EXISTS quotes (
    id CHAR(36) PRIMARY KEY,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Requester
    business_account_id CHAR(36),
    user_id CHAR(36) NOT NULL,
    
    -- Seller (if specific)
    seller_id CHAR(36),
    
    -- Quote details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sent', 'received', 'accepted', 'rejected', 'expired'
    
    -- Requirements
    required_by_date DATE,
    quantity_estimate INTEGER,
    budget_range_min DECIMAL(12,2),
    budget_range_max DECIMAL(12,2),
    
    -- Quote received
    quoted_amount DECIMAL(12,2),
    quote_valid_until DATE,
    quote_document_url TEXT,
    
    -- Linked
    order_id CHAR(36),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_q_account_id FOREIGN KEY (business_account_id) REFERENCES business_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_q_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_q_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_q_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) COMMENT 'Request for quote system for B2B buyers';

CREATE INDEX idx_quotes_business_account ON quotes(business_account_id);
CREATE INDEX idx_quotes_seller_id ON quotes(seller_id);
CREATE INDEX idx_quotes_status ON quotes(status);

-- Quote Items
CREATE TABLE IF NOT EXISTS quote_items (
    id CHAR(36) PRIMARY KEY,
    quote_id CHAR(36) NOT NULL,
    
    product_id CHAR(36), -- NULL if custom request
    product_name VARCHAR(255),
    product_description TEXT,
    
    specifications JSON, -- Changed from JSONB to JSON
    quantity_requested INTEGER NOT NULL,
    
    -- Response
    unit_price_quoted DECIMAL(10,2),
    quantity_available INTEGER,
    delivery_time_days INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_qi_quote_id FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
    CONSTRAINT fk_qi_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);

-- Volume Pricing Tiers
CREATE TABLE IF NOT EXISTS volume_pricing_tiers (
    id CHAR(36) PRIMARY KEY,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    
    min_quantity INTEGER NOT NULL,
    max_quantity INTEGER,
    unit_price DECIMAL(10,2) NOT NULL,
    
    -- Target
    customer_type VARCHAR(20) DEFAULT 'all', -- 'all', 'b2b', 'b2c'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, variant_id, min_quantity, customer_type),
    CONSTRAINT fk_vpt_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_vpt_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

CREATE INDEX idx_volume_pricing_product_id ON volume_pricing_tiers(product_id);

-- Requisition Lists (Shopping lists for B2B)
CREATE TABLE IF NOT EXISTS requisition_lists (
    id CHAR(36) PRIMARY KEY,
    business_account_id CHAR(36) NOT NULL,
    created_by CHAR(36) NOT NULL,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Sharing
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with JSON, -- Changed from UUID[] to JSON
    
    -- Default for quick ordering
    is_default BOOLEAN DEFAULT FALSE,
    
    item_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rl_account_id FOREIGN KEY (business_account_id) REFERENCES business_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_rl_creator_id FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) COMMENT 'B2B shopping lists for recurring purchases';

CREATE INDEX idx_requisition_lists_business_account ON requisition_lists(business_account_id);

-- Requisition List Items
CREATE TABLE IF NOT EXISTS requisition_list_items (
    id CHAR(36) PRIMARY KEY,
    requisition_list_id CHAR(36) NOT NULL,
    
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    
    default_quantity INTEGER DEFAULT 1,
    notes TEXT,
    
    added_by CHAR(36),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(requisition_list_id, product_id, variant_id),
    CONSTRAINT fk_rli_list_id FOREIGN KEY (requisition_list_id) REFERENCES requisition_lists(id) ON DELETE CASCADE,
    CONSTRAINT fk_rli_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_rli_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
    CONSTRAINT fk_rli_adder_id FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_requisition_list_items_list_id ON requisition_list_items(requisition_list_id);

-- Order Approval Workflow
CREATE TABLE IF NOT EXISTS order_approval_requests (
    id CHAR(36) PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    requester_id CHAR(36) NOT NULL,
    
    -- Approval chain
    approver_id CHAR(36) NOT NULL,
    
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'escalated'
    
    -- Details
    request_note TEXT,
    response_note TEXT,
    
    -- Timing
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    
    -- Escalation
    escalated_to CHAR(36),
    escalated_at TIMESTAMP NULL,
    escalation_reason TEXT,
    CONSTRAINT fk_oar_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_oar_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_oar_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_oar_escalator FOREIGN KEY (escalated_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_order_approval_requests_order_id ON order_approval_requests(order_id);
CREATE INDEX idx_order_approval_requests_approver ON order_approval_requests(approver_id);
CREATE INDEX idx_order_approval_requests_status ON order_approval_requests(status);

-- Net Terms / Invoice Payments
CREATE TABLE IF NOT EXISTS invoice_payments (
    id CHAR(36) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    
    business_account_id CHAR(36) NOT NULL,
    order_id CHAR(36) NOT NULL,
    
    -- Amounts
    amount DECIMAL(12,2) NOT NULL,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    amount_due DECIMAL(12,2) NOT NULL,
    
    -- Terms
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_terms VARCHAR(30),
    
    -- Status
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'partial', 'paid', 'overdue', 'cancelled'
    
    -- Payment tracking
    paid_at TIMESTAMP NULL,
    paid_by CHAR(36),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    
    -- Reminders
    reminder_sent_at TIMESTAMP NULL,
    reminder_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ip_account_id FOREIGN KEY (business_account_id) REFERENCES business_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_ip_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_ip_payer_id FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_invoice_payments_business_account ON invoice_payments(business_account_id);
CREATE INDEX idx_invoice_payments_order_id ON invoice_payments(order_id);
CREATE INDEX idx_invoice_payments_status ON invoice_payments(status);
CREATE INDEX idx_invoice_payments_due_date ON invoice_payments(due_date);

-- MySQL Triggers
DELIMITER //

CREATE TRIGGER tr_po_insert BEFORE INSERT ON purchase_orders
FOR EACH ROW
BEGIN
    SET NEW.po_number = CONCAT('PO-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', SUBSTRING(MD5(RAND()), 1, 6));
END;
//

CREATE TRIGGER tr_q_insert BEFORE INSERT ON quotes
FOR EACH ROW
BEGIN
    SET NEW.quote_number = CONCAT('Q-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', SUBSTRING(MD5(RAND()), 1, 6));
END;
//

CREATE TRIGGER tr_rli_insert AFTER INSERT ON requisition_list_items
FOR EACH ROW
BEGIN
    UPDATE requisition_lists SET item_count = item_count + 1 WHERE id = NEW.requisition_list_id;
END;
//

CREATE TRIGGER tr_rli_delete AFTER DELETE ON requisition_list_items
FOR EACH ROW
BEGIN
    UPDATE requisition_lists SET item_count = item_count - 1 WHERE id = OLD.requisition_list_id;
END;
//

DELIMITER ;


-- --- Migration: 024_add_avatar_to_users.sql ---
-- Migration: Add avatar_url to users
-- Description: Supports custom profile images outside of social connections

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;


-- --- Migration: 025_expand_seller_profiles.sql ---
-- Migration: Expand seller profiles
-- Description: Adds business identity, store policies, and social integrations

ALTER TABLE seller_profiles
    ADD COLUMN IF NOT EXISTS business_address TEXT,
    ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS social_facebook VARCHAR(255),
    ADD COLUMN IF NOT EXISTS social_instagram VARCHAR(255),
    ADD COLUMN IF NOT EXISTS social_twitter VARCHAR(255),
    ADD COLUMN IF NOT EXISTS return_policy TEXT,
    ADD COLUMN IF NOT EXISTS shipping_policy TEXT;


