-- Add seller response fields to reviews table
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS seller_response TEXT,
  ADD COLUMN IF NOT EXISTS seller_response_at TIMESTAMPTZ;
