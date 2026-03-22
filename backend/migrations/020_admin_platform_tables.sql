-- Migration 020: Admin Platform - CMS, SEO, Tax, Fraud, Chat
-- Adds: CMS pages, banners, SEO redirects, tax rules, fraud detection, live chat

-- CMS Pages (Content Management System)
CREATE TABLE IF NOT EXISTS cms_pages (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content LONGTEXT, -- LONGTEXT for large content
    meta_title VARCHAR(100),
    meta_description VARCHAR(300),
    meta_keywords JSON, -- Changed from TEXT[] to JSON
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE, -- Cannot be deleted
    layout VARCHAR(50) DEFAULT 'default',
    sidebar_id CHAR(36),
    parent_id CHAR(36),
    sort_order INTEGER DEFAULT 0,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cms_parent FOREIGN KEY (parent_id) REFERENCES cms_pages(id) ON DELETE SET NULL
) COMMENT 'Content management system for static pages';

CREATE INDEX idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX idx_cms_pages_active ON cms_pages(is_active);

-- CMS Blocks (Reusable content pieces)
CREATE TABLE IF NOT EXISTS cms_blocks (
    id CHAR(36) PRIMARY KEY,
    identifier VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    content LONGTEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_cms_blocks_identifier ON cms_blocks(identifier);

-- CMS Banners (Promotional banners)
CREATE TABLE IF NOT EXISTS cms_banners (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    placement VARCHAR(50) NOT NULL, -- 'home_hero', 'home_sidebar', 'category_top', 'product_sidebar'
    type VARCHAR(20) DEFAULT 'image', -- 'image', 'html', 'video', 'carousel'
    content JSON NOT NULL, -- {image_url, link_url, alt_text, title, etc.}
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    impression_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_cms_banners_placement ON cms_banners(placement);
CREATE INDEX idx_cms_banners_active ON cms_banners(is_active);

-- SEO Redirects (301/302 redirects)
CREATE TABLE IF NOT EXISTS seo_redirects (
    id CHAR(36) PRIMARY KEY,
    source_url VARCHAR(500) UNIQUE NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    http_code INTEGER DEFAULT 301, -- 301, 302
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_seo_redirects_source ON seo_redirects(source_url);

-- Tax Rules
CREATE TABLE IF NOT EXISTS tax_rules (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(2) NOT NULL DEFAULT 'US',
    state VARCHAR(50),
    postal_code VARCHAR(20),
    city VARCHAR(100),
    rate DECIMAL(6,4) NOT NULL, -- e.g., 0.0825 for 8.25%
    is_compound BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 0,
    tax_class VARCHAR(50) DEFAULT 'standard', -- 'standard', 'reduced', 'zero', 'exempt'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(country, state, postal_code, city, tax_class)
) COMMENT 'Regional tax configuration';

CREATE INDEX idx_tax_rules_location ON tax_rules(country, state);

-- Fraud Detection Rules
CREATE TABLE IF NOT EXISTS fraud_rules (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'velocity', 'blacklist', 'amount', 'geolocation', 'score'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'test', 'disabled'
    action VARCHAR(20) NOT NULL, -- 'flag', 'hold', 'reject', 'require_review'
    conditions JSON NOT NULL, -- {max_orders_per_hour: 5, etc.}
    score_impact INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Fraud Blacklist
CREATE TABLE IF NOT EXISTS fraud_blacklist (
    id CHAR(36) PRIMARY KEY,
    type VARCHAR(20) NOT NULL, -- 'email', 'ip', 'fingerprint', 'phone', 'address'
    `value` VARCHAR(255) NOT NULL,
    reason TEXT,
    added_by CHAR(36),
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, `value`),
    CONSTRAINT fk_fb_added_by FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_fraud_blacklist_value ON fraud_blacklist(`value`);

-- Live Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    visitor_id VARCHAR(64), -- For guest chats
    agent_id CHAR(36),
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'active', 'closed', 'transferred'
    subject VARCHAR(200),
    priority VARCHAR(10) DEFAULT 'normal',
    department VARCHAR(50),
    user_ip VARCHAR(45), -- INET compatible
    user_agent TEXT,
    closed_at TIMESTAMP NULL,
    closed_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_cs_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_cs_closed_by FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL
) COMMENT 'Customer support live chat sessions';

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_agent ON chat_sessions(agent_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id CHAR(36) PRIMARY KEY,
    session_id CHAR(36) NOT NULL,
    sender_type VARCHAR(10) NOT NULL, -- 'user', 'agent', 'system', 'bot'
    sender_id CHAR(36),
    message LONGTEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    metadata JSON, -- {attachments, links, etc.}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cm_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);

-- Admin Activity Logs (Audit trail)
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id CHAR(36) PRIMARY KEY,
    admin_id CHAR(36) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'product', 'user', 'order', 'setting'
    entity_id CHAR(36),
    description TEXT,
    original_data JSON,
    new_data JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_aal_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT 'System-wide admin action audit trail';

CREATE INDEX idx_admin_logs_admin ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_logs_entity ON admin_activity_logs(entity_type, entity_id);

-- System Health Monitoring
CREATE TABLE IF NOT EXISTS system_health_logs (
    id CHAR(36) PRIMARY KEY,
    component VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'healthy', 'warning', 'critical'
    message TEXT,
    metrics JSON, -- {cpu: 80, memory: 90, etc.}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_health_logs_component ON system_health_logs(component);
CREATE INDEX idx_health_logs_created ON system_health_logs(created_at);

-- Update users table with admin flags
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS permissions JSON,
    ADD COLUMN IF NOT EXISTS last_admin_login TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active';

-- MySQL Triggers
DELIMITER //

-- Update cms_pages updated_at (redundant but matches PG logic)
-- Actually managed by CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

-- Notification for fraud rejection
CREATE TRIGGER tr_fr_insert AFTER INSERT ON fraud_blacklist
FOR EACH ROW
BEGIN
    -- This would normally trigger an event or log
    INSERT INTO admin_activity_logs (id, admin_id, action, entity_type, entity_id, description)
    VALUES ((UUID()), NEW.added_by, 'BLACKLIST_ADD', 'fraud_blacklist', NEW.id, 
            CONCAT('Added ', NEW.type, ': ', NEW.value, ' to blacklist'));
END;
//

DELIMITER ;
