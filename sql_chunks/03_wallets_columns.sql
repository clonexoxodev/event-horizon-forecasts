-- RUN 3rd: Add missing columns to wallets table

select public.add_column_if_missing('wallets', 'balance_ngn_kobo', 'bigint', '0');
select public.add_column_if_missing('wallets', 'balance_usd_cents', 'bigint', '0');
select public.add_column_if_missing('wallets', 'available_ngn_kobo', 'bigint', '0');
select public.add_column_if_missing('wallets', 'available_usd_cents', 'bigint', '0');
select public.add_column_if_missing('wallets', 'locked_ngn_kobo', 'bigint', '0');
select public.add_column_if_missing('wallets', 'locked_usd_cents', 'bigint', '0');
select public.add_column_if_missing('wallets', 'total_deposited_ngn_kobo', 'bigint', '0');
select public.add_column_if_missing('wallets', 'total_withdrawn_ngn_kobo', 'bigint', '0');
select public.add_column_if_missing('wallets', 'total_winnings_ngn_kobo', 'bigint', '0');
select public.add_column_if_missing('wallets', 'total_staked_ngn_kobo', 'bigint', '0');
select public.add_column_if_missing('wallets', 'currency', 'text', quote_literal('NGN'));
select public.add_column_if_missing('wallets', 'updated_at', 'timestamptz', 'now()');
