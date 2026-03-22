-- Migration 018: Seller Enhancement - Warehouses, Bulk Operations, Pricing Rules
-- Adds: Multi-warehouse support, bulk upload tracking, pricing rules, competitor monitoring

-- Seller Warehouses
CREATE TABLE IF NOT EXISTS seller_warehouses (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(2) NOT NULL DEFAULT 'US',
    phone VARCHAR(20),
    email VARCHAR(255),
    contact_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    handling_time INTEGER DEFAULT 1, -- Days to prepare order
    cutoff_time TIME DEFAULT '14:00', -- Order cutoff for same-day processing
    operates_weekends BOOLEAN DEFAULT FALSE,
    operates_holidays BOOLEAN DEFAULT FALSE,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sw_seller_id FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE
) COMMENT 'Multi-location inventory management for sellers';

CREATE INDEX idx_seller_warehouses_seller_id ON seller_warehouses(seller_id);
CREATE INDEX idx_seller_warehouses_code ON seller_warehouses(code);

-- Inventory by Warehouse (multi-location inventory)
CREATE TABLE IF NOT EXISTS warehouse_inventory (
    id CHAR(36) PRIMARY KEY,
    warehouse_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    quantity_available INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    quantity_incoming INTEGER NOT NULL DEFAULT 0, -- From inbound shipments
    reorder_point INTEGER DEFAULT 10,
    reorder_quantity INTEGER DEFAULT 50,
    location_code VARCHAR(50), -- Bin/shelf location
    last_counted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, product_id, variant_id),
    CONSTRAINT fk_wi_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES seller_warehouses(id) ON DELETE CASCADE,
    CONSTRAINT fk_wi_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_wi_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

CREATE INDEX idx_warehouse_inventory_warehouse_id ON warehouse_inventory(warehouse_id);
CREATE INDEX idx_warehouse_inventory_product_id ON warehouse_inventory(product_id);
CREATE INDEX idx_warehouse_inventory_low_stock ON warehouse_inventory(quantity_available);

-- Inbound Shipments (to warehouses)
CREATE TABLE IF NOT EXISTS inbound_shipments (
    id CHAR(36) PRIMARY KEY,
    shipment_number VARCHAR(32) UNIQUE NOT NULL,
    seller_id CHAR(36) NOT NULL,
    warehouse_id CHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'in_transit', -- 'in_transit', 'received', 'partially_received', 'cancelled'
    carrier VARCHAR(50),
    tracking_number VARCHAR(100),
    expected_arrival DATE,
    actual_arrival TIMESTAMP NULL,
    total_items INTEGER NOT NULL,
    received_items INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_is_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_is_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES seller_warehouses(id) ON DELETE CASCADE
);

CREATE INDEX idx_inbound_shipments_seller_id ON inbound_shipments(seller_id);
CREATE INDEX idx_inbound_shipments_warehouse_id ON inbound_shipments(warehouse_id);
CREATE INDEX idx_inbound_shipments_tracking ON inbound_shipments(tracking_number);

-- Inbound Shipment Items
CREATE TABLE IF NOT EXISTS inbound_shipment_items (
    id CHAR(36) PRIMARY KEY,
    shipment_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    expected_quantity INTEGER NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    damaged_quantity INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2),
    batch_number VARCHAR(50),
    expiry_date DATE,
    received_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_isi_shipment_id FOREIGN KEY (shipment_id) REFERENCES inbound_shipments(id) ON DELETE CASCADE,
    CONSTRAINT fk_isi_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_isi_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX idx_inbound_shipment_items_shipment_id ON inbound_shipment_items(shipment_id);

-- Bulk Upload Jobs
CREATE TABLE IF NOT EXISTS bulk_upload_jobs (
    id CHAR(36) PRIMARY KEY,
    job_id VARCHAR(64) UNIQUE NOT NULL,
    seller_id CHAR(36) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'products', 'inventory', 'prices', 'images'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'partial'
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    successful_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    error_log JSON,
    result_summary JSON,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_buj_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_bulk_upload_jobs_seller_id ON bulk_upload_jobs(seller_id);
CREATE INDEX idx_bulk_upload_jobs_status ON bulk_upload_jobs(status);

-- Pricing Rules (Dynamic pricing)
CREATE TABLE IF NOT EXISTS pricing_rules (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'competitor_match', 'percentage_markup', 'fixed_markup', 'volume_discount', 'time_based'
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- Higher number = higher priority
    
    -- Product selection
    apply_to VARCHAR(20) DEFAULT 'all', -- 'all', 'category', 'brand', 'products', 'tags'
    category_id CHAR(36),
    brand VARCHAR(100),
    product_ids JSON, -- Changed from UUID[] to JSON
    tags JSON, -- Changed from TEXT[] to JSON
    
    -- Rule conditions
    condition_type VARCHAR(30), -- 'always', 'inventory_level', 'competitor_price', 'time_range', 'customer_group'
    condition_value JSON,
    
    -- Pricing calculation
    base_price_source VARCHAR(30) DEFAULT 'cost', -- 'cost', 'msrp', 'current_price'
    adjustment_type VARCHAR(20) NOT NULL, -- 'fixed_amount', 'percentage', 'match_competitor', 'formula'
    adjustment_value DECIMAL(10,4),
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    
    -- Time constraints
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    schedule_cron VARCHAR(50), -- Cron expression for recurring rules
    
    -- Competitor matching (for competitor_match type)
    competitor_url TEXT,
    competitor_name VARCHAR(100),
    match_strategy VARCHAR(20) DEFAULT 'match', -- 'match', 'beat_by_amount', 'beat_by_percent', 'stay_above'
    match_difference DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_applied_at TIMESTAMP NULL,
    applied_count INTEGER DEFAULT 0,
    CONSTRAINT fk_pr_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_pr_category_id FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) COMMENT 'Automated pricing strategies for sellers';

CREATE INDEX idx_pricing_rules_seller_id ON pricing_rules(seller_id);
CREATE INDEX idx_pricing_rules_active ON pricing_rules(is_active);
CREATE INDEX idx_pricing_rules_type ON pricing_rules(type);

-- Competitor Price Monitoring
CREATE TABLE IF NOT EXISTS competitor_prices (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    competitor_name VARCHAR(100) NOT NULL,
    competitor_url TEXT,
    competitor_price DECIMAL(10,2) NOT NULL,
    competitor_currency VARCHAR(3) DEFAULT 'USD',
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    availability VARCHAR(30) DEFAULT 'in_stock', -- 'in_stock', 'out_of_stock', 'backorder'
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_lowest BOOLEAN DEFAULT FALSE,
    price_difference DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cp_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cp_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_competitor_prices_seller_id ON competitor_prices(seller_id);
CREATE INDEX idx_competitor_prices_product_id ON competitor_prices(product_id);
CREATE INDEX idx_competitor_prices_scraped ON competitor_prices(scraped_at);

-- Product Bundles
CREATE TABLE IF NOT EXISTS product_bundles (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'draft'
    base_product_id CHAR(36) NOT NULL,
    bundle_price DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(10,2) NOT NULL, -- Sum of individual prices
    savings_amount DECIMAL(10,2) NOT NULL,
    savings_percentage DECIMAL(5,2),
    is_featured BOOLEAN DEFAULT FALSE,
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pb_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_pb_product_id FOREIGN KEY (base_product_id) REFERENCES products(id) ON DELETE CASCADE
) COMMENT 'Product bundling for increased AOV';

CREATE INDEX idx_product_bundles_seller_id ON product_bundles(seller_id);
CREATE INDEX idx_product_bundles_status ON product_bundles(status);

-- Bundle Items
CREATE TABLE IF NOT EXISTS bundle_items (
    id CHAR(36) PRIMARY KEY,
    bundle_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bi_bundle_id FOREIGN KEY (bundle_id) REFERENCES product_bundles(id) ON DELETE CASCADE,
    CONSTRAINT fk_bi_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_bi_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX idx_bundle_items_bundle_id ON bundle_items(bundle_id);

-- Shipping Templates (Seller-defined shipping rules)
CREATE TABLE IF NOT EXISTS shipping_templates (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    processing_time INTEGER DEFAULT 1, -- Business days
    
    -- Domestic shipping
    domestic_free_shipping BOOLEAN DEFAULT FALSE,
    domestic_free_shipping_threshold DECIMAL(10,2),
    domestic_flat_rate DECIMAL(10,2),
    domestic_calculation VARCHAR(20) DEFAULT 'flat', -- 'flat', 'weight_based', 'price_based', 'carrier_calculated'
    domestic_carrier_preferences JSON, -- Changed from TEXT[] to JSON
    
    -- International shipping
    ships_internationally BOOLEAN DEFAULT FALSE,
    international_free_shipping BOOLEAN DEFAULT FALSE,
    international_free_shipping_threshold DECIMAL(10,2),
    international_flat_rate DECIMAL(10,2),
    international_calculation VARCHAR(20) DEFAULT 'flat',
    international_destinations JSON, -- Changed from TEXT[] to JSON
    
    -- Restrictions
    max_weight_kg DECIMAL(8,2),
    max_dimensions_cm JSON, -- {length, width, height}
    excluded_regions JSON, -- Changed from TEXT[] to JSON
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_st_seller_id_v2 FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_shipping_templates_seller_id ON shipping_templates(seller_id);

-- Product-Shipping Template Assignment
CREATE TABLE IF NOT EXISTS product_shipping_templates (
    id CHAR(36) PRIMARY KEY,
    product_id CHAR(36) NOT NULL,
    template_id CHAR(36) NOT NULL,
    is_overridden BOOLEAN DEFAULT FALSE,
    override_flat_rate DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, template_id),
    CONSTRAINT fk_pst_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_pst_template_id FOREIGN KEY (template_id) REFERENCES shipping_templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_shipping_templates_product_id ON product_shipping_templates(product_id);

-- Seller Customer Messages
CREATE TABLE IF NOT EXISTS seller_customer_messages (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    customer_id CHAR(36) NOT NULL,
    order_id CHAR(36),
    product_id CHAR(36),
    subject VARCHAR(255),
    direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    attachments JSON, -- Changed from TEXT[] to JSON
    metadata JSON, -- {order_number, product_name, etc.}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_scm_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_scm_customer_id FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_scm_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    CONSTRAINT fk_scm_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX idx_seller_messages_seller_id ON seller_customer_messages(seller_id);
CREATE INDEX idx_seller_messages_customer_id ON seller_customer_messages(customer_id);
CREATE INDEX idx_seller_messages_order_id ON seller_customer_messages(order_id);
CREATE INDEX idx_seller_messages_unread ON seller_customer_messages(is_read);

-- Seller Performance Metrics (denormalized for quick access)
CREATE TABLE IF NOT EXISTS seller_performance_metrics (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    
    -- Order metrics
    total_orders INTEGER DEFAULT 0,
    shipped_on_time INTEGER DEFAULT 0,
    late_shipments INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    
    -- Quality metrics
    valid_tracking_rate DECIMAL(5,2) DEFAULT 0,
    late_shipment_rate DECIMAL(5,2) DEFAULT 0,
    pre_fulfillment_cancel_rate DECIMAL(5,2) DEFAULT 0,
    order_defect_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Customer metrics
    positive_feedback INTEGER DEFAULT 0,
    neutral_feedback INTEGER DEFAULT 0,
    negative_feedback INTEGER DEFAULT 0,
    response_time_hours DECIMAL(6,2),
    
    -- Policy compliance
    policy_violations INTEGER DEFAULT 0,
    intellectual_property_complaints INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(seller_id, `date`),
    CONSTRAINT fk_spm_seller_id FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_seller_performance_seller_id ON seller_performance_metrics(seller_id);
CREATE INDEX idx_seller_performance_date ON seller_performance_metrics(`date`);

-- MySQL Triggers
DELIMITER //
CREATE TRIGGER tr_is_insert BEFORE INSERT ON inbound_shipments
FOR EACH ROW
BEGIN
    SET NEW.shipment_number = CONCAT('INB-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', SUBSTRING(MD5(RAND()), 1, 6));
END;
//

-- Inventory update trigger
CREATE TRIGGER tr_isi_update AFTER UPDATE ON inbound_shipment_items
FOR EACH ROW
BEGIN
    IF NEW.received_quantity > 0 AND NEW.received_quantity != OLD.received_quantity THEN
        UPDATE warehouse_inventory 
        SET quantity_available = quantity_available + (NEW.received_quantity - OLD.received_quantity),
            quantity_incoming = quantity_incoming - (NEW.received_quantity - OLD.received_quantity),
            last_counted_at = NOW()
        WHERE warehouse_id = (SELECT warehouse_id FROM inbound_shipments WHERE id = NEW.shipment_id)
          AND product_id = NEW.product_id
          AND (variant_id = NEW.variant_id OR (variant_id IS NULL AND NEW.variant_id IS NULL));
    END IF;
END;
//
DELIMITER ;
