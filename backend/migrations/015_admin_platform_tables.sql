-- Migration 015: Platform settings and support tickets

CREATE TABLE IF NOT EXISTS platform_settings (
  id CHAR(36) PRIMARY KEY,
  `key` VARCHAR(100) UNIQUE NOT NULL,
  `value` TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Note: support_tickets table might already exist from migration 004 if it was merged, 
-- but this migration looks like it might be redefining it or it was added later.
-- In migration 004 it was already created. I'll use CREATE TABLE IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS support_tickets (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, closed
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  category VARCHAR(50) DEFAULT 'general', -- general, order, payment, refund, dispute
  order_id CHAR(36),
  admin_response TEXT,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_st_user_id_v2 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_st_order_id_v2 FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Seed default platform settings
INSERT IGNORE INTO platform_settings (`key`, `value`, description, id) VALUES
  ('commission_rate', '10', 'Platform commission percentage (%)', 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1'),
  ('tax_rate', '0', 'Default tax rate (%)', 't1t1t1t1-t1t1-t1t1-t1t1-t1t1t1t1t1t1'),
  ('free_shipping_threshold', '50', 'Order amount for free shipping ($)', 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1'),
  ('maintenance_mode', 'false', 'Enable maintenance mode', 'm1m1m1m1-m1m1-m1m1-m1m1-m1m1m1m1m1m1'),
  ('allow_seller_registration', 'true', 'Allow new seller registrations', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  ('max_products_per_seller', '500', 'Maximum products per seller', 'p1p1p1p1-p1p1-p1p1-p1p1-p1p1p1p1p1p1'),
  ('stripe_enabled', 'true', 'Enable Stripe payments', 's1s1s1s1-s1s1-s1s1-s1s1-s1s1s1s1s1s1'),
  ('email_notifications', 'true', 'Enable email notifications', 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1');

-- Note: account_status was already added in migration 007
