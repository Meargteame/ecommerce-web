-- Add seller response fields to reviews table
ALTER TABLE reviews
  ADD COLUMN seller_response TEXT,
  ADD COLUMN seller_response_at TIMESTAMP NULL;
