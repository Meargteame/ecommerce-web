-- Migration: Create Payment and Shipping Tables
-- Description: Payments, Refunds, Shipments

-- Payments table
CREATE TABLE payments (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) UNIQUE NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('stripe', 'paypal', 'flutterwave', 'bank_transfer', 'cash', 'card', 'wallet', 'other')),
  payment_provider_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Payment Details
  card_last4 VARCHAR(4),
  card_brand VARCHAR(20),
  
  -- Metadata
  metadata JSON,
  error_message TEXT,
  
  -- Timestamps
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Order ID index is covered by the UNIQUE constraint above
CREATE INDEX idx_payments_payment_provider_id ON payments(payment_provider_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Refunds table
CREATE TABLE refunds (
  id CHAR(36) PRIMARY KEY,
  payment_id CHAR(36) NOT NULL,
  order_id CHAR(36) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  refund_provider_id VARCHAR(255),
  processed_by CHAR(36),
  
  -- Timestamps
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_refunds_payment_id FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_refunds_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_refunds_processed_by FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_created_at ON refunds(created_at);

-- Shipments table
CREATE TABLE shipments (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  courier VARCHAR(50) NOT NULL,
  tracking_number VARCHAR(100) UNIQUE NOT NULL,
  tracking_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned')),
  
  -- Shipping Details
  weight DECIMAL(10, 2),
  weight_unit VARCHAR(10) DEFAULT 'kg',
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Metadata
  metadata JSON,
  notes TEXT,
  
  -- Timestamps
  shipped_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_shipments_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_created_at ON shipments(created_at);
