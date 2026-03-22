-- Migration 016: Complete Customer Experience Enhancement
-- Adds: Shopping lists, Save for later, Product Q&A, Payment methods, Gift cards, Price alerts, Back-in-stock alerts

-- Shopping Lists (Multiple named wishlists)
CREATE TABLE IF NOT EXISTS shopping_lists (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(64) UNIQUE,
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(user_id, name),
    CONSTRAINT fk_sl_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT 'Multiple named wishlists per user';

CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX idx_shopping_lists_share_token ON shopping_lists(share_token);

-- Shopping List Items
CREATE TABLE IF NOT EXISTS shopping_list_items (
    id CHAR(36) PRIMARY KEY,
    list_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    priority INTEGER DEFAULT 0,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(list_id, product_id, variant_id),
    CONSTRAINT fk_sli_list_id FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE,
    CONSTRAINT fk_sli_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_sli_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(list_id);
CREATE INDEX idx_shopping_list_items_product_id ON shopping_list_items(product_id);

-- Saved for Later (Cart extension)
CREATE TABLE IF NOT EXISTS saved_for_later (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    quantity INTEGER DEFAULT 1,
    price_at_save DECIMAL(10,2),
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id, variant_id),
    CONSTRAINT fk_sfl_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sfl_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_sfl_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
) COMMENT 'Items saved from cart for later purchase';

CREATE INDEX idx_saved_for_later_user_id ON saved_for_later(user_id);

-- Product Questions (Q&A)
CREATE TABLE IF NOT EXISTS product_questions (
    id CHAR(36) PRIMARY KEY,
    product_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    question TEXT NOT NULL,
    votes INTEGER DEFAULT 0,
    is_answered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pq_product_id_v2 FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_pq_user_id_v2 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT 'Customer questions about products';

CREATE INDEX idx_product_questions_product_id_v2 ON product_questions(product_id);
CREATE INDEX idx_product_questions_user_id_v2 ON product_questions(user_id);

-- Product Answers
CREATE TABLE IF NOT EXISTS product_answers (
    id CHAR(36) PRIMARY KEY,
    question_id CHAR(36) NOT NULL,
    user_id CHAR(36),
    seller_id CHAR(36),
    answer TEXT NOT NULL,
    is_official BOOLEAN DEFAULT FALSE,
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pa_question_id_v2 FOREIGN KEY (question_id) REFERENCES product_questions(id) ON DELETE CASCADE,
    CONSTRAINT fk_pa_user_id_v2 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_pa_seller_id FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_product_answers_question_id_v2 ON product_answers(question_id);

-- Payment Methods (Stored securely)
CREATE TABLE IF NOT EXISTS payment_methods (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'card', 'paypal', 'apple_pay', 'google_pay', 'cod'
    provider VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', etc.
    provider_token VARCHAR(255), -- Encrypted token from provider
    last_four VARCHAR(4),
    brand VARCHAR(50), -- 'visa', 'mastercard', etc.
    expiry_month INTEGER,
    expiry_year INTEGER,
    holder_name VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    billing_address_id CHAR(36),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pm_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_pm_address_id FOREIGN KEY (billing_address_id) REFERENCES addresses(id) ON DELETE SET NULL
) COMMENT 'Stored payment methods for one-click checkout';

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);

-- Gift Cards
CREATE TABLE IF NOT EXISTS gift_cards (
    id CHAR(36) PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'digital', -- 'digital', 'physical'
    initial_balance DECIMAL(10,2) NOT NULL,
    current_balance DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'redeemed', 'expired', 'cancelled'
    sender_id CHAR(36),
    recipient_id CHAR(36),
    recipient_email VARCHAR(255),
    recipient_name VARCHAR(100),
    message TEXT,
    expires_at TIMESTAMP NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    redeemed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_gc_sender_id FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_gc_recipient_id FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL
) COMMENT 'Gift cards with balance tracking';

CREATE INDEX idx_gift_cards_code ON gift_cards(code);
CREATE INDEX idx_gift_cards_recipient_id ON gift_cards(recipient_id);
CREATE INDEX idx_gift_cards_sender_id ON gift_cards(sender_id);

-- Gift Card Transactions
CREATE TABLE IF NOT EXISTS gift_card_transactions (
    id CHAR(36) PRIMARY KEY,
    gift_card_id CHAR(36) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'purchase', 'redemption', 'refund', 'adjustment'
    amount DECIMAL(10,2) NOT NULL,
    order_id CHAR(36),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gct_card_id FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_gct_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX idx_gift_card_transactions_card_id ON gift_card_transactions(gift_card_id);

-- Loyalty Points
CREATE TABLE IF NOT EXISTS loyalty_points (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL UNIQUE,
    total_points INTEGER DEFAULT 0,
    available_points INTEGER DEFAULT 0,
    pending_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
    tier_updated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_lp_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT 'Customer loyalty program points';

CREATE INDEX idx_loyalty_points_user_id ON loyalty_points(user_id);
CREATE INDEX idx_loyalty_points_tier ON loyalty_points(tier);

-- Loyalty Points Transactions
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'earn', 'redeem', 'expire', 'adjustment', 'bonus'
    points INTEGER NOT NULL,
    order_id CHAR(36),
    description TEXT,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lt_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_lt_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);

-- Price Alerts
CREATE TABLE IF NOT EXISTS price_alerts (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    target_price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMP NULL,
    triggered_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id),
    CONSTRAINT fk_pal_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_pal_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) COMMENT 'Price drop notifications';

CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_product_id ON price_alerts(product_id);
CREATE INDEX idx_price_alerts_active ON price_alerts(is_active);

-- Back in Stock Alerts
CREATE TABLE IF NOT EXISTS back_in_stock_alerts (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    variant_id CHAR(36),
    email VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id, variant_id),
    CONSTRAINT fk_bis_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bis_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_bis_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

CREATE INDEX idx_back_in_stock_user_id ON back_in_stock_alerts(user_id);
CREATE INDEX idx_back_in_stock_product_id ON back_in_stock_alerts(product_id);
CREATE INDEX idx_back_in_stock_active ON back_in_stock_alerts(is_active);

-- Product Comparison Sets
CREATE TABLE IF NOT EXISTS product_comparison_sets (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    session_id VARCHAR(128), -- For guest comparisons
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY)),
    CONSTRAINT fk_pcs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_comparison_sets_user_id ON product_comparison_sets(user_id);
CREATE INDEX idx_comparison_sets_session ON product_comparison_sets(session_id);

-- Product Comparison Items
CREATE TABLE IF NOT EXISTS product_comparison_items (
    id CHAR(36) PRIMARY KEY,
    set_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(set_id, product_id),
    CONSTRAINT fk_pci_set_id FOREIGN KEY (set_id) REFERENCES product_comparison_sets(id) ON DELETE CASCADE,
    CONSTRAINT fk_pci_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_comparison_items_set_id ON product_comparison_items(set_id);

-- Update existing tables
ALTER TABLE users 
    ADD COLUMN loyalty_points_balance INTEGER DEFAULT 0,
    ADD COLUMN loyalty_tier VARCHAR(20) DEFAULT 'bronze',
    ADD COLUMN gift_card_balance DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN store_credit DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN preferred_payment_method_id CHAR(36),
    ADD COLUMN default_currency VARCHAR(3) DEFAULT 'USD',
    ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC',
    ADD COLUMN language VARCHAR(10) DEFAULT 'en',
    ADD COLUMN marketing_consent BOOLEAN DEFAULT TRUE,
    ADD COLUMN sms_consent BOOLEAN DEFAULT FALSE,
    ADD COLUMN whatsapp_consent BOOLEAN DEFAULT FALSE;

-- Notification Preferences (granular)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'whatsapp'
    type VARCHAR(50) NOT NULL, -- 'order_updates', 'promotions', 'price_alerts', etc.
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(user_id, channel, type),
    CONSTRAINT fk_np_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notification_prefs_user_id ON notification_preferences(user_id);

-- MySQL Triggers (Individual per table since there's no generic plpgsql)

-- Update shopping list item count
DELIMITER //
CREATE TRIGGER tr_sli_insert AFTER INSERT ON shopping_list_items
FOR EACH ROW
BEGIN
    UPDATE shopping_lists SET item_count = item_count + 1 WHERE id = NEW.list_id;
END;
//

CREATE TRIGGER tr_sli_delete AFTER DELETE ON shopping_list_items
FOR EACH ROW
BEGIN
    UPDATE shopping_lists SET item_count = item_count - 1 WHERE id = OLD.list_id;
END;
//

-- Mark question as answered
CREATE TRIGGER tr_pa_insert AFTER INSERT ON product_answers
FOR EACH ROW
BEGIN
    UPDATE product_questions SET is_answered = TRUE WHERE id = NEW.question_id;
END;
//
DELIMITER ;
