-- Migration 015: Platform settings and support tickets

CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, closed
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  category VARCHAR(50) DEFAULT 'general', -- general, order, payment, refund, dispute
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  admin_response TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default platform settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('commission_rate', '10', 'Platform commission percentage (%)'),
  ('tax_rate', '0', 'Default tax rate (%)'),
  ('free_shipping_threshold', '50', 'Order amount for free shipping ($)'),
  ('maintenance_mode', 'false', 'Enable maintenance mode'),
  ('allow_seller_registration', 'true', 'Allow new seller registrations'),
  ('max_products_per_seller', '500', 'Maximum products per seller'),
  ('stripe_enabled', 'true', 'Enable Stripe payments'),
  ('email_notifications', 'true', 'Enable email notifications')
ON CONFLICT (key) DO NOTHING;

-- Add account_status column to users if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'active';
