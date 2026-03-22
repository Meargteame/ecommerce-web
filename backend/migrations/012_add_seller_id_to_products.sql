-- Migration 012: Add seller_id to products for multi-vendor support

-- Products table already includes seller_id from migration 001

-- Seller profile table
CREATE TABLE IF NOT EXISTS seller_profiles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  store_name VARCHAR(255) NOT NULL,
  store_description TEXT,
  store_logo_url TEXT,
  store_banner_url TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  payout_email VARCHAR(255),
  total_sales DECIMAL(12,2) DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  rating DECIMAL(3,2),
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_seller_profiles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_seller_profiles_user_id ON seller_profiles(user_id);
