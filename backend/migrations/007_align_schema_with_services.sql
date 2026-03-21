-- Migration: Align Schema with Service Layer
-- Description: Adds missing columns and renames columns to match service expectations

-- ============================================================
-- USERS TABLE: add email_verified, account_status columns
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active' 
  CHECK (account_status IN ('active', 'disabled', 'suspended'));

-- Sync existing is_verified -> email_verified
UPDATE users SET email_verified = is_verified WHERE email_verified IS DISTINCT FROM is_verified;

-- ============================================================
-- PRODUCTS TABLE: add base_price, status, specifications columns
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' 
  CHECK (status IN ('draft', 'published', 'archived'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}';

-- Sync existing price -> base_price
UPDATE products SET base_price = price WHERE base_price IS NULL;

-- Sync is_active -> status
UPDATE products SET status = CASE WHEN is_active = TRUE THEN 'published' ELSE 'archived' END 
  WHERE status = 'draft';

-- ============================================================
-- PRODUCT VARIANTS TABLE: add variant_name, price_adjustment, 
-- low_stock_threshold, weight_grams columns
-- ============================================================
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS variant_name VARCHAR(255);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS price_adjustment DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS weight_grams INTEGER;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}';

-- Sync existing name -> variant_name
UPDATE product_variants SET variant_name = name WHERE variant_name IS NULL;

-- Sync weight (kg) -> weight_grams
UPDATE product_variants SET weight_grams = (weight * 1000)::INTEGER WHERE weight IS NOT NULL AND weight_grams IS NULL;

-- ============================================================
-- ORDERS TABLE: add JSON address columns, currency, customer_email,
-- customer_phone, notes; fix status values
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Backfill JSON address from flat columns (for existing rows)
UPDATE orders SET shipping_address = json_build_object(
  'fullName', shipping_full_name,
  'addressLine1', shipping_address_line1,
  'addressLine2', shipping_address_line2,
  'city', shipping_city,
  'state', shipping_state,
  'postalCode', shipping_postal_code,
  'country', shipping_country
) WHERE shipping_address IS NULL;

UPDATE orders SET billing_address = json_build_object(
  'fullName', billing_full_name,
  'addressLine1', billing_address_line1,
  'addressLine2', billing_address_line2,
  'city', billing_city,
  'state', billing_state,
  'postalCode', billing_postal_code,
  'country', billing_country
) WHERE billing_address IS NULL;

-- Add new status values to orders check constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'placed', 'confirmed', 'payment_confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'));

-- ============================================================
-- ORDER ITEMS TABLE: fix column name variant_id vs product_variant_id
-- ============================================================
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sku VARCHAR(100);

-- Sync product_variant_id -> variant_id
UPDATE order_items SET variant_id = product_variant_id WHERE variant_id IS NULL AND product_variant_id IS NOT NULL;
UPDATE order_items SET sku = product_sku WHERE sku IS NULL;

-- ============================================================
-- ORDER STATUS HISTORY: fix created_by vs changed_by
-- ============================================================
ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
UPDATE order_status_history SET created_by = changed_by WHERE created_by IS NULL AND changed_by IS NOT NULL;

-- ============================================================
-- CART ITEMS TABLE: ensure it exists with correct columns
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- ============================================================
-- WISHLISTS TABLE: ensure it exists
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
