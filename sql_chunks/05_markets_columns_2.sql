-- RUN 5th: Add missing columns to markets table (part 2 of 3)

select public.add_column_if_missing('markets', 'activation_state', 'text', quote_literal('pre_activation'));
select public.add_column_if_missing('markets', 'activated_at', 'timestamptz');
select public.add_column_if_missing('markets', 'activated_by', 'uuid');
select public.add_column_if_missing('markets', 'activation_snapshot', 'jsonb');
select public.add_column_if_missing('markets', 'protected_market_enabled', 'boolean', 'false');
select public.add_column_if_missing('markets', 'activation_threshold_smallest_unit', 'bigint');
select public.add_column_if_missing('markets', 'activation_yes_min_smallest_unit', 'bigint');
select public.add_column_if_missing('markets', 'activation_no_min_smallest_unit', 'bigint');
select public.add_column_if_missing('markets', 'activation_min_participants', 'integer');
select public.add_column_if_missing('markets', 'protected_max_stake_smallest_unit', 'bigint');
select public.add_column_if_missing('markets', 'image_url', 'text');
select public.add_column_if_missing('markets', 'video_url', 'text');
select public.add_column_if_missing('markets', 'is_trending', 'boolean', 'false');
select public.add_column_if_missing('markets', 'min_position_smallest_unit', 'bigint');
select public.add_column_if_missing('markets', 'max_position_smallest_unit', 'bigint');
select public.add_column_if_missing('markets', 'created_by', 'uuid');
select public.add_column_if_missing('markets', 'country_filter', 'text');
select public.add_column_if_missing('markets', 'rules', 'text');
select public.add_column_if_missing('markets', 'archived_at', 'timestamptz');
