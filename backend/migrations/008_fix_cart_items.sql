-- Migration: Fix cart_items to support direct user_id queries
-- The cart service queries cart_items directly by user_id

-- Add user_id column to cart_items
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add variant_id as alias for product_variant_id
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE;

-- Backfill user_id from carts table
UPDATE cart_items ci
SET user_id = c.user_id
FROM carts c
WHERE ci.cart_id = c.id AND ci.user_id IS NULL;

-- Backfill variant_id from product_variant_id
UPDATE cart_items SET variant_id = product_variant_id WHERE variant_id IS NULL AND product_variant_id IS NOT NULL;

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
