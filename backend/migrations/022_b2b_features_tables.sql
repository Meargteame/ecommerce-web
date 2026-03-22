-- Migration 022: B2B Features and Advanced Order Features
-- Adds: Business accounts, quotes, purchase orders, and bulk buying

-- Business Accounts (B2B customers)
CREATE TABLE IF NOT EXISTS business_accounts (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    
    -- Company details
    company_name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(200),
    company_number VARCHAR(100),
    vat_number VARCHAR(50),
    tax_id VARCHAR(50),
    
    -- Industry
    industry VARCHAR(100),
    company_size VARCHAR(30), -- '1-10', '11-50', '51-200', '201-500', '500+'
    annual_revenue DECIMAL(15,2),
    
    -- Contact
    company_email VARCHAR(255),
    company_phone VARCHAR(20),
    website VARCHAR(255),
    
    -- Billing
    payment_terms VARCHAR(30) DEFAULT 'net_30', -- 'immediate', 'net_15', 'net_30', 'net_60'
    credit_limit DECIMAL(12,2) DEFAULT 0,
    credit_used DECIMAL(12,2) DEFAULT 0,
    credit_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended'
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verification_documents JSON, -- Changed from TEXT[] to JSON
    verified_by CHAR(36),
    verified_at TIMESTAMP NULL,
    
    -- Settings
    requires_approval BOOLEAN DEFAULT FALSE,
    approver_ids JSON, -- Changed from UUID[] to JSON
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'closed'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    CONSTRAINT fk_ba_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ba_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) COMMENT 'B2B customer accounts with credit and approval workflows';

CREATE INDEX idx_business_accounts_user_id ON business_accounts(user_id);
CREATE INDEX idx_business_accounts_status ON business_accounts(status);
CREATE INDEX idx_business_accounts_credit_status ON business_accounts(credit_status);

-- Business Account Users (Multiple employees per account)
CREATE TABLE IF NOT EXISTS business_account_users (
    id CHAR(36) PRIMARY KEY,
    business_account_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    
    role VARCHAR(30) NOT NULL, -- 'admin', 'buyer', 'approver', 'viewer'
    can_purchase BOOLEAN DEFAULT FALSE,
    can_approve BOOLEAN DEFAULT FALSE,
    purchase_limit DECIMAL(12,2),
    
    -- Approval chain
    requires_approval_from JSON, -- Changed from UUID[] to JSON
    
    is_active BOOLEAN DEFAULT TRUE,
    invited_by CHAR(36),
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP NULL,
    
    UNIQUE(business_account_id, user_id),
    CONSTRAINT fk_bau_account_id FOREIGN KEY (business_account_id) REFERENCES business_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_bau_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bau_invited_by FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_business_account_users_account_id ON business_account_users(business_account_id);
CREATE INDEX idx_business_account_users_user_id ON business_account_users(user_id);

-- Purchase Orders (B2B formal ordering)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id CHAR(36) PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    
    business_account_id CHAR(36) NOT NULL,
    buyer_user_id CHAR(36) NOT NULL,
    
    -- Supplier/Seller info
    seller_id CHAR(36),
    
    -- Status
    status VARCHAR(30) DEFAULT 'draft', -- 'draft', 'sent', 'acknowledged', 'partially_fulfilled', 'fulfilled', 'cancelled', 'rejected'
    
    -- Financial
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    shipping_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Delivery
    delivery_address_id CHAR(36),
    billing_address_id CHAR(36),
    requested_delivery_date DATE,
    
    -- Approval workflow
    submitted_for_approval_at TIMESTAMP NULL,
    approved_by CHAR(36),
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    
    -- Notes
    internal_notes TEXT,
    supplier_notes TEXT,
    
    -- Linked order
    order_id CHAR(36),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_po_account_id FOREIGN KEY (business_account_id) REFERENCES business_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_po_buyer_id FOREIGN KEY (buyer_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_po_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_po_deliv_addr FOREIGN KEY (delivery_address_id) REFERENCES addresses(id) ON DELETE SET NULL,
    CONSTRAINT fk_po_bill_addr FOREIGN KEY (billing_address_id) REFERENCES addresses(id) ON DELETE SET NULL,
    CONSTRAINT fk_po_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_po_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) COMMENT 'Formal purchase orders for B2B transactions';

CREATE INDEX idx_purchase_orders_business_account ON purchase_orders(business_account_id);
CREATE INDEX idx_purchase_orders_seller_id ON purchase_orders(seller_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id CHAR(36) PRIMARY KEY,
    purchase_order_id CHAR(36) NOT NULL,
    
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    unit_of_measure VARCHAR(50), -- 'each', 'case', 'pallet', 'kg', 'meter'
    
    -- Fulfillment tracking
    quantity_received INTEGER DEFAULT 0,
    quantity_accepted INTEGER DEFAULT 0,
    quantity_rejected INTEGER DEFAULT 0,
    
    total DECIMAL(10,2) NOT NULL,
    
    -- Delivery
    requested_delivery_date DATE,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_poi_po_id FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_poi_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_poi_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX idx_po_items_po_id ON purchase_order_items(purchase_order_id);

-- Quotes / RFQ (Request for Quote)
CREATE TABLE IF NOT EXISTS quotes (
    id CHAR(36) PRIMARY KEY,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Requester
    business_account_id CHAR(36),
    user_id CHAR(36) NOT NULL,
    
    -- Seller (if specific)
    seller_id CHAR(36),
    
    -- Quote details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sent', 'received', 'accepted', 'rejected', 'expired'
    
    -- Requirements
    required_by_date DATE,
    quantity_estimate INTEGER,
    budget_range_min DECIMAL(12,2),
    budget_range_max DECIMAL(12,2),
    
    -- Quote received
    quoted_amount DECIMAL(12,2),
    quote_valid_until DATE,
    quote_document_url TEXT,
    
    -- Linked
    order_id CHAR(36),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_q_account_id FOREIGN KEY (business_account_id) REFERENCES business_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_q_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_q_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_q_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) COMMENT 'Request for quote system for B2B buyers';

CREATE INDEX idx_quotes_business_account ON quotes(business_account_id);
CREATE INDEX idx_quotes_seller_id ON quotes(seller_id);
CREATE INDEX idx_quotes_status ON quotes(status);

-- Quote Items
CREATE TABLE IF NOT EXISTS quote_items (
    id CHAR(36) PRIMARY KEY,
    quote_id CHAR(36) NOT NULL,
    
    product_id CHAR(36), -- NULL if custom request
    product_name VARCHAR(255),
    product_description TEXT,
    
    specifications JSON, -- Changed from JSONB to JSON
    quantity_requested INTEGER NOT NULL,
    
    -- Response
    unit_price_quoted DECIMAL(10,2),
    quantity_available INTEGER,
    delivery_time_days INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_qi_quote_id FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
    CONSTRAINT fk_qi_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);

-- Volume Pricing Tiers
CREATE TABLE IF NOT EXISTS volume_pricing_tiers (
    id CHAR(36) PRIMARY KEY,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    
    min_quantity INTEGER NOT NULL,
    max_quantity INTEGER,
    unit_price DECIMAL(10,2) NOT NULL,
    
    -- Target
    customer_type VARCHAR(20) DEFAULT 'all', -- 'all', 'b2b', 'b2c'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, variant_id, min_quantity, customer_type),
    CONSTRAINT fk_vpt_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_vpt_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

CREATE INDEX idx_volume_pricing_product_id ON volume_pricing_tiers(product_id);

-- Requisition Lists (Shopping lists for B2B)
CREATE TABLE IF NOT EXISTS requisition_lists (
    id CHAR(36) PRIMARY KEY,
    business_account_id CHAR(36) NOT NULL,
    created_by CHAR(36) NOT NULL,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Sharing
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with JSON, -- Changed from UUID[] to JSON
    
    -- Default for quick ordering
    is_default BOOLEAN DEFAULT FALSE,
    
    item_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rl_account_id FOREIGN KEY (business_account_id) REFERENCES business_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_rl_creator_id FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) COMMENT 'B2B shopping lists for recurring purchases';

CREATE INDEX idx_requisition_lists_business_account ON requisition_lists(business_account_id);

-- Requisition List Items
CREATE TABLE IF NOT EXISTS requisition_list_items (
    id CHAR(36) PRIMARY KEY,
    requisition_list_id CHAR(36) NOT NULL,
    
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    
    default_quantity INTEGER DEFAULT 1,
    notes TEXT,
    
    added_by CHAR(36),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(requisition_list_id, product_id, variant_id),
    CONSTRAINT fk_rli_list_id FOREIGN KEY (requisition_list_id) REFERENCES requisition_lists(id) ON DELETE CASCADE,
    CONSTRAINT fk_rli_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_rli_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
    CONSTRAINT fk_rli_adder_id FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_requisition_list_items_list_id ON requisition_list_items(requisition_list_id);

-- Order Approval Workflow
CREATE TABLE IF NOT EXISTS order_approval_requests (
    id CHAR(36) PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    requester_id CHAR(36) NOT NULL,
    
    -- Approval chain
    approver_id CHAR(36) NOT NULL,
    
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'escalated'
    
    -- Details
    request_note TEXT,
    response_note TEXT,
    
    -- Timing
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    
    -- Escalation
    escalated_to CHAR(36),
    escalated_at TIMESTAMP NULL,
    escalation_reason TEXT,
    CONSTRAINT fk_oar_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_oar_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_oar_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_oar_escalator FOREIGN KEY (escalated_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_order_approval_requests_order_id ON order_approval_requests(order_id);
CREATE INDEX idx_order_approval_requests_approver ON order_approval_requests(approver_id);
CREATE INDEX idx_order_approval_requests_status ON order_approval_requests(status);

-- Net Terms / Invoice Payments
CREATE TABLE IF NOT EXISTS invoice_payments (
    id CHAR(36) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    
    business_account_id CHAR(36) NOT NULL,
    order_id CHAR(36) NOT NULL,
    
    -- Amounts
    amount DECIMAL(12,2) NOT NULL,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    amount_due DECIMAL(12,2) NOT NULL,
    
    -- Terms
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_terms VARCHAR(30),
    
    -- Status
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'partial', 'paid', 'overdue', 'cancelled'
    
    -- Payment tracking
    paid_at TIMESTAMP NULL,
    paid_by CHAR(36),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    
    -- Reminders
    reminder_sent_at TIMESTAMP NULL,
    reminder_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ip_account_id FOREIGN KEY (business_account_id) REFERENCES business_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_ip_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_ip_payer_id FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_invoice_payments_business_account ON invoice_payments(business_account_id);
CREATE INDEX idx_invoice_payments_order_id ON invoice_payments(order_id);
CREATE INDEX idx_invoice_payments_status ON invoice_payments(status);
CREATE INDEX idx_invoice_payments_due_date ON invoice_payments(due_date);

-- MySQL Triggers
DELIMITER //

CREATE TRIGGER tr_po_insert BEFORE INSERT ON purchase_orders
FOR EACH ROW
BEGIN
    SET NEW.po_number = CONCAT('PO-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', SUBSTRING(MD5(RAND()), 1, 6));
END;
//

CREATE TRIGGER tr_q_insert BEFORE INSERT ON quotes
FOR EACH ROW
BEGIN
    SET NEW.quote_number = CONCAT('Q-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', SUBSTRING(MD5(RAND()), 1, 6));
END;
//

CREATE TRIGGER tr_rli_insert AFTER INSERT ON requisition_list_items
FOR EACH ROW
BEGIN
    UPDATE requisition_lists SET item_count = item_count + 1 WHERE id = NEW.requisition_list_id;
END;
//

CREATE TRIGGER tr_rli_delete AFTER DELETE ON requisition_list_items
FOR EACH ROW
BEGIN
    UPDATE requisition_lists SET item_count = item_count - 1 WHERE id = OLD.requisition_list_id;
END;
//

DELIMITER ;
