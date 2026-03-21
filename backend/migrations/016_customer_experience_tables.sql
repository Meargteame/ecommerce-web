-- Migration 016: Complete Customer Experience Enhancement
-- Adds: Shopping lists, Save for later, Product Q&A, Payment methods, Gift cards, Price alerts, Back-in-stock alerts

-- Shopping Lists (Multiple named wishlists)
CREATE TABLE IF NOT EXISTS shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(64) UNIQUE,
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX idx_shopping_lists_share_token ON shopping_lists(share_token) WHERE share_token IS NOT NULL;

-- Shopping List Items
CREATE TABLE IF NOT EXISTS shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    priority INTEGER DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(list_id, product_id, variant_id)
);

CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(list_id);
CREATE INDEX idx_shopping_list_items_product_id ON shopping_list_items(product_id);

-- Saved for Later (Cart extension)
CREATE TABLE IF NOT EXISTS saved_for_later (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 1,
    price_at_save DECIMAL(10,2),
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id, variant_id)
);

CREATE INDEX idx_saved_for_later_user_id ON saved_for_later(user_id);

-- Product Questions (Q&A)
CREATE TABLE IF NOT EXISTS product_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    votes INTEGER DEFAULT 0,
    is_answered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_questions_product_id ON product_questions(product_id);
CREATE INDEX idx_product_questions_user_id ON product_questions(user_id);

-- Product Answers
CREATE TABLE IF NOT EXISTS product_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES product_questions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES seller_profiles(id) ON DELETE SET NULL,
    answer TEXT NOT NULL,
    is_official BOOLEAN DEFAULT FALSE,
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_answers_question_id ON product_answers(question_id);

-- Payment Methods (Stored securely)
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'card', 'paypal', 'apple_pay', 'google_pay', 'cod'
    provider VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', etc.
    provider_token VARCHAR(255), -- Encrypted token from provider
    last_four VARCHAR(4),
    brand VARCHAR(50), -- 'visa', 'mastercard', etc.
    expiry_month INTEGER,
    expiry_year INTEGER,
    holder_name VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    billing_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);

-- Gift Cards
CREATE TABLE IF NOT EXISTS gift_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'digital', -- 'digital', 'physical'
    initial_balance DECIMAL(10,2) NOT NULL,
    current_balance DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'redeemed', 'expired', 'cancelled'
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255),
    recipient_name VARCHAR(100),
    message TEXT,
    expires_at TIMESTAMPTZ,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gift_cards_code ON gift_cards(code);
CREATE INDEX idx_gift_cards_recipient_id ON gift_cards(recipient_id);
CREATE INDEX idx_gift_cards_sender_id ON gift_cards(sender_id);

-- Gift Card Transactions
CREATE TABLE IF NOT EXISTS gift_card_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'purchase', 'redemption', 'refund', 'adjustment'
    amount DECIMAL(10,2) NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gift_card_transactions_card_id ON gift_card_transactions(gift_card_id);

-- Loyalty Points
CREATE TABLE IF NOT EXISTS loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    available_points INTEGER DEFAULT 0,
    pending_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
    tier_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_loyalty_points_user_id ON loyalty_points(user_id);
CREATE INDEX idx_loyalty_points_tier ON loyalty_points(tier);

-- Loyalty Points Transactions
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'earn', 'redeem', 'expire', 'adjustment', 'bonus'
    points INTEGER NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    description TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);

-- Price Alerts
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    target_price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMPTZ,
    triggered_price DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_product_id ON price_alerts(product_id);
CREATE INDEX idx_price_alerts_active ON price_alerts(is_active) WHERE is_active = TRUE;

-- Back in Stock Alerts
CREATE TABLE IF NOT EXISTS back_in_stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id, variant_id)
);

CREATE INDEX idx_back_in_stock_user_id ON back_in_stock_alerts(user_id);
CREATE INDEX idx_back_in_stock_product_id ON back_in_stock_alerts(product_id);
CREATE INDEX idx_back_in_stock_active ON back_in_stock_alerts(is_active) WHERE is_active = TRUE;

-- Product Comparison Sets
CREATE TABLE IF NOT EXISTS product_comparison_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(128), -- For guest comparisons
    name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX idx_comparison_sets_user_id ON product_comparison_sets(user_id);
CREATE INDEX idx_comparison_sets_session ON product_comparison_sets(session_id);

-- Product Comparison Items
CREATE TABLE IF NOT EXISTS product_comparison_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID NOT NULL REFERENCES product_comparison_sets(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(set_id, product_id)
);

CREATE INDEX idx_comparison_items_set_id ON product_comparison_items(set_id);

-- Update existing tables
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS loyalty_points_balance INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(20) DEFAULT 'bronze',
    ADD COLUMN IF NOT EXISTS gift_card_balance DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS store_credit DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS preferred_payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN DEFAULT FALSE;

-- Notification Preferences (granular)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'whatsapp'
    type VARCHAR(50) NOT NULL, -- 'order_updates', 'promotions', 'price_alerts', etc.
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, channel, type)
);

CREATE INDEX idx_notification_prefs_user_id ON notification_preferences(user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_questions_updated_at BEFORE UPDATE ON product_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_answers_updated_at BEFORE UPDATE ON product_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gift_cards_updated_at BEFORE UPDATE ON gift_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_points_updated_at BEFORE UPDATE ON loyalty_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_prefs_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update shopping list item count
CREATE OR REPLACE FUNCTION update_shopping_list_item_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE shopping_lists SET item_count = item_count + 1 WHERE id = NEW.list_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE shopping_lists SET item_count = item_count - 1 WHERE id = OLD.list_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopping_list_item_count_trigger
    AFTER INSERT OR DELETE ON shopping_list_items
    FOR EACH ROW EXECUTE FUNCTION update_shopping_list_item_count();

-- Function to mark question as answered
CREATE OR REPLACE FUNCTION mark_question_answered()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE product_questions SET is_answered = TRUE WHERE id = NEW.question_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER answer_inserted_trigger
    AFTER INSERT ON product_answers
    FOR EACH ROW EXECUTE FUNCTION mark_question_answered();

COMMENT ON TABLE shopping_lists IS 'Multiple named wishlists per user';
COMMENT ON TABLE saved_for_later IS 'Items saved from cart for later purchase';
COMMENT ON TABLE product_questions IS 'Customer questions about products';
COMMENT ON TABLE payment_methods IS 'Stored payment methods for one-click checkout';
COMMENT ON TABLE gift_cards IS 'Gift cards with balance tracking';
COMMENT ON TABLE loyalty_points IS 'Customer loyalty program points';
COMMENT ON TABLE price_alerts IS 'Price drop notifications';
