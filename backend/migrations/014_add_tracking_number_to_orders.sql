-- Migration 014: Add tracking_number to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(255);
