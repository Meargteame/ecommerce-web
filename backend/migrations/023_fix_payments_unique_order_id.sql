-- Migration: Add unique constraint to payments(order_id)
-- Requirement: paymentService.ts uses ON CONFLICT (order_id), which requires a unique constraint.

-- 1. Remove duplicates if any (keep most recent based on created_at or id)
DELETE FROM payments a USING payments b
WHERE a.created_at < b.created_at AND a.order_id = b.order_id;

-- 2. Ensure order_id is unique
-- First drop existing regular index if it exists to avoid confusion (optional but good practice)
DROP INDEX IF EXISTS idx_payments_order_id;

-- Add Unique index/constraint
ALTER TABLE payments ADD CONSTRAINT unique_payments_order_id UNIQUE (order_id);

-- Re-create a regular index if performance is still needed (UNIQUE index already provides this though)
-- CREATE INDEX idx_payments_order_id ON payments(order_id);
