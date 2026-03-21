-- Migration 020: Admin Platform, CMS, and Advanced Features
-- Adds: CMS pages, banners, SEO management, tax rules, fraud detection

-- CMS Pages
CREATE TABLE IF NOT EXISTS cms_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    
    -- Content
    content JSONB NOT NULL, -- Structured content blocks
    meta_title VARCHAR(100),
    meta_description VARCHAR(300),
    meta_keywords TEXT[],
    
    -- Settings
    template VARCHAR(50) DEFAULT 'default', -- 'default', 'full_width', 'sidebar', 'landing'
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
    is_homepage BOOLEAN DEFAULT FALSE,
    
    -- Visibility
    show_in_header BOOLEAN DEFAULT FALSE,
    show_in_footer BOOLEAN DEFAULT FALSE,
    header_position INTEGER,
    footer_position INTEGER,
    
    -- Targeting
    target_audience VARCHAR(20) DEFAULT 'all', -- 'all', 'customers', 'sellers', 'b2b'
    target_markets TEXT[], -- Country codes
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    
    -- Authoring
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    published_by UUID REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX idx_cms_pages_status ON cms_pages(status);
CREATE INDEX idx_cms_pages_homepage ON cms_pages(is_homepage) WHERE is_homepage = TRUE;

-- CMS Content Blocks (Reusable components)
CREATE TABLE IF NOT EXISTS cms_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    identifier VARCHAR(50) UNIQUE NOT NULL,
    
    type VARCHAR(30) NOT NULL, -- 'html', 'markdown', 'image', 'video', 'carousel', 'product_grid', 'category_grid'
    content JSONB NOT NULL,
    
    -- Placement
    position VARCHAR(50), -- 'homepage_hero', 'homepage_featured', 'product_page_sidebar', etc.
    
    -- Schedule
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    
    -- Targeting
    target_pages TEXT[], -- Page slugs where this appears
    target_categories UUID[], -- Category IDs
    
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_blocks_identifier ON cms_blocks(identifier);
CREATE INDEX idx_cms_blocks_position ON cms_blocks(position);
CREATE INDEX idx_cms_blocks_active ON cms_blocks(is_active) WHERE is_active = TRUE;

-- Banners / Hero Slides
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    
    -- Content
    title VARCHAR(200),
    subtitle TEXT,
    image_url TEXT NOT NULL,
    mobile_image_url TEXT,
    video_url TEXT,
    
    -- CTA
    cta_text VARCHAR(50),
    cta_url TEXT,
    cta_style VARCHAR(20) DEFAULT 'primary', -- 'primary', 'secondary', 'outline'
    
    -- Styling
    text_alignment VARCHAR(20) DEFAULT 'left', -- 'left', 'center', 'right'
    text_color VARCHAR(7) DEFAULT '#FFFFFF',
    overlay_opacity DECIMAL(3,2) DEFAULT 0.3,
    
    -- Placement
    position VARCHAR(50) NOT NULL, -- 'homepage_hero', 'category_page', 'cart_page', 'checkout_page'
    target_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    target_page VARCHAR(100),
    
    -- Schedule
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    priority INTEGER DEFAULT 0, -- Higher = shown first
    
    -- Targeting
    target_audience VARCHAR(20) DEFAULT 'all', -- 'all', 'new_visitors', 'returning', 'logged_in', 'guest'
    target_device VARCHAR(20) DEFAULT 'all', -- 'all', 'desktop', 'mobile'
    target_markets TEXT[],
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Performance
    impression_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_banners_position ON banners(position);
CREATE INDEX idx_banners_active ON banners(is_active, start_date, end_date) WHERE is_active = TRUE;
CREATE INDEX idx_banners_target_category ON banners(target_category_id);

-- SEO URL Redirects
CREATE TABLE IF NOT EXISTS seo_redirects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    old_url VARCHAR(500) NOT NULL,
    new_url VARCHAR(500) NOT NULL,
    type VARCHAR(20) DEFAULT '301', -- '301', '302'
    
    -- Tracking
    hit_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seo_redirects_old_url ON seo_redirects(old_url);
CREATE INDEX idx_seo_redirects_active ON seo_redirects(is_active) WHERE is_active = TRUE;

-- SEO URL Rewrites
CREATE TABLE IF NOT EXISTS seo_url_rewrites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_path VARCHAR(500) UNIQUE NOT NULL,
    target_path VARCHAR(500) NOT NULL,
    entity_type VARCHAR(30), -- 'product', 'category', 'page', 'cms_page'
    entity_id UUID,
    is_custom BOOLEAN DEFAULT FALSE, -- User-defined vs auto-generated
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seo_rewrites_request_path ON seo_url_rewrites(request_path);
CREATE INDEX idx_seo_rewrites_entity ON seo_url_rewrites(entity_type, entity_id);

-- Tax Rules
CREATE TABLE IF NOT EXISTS tax_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Tax calculation
    rate DECIMAL(5,4) NOT NULL, -- 0.1000 = 10%
    type VARCHAR(20) DEFAULT 'percentage', -- 'percentage', 'fixed'
    fixed_amount DECIMAL(10,2),
    
    -- Applicability
    apply_to VARCHAR(20) DEFAULT 'subtotal', -- 'subtotal', 'shipping', 'both'
    product_types TEXT[], -- 'physical', 'digital', 'services'
    customer_types TEXT[], -- 'individual', 'business'
    
    -- Geolocation rules
    country_code VARCHAR(2),
    state_code VARCHAR(10),
    city VARCHAR(100),
    postal_code_pattern VARCHAR(20), -- Regex pattern for postal codes
    
    -- Conditions
    min_order_amount DECIMAL(10,2),
    max_order_amount DECIMAL(10,2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- Higher priority = applied first
    
    -- Metadata
    tax_category VARCHAR(50), -- 'standard', 'reduced', 'zero', 'exempt'
    vat_number_required BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tax_rules_country ON tax_rules(country_code);
CREATE INDEX idx_tax_rules_active ON tax_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_tax_rules_priority ON tax_rules(priority DESC);

-- Tax Zones (Group of tax rules)
CREATE TABLE IF NOT EXISTS tax_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Geographic boundaries
    country_codes TEXT[],
    state_codes TEXT[],
    postal_code_patterns TEXT[],
    
    -- Default tax for this zone
    default_tax_rate DECIMAL(5,4) DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tax_zones_code ON tax_zones(code);

-- Tax Zone Rules (Link zones to specific rules)
CREATE TABLE IF NOT EXISTS tax_zone_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES tax_zones(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES tax_rules(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(zone_id, rule_id)
);

-- Currency Rates
CREATE TABLE IF NOT EXISTS currency_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15,6) NOT NULL,
    source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'ecb', 'fixer', 'open_exchange'
    
    -- Rates fetched at
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(base_currency, target_currency)
);

CREATE INDEX idx_currency_rates_base ON currency_rates(base_currency);
CREATE INDEX idx_currency_rates_target ON currency_rates(target_currency);
CREATE INDEX idx_currency_rates_active ON currency_rates(is_active) WHERE is_active = TRUE;

-- Fraud Detection Rules
CREATE TABLE IF NOT EXISTS fraud_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Rule conditions
    type VARCHAR(30) NOT NULL, -- 'velocity', 'amount', 'address', 'device', 'behavior', 'list'
    condition JSONB NOT NULL, -- Rule-specific conditions
    
    -- Scoring
    score_impact INTEGER NOT NULL, -- Points to add/subtract from risk score
    action VARCHAR(30) DEFAULT 'review', -- 'allow', 'review', 'block', '3ds', 'captcha'
    
    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    
    -- Performance tracking
    triggered_count INTEGER DEFAULT 0,
    false_positive_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fraud_rules_type ON fraud_rules(type);
CREATE INDEX idx_fraud_rules_active ON fraud_rules(is_active) WHERE is_active = TRUE;

-- Risk Scores (Per order/user)
CREATE TABLE IF NOT EXISTS risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL, -- 'order', 'user', 'payment'
    entity_id UUID NOT NULL,
    
    -- Scoring
    total_score INTEGER NOT NULL, -- 0-100
    risk_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
    
    -- Factors
    factors JSONB, -- [{rule_id, score_impact, description}]
    
    -- Decision
    recommendation VARCHAR(20), -- 'approve', 'review', 'decline'
    decision VARCHAR(20), -- 'approved', 'reviewing', 'declined'
    decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    decision_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_scores_entity ON risk_scores(entity_type, entity_id);
CREATE INDEX idx_risk_scores_level ON risk_scores(risk_level);
CREATE INDEX idx_risk_scores_decision ON risk_scores(decision);

-- Fraud Lists (Blacklist/Whitelist)
CREATE TABLE IF NOT EXISTS fraud_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL, -- 'blacklist', 'whitelist', 'greylist', 'watchlist'
    
    -- Item details
    value_type VARCHAR(30) NOT NULL, -- 'email', 'phone', 'ip', 'card_bin', 'device_id', 'address'
    value VARCHAR(255) NOT NULL,
    
    -- Metadata
    reason TEXT,
    source VARCHAR(50), -- 'manual', 'system', 'chargeback', 'external'
    external_reference VARCHAR(100),
    
    -- Expiry
    expires_at TIMESTAMPTZ,
    
    -- Tracking
    hit_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMPTZ,
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(type, value_type, value)
);

CREATE INDEX idx_fraud_lists_type ON fraud_lists(type);
CREATE INDEX idx_fraud_lists_value ON fraud_lists(value);
CREATE INDEX idx_fraud_lists_expiry ON fraud_lists(expires_at);

-- Chat Sessions (Live support)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) UNIQUE NOT NULL,
    
    -- Participants
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    guest_email VARCHAR(255),
    guest_name VARCHAR(100),
    
    -- Assignment
    assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    team_id UUID, -- Support team/category
    
    -- Status
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'active', 'resolved', 'closed', 'transferred'
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    
    -- Context
    page_url TEXT,
    referrer_url TEXT,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    agent_joined_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Satisfaction
    customer_rating INTEGER, -- 1-5
    customer_feedback TEXT,
    
    -- Metadata
    user_agent TEXT,
    ip_address INET,
    tags TEXT[]
);

CREATE INDEX idx_chat_sessions_customer ON chat_sessions(customer_id);
CREATE INDEX idx_chat_sessions_agent ON chat_sessions(assigned_agent_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_started ON chat_sessions(started_at);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    
    sender_type VARCHAR(20) NOT NULL, -- 'customer', 'agent', 'system', 'bot'
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file', 'product', 'order'
    
    -- Attachments
    attachments JSONB, -- [{url, type, name, size}]
    
    -- System messages
    action_type VARCHAR(30), -- 'transfer', 'resolve', 'close', 'assign', 'join'
    action_data JSONB,
    
    -- Read status
    read_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- Support Quick Responses (Canned responses)
CREATE TABLE IF NOT EXISTS support_quick_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Content
    shortcut VARCHAR(50) NOT NULL, -- /refund, /shipping, etc.
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    
    -- Categorization
    category VARCHAR(50), -- 'orders', 'returns', 'products', 'billing', 'general'
    tags TEXT[],
    
    -- Personalization
    variables JSONB, -- Available variables like {customer_name}, {order_number}
    
    -- Visibility
    is_active BOOLEAN DEFAULT TRUE,
    is_personal BOOLEAN DEFAULT FALSE, -- Personal to agent vs shared
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Usage
    use_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quick_responses_category ON support_quick_responses(category);
CREATE INDEX idx_quick_responses_shortcut ON support_quick_responses(shortcut);

-- Update categories table with additional fields
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS meta_title VARCHAR(100),
    ADD COLUMN IF NOT EXISTS meta_description VARCHAR(300),
    ADD COLUMN IF NOT EXISTS meta_keywords TEXT[],
    ADD COLUMN IF NOT EXISTS banner_image_url TEXT,
    ADD COLUMN IF NOT EXISTS icon_url TEXT,
    ADD COLUMN IF NOT EXISTS display_mode VARCHAR(20) DEFAULT 'products', -- 'products', 'subcategories', 'both'
    ADD COLUMN IF NOT EXISTS default_sort VARCHAR(30) DEFAULT 'featured',
    ADD COLUMN IF NOT EXISTS filters JSONB, -- Available filter attributes
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS featured_sort_order INTEGER;

-- Triggers
CREATE TRIGGER update_cms_pages_updated_at BEFORE UPDATE ON cms_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_blocks_updated_at BEFORE UPDATE ON cms_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON banners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_url_rewrites_updated_at BEFORE UPDATE ON seo_url_rewrites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_rules_updated_at BEFORE UPDATE ON tax_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_zones_updated_at BEFORE UPDATE ON tax_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_currency_rates_updated_at BEFORE UPDATE ON currency_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fraud_rules_updated_at BEFORE UPDATE ON fraud_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fraud_lists_updated_at BEFORE UPDATE ON fraud_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_quick_responses_updated_at BEFORE UPDATE ON support_quick_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions
CREATE OR REPLACE FUNCTION update_banner_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE banners SET impression_count = impression_count + 1 WHERE id = NEW.banner_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Indexes for common queries
CREATE INDEX idx_cms_pages_footer ON cms_pages(show_in_footer, footer_position) WHERE show_in_footer = TRUE;
CREATE INDEX idx_cms_pages_header ON cms_pages(show_in_header, header_position) WHERE show_in_header = TRUE;

COMMENT ON TABLE cms_pages IS 'Static content pages with rich editor support';
COMMENT ON TABLE banners IS 'Promotional banners with scheduling and targeting';
COMMENT ON TABLE tax_rules IS 'Complex tax calculation rules by geography';
COMMENT ON TABLE fraud_rules IS 'Automated fraud detection rules';
COMMENT ON TABLE chat_sessions IS 'Live chat support sessions';
