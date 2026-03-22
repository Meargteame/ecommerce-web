-- Migration 019: Advertising Platform and Advanced Marketing
-- Adds: Sponsored products, advertising campaigns, coupons, deals

-- Advertising Campaigns
CREATE TABLE IF NOT EXISTS advertising_campaigns (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
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
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NULL,
    day_parting JSON, -- {monday: [{start: '09:00', end: '17:00'}], ...}
    
    -- Performance
    total_impressions INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_sales DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ac_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT 'Pay-per-click advertising campaigns';

CREATE INDEX idx_ad_campaigns_seller_id ON advertising_campaigns(seller_id);
CREATE INDEX idx_ad_campaigns_status ON advertising_campaigns(status);
CREATE INDEX idx_ad_campaigns_type ON advertising_campaigns(type);

-- Ad Groups (within campaigns)
CREATE TABLE IF NOT EXISTS ad_groups (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    default_bid DECIMAL(8,4) NOT NULL,
    
    -- Targeting settings
    match_type VARCHAR(20) DEFAULT 'broad', -- 'broad', 'phrase', 'exact'
    negative_keywords JSON, -- Changed from TEXT[] to JSON
    negative_product_ids JSON, -- Changed from UUID[] to JSON
    
    -- Placement settings
    placement_strategy JSON, -- {top_of_search: 1.5, product_pages: 1.0, rest_of_search: 0.5}
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ag_campaign_id FOREIGN KEY (campaign_id) REFERENCES advertising_campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_ad_groups_campaign_id ON ad_groups(campaign_id);

-- Ad Group Products (what products are advertised)
CREATE TABLE IF NOT EXISTS ad_group_products (
    id CHAR(36) PRIMARY KEY,
    ad_group_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    custom_bid DECIMAL(8,4),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused'
    is_eligible BOOLEAN DEFAULT TRUE, -- Based on buy box, inventory, etc.
    ineligibility_reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_agp_ad_group_id FOREIGN KEY (ad_group_id) REFERENCES ad_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_agp_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_ad_group_products_ad_group_id ON ad_group_products(ad_group_id);
CREATE INDEX idx_ad_group_products_product_id ON ad_group_products(product_id);

-- Ad Keywords (for keyword targeting)
CREATE TABLE IF NOT EXISTS ad_keywords (
    id CHAR(36) PRIMARY KEY,
    ad_group_id CHAR(36) NOT NULL,
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
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(ad_group_id, keyword, match_type),
    CONSTRAINT fk_ak_ad_group_id FOREIGN KEY (ad_group_id) REFERENCES ad_groups(id) ON DELETE CASCADE
);

CREATE INDEX idx_ad_keywords_ad_group_id ON ad_keywords(ad_group_id);
CREATE INDEX idx_ad_keywords_keyword ON ad_keywords(keyword);

-- Ad Search Terms (what customers actually searched)
CREATE TABLE IF NOT EXISTS ad_search_terms (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36) NOT NULL,
    ad_group_id CHAR(36) NOT NULL,
    search_term VARCHAR(255) NOT NULL,
    keyword_id CHAR(36),
    
    -- Match info
    matched_keyword VARCHAR(255),
    match_type VARCHAR(20),
    
    -- Performance
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    sales DECIMAL(10,2) DEFAULT 0,
    
    `date` DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, search_term, `date`),
    CONSTRAINT fk_ast_campaign_id FOREIGN KEY (campaign_id) REFERENCES advertising_campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_ast_ad_group_id FOREIGN KEY (ad_group_id) REFERENCES ad_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_ast_keyword_id FOREIGN KEY (keyword_id) REFERENCES ad_keywords(id) ON DELETE SET NULL
);

CREATE INDEX idx_ad_search_terms_campaign_id ON ad_search_terms(campaign_id);
CREATE INDEX idx_ad_search_terms_date ON ad_search_terms(`date`);

-- Ad Daily Performance
CREATE TABLE IF NOT EXISTS ad_daily_performance (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36) NOT NULL,
    ad_group_id CHAR(36),
    product_id CHAR(36),
    
    `date` DATE NOT NULL,
    
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
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, ad_group_id, product_id, `date`),
    CONSTRAINT fk_adp_campaign_id FOREIGN KEY (campaign_id) REFERENCES advertising_campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_adp_ad_group_id FOREIGN KEY (ad_group_id) REFERENCES ad_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_adp_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_ad_daily_performance_campaign_id ON ad_daily_performance(campaign_id);
CREATE INDEX idx_ad_daily_performance_date ON ad_daily_performance(`date`);

-- Sponsored Brands (Headline Search Ads)
CREATE TABLE IF NOT EXISTS sponsored_brand_ads (
    id CHAR(36) PRIMARY KEY,
    campaign_id CHAR(36) NOT NULL,
    
    -- Creative
    headline VARCHAR(100) NOT NULL,
    logo_url TEXT,
    custom_image_url TEXT,
    
    -- Landing
    landing_page_type VARCHAR(30) DEFAULT 'store', -- 'store', 'product_list', 'custom_url'
    landing_page_url TEXT,
    
    -- Products featured (up to 3)
    featured_product_ids JSON, -- Changed from UUID[] to JSON
    
    -- Performance
    brand_store_views INTEGER DEFAULT 0,
    new_to_brand_customers INTEGER DEFAULT 0,
    new_to_brand_sales DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sba_campaign_id FOREIGN KEY (campaign_id) REFERENCES advertising_campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_sponsored_brand_ads_campaign_id ON sponsored_brand_ads(campaign_id);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    
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
    category_id CHAR(36),
    product_ids JSON, -- Changed from UUID[] to JSON
    exclude_discounted_products BOOLEAN DEFAULT TRUE,
    
    -- Limits
    usage_limit_per_customer INTEGER DEFAULT 1,
    total_usage_limit INTEGER,
    total_used INTEGER DEFAULT 0,
    
    -- Schedule
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'active', 'paused', 'expired'
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Performance
    budget DECIMAL(10,2),
    budget_spent DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_c_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_c_category_id FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) COMMENT 'Discount coupons and promotional codes';

CREATE INDEX idx_coupons_seller_id ON coupons(seller_id);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_status ON coupons(status);

-- Coupon Usage
CREATE TABLE IF NOT EXISTS coupon_usage (
    id CHAR(36) PRIMARY KEY,
    coupon_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    order_id CHAR(36) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cu_coupon_id FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    CONSTRAINT fk_cu_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cu_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user_id ON coupon_usage(user_id);

-- Lightning Deals / Flash Sales
CREATE TABLE IF NOT EXISTS lightning_deals (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    
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
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending_review', -- 'pending_review', 'approved', 'rejected', 'active', 'ended', 'cancelled'
    rejection_reason TEXT,
    
    -- Performance
    waitlist_count INTEGER DEFAULT 0,
    
    -- Review
    reviewed_by CHAR(36),
    reviewed_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(product_id, variant_id, start_time),
    CONSTRAINT fk_ld_seller_id FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ld_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_ld_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ld_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) COMMENT 'Time-limited flash sales with limited inventory';

CREATE INDEX idx_lightning_deals_seller_id ON lightning_deals(seller_id);
CREATE INDEX idx_lightning_deals_status ON lightning_deals(status);
CREATE INDEX idx_lightning_deals_active_time ON lightning_deals(start_time, end_time);

-- Lightning Deal Waitlist
CREATE TABLE IF NOT EXISTS lightning_deal_waitlist (
    id CHAR(36) PRIMARY KEY,
    deal_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    notification_sent BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(deal_id, user_id),
    CONSTRAINT fk_ldw_deal_id FOREIGN KEY (deal_id) REFERENCES lightning_deals(id) ON DELETE CASCADE,
    CONSTRAINT fk_ldw_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_lightning_deal_waitlist_deal_id ON lightning_deal_waitlist(deal_id);

-- Store/Brand Pages
CREATE TABLE IF NOT EXISTS seller_stores (
    id CHAR(36) PRIMARY KEY,
    seller_id CHAR(36) NOT NULL,
    
    -- Store customization
    store_name VARCHAR(200) NOT NULL,
    headline VARCHAR(200),
    description TEXT,
    
    -- Branding
    logo_url TEXT,
    hero_image_url TEXT,
    banner_images JSON, -- Changed from TEXT[] to JSON
    
    -- Theme
    primary_color VARCHAR(7) DEFAULT '#000000',
    secondary_color VARCHAR(7) DEFAULT '#FFFFFF',
    font_family VARCHAR(50) DEFAULT 'Inter',
    
    -- Layout
    layout_template VARCHAR(50) DEFAULT 'standard', -- 'standard', 'featured', 'grid', 'carousel'
    featured_products JSON, -- Changed from UUID[] to JSON
    featured_categories JSON, -- Changed from UUID[] to JSON
    
    -- SEO
    meta_title VARCHAR(100),
    meta_description VARCHAR(300),
    slug VARCHAR(255) UNIQUE,
    
    -- Status
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP NULL,
    
    -- Analytics
    total_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ss_seller_id FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE
) COMMENT 'Custom brand/store pages for sellers';

CREATE INDEX idx_seller_stores_seller_id ON seller_stores(seller_id);
CREATE INDEX idx_seller_stores_slug ON seller_stores(slug);

-- Store Page Modules (Custom content blocks)
CREATE TABLE IF NOT EXISTS store_page_modules (
    id CHAR(36) PRIMARY KEY,
    store_id CHAR(36) NOT NULL,
    
    type VARCHAR(30) NOT NULL, -- 'hero', 'product_grid', 'text', 'image', 'video', 'carousel', 'category_grid'
    title VARCHAR(200),
    content JSON, -- Type-specific content
    
    -- Styling
    background_color VARCHAR(7),
    text_color VARCHAR(7),
    padding VARCHAR(20),
    
    -- Layout
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_spm_store_id FOREIGN KEY (store_id) REFERENCES seller_stores(id) ON DELETE CASCADE
);

CREATE INDEX idx_store_modules_store_id ON store_page_modules(store_id);
CREATE INDEX idx_store_modules_sort_order ON store_page_modules(sort_order);
