-- ============================================================================
-- FLIPPE AUDIT: 10 VERIFICATION
-- Run these queries to verify all SQL objects exist
-- ============================================================================

-- 1. Check all required tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'wallets', 'markets', 'positions', 'transactions',
    'notifications', 'orders', 'order_fills', 'trades', 'order_events',
    'settlement_audit_log', 'deposit_requests', 'withdrawal_requests',
    'market_trades', 'market_price_history', 'market_resolution_logs',
    'market_activity_events', 'market_comments', 'market_audit_trail',
    'saved_bank_details', 'leaderboard_entries', 'position_listings',
    'platform_settings', 'payout_records', 'dispute_reports',
    'portfolio_value_history', 'user_activity_logs', 'admin_audit_logs'
  )
ORDER BY table_name;

-- 2. Check all required RPC functions exist
SELECT p.proname AS function_name,
       pg_catalog.pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE 'atomic_%'
ORDER BY p.proname;

-- 3. Check helper function exists
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'add_column_if_missing';

-- 4. Check query functions exist
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('get_unsettled_positions', 'get_active_orders_for_market');

-- 5. Check wallet columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'wallets'
  AND column_name IN (
    'balance_ngn_kobo', 'balance_usd_cents',
    'available_ngn_kobo', 'available_usd_cents',
    'locked_ngn_kobo', 'locked_usd_cents',
    'total_deposited_ngn_kobo', 'total_withdrawn_ngn_kobo',
    'total_winnings_ngn_kobo', 'total_winnings_usd_cents',
    'currency'
  )
ORDER BY column_name;

-- 6. Check markets settlement columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'markets'
  AND column_name LIKE 'settlement_%'
ORDER BY column_name;

-- 7. Check positions order book columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'positions'
  AND column_name IN ('order_id', 'first_fill_price', 'last_fill_price', 'fill_count',
                       'settlement_id', 'settlement_outcome', 'refund_reason',
                       'refund_amount_smallest_unit', 'refunded_at')
ORDER BY column_name;

-- 8. Check indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_orders_%'
    OR indexname LIKE 'idx_fills_%'
    OR indexname LIKE 'idx_trades_%'
    OR indexname LIKE 'idx_order_events_%'
    OR indexname LIKE 'idx_settlement_%'
    OR indexname LIKE 'idx_positions_settlement%'
    OR indexname LIKE 'idx_positions_market_settled'
  )
ORDER BY indexname;

-- 9. Check RLS is enabled on new tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'order_fills', 'trades', 'order_events', 'settlement_audit_log')
ORDER BY tablename;

-- 10. Check constraints on wallets
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'wallets'::regclass
ORDER BY conname;

-- 11. Check pricing_model constraint
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'markets'::regclass
  AND conname LIKE '%pricing%';

-- 12. Check status constraint includes 'refunded'
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'markets'::regclass
  AND conname LIKE '%status%';

-- 13. Verify settlement_audit_log RLS
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'settlement_audit_log';

-- 14. Check triggers on orders
SELECT triggername, eventmanipulation
FROM information_schema.triggers
WHERE event_object_table = 'orders';

-- 15. Summary count
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS total_tables,
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname LIKE 'atomic_%') AS atomic_functions,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'idx_%') AS total_indexes;
