-- Migration: Add password reset fields to users table
-- Description: Adds password_reset_token and password_reset_expires columns for password reset functionality

-- Add password reset fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- Create index for password reset token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(password_reset_token);

-- Add comment
COMMENT ON COLUMN users.password_reset_token IS 'Hashed token for password reset';
COMMENT ON COLUMN users.password_reset_expires IS 'Expiration timestamp for password reset token';
