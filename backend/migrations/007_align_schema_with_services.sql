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

