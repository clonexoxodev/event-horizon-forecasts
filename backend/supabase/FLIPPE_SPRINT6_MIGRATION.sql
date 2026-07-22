-- ============================================================
-- FLIPPE SPRINT 6: PRODUCTION READINESS MIGRATION
-- ============================================================

-- 1. FEATURE FLAGS (new table)
CREATE TABLE IF NOT EXISTS feature_flags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text UNIQUE NOT NULL,
  label         text NOT NULL,
  description   text,
  enabled       boolean NOT NULL DEFAULT true,
  category      text NOT NULL DEFAULT 'general',
  created_by    uuid REFERENCES auth.users(id),
  updated_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);

INSERT INTO feature_flags (key, label, description, enabled, category) VALUES
  ('order_book', 'Order Book', 'Enable order book trading', true, 'trading'),
  ('protected_markets', 'Protected Markets', 'Enable protected market system', true, 'trading'),
  ('notifications', 'Notifications', 'Enable push notifications', true, 'platform'),
  ('email_notifications', 'Email Notifications', 'Enable email notifications', true, 'platform'),
  ('sms_notifications', 'SMS Notifications', 'Enable SMS notifications', false, 'platform'),
  ('kyc_verification', 'KYC Verification', 'Require KYC for withdrawals', false, 'compliance'),
  ('withdrawals', 'Withdrawals', 'Enable withdrawal processing', true, 'finance'),
  ('deposits', 'Deposits', 'Enable deposit processing', true, 'finance'),
  ('maintenance_mode', 'Maintenance Mode', 'Platform maintenance mode', false, 'platform')
ON CONFLICT (key) DO NOTHING;

-- 2. ENHANCE EXISTING platform_settings (table already exists from supplemental migration)
-- Add category column if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_settings' AND column_name='category') THEN
    ALTER TABLE platform_settings ADD COLUMN category text NOT NULL DEFAULT 'general';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_settings' AND column_name='updated_by') THEN
    ALTER TABLE platform_settings ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(key);

-- Upsert settings (safe even if some already exist)
INSERT INTO platform_settings (key, value, category, description) VALUES
  ('platform_name', '"Flippe"', 'general', 'Platform display name'),
  ('maintenance_mode', 'false', 'platform', 'Maintenance mode'),
  ('trading_enabled', 'true', 'trading', 'Trading enabled'),
  ('deposits_enabled', 'true', 'finance', 'Deposits enabled'),
  ('withdrawals_enabled', 'true', 'finance', 'Withdrawals enabled'),
  ('min_deposit_naira', '500', 'finance', 'Minimum deposit NGN'),
  ('min_withdrawal_naira', '1000', 'finance', 'Minimum withdrawal NGN'),
  ('max_withdrawal_naira', '5000000', 'finance', 'Maximum withdrawal NGN'),
  ('default_currency', '"NGN"', 'finance', 'Default currency'),
  ('order_timeout_seconds', '300', 'trading', 'Order timeout'),
  ('settlement_delay_hours', '24', 'settlement', 'Settlement delay'),
  ('protected_market_threshold', '10', 'trading', 'Protected threshold')
ON CONFLICT (key) DO UPDATE SET
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = now();

-- 3. ADMIN NOTIFICATIONS (new table)
CREATE TABLE IF NOT EXISTS admin_notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text NOT NULL,
  title         text NOT NULL,
  message       text NOT NULL,
  severity      text NOT NULL DEFAULT 'info',
  metadata      jsonb DEFAULT '{}',
  read_by       uuid[] DEFAULT '{}',
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity ON admin_notifications(severity);

-- 4. FRAUD ALERTS (new table)
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id),
  alert_type    text NOT NULL,
  severity      text NOT NULL DEFAULT 'medium',
  title         text NOT NULL,
  description   text NOT NULL,
  evidence      jsonb DEFAULT '{}',
  status        text NOT NULL DEFAULT 'pending',
  reviewed_by   uuid REFERENCES auth.users(id),
  review_notes  text,
  reviewed_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user ON fraud_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_created ON fraud_alerts(created_at DESC);

-- 5. ENHANCED AUDIT LOG COLUMNS (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_audit_log' AND column_name='ip_address') THEN
    ALTER TABLE admin_audit_log ADD COLUMN ip_address text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_audit_log' AND column_name='user_agent') THEN
    ALTER TABLE admin_audit_log ADD COLUMN user_agent text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_audit_log' AND column_name='old_value') THEN
    ALTER TABLE admin_audit_log ADD COLUMN old_value jsonb; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_audit_log' AND column_name='new_value') THEN
    ALTER TABLE admin_audit_log ADD COLUMN new_value jsonb; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_audit_log' AND column_name='reason') THEN
    ALTER TABLE admin_audit_log ADD COLUMN reason text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_audit_log' AND column_name='affected_user_id') THEN
    ALTER TABLE admin_audit_log ADD COLUMN affected_user_id uuid; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_audit_log' AND column_name='affected_market_id') THEN
    ALTER TABLE admin_audit_log ADD COLUMN affected_market_id uuid; END IF;
END $$;

-- 6. RLS POLICIES (idempotent)
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS service_role_all_feature_flags ON feature_flags;
  DROP POLICY IF EXISTS admin_read_feature_flags ON feature_flags;
  DROP POLICY IF EXISTS service_role_all_admin_notifications ON admin_notifications;
  DROP POLICY IF EXISTS admin_read_admin_notifications ON admin_notifications;
  DROP POLICY IF EXISTS service_role_all_fraud_alerts ON fraud_alerts;
  DROP POLICY IF EXISTS admin_read_fraud_alerts ON fraud_alerts;
END $$;

CREATE POLICY service_role_all_feature_flags ON feature_flags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY admin_read_feature_flags ON feature_flags FOR SELECT USING (true);
CREATE POLICY service_role_all_admin_notifications ON admin_notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY admin_read_admin_notifications ON admin_notifications FOR SELECT USING (true);
CREATE POLICY service_role_all_fraud_alerts ON fraud_alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY admin_read_fraud_alerts ON fraud_alerts FOR SELECT USING (true);

-- 7. GRANTS
GRANT ALL ON feature_flags TO service_role;
GRANT ALL ON admin_notifications TO service_role;
GRANT ALL ON fraud_alerts TO service_role;
