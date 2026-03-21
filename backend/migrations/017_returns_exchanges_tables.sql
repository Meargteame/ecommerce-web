-- Migration 017: Returns, Exchanges, and Advanced Order Management
-- Adds: Return requests, exchanges, order tracking, delivery scheduling

-- Return Requests
CREATE TABLE IF NOT EXISTS return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number VARCHAR(32) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'received', 'refunded', 'closed'
    reason VARCHAR(50) NOT NULL, -- 'defective', 'wrong_item', 'not_as_described', 'changed_mind', 'arrived_late', 'other'
    reason_details TEXT,
    return_method VARCHAR(20) DEFAULT 'pickup', -- 'pickup', 'dropoff', 'mail'
    refund_method VARCHAR(20) DEFAULT 'original', -- 'original', 'store_credit', 'exchange'
    total_items INTEGER NOT NULL,
    total_refund_amount DECIMAL(10,2),
    shipping_label_url TEXT,
    tracking_number VARCHAR(100),
    pickup_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
    scheduled_pickup_date DATE,
    received_at TIMESTAMPTZ,
    inspected_at TIMESTAMPTZ,
    inspected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    inspection_notes TEXT,
    refund_processed_at TIMESTAMPTZ,
    refund_transaction_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_return_requests_order_id ON return_requests(order_id);
CREATE INDEX idx_return_requests_user_id ON return_requests(user_id);
CREATE INDEX idx_return_requests_status ON return_requests(status);
CREATE INDEX idx_return_requests_number ON return_requests(return_number);

-- Return Items
CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    return_reason VARCHAR(50),
    condition_received VARCHAR(30), -- 'new', 'opened', 'damaged', 'incomplete'
    refund_amount DECIMAL(10,2),
    restocking_fee DECIMAL(10,2) DEFAULT 0,
    is_exchange_eligible BOOLEAN DEFAULT TRUE,
    images TEXT[], -- URLs of return condition photos
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_return_items_return_id ON return_items(return_id);
CREATE INDEX idx_return_items_order_item_id ON return_items(order_item_id);

-- Exchange Requests
CREATE TABLE IF NOT EXISTS exchange_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_number VARCHAR(32) UNIQUE NOT NULL,
    return_id UUID REFERENCES return_requests(id) ON DELETE SET NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'shipped', 'delivered', 'cancelled'
    total_items INTEGER NOT NULL,
    exchange_difference DECIMAL(10,2) DEFAULT 0, -- Amount customer needs to pay or be refunded
    shipping_label_url TEXT,
    tracking_number VARCHAR(100),
    new_tracking_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exchange_requests_return_id ON exchange_requests(return_id);
CREATE INDEX idx_exchange_requests_order_id ON exchange_requests(order_id);
CREATE INDEX idx_exchange_requests_user_id ON exchange_requests(user_id);

-- Exchange Items
CREATE TABLE IF NOT EXISTS exchange_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID NOT NULL REFERENCES exchange_requests(id) ON DELETE CASCADE,
    return_item_id UUID NOT NULL REFERENCES return_items(id) ON DELETE CASCADE,
    new_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    new_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    new_quantity INTEGER NOT NULL,
    price_difference DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exchange_items_exchange_id ON exchange_items(exchange_id);

-- Order Tracking Updates (Real-time GPS tracking)
CREATE TABLE IF NOT EXISTS order_tracking_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    description TEXT,
    estimated_delivery TIMESTAMPTZ,
    carrier_status_code VARCHAR(50),
    raw_data JSONB, -- Carrier API response
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_tracking_order_id ON order_tracking_updates(order_id);
CREATE INDEX idx_order_tracking_shipment_id ON order_tracking_updates(shipment_id);
CREATE INDEX idx_order_tracking_created ON order_tracking_updates(created_at);

-- Delivery Scheduling
CREATE TABLE IF NOT EXISTS delivery_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
    preferred_date DATE NOT NULL,
    preferred_time_start TIME,
    preferred_time_end TIME,
    is_scheduled BOOLEAN DEFAULT FALSE,
    scheduled_date DATE,
    scheduled_time_start TIME,
    scheduled_time_end TIME,
    delivery_instructions TEXT,
    leave_at_door BOOLEAN DEFAULT FALSE,
    call_before_delivery BOOLEAN DEFAULT FALSE,
    building_name VARCHAR(100),
    apartment_number VARCHAR(20),
    floor_number VARCHAR(10),
    landmark VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id, shipment_id)
);

CREATE INDEX idx_delivery_schedules_order_id ON delivery_schedules(order_id);

-- Order Modification Requests (Before shipment)
CREATE TABLE IF NOT EXISTS order_modifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL, -- 'address_change', 'item_cancel', 'quantity_change', 'shipping_upgrade'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'processed'
    request_details JSONB NOT NULL,
    admin_notes TEXT,
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_modifications_order_id ON order_modifications(order_id);
CREATE INDEX idx_order_modifications_status ON order_modifications(status);

-- Delivery Photos (Proof of delivery)
CREATE TABLE IF NOT EXISTS delivery_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_type VARCHAR(30) DEFAULT 'delivery', -- 'delivery', 'pickup', 'exception'
    taken_at TIMESTAMPTZ DEFAULT NOW(),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_photos_order_id ON delivery_photos(order_id);

-- Update orders table with new fields
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS can_modify_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS modification_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS delivery_photo_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS signature_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS adult_signature_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS insurance_amount DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS gift_message TEXT,
    ADD COLUMN IF NOT EXISTS gift_wrap BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS gift_wrap_charge DECIMAL(10,2) DEFAULT 0;

-- Subscribe & Save (Recurring orders)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_number VARCHAR(32) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'cancelled', 'expired'
    frequency VARCHAR(20) NOT NULL, -- 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly'
    interval_days INTEGER NOT NULL,
    next_delivery_date DATE NOT NULL,
    shipping_address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    is_gift BOOLEAN DEFAULT FALSE,
    gift_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_delivery ON subscriptions(next_delivery_date);

-- Subscription Items
CREATE TABLE IF NOT EXISTS subscription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subscription_discount DECIMAL(5,2) DEFAULT 0, -- Percentage discount for subscription
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_items_subscription_id ON subscription_items(subscription_id);

-- Subscription Orders (Linking subscriptions to generated orders)
CREATE TABLE IF NOT EXISTS subscription_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    cycle_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subscription_id, cycle_number)
);

CREATE INDEX idx_subscription_orders_subscription_id ON subscription_orders(subscription_id);

-- Triggers
CREATE TRIGGER update_return_requests_updated_at BEFORE UPDATE ON return_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_requests_updated_at BEFORE UPDATE ON exchange_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_schedules_updated_at BEFORE UPDATE ON delivery_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_modifications_updated_at BEFORE UPDATE ON order_modifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_items_updated_at BEFORE UPDATE ON subscription_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.return_number = 'RET-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_return_number
    BEFORE INSERT ON return_requests
    FOR EACH ROW EXECUTE FUNCTION generate_return_number();

CREATE OR REPLACE FUNCTION generate_exchange_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.exchange_number = 'EXC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_exchange_number
    BEFORE INSERT ON exchange_requests
    FOR EACH ROW EXECUTE FUNCTION generate_exchange_number();

CREATE OR REPLACE FUNCTION generate_subscription_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subscription_number = 'SUB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_subscription_number
    BEFORE INSERT ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION generate_subscription_number();

COMMENT ON TABLE return_requests IS 'Customer return requests with RMA workflow';
COMMENT ON TABLE exchange_requests IS 'Product exchange requests';
COMMENT ON TABLE order_tracking_updates IS 'Real-time shipment tracking updates';
COMMENT ON TABLE subscriptions IS 'Subscribe & Save recurring orders';
