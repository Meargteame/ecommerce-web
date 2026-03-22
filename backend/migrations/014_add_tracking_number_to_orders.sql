-- Migration 014: Add tracking_number to orders
ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(255);
