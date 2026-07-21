-- RUN 7th: Add missing columns to transactions table

select public.add_column_if_missing('transactions', 'status', 'text', quote_literal('pending'));
select public.add_column_if_missing('transactions', 'reference', 'text');
select public.add_column_if_missing('transactions', 'reference_id', 'text');
select public.add_column_if_missing('transactions', 'reference_type', 'text');
select public.add_column_if_missing('transactions', 'description', 'text');
select public.add_column_if_missing('transactions', 'metadata', 'jsonb');
select public.add_column_if_missing('transactions', 'market_id', 'text');
select public.add_column_if_missing('transactions', 'position_id', 'uuid');
select public.add_column_if_missing('transactions', 'approved_by', 'uuid');
select public.add_column_if_missing('transactions', 'approved_at', 'timestamptz');
select public.add_column_if_missing('transactions', 'updated_at', 'timestamptz', 'now()');
