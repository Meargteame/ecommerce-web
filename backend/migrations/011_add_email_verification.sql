-- Migration 011: Add email verification token fields
ALTER TABLE users
  ADD COLUMN email_verification_token VARCHAR(255),
  ADD COLUMN email_verification_expires TIMESTAMP NULL;

CREATE INDEX idx_users_email_verification_token
  ON users(email_verification_token);
