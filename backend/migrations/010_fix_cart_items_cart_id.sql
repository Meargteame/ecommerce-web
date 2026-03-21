-- Migration: Make cart_id nullable in cart_items to support direct user_id inserts

-- Drop the NOT NULL constraint on cart_id
ALTER TABLE cart_items ALTER COLUMN cart_id DROP NOT NULL;
