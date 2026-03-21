-- Migration: Add avatar_url to users
-- Description: Supports custom profile images outside of social connections

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
