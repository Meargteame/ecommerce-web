-- Migration: Add password reset fields to users table
-- Description: Adds password_reset_token and password_reset_expires columns for password reset functionality

-- Add password reset fields
ALTER TABLE users 
ADD COLUMN password_reset_token VARCHAR(255),
ADD COLUMN password_reset_expires TIMESTAMP NULL;

-- Create index for password reset token lookups
CREATE INDEX idx_users_reset_token ON users(password_reset_token);
