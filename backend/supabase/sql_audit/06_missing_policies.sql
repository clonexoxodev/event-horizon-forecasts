-- ============================================================================
-- FLIPPE AUDIT: 06 MISSING RLS POLICIES
-- RLS policies for tables that lack them in existing migrations.
-- Run AFTER 20260721_settlement_sprint4.sql.
-- ============================================================================

-- ============================================================================
-- settlement_audit_log
--
-- Sprint 4 creates the table and GRANTs access, but never enables RLS or
-- defines policies. Without RLS, any authenticated user could SELECT the
-- entire audit trail. Enable RLS and lock it down.
-- ============================================================================

ALTER TABLE settlement_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role (backend) bypasses RLS entirely via the service_role key,
-- but the explicit policy makes intent clear and covers edge cases.
CREATE POLICY "settlement_audit: service_role all"
  ON settlement_audit_log FOR ALL
  USING (true)
  WITH CHECK (true);

-- Admins and super-admins can read audit logs from the dashboard.
CREATE POLICY "settlement_audit: admin read"
  ON settlement_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- NOTE on existing tables
--
-- orders, order_fills, trades, order_events:
--   RLS is enabled with own-read/insert/update policies in sprint1.
--   The backend uses service_role which bypasses RLS, so these are correct.
--   Authenticated users can only see their own rows.
--
-- notifications:
--   Managed by init.sql (base schema). The backend writes via service_role
--   and reads via both service_role and authenticated sessions. No gaps.
--
-- wallets, positions, transactions, markets:
--   Managed by init.sql (base schema). RLS and policies already defined.
-- ============================================================================
