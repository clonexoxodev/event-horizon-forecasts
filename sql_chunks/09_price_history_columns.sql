-- RUN 9th: Add missing columns to market_price_history table

select public.add_column_if_missing('market_price_history', 'market_id', 'text');
select public.add_column_if_missing('market_price_history', 'yes_price', 'numeric');
select public.add_column_if_missing('market_price_history', 'no_price', 'numeric');
select public.add_column_if_missing('market_price_history', 'yes_pool_smallest_unit', 'bigint');
select public.add_column_if_missing('market_price_history', 'no_pool_smallest_unit', 'bigint');
select public.add_column_if_missing('market_price_history', 'volume_smallest_unit', 'bigint');
select public.add_column_if_missing('market_price_history', 'trade_count', 'integer');
select public.add_column_if_missing('market_price_history', 'side', 'text');
select public.add_column_if_missing('market_price_history', 'amount_smallest_unit', 'bigint');
select public.add_column_if_missing('market_price_history', 'created_at', 'timestamptz', 'now()');
