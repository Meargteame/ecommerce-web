-- Migration 017: Returns, Exchanges, and Advanced Order Management
-- Adds: Return requests, exchanges, order tracking, delivery scheduling

-- Return Requests
CREATE TABLE IF NOT EXISTS return_requests (
    id CHAR(36) PRIMARY KEY,
    return_number VARCHAR(32) UNIQUE NOT NULL,
    order_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'received', 'refunded', 'closed'
    reason VARCHAR(50) NOT NULL, -- 'defective', 'wrong_item', 'not_as_described', 'changed_mind', 'arrived_late', 'other'
    reason_details TEXT,
    return_method VARCHAR(20) DEFAULT 'pickup', -- 'pickup', 'dropoff', 'mail'
    refund_method VARCHAR(20) DEFAULT 'original', -- 'original', 'store_credit', 'exchange'
    total_items INTEGER NOT NULL,
    total_refund_amount DECIMAL(10,2),
    shipping_label_url TEXT,
    tracking_number VARCHAR(100),
    pickup_address_id CHAR(36),
    scheduled_pickup_date DATE,
    received_at TIMESTAMP NULL,
    inspected_at TIMESTAMP NULL,
    inspected_by CHAR(36),
    inspection_notes TEXT,
    refund_processed_at TIMESTAMP NULL,
    refund_transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rr_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_address_id FOREIGN KEY (pickup_address_id) REFERENCES addresses(id) ON DELETE SET NULL,
    CONSTRAINT fk_rr_inspector FOREIGN KEY (inspected_by) REFERENCES users(id) ON DELETE SET NULL
) COMMENT 'Customer return requests with RMA workflow';

CREATE INDEX idx_return_requests_order_id ON return_requests(order_id);
CREATE INDEX idx_return_requests_user_id ON return_requests(user_id);
CREATE INDEX idx_return_requests_status ON return_requests(status);
CREATE INDEX idx_return_requests_number ON return_requests(return_number);

-- Return Items
CREATE TABLE IF NOT EXISTS return_items (
    id CHAR(36) PRIMARY KEY,
    return_id CHAR(36) NOT NULL,
    order_item_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    quantity INTEGER NOT NULL,
    return_reason VARCHAR(50),
    condition_received VARCHAR(30), -- 'new', 'opened', 'damaged', 'incomplete'
    refund_amount DECIMAL(10,2),
    restocking_fee DECIMAL(10,2) DEFAULT 0,
    is_exchange_eligible BOOLEAN DEFAULT TRUE,
    images JSON, -- Changed from TEXT[] to JSON
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ri_return_id FOREIGN KEY (return_id) REFERENCES return_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_ri_order_item_id FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_ri_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_ri_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX idx_return_items_return_id ON return_items(return_id);
CREATE INDEX idx_return_items_order_item_id ON return_items(order_item_id);

-- Exchange Requests
CREATE TABLE IF NOT EXISTS exchange_requests (
    id CHAR(36) PRIMARY KEY,
    exchange_number VARCHAR(32) UNIQUE NOT NULL,
    return_id CHAR(36),
    order_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'shipped', 'delivered', 'cancelled'
    total_items INTEGER NOT NULL,
    exchange_difference DECIMAL(10,2) DEFAULT 0, -- Amount customer needs to pay or be refunded
    shipping_label_url TEXT,
    tracking_number VARCHAR(100),
    new_tracking_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_er_return_id FOREIGN KEY (return_id) REFERENCES return_requests(id) ON DELETE SET NULL,
    CONSTRAINT fk_er_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_er_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT 'Product exchange requests';

CREATE INDEX idx_exchange_requests_return_id ON exchange_requests(return_id);
CREATE INDEX idx_exchange_requests_order_id ON exchange_requests(order_id);
CREATE INDEX idx_exchange_requests_user_id ON exchange_requests(user_id);

-- Exchange Items
CREATE TABLE IF NOT EXISTS exchange_items (
    id CHAR(36) PRIMARY KEY,
    exchange_id CHAR(36) NOT NULL,
    return_item_id CHAR(36) NOT NULL,
    new_product_id CHAR(36) NOT NULL,
    new_variant_id CHAR(36),
    new_quantity INTEGER NOT NULL,
    price_difference DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ei_exchange_id FOREIGN KEY (exchange_id) REFERENCES exchange_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_ei_return_item_id FOREIGN KEY (return_item_id) REFERENCES return_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_ei_product_id FOREIGN KEY (new_product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_ei_variant_id FOREIGN KEY (new_variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX idx_exchange_items_exchange_id ON exchange_items(exchange_id);

-- Order Tracking Updates (Real-time GPS tracking)
CREATE TABLE IF NOT EXISTS order_tracking_updates (
    id CHAR(36) PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    shipment_id CHAR(36),
    status VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    description TEXT,
    estimated_delivery TIMESTAMP NULL,
    carrier_status_code VARCHAR(50),
    raw_data JSON, -- Carrier API response
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_otu_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_otu_shipment_id FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
) COMMENT 'Real-time shipment tracking updates';

CREATE INDEX idx_order_tracking_order_id ON order_tracking_updates(order_id);
CREATE INDEX idx_order_tracking_shipment_id ON order_tracking_updates(shipment_id);
CREATE INDEX idx_order_tracking_created ON order_tracking_updates(created_at);

-- Delivery Scheduling
CREATE TABLE IF NOT EXISTS delivery_schedules (
    id CHAR(36) PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    shipment_id CHAR(36),
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(order_id, shipment_id),
    CONSTRAINT fk_ds_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_ds_shipment_id FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

CREATE INDEX idx_delivery_schedules_order_id ON delivery_schedules(order_id);

-- Order Modification Requests (Before shipment)
CREATE TABLE IF NOT EXISTS order_modifications (
    id CHAR(36) PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'address_change', 'item_cancel', 'quantity_change', 'shipping_upgrade'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'processed'
    request_details JSON NOT NULL,
    admin_notes TEXT,
    processed_by CHAR(36),
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_om_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_om_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_om_processor FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_order_modifications_order_id ON order_modifications(order_id);
CREATE INDEX idx_order_modifications_status ON order_modifications(status);

-- Delivery Photos (Proof of delivery)
CREATE TABLE IF NOT EXISTS delivery_photos (
    id CHAR(36) PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    shipment_id CHAR(36),
    photo_url TEXT NOT NULL,
    photo_type VARCHAR(30) DEFAULT 'delivery', -- 'delivery', 'pickup', 'exception'
    taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dp_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_dp_shipment_id FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

CREATE INDEX idx_delivery_photos_order_id ON delivery_photos(order_id);

-- Update orders table with new fields
ALTER TABLE orders
    ADD COLUMN can_modify_until TIMESTAMP NULL,
    ADD COLUMN modification_count INTEGER DEFAULT 0,
    ADD COLUMN delivery_photo_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN signature_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN adult_signature_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN insurance_amount DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN is_gift BOOLEAN DEFAULT FALSE,
    ADD COLUMN gift_message TEXT,
    ADD COLUMN gift_wrap BOOLEAN DEFAULT FALSE,
    ADD COLUMN gift_wrap_charge DECIMAL(10,2) DEFAULT 0;

-- Subscribe & Save (Recurring orders)
CREATE TABLE IF NOT EXISTS subscriptions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    subscription_number VARCHAR(32) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'cancelled', 'expired'
    frequency VARCHAR(20) NOT NULL, -- 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly'
    interval_days INTEGER NOT NULL,
    next_delivery_date DATE NOT NULL,
    shipping_address_id CHAR(36) NOT NULL,
    payment_method_id CHAR(36),
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    is_gift BOOLEAN DEFAULT FALSE,
    gift_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason TEXT,
    CONSTRAINT fk_sub_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sub_address_id FOREIGN KEY (shipping_address_id) REFERENCES addresses(id) ON DELETE CASCADE,
    CONSTRAINT fk_sub_pm_id FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
) COMMENT 'Subscribe & Save recurring orders';

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_delivery ON subscriptions(next_delivery_date);

-- Subscription Items
CREATE TABLE IF NOT EXISTS subscription_items (
    id CHAR(36) PRIMARY KEY,
    subscription_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subscription_discount DECIMAL(5,2) DEFAULT 0, -- Percentage discount for subscription
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_si_sub_id FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    CONSTRAINT fk_si_prod_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_si_var_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX idx_subscription_items_subscription_id ON subscription_items(subscription_id);

-- Subscription Orders (Linking subscriptions to generated orders)
CREATE TABLE IF NOT EXISTS subscription_orders (
    id CHAR(36) PRIMARY KEY,
    subscription_id CHAR(36) NOT NULL,
    order_id CHAR(36) NOT NULL,
    cycle_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscription_id, cycle_number),
    CONSTRAINT fk_so_sub_id FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    CONSTRAINT fk_so_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscription_orders_subscription_id ON subscription_orders(subscription_id);

-- MySQL Triggers for numbers (Random suffixes)
DELIMITER //
CREATE TRIGGER tr_rr_insert BEFORE INSERT ON return_requests
FOR EACH ROW
BEGIN
    SET NEW.return_number = CONCAT('RET-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', SUBSTRING(MD5(RAND()), 1, 6));
END;
//

CREATE TRIGGER tr_er_insert BEFORE INSERT ON exchange_requests
FOR EACH ROW
BEGIN
    SET NEW.exchange_number = CONCAT('EXC-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', SUBSTRING(MD5(RAND()), 1, 6));
END;
//

CREATE TRIGGER tr_sub_insert BEFORE INSERT ON subscriptions
FOR EACH ROW
BEGIN
    SET NEW.subscription_number = CONCAT('SUB-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', SUBSTRING(MD5(RAND()), 1, 8));
END;
//
DELIMITER ;
