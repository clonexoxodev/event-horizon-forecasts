-- RUN 2nd: Add missing columns to users table

select public.add_column_if_missing('users', 'name', 'text');
select public.add_column_if_missing('users', 'avatar_url', 'text');
select public.add_column_if_missing('users', 'profile_image_url', 'text');
select public.add_column_if_missing('users', 'account_status', 'text', quote_literal('active'));
select public.add_column_if_missing('users', 'suspended_at', 'timestamptz');
select public.add_column_if_missing('users', 'suspended_by', 'uuid');
select public.add_column_if_missing('users', 'suspension_reason', 'text');
select public.add_column_if_missing('users', 'password_hash', 'text');
select public.add_column_if_missing('users', 'updated_at', 'timestamptz', 'now()');
