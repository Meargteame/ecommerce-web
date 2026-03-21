-- Migration 019: Advertising Platform and Advanced Marketing
-- Adds: Sponsored products, advertising campaigns, coupons, deals

-- Advertising Campaigns
CREATE TABLE IF NOT EXISTS advertising_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'sponsored_products', 'sponsored_brands', 'sponsored_display', 'stores'
    status VARCHAR(20) DEFAULT 'paused', -- 'active', 'paused', 'ended', 'archived'
    
    -- Budget settings
    daily_budget DECIMAL(10,2) NOT NULL,
    total_budget DECIMAL(10,2),
    spent_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Bidding strategy
    bidding_strategy VARCHAR(20) DEFAULT 'manual', -- 'manual', 'automatic', 'enhanced'
    default_bid DECIMAL(8,4) NOT NULL, -- Cost per click
    
    -- Targeting
    targeting_type VARCHAR(20) DEFAULT 'keyword', -- 'keyword', 'product', 'category', 'audience', 'automatic'
    
    -- Schedule
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    day_parting JSONB, -- {monday: [{start: '09:00', end: '17:00'}], ...}
    
    -- Performance
    total_impressions INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_sales DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ad_campaigns_seller_id ON advertising_campaigns(seller_id);
CREATE INDEX idx_ad_campaigns_status ON advertising_campaigns(status);
CREATE INDEX idx_ad_campaigns_type ON advertising_campaigns(type);

-- Ad Groups (within campaigns)
CREATE TABLE IF NOT EXISTS ad_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES advertising_campaigns(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    default_bid DECIMAL(8,4) NOT NULL,
    
    -- Targeting settings
    match_type VARCHAR(20) DEFAULT 'broad', -- 'broad', 'phrase', 'exact'
    negative_keywords TEXT[],
    negative_product_ids UUID[],
    
    -- Placement settings
    placement_strategy JSONB, -- {top_of_search: 1.5, product_pages: 1.0, rest_of_search: 0.5}
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ad_groups_campaign_id ON ad_groups(campaign_id);

-- Ad Group Products (what products are advertised)
CREATE TABLE IF NOT EXISTS ad_group_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_group_id UUID NOT NULL REFERENCES ad_groups(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    custom_bid DECIMAL(8,4),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused'
    is_eligible BOOLEAN DEFAULT TRUE, -- Based on buy box, inventory, etc.
    ineligibility_reason VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ad_group_products_ad_group_id ON ad_group_products(ad_group_id);
CREATE INDEX idx_ad_group_products_product_id ON ad_group_products(product_id);

-- Ad Keywords (for keyword targeting)
CREATE TABLE IF NOT EXISTS ad_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_group_id UUID NOT NULL REFERENCES ad_groups(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    match_type VARCHAR(20) NOT NULL, -- 'exact', 'phrase', 'broad'
    bid DECIMAL(8,4),
    status VARCHAR(20) DEFAULT 'active',
    
    -- Performance metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    sales DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ad_group_id, keyword, match_type)
);

CREATE INDEX idx_ad_keywords_ad_group_id ON ad_keywords(ad_group_id);
CREATE INDEX idx_ad_keywords_keyword ON ad_keywords(keyword);

-- Ad Search Terms (what customers actually searched)
CREATE TABLE IF NOT EXISTS ad_search_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES advertising_campaigns(id) ON DELETE CASCADE,
    ad_group_id UUID NOT NULL REFERENCES ad_groups(id) ON DELETE CASCADE,
    search_term VARCHAR(255) NOT NULL,
    keyword_id UUID REFERENCES ad_keywords(id) ON DELETE SET NULL,
    
    -- Match info
    matched_keyword VARCHAR(255),
    match_type VARCHAR(20),
    
    -- Performance
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    sales DECIMAL(10,2) DEFAULT 0,
    
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, search_term, date)
);

CREATE INDEX idx_ad_search_terms_campaign_id ON ad_search_terms(campaign_id);
CREATE INDEX idx_ad_search_terms_date ON ad_search_terms(date);

-- Ad Daily Performance
CREATE TABLE IF NOT EXISTS ad_daily_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES advertising_campaigns(id) ON DELETE CASCADE,
    ad_group_id UUID REFERENCES ad_groups(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    date DATE NOT NULL,
    
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    ctr DECIMAL(6,4) DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    cpc DECIMAL(8,4) DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(6,4) DEFAULT 0,
    sales DECIMAL(10,2) DEFAULT 0,
    acos DECIMAL(6,4) DEFAULT 0, -- Advertising Cost of Sales (spend/sales)
    roas DECIMAL(6,2) DEFAULT 0, -- Return on Ad Spend (sales/spend)
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, ad_group_id, product_id, date)
);

CREATE INDEX idx_ad_daily_performance_campaign_id ON ad_daily_performance(campaign_id);
CREATE INDEX idx_ad_daily_performance_date ON ad_daily_performance(date);

-- Sponsored Brands (Headline Search Ads)
CREATE TABLE IF NOT EXISTS sponsored_brand_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES advertising_campaigns(id) ON DELETE CASCADE,
    
    -- Creative
    headline VARCHAR(100) NOT NULL,
    logo_url TEXT,
    custom_image_url TEXT,
    
    -- Landing
    landing_page_type VARCHAR(30) DEFAULT 'store', -- 'store', 'product_list', 'custom_url'
    landing_page_url TEXT,
    
    -- Products featured (up to 3)
    featured_product_ids UUID[],
    
    -- Performance
    brand_store_views INTEGER DEFAULT 0,
    new_to_brand_customers INTEGER DEFAULT 0,
    new_to_brand_sales DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sponsored_brand_ads_campaign_id ON sponsored_brand_ads(campaign_id);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Coupon details
    code VARCHAR(50), -- NULL for automatic coupons (clip & save)
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Discount settings
    type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping'
    discount_value DECIMAL(10,2) NOT NULL, -- Percentage or amount
    min_purchase_amount DECIMAL(10,2) DEFAULT 0,
    max_discount_amount DECIMAL(10,2),
    
    -- Eligibility
    apply_to VARCHAR(20) DEFAULT 'all', -- 'all', 'category', 'products'
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    product_ids UUID[],
    exclude_discounted_products BOOLEAN DEFAULT TRUE,
    
    -- Limits
    usage_limit_per_customer INTEGER DEFAULT 1,
    total_usage_limit INTEGER,
    total_used INTEGER DEFAULT 0,
    
    -- Schedule
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'active', 'paused', 'expired'
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Performance
    budget DECIMAL(10,2),
    budget_spent DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coupons_seller_id ON coupons(seller_id);
CREATE INDEX idx_coupons_code ON coupons(code) WHERE code IS NOT NULL;
CREATE INDEX idx_coupons_status ON coupons(status);

-- Coupon Usage
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user_id ON coupon_usage(user_id);

-- Lightning Deals / Flash Sales
CREATE TABLE IF NOT EXISTS lightning_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    
    -- Deal details
    original_price DECIMAL(10,2) NOT NULL,
    deal_price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) GENERATED ALWAYS AS 
        (ROUND((original_price - deal_price) / original_price * 100, 2)) STORED,
    
    -- Inventory
    quantity_available INTEGER NOT NULL,
    quantity_claimed INTEGER DEFAULT 0,
    quantity_sold INTEGER DEFAULT 0,
    max_quantity_per_customer INTEGER DEFAULT 1,
    
    -- Schedule
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending_review', -- 'pending_review', 'approved', 'rejected', 'active', 'ended', 'cancelled'
    rejection_reason TEXT,
    
    -- Performance
    waitlist_count INTEGER DEFAULT 0,
    
    -- Review
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, variant_id, start_time)
);

CREATE INDEX idx_lightning_deals_seller_id ON lightning_deals(seller_id);
CREATE INDEX idx_lightning_deals_status ON lightning_deals(status);
CREATE INDEX idx_lightning_deals_active_time ON lightning_deals(start_time, end_time) WHERE status = 'active';

-- Lightning Deal Waitlist
CREATE TABLE IF NOT EXISTS lightning_deal_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES lightning_deals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_sent BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id, user_id)
);

CREATE INDEX idx_lightning_deal_waitlist_deal_id ON lightning_deal_waitlist(deal_id);

-- Store/Brand Pages
CREATE TABLE IF NOT EXISTS seller_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
    
    -- Store customization
    store_name VARCHAR(200) NOT NULL,
    headline VARCHAR(200),
    description TEXT,
    
    -- Branding
    logo_url TEXT,
    hero_image_url TEXT,
    banner_images TEXT[],
    
    -- Theme
    primary_color VARCHAR(7) DEFAULT '#000000',
    secondary_color VARCHAR(7) DEFAULT '#FFFFFF',
    font_family VARCHAR(50) DEFAULT 'Inter',
    
    -- Layout
    layout_template VARCHAR(50) DEFAULT 'standard', -- 'standard', 'featured', 'grid', 'carousel'
    featured_products UUID[],
    featured_categories UUID[],
    
    -- SEO
    meta_title VARCHAR(100),
    meta_description VARCHAR(300),
    slug VARCHAR(255) UNIQUE,
    
    -- Status
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    
    -- Analytics
    total_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seller_stores_seller_id ON seller_stores(seller_id);
CREATE INDEX idx_seller_stores_slug ON seller_stores(slug) WHERE slug IS NOT NULL;

-- Store Page Modules (Custom content blocks)
CREATE TABLE IF NOT EXISTS store_page_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES seller_stores(id) ON DELETE CASCADE,
    
    type VARCHAR(30) NOT NULL, -- 'hero', 'product_grid', 'text', 'image', 'video', 'carousel', 'category_grid'
    title VARCHAR(200),
    content JSONB, -- Type-specific content
    
    -- Styling
    background_color VARCHAR(7),
    text_color VARCHAR(7),
    padding VARCHAR(20),
    
    -- Layout
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_store_modules_store_id ON store_page_modules(store_id);
CREATE INDEX idx_store_modules_sort_order ON store_page_modules(sort_order);

-- Triggers
CREATE TRIGGER update_ad_campaigns_updated_at BEFORE UPDATE ON advertising_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_groups_updated_at BEFORE UPDATE ON ad_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_keywords_updated_at BEFORE UPDATE ON ad_keywords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lightning_deals_updated_at BEFORE UPDATE ON lightning_deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_stores_updated_at BEFORE UPDATE ON seller_stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_page_modules_updated_at BEFORE UPDATE ON store_page_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE advertising_campaigns IS 'Pay-per-click advertising campaigns';
COMMENT ON TABLE coupons IS 'Discount coupons and promotional codes';
COMMENT ON TABLE lightning_deals IS 'Time-limited flash sales with limited inventory';
COMMENT ON TABLE seller_stores IS 'Custom brand/store pages for sellers';
