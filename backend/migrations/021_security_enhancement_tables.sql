-- Migration 021: Security, Device Management, and User Enhancements
-- Adds: Device management, login history, 2FA, social auth

-- User Devices (for device management and trust)
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Device info
    device_id VARCHAR(255) NOT NULL, -- Unique device identifier
    device_type VARCHAR(30) NOT NULL, -- 'mobile', 'tablet', 'desktop', 'smart_tv', 'unknown'
    device_name VARCHAR(100),
    brand VARCHAR(50),
    model VARCHAR(100),
    os VARCHAR(50),
    os_version VARCHAR(30),
    browser VARCHAR(50),
    browser_version VARCHAR(30),
    
    -- Security
    is_trusted BOOLEAN DEFAULT FALSE,
    is_current BOOLEAN DEFAULT FALSE,
    trust_granted_at TIMESTAMPTZ,
    
    -- Location (last known)
    last_ip INET,
    last_country VARCHAR(2),
    last_city VARCHAR(100),
    last_latitude DECIMAL(10,8),
    last_longitude DECIMAL(11,8),
    
    -- Activity
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    login_count INTEGER DEFAULT 1,
    
    -- 2FA for this device
    requires_2fa BOOLEAN DEFAULT TRUE,
    last_2fa_at TIMESTAMPTZ,
    
    -- Push notifications
    push_token TEXT,
    push_enabled BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_current ON user_devices(is_current) WHERE is_current = TRUE;
CREATE INDEX idx_user_devices_trusted ON user_devices(is_trusted) WHERE is_trusted = TRUE;

-- Login History
CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES user_devices(id) ON DELETE SET NULL,
    
    -- Authentication method
    method VARCHAR(30) NOT NULL, -- 'password', '2fa', 'social_google', 'social_facebook', 'social_apple', 'magic_link', 'biometric'
    social_provider VARCHAR(20), -- 'google', 'facebook', 'apple', 'amazon'
    
    -- Status
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'blocked', 'requires_2fa', 'suspicious'
    failure_reason VARCHAR(100), -- 'invalid_password', 'account_locked', 'invalid_2fa', 'expired_token'
    
    -- Location
    ip_address INET NOT NULL,
    country VARCHAR(2),
    city VARCHAR(100),
    region VARCHAR(100),
    timezone VARCHAR(50),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Device context
    user_agent TEXT,
    fingerprint VARCHAR(64), -- Browser fingerprint hash
    
    -- Session info
    session_token VARCHAR(255),
    session_expires_at TIMESTAMPTZ,
    logout_at TIMESTAMPTZ,
    logout_method VARCHAR(20), -- 'user', 'timeout', 'remote', 'password_change', 'suspicious_activity'
    
    -- Security flags
    is_suspicious BOOLEAN DEFAULT FALSE,
    suspicious_reason TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_created ON login_history(created_at);
CREATE INDEX idx_login_history_ip ON login_history(ip_address);
CREATE INDEX idx_login_history_suspicious ON login_history(is_suspicious) WHERE is_suspicious = TRUE;
CREATE INDEX idx_login_history_status ON login_history(status);

-- Two-Factor Authentication
CREATE TABLE IF NOT EXISTS user_2fa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 2FA Method
    method VARCHAR(20) NOT NULL, -- 'authenticator_app', 'sms', 'email', 'security_key'
    
    -- Status
    is_enabled BOOLEAN DEFAULT FALSE,
    enabled_at TIMESTAMPTZ,
    
    -- TOTP settings (for authenticator apps)
    totp_secret_encrypted TEXT,
    totp_verified BOOLEAN DEFAULT FALSE,
    backup_codes TEXT[], -- Encrypted backup codes
    backup_codes_used INTEGER[] DEFAULT '{}', -- Indices of used backup codes
    
    -- SMS settings
    phone_number VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,
    
    -- Security Key (WebAuthn)
    webauthn_credential_id TEXT,
    webauthn_public_key TEXT,
    webauthn_counter INTEGER DEFAULT 0,
    
    -- Settings
    require_2fa_for_device_trust BOOLEAN DEFAULT TRUE,
    trust_duration_days INTEGER DEFAULT 30,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, method)
);

CREATE INDEX idx_user_2fa_settings_user_id ON user_2fa_settings(user_id);
CREATE INDEX idx_user_2fa_settings_enabled ON user_2fa_settings(is_enabled) WHERE is_enabled = TRUE;

-- Social Authentication Connections
CREATE TABLE IF NOT EXISTS user_social_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    provider VARCHAR(20) NOT NULL, -- 'google', 'facebook', 'apple', 'amazon', 'microsoft'
    provider_user_id VARCHAR(255) NOT NULL,
    
    -- Profile data (cached)
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    raw_profile JSONB,
    
    -- Tokens (encrypted)
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    
    -- Settings
    is_primary_connection BOOLEAN DEFAULT FALSE,
    can_login BOOLEAN DEFAULT TRUE,
    
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_user_social_connections_user_id ON user_social_connections(user_id);
CREATE INDEX idx_user_social_connections_provider ON user_social_connections(provider);

-- Security Alerts
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    type VARCHAR(50) NOT NULL, -- 'new_device', 'suspicious_login', 'password_changed', 'email_changed', '2fa_enabled', '2fa_disabled'
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'critical'
    
    -- Details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Context
    ip_address INET,
    location VARCHAR(255),
    device_info TEXT,
    
    -- Actions taken
    action_required BOOLEAN DEFAULT FALSE,
    action_taken VARCHAR(50), -- 'none', 'blocked', 'verified', 'password_reset_sent'
    
    -- User interaction
    acknowledged_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    
    -- Notifications sent
    email_sent_at TIMESTAMPTZ,
    sms_sent_at TIMESTAMPTZ,
    push_sent_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_alerts_user_id ON security_alerts(user_id);
CREATE INDEX idx_security_alerts_type ON security_alerts(type);
CREATE INDEX idx_security_alerts_action_required ON security_alerts(action_required) WHERE action_required = TRUE;
CREATE INDEX idx_security_alerts_created ON security_alerts(created_at);

-- Password History (prevent password reuse)
CREATE TABLE IF NOT EXISTS password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL, -- Previous password hash
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_reason VARCHAR(50) DEFAULT 'user_initiated' -- 'user_initiated', 'expired', 'breach', 'admin_reset'
);

CREATE INDEX idx_password_history_user_id ON password_history(user_id);
CREATE INDEX idx_password_history_changed ON password_history(changed_at);

-- API Keys (for integrations)
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(8) NOT NULL, -- First 8 chars of key for identification
    key_hash VARCHAR(255) NOT NULL, -- Full key hash
    
    -- Permissions
    scopes TEXT[] DEFAULT '{read}',
    
    -- Rate limiting
    rate_limit INTEGER DEFAULT 1000, -- Requests per hour
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by_ip INET,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT
);

CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_prefix ON user_api_keys(key_prefix);

-- User Sessions (Active session management)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES user_devices(id) ON DELETE SET NULL,
    login_history_id UUID REFERENCES login_history(id) ON DELETE SET NULL,
    
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Session info
    ip_address INET NOT NULL,
    user_agent TEXT,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    invalidated_at TIMESTAMPTZ,
    invalidation_reason VARCHAR(50),
    
    -- 2FA status for this session
    is_2fa_verified BOOLEAN DEFAULT FALSE,
    verified_2fa_at TIMESTAMPTZ
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_refresh ON user_sessions(refresh_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = TRUE;

-- User Activity Log (Audit trail)
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    
    action VARCHAR(50) NOT NULL, -- 'view', 'create', 'update', 'delete', 'download', 'share', 'purchase'
    entity_type VARCHAR(50), -- 'product', 'order', 'address', 'profile', 'payment_method'
    entity_id UUID,
    
    -- Details
    description TEXT,
    metadata JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_action ON user_activity_log(action);
CREATE INDEX idx_user_activity_log_entity ON user_activity_log(entity_type, entity_id);
CREATE INDEX idx_user_activity_log_created ON user_activity_log(created_at);

-- Account Recovery Requests
CREATE TABLE IF NOT EXISTS account_recovery_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request details
    request_type VARCHAR(30) NOT NULL, -- 'forgot_password', 'account_hacked', 'lost_2fa'
    verification_method VARCHAR(20) NOT NULL, -- 'email', 'sms', 'backup_email'
    
    -- Tokens
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'completed', 'expired', 'cancelled'
    
    -- Verification attempts
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Completion
    completed_at TIMESTAMPTZ,
    new_device_id UUID REFERENCES user_devices(id) ON DELETE SET NULL,
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_account_recovery_user_id ON account_recovery_requests(user_id);
CREATE INDEX idx_account_recovery_token ON account_recovery_requests(token_hash);
CREATE INDEX idx_account_recovery_status ON account_recovery_requests(status);

-- Update users table with security fields
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS require_password_change BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS max_session_duration INTEGER DEFAULT 30, -- Days
    ADD COLUMN IF NOT EXISTS simultaneous_sessions_allowed INTEGER DEFAULT 5,
    ADD COLUMN IF NOT EXISTS login_notifications_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS security_email_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS trusted_devices_only BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS suspicious_login_block BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS account_recovery_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS backup_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS backup_email_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS backup_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS backup_phone_verified BOOLEAN DEFAULT FALSE;

-- Triggers
CREATE TRIGGER update_user_devices_updated_at BEFORE UPDATE ON user_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_2fa_settings_updated_at BEFORE UPDATE ON user_2fa_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_social_connections_updated_at BEFORE UPDATE ON user_social_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON user_api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions
CREATE OR REPLACE FUNCTION log_password_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
        INSERT INTO password_history (user_id, password_hash, changed_at, changed_reason)
        VALUES (NEW.id, OLD.password_hash, NOW(), 'user_initiated');
        
        NEW.last_password_change = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_password_change_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION log_password_change();

-- Function to check for suspicious login
CREATE OR REPLACE FUNCTION check_suspicious_login()
RETURNS TRIGGER AS $$
DECLARE
    last_country VARCHAR(2);
    last_ip INET;
    is_new_country BOOLEAN := FALSE;
    is_new_ip BOOLEAN := TRUE;
BEGIN
    -- Get last successful login location
    SELECT country, ip_address INTO last_country, last_ip
    FROM login_history
    WHERE user_id = NEW.user_id AND status = 'success'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Check if new country
    IF last_country IS NOT NULL AND NEW.country IS DISTINCT FROM last_country THEN
        is_new_country := TRUE;
    END IF;
    
    -- Check if we've seen this IP before
    IF EXISTS (
        SELECT 1 FROM login_history 
        WHERE user_id = NEW.user_id AND ip_address = NEW.ip_address AND status = 'success'
    ) THEN
        is_new_ip := FALSE;
    END IF;
    
    -- Flag suspicious if new country or completely new IP pattern
    IF is_new_country OR (is_new_ip AND last_ip IS NOT NULL) THEN
        NEW.is_suspicious := TRUE;
        NEW.suspicious_reason := CASE 
            WHEN is_new_country THEN 'Login from new country: ' || NEW.country
            ELSE 'Login from new IP address'
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_suspicious_login_trigger
    BEFORE INSERT ON login_history
    FOR EACH ROW EXECUTE FUNCTION check_suspicious_login();

COMMENT ON TABLE user_devices IS 'Device fingerprinting and trust management';
COMMENT ON TABLE login_history IS 'Comprehensive authentication audit trail';
COMMENT ON TABLE user_2fa_settings IS 'Two-factor authentication configuration';
COMMENT ON TABLE security_alerts IS 'Security notifications and alerts';
