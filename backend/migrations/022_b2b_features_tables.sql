-- Migration 022: B2B Features and Advanced Order Features
-- Adds: Business accounts, quotes, purchase orders, and bulk buying

-- Business Accounts (B2B customers)
CREATE TABLE IF NOT EXISTS business_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
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
    verification_documents TEXT[], -- URLs to uploaded documents
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    
    -- Settings
    requires_approval BOOLEAN DEFAULT FALSE,
    approver_ids UUID[], -- Users who can approve orders
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'closed'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_business_accounts_user_id ON business_accounts(user_id);
CREATE INDEX idx_business_accounts_status ON business_accounts(status);
CREATE INDEX idx_business_accounts_credit_status ON business_accounts(credit_status);

-- Business Account Users (Multiple employees per account)
CREATE TABLE IF NOT EXISTS business_account_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    role VARCHAR(30) NOT NULL, -- 'admin', 'buyer', 'approver', 'viewer'
    can_purchase BOOLEAN DEFAULT FALSE,
    can_approve BOOLEAN DEFAULT FALSE,
    purchase_limit DECIMAL(12,2),
    
    -- Approval chain
    requires_approval_from UUID[],
    
    is_active BOOLEAN DEFAULT TRUE,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    
    UNIQUE(business_account_id, user_id)
);

CREATE INDEX idx_business_account_users_account_id ON business_account_users(business_account_id);
CREATE INDEX idx_business_account_users_user_id ON business_account_users(user_id);

-- Purchase Orders (B2B formal ordering)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    
    business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
    buyer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Supplier/Seller info
    seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
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
    delivery_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
    billing_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
    requested_delivery_date DATE,
    
    -- Approval workflow
    submitted_for_approval_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Notes
    internal_notes TEXT,
    supplier_notes TEXT,
    
    -- Linked order
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchase_orders_business_account ON purchase_orders(business_account_id);
CREATE INDEX idx_purchase_orders_seller_id ON purchase_orders(seller_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    
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
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_items_po_id ON purchase_order_items(purchase_order_id);

-- Quotes / RFQ (Request for Quote)
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Requester
    business_account_id UUID REFERENCES business_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Seller (if specific)
    seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
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
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotes_business_account ON quotes(business_account_id);
CREATE INDEX idx_quotes_seller_id ON quotes(seller_id);
CREATE INDEX idx_quotes_status ON quotes(status);

-- Quote Items
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    
    product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- NULL if custom request
    product_name VARCHAR(255),
    product_description TEXT,
    
    specifications JSONB,
    quantity_requested INTEGER NOT NULL,
    
    -- Response
    unit_price_quoted DECIMAL(10,2),
    quantity_available INTEGER,
    delivery_time_days INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);

-- Volume Pricing Tiers
CREATE TABLE IF NOT EXISTS volume_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    
    min_quantity INTEGER NOT NULL,
    max_quantity INTEGER,
    unit_price DECIMAL(10,2) NOT NULL,
    
    -- Target
    customer_type VARCHAR(20) DEFAULT 'all', -- 'all', 'b2b', 'b2c'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, variant_id, min_quantity, customer_type)
);

CREATE INDEX idx_volume_pricing_product_id ON volume_pricing_tiers(product_id);

-- Requisition Lists (Shopping lists for B2B)
CREATE TABLE IF NOT EXISTS requisition_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Sharing
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with UUID[],
    
    -- Default for quick ordering
    is_default BOOLEAN DEFAULT FALSE,
    
    item_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_requisition_lists_business_account ON requisition_lists(business_account_id);

-- Requisition List Items
CREATE TABLE IF NOT EXISTS requisition_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_list_id UUID NOT NULL REFERENCES requisition_lists(id) ON DELETE CASCADE,
    
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    
    default_quantity INTEGER DEFAULT 1,
    notes TEXT,
    
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(requisition_list_id, product_id, variant_id)
);

CREATE INDEX idx_requisition_list_items_list_id ON requisition_list_items(requisition_list_id);

-- Order Approval Workflow
CREATE TABLE IF NOT EXISTS order_approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Approval chain
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'escalated'
    
    -- Details
    request_note TEXT,
    response_note TEXT,
    
    -- Timing
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Escalation
    escalated_to UUID REFERENCES users(id) ON DELETE SET NULL,
    escalated_at TIMESTAMPTZ,
    escalation_reason TEXT
);

CREATE INDEX idx_order_approval_requests_order_id ON order_approval_requests(order_id);
CREATE INDEX idx_order_approval_requests_approver ON order_approval_requests(approver_id);
CREATE INDEX idx_order_approval_requests_status ON order_approval_requests(status);

-- Net Terms / Invoice Payments
CREATE TABLE IF NOT EXISTS invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    
    business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
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
    paid_at TIMESTAMPTZ,
    paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    
    -- Reminders
    reminder_sent_at TIMESTAMPTZ,
    reminder_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_payments_business_account ON invoice_payments(business_account_id);
CREATE INDEX idx_invoice_payments_order_id ON invoice_payments(order_id);
CREATE INDEX idx_invoice_payments_status ON invoice_payments(status);
CREATE INDEX idx_invoice_payments_due_date ON invoice_payments(due_date);

-- Triggers
CREATE TRIGGER update_business_accounts_updated_at BEFORE UPDATE ON business_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requisition_lists_updated_at BEFORE UPDATE ON requisition_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_payments_updated_at BEFORE UPDATE ON invoice_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.po_number = 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_po_number
    BEFORE INSERT ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION generate_po_number();

CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.quote_number = 'Q-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_quote_number
    BEFORE INSERT ON quotes
    FOR EACH ROW EXECUTE FUNCTION generate_quote_number();

CREATE OR REPLACE FUNCTION update_requisition_list_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE requisition_lists SET item_count = item_count + 1 WHERE id = NEW.requisition_list_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE requisition_lists SET item_count = item_count - 1 WHERE id = OLD.requisition_list_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER requisition_list_count_trigger
    AFTER INSERT OR DELETE ON requisition_list_items
    FOR EACH ROW EXECUTE FUNCTION update_requisition_list_count();

COMMENT ON TABLE business_accounts IS 'B2B customer accounts with credit and approval workflows';
COMMENT ON TABLE purchase_orders IS 'Formal purchase orders for B2B transactions';
COMMENT ON TABLE quotes IS 'Request for quote system for B2B buyers';
COMMENT ON TABLE requisition_lists IS 'B2B shopping lists for recurring purchases';
