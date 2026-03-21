-- Migration: Expand seller profiles
-- Description: Adds business identity, store policies, and social integrations

ALTER TABLE seller_profiles
    ADD COLUMN IF NOT EXISTS business_address TEXT,
    ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS social_facebook VARCHAR(255),
    ADD COLUMN IF NOT EXISTS social_instagram VARCHAR(255),
    ADD COLUMN IF NOT EXISTS social_twitter VARCHAR(255),
    ADD COLUMN IF NOT EXISTS return_policy TEXT,
    ADD COLUMN IF NOT EXISTS shipping_policy TEXT;
