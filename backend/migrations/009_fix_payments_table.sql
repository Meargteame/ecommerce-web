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
-- Note: Payment constraint was already updated in migration 003

-- Add a more permissive constraint
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check 
  CHECK (payment_method IN ('stripe', 'paypal', 'flutterwave', 'bank_transfer', 'credit_card', 'debit_card', 'cash_on_delivery'));

-- Fix refunds table - add missing columns
ALTER TABLE refunds ADD COLUMN refund_transaction_id VARCHAR(255);
