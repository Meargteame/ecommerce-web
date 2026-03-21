-- Migration 018: Seller Enhancement - Warehouses, Bulk Operations, Pricing Rules
-- Adds: Multi-warehouse support, bulk upload tracking, pricing rules, competitor monitoring

-- Seller Warehouses
CREATE TABLE IF NOT EXISTS seller_warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seller_warehouses_seller_id ON seller_warehouses(seller_id);
CREATE INDEX idx_seller_warehouses_code ON seller_warehouses(code);

-- Inventory by Warehouse (multi-location inventory)
CREATE TABLE IF NOT EXISTS warehouse_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES seller_warehouses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    quantity_incoming INTEGER NOT NULL DEFAULT 0, -- From inbound shipments
    reorder_point INTEGER DEFAULT 10,
    reorder_quantity INTEGER DEFAULT 50,
    location_code VARCHAR(50), -- Bin/shelf location
    last_counted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(warehouse_id, product_id, variant_id)
);

CREATE INDEX idx_warehouse_inventory_warehouse_id ON warehouse_inventory(warehouse_id);
CREATE INDEX idx_warehouse_inventory_product_id ON warehouse_inventory(product_id);
CREATE INDEX idx_warehouse_inventory_low_stock ON warehouse_inventory(quantity_available)
    WHERE quantity_available <= reorder_point;

-- Inbound Shipments (to warehouses)
CREATE TABLE IF NOT EXISTS inbound_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_number VARCHAR(32) UNIQUE NOT NULL,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES seller_warehouses(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'in_transit', -- 'in_transit', 'received', 'partially_received', 'cancelled'
    carrier VARCHAR(50),
    tracking_number VARCHAR(100),
    expected_arrival DATE,
    actual_arrival TIMESTAMPTZ,
    total_items INTEGER NOT NULL,
    received_items INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inbound_shipments_seller_id ON inbound_shipments(seller_id);
CREATE INDEX idx_inbound_shipments_warehouse_id ON inbound_shipments(warehouse_id);
CREATE INDEX idx_inbound_shipments_tracking ON inbound_shipments(tracking_number);

-- Inbound Shipment Items
CREATE TABLE IF NOT EXISTS inbound_shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES inbound_shipments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    expected_quantity INTEGER NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    damaged_quantity INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2),
    batch_number VARCHAR(50),
    expiry_date DATE,
    received_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inbound_shipment_items_shipment_id ON inbound_shipment_items(shipment_id);

-- Bulk Upload Jobs
CREATE TABLE IF NOT EXISTS bulk_upload_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(64) UNIQUE NOT NULL,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL, -- 'products', 'inventory', 'prices', 'images'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'partial'
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    successful_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    error_log JSONB,
    result_summary JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bulk_upload_jobs_seller_id ON bulk_upload_jobs(seller_id);
CREATE INDEX idx_bulk_upload_jobs_status ON bulk_upload_jobs(status);

-- Pricing Rules (Dynamic pricing)
CREATE TABLE IF NOT EXISTS pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'competitor_match', 'percentage_markup', 'fixed_markup', 'volume_discount', 'time_based'
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- Higher number = higher priority
    
    -- Product selection
    apply_to VARCHAR(20) DEFAULT 'all', -- 'all', 'category', 'brand', 'products', 'tags'
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    brand VARCHAR(100),
    product_ids UUID[],
    tags TEXT[],
    
    -- Rule conditions
    condition_type VARCHAR(30), -- 'always', 'inventory_level', 'competitor_price', 'time_range', 'customer_group'
    condition_value JSONB,
    
    -- Pricing calculation
    base_price_source VARCHAR(30) DEFAULT 'cost', -- 'cost', 'msrp', 'current_price'
    adjustment_type VARCHAR(20) NOT NULL, -- 'fixed_amount', 'percentage', 'match_competitor', 'formula'
    adjustment_value DECIMAL(10,4),
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    
    -- Time constraints
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    schedule_cron VARCHAR(50), -- Cron expression for recurring rules
    
    -- Competitor matching (for competitor_match type)
    competitor_url TEXT,
    competitor_name VARCHAR(100),
    match_strategy VARCHAR(20) DEFAULT 'match', -- 'match', 'beat_by_amount', 'beat_by_percent', 'stay_above'
    match_difference DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_applied_at TIMESTAMPTZ,
    applied_count INTEGER DEFAULT 0
);

CREATE INDEX idx_pricing_rules_seller_id ON pricing_rules(seller_id);
CREATE INDEX idx_pricing_rules_active ON pricing_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_pricing_rules_type ON pricing_rules(type);

-- Competitor Price Monitoring
CREATE TABLE IF NOT EXISTS competitor_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    competitor_name VARCHAR(100) NOT NULL,
    competitor_url TEXT,
    competitor_price DECIMAL(10,2) NOT NULL,
    competitor_currency VARCHAR(3) DEFAULT 'USD',
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    availability VARCHAR(30) DEFAULT 'in_stock', -- 'in_stock', 'out_of_stock', 'backorder'
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    is_lowest BOOLEAN DEFAULT FALSE,
    price_difference DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_competitor_prices_seller_id ON competitor_prices(seller_id);
CREATE INDEX idx_competitor_prices_product_id ON competitor_prices(product_id);
CREATE INDEX idx_competitor_prices_scraped ON competitor_prices(scraped_at);

-- Product Bundles
CREATE TABLE IF NOT EXISTS product_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'draft'
    base_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    bundle_price DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(10,2) NOT NULL, -- Sum of individual prices
    savings_amount DECIMAL(10,2) NOT NULL,
    savings_percentage DECIMAL(5,2),
    is_featured BOOLEAN DEFAULT FALSE,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_bundles_seller_id ON product_bundles(seller_id);
CREATE INDEX idx_product_bundles_status ON product_bundles(status);

-- Bundle Items
CREATE TABLE IF NOT EXISTS bundle_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bundle_items_bundle_id ON bundle_items(bundle_id);

-- Shipping Templates (Seller-defined shipping rules)
CREATE TABLE IF NOT EXISTS shipping_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    processing_time INTEGER DEFAULT 1, -- Business days
    
    -- Domestic shipping
    domestic_free_shipping BOOLEAN DEFAULT FALSE,
    domestic_free_shipping_threshold DECIMAL(10,2),
    domestic_flat_rate DECIMAL(10,2),
    domestic_calculation VARCHAR(20) DEFAULT 'flat', -- 'flat', 'weight_based', 'price_based', 'carrier_calculated'
    domestic_carrier_preferences TEXT[],
    
    -- International shipping
    ships_internationally BOOLEAN DEFAULT FALSE,
    international_free_shipping BOOLEAN DEFAULT FALSE,
    international_free_shipping_threshold DECIMAL(10,2),
    international_flat_rate DECIMAL(10,2),
    international_calculation VARCHAR(20) DEFAULT 'flat',
    international_destinations TEXT[], -- Country codes allowed
    
    -- Restrictions
    max_weight_kg DECIMAL(8,2),
    max_dimensions_cm JSONB, -- {length, width, height}
    excluded_regions TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shipping_templates_seller_id ON shipping_templates(seller_id);

-- Product-Shipping Template Assignment
CREATE TABLE IF NOT EXISTS product_shipping_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES shipping_templates(id) ON DELETE CASCADE,
    is_overridden BOOLEAN DEFAULT FALSE,
    override_flat_rate DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, template_id)
);

CREATE INDEX idx_product_shipping_templates_product_id ON product_shipping_templates(product_id);

-- Seller Customer Messages
CREATE TABLE IF NOT EXISTS seller_customer_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    subject VARCHAR(255),
    direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    attachments TEXT[],
    metadata JSONB, -- {order_number, product_name, etc.}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seller_messages_seller_id ON seller_customer_messages(seller_id);
CREATE INDEX idx_seller_messages_customer_id ON seller_customer_messages(customer_id);
CREATE INDEX idx_seller_messages_order_id ON seller_customer_messages(order_id);
CREATE INDEX idx_seller_messages_unread ON seller_customer_messages(is_read) WHERE is_read = FALSE;

-- Seller Performance Metrics (denormalized for quick access)
CREATE TABLE IF NOT EXISTS seller_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
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
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(seller_id, date)
);

CREATE INDEX idx_seller_performance_seller_id ON seller_performance_metrics(seller_id);
CREATE INDEX idx_seller_performance_date ON seller_performance_metrics(date);

-- Triggers
CREATE TRIGGER update_seller_warehouses_updated_at BEFORE UPDATE ON seller_warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouse_inventory_updated_at BEFORE UPDATE ON warehouse_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inbound_shipments_updated_at BEFORE UPDATE ON inbound_shipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_bundles_updated_at BEFORE UPDATE ON product_bundles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_templates_updated_at BEFORE UPDATE ON shipping_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_performance_updated_at BEFORE UPDATE ON seller_performance_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate inbound shipment number
CREATE OR REPLACE FUNCTION generate_inbound_shipment_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.shipment_number = 'INB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_inbound_shipment_number
    BEFORE INSERT ON inbound_shipments
    FOR EACH ROW EXECUTE FUNCTION generate_inbound_shipment_number();

-- Function to update inventory on inbound receipt
CREATE OR REPLACE FUNCTION update_inventory_on_receipt()
RETURNS TRIGGER AS $$
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
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_on_receipt_trigger
    AFTER UPDATE ON inbound_shipment_items
    FOR EACH ROW EXECUTE FUNCTION update_inventory_on_receipt();

COMMENT ON TABLE seller_warehouses IS 'Multi-location inventory management for sellers';
COMMENT ON TABLE pricing_rules IS 'Automated pricing strategies for sellers';
COMMENT ON TABLE product_bundles IS 'Product bundling for increased AOV';
