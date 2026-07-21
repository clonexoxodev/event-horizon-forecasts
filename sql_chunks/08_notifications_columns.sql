-- RUN 8th: Add missing columns to notifications table

select public.add_column_if_missing('notifications', 'user_id', 'uuid');
select public.add_column_if_missing('notifications', 'type', 'text');
select public.add_column_if_missing('notifications', 'title', 'text');
select public.add_column_if_missing('notifications', 'message', 'text');
select public.add_column_if_missing('notifications', 'reference_id', 'text');
select public.add_column_if_missing('notifications', 'reference_type', 'text');
select public.add_column_if_missing('notifications', 'metadata', 'jsonb');
select public.add_column_if_missing('notifications', 'is_read', 'boolean', 'false');
select public.add_column_if_missing('notifications', 'read_at', 'timestamptz');
select public.add_column_if_missing('notifications', 'created_at', 'timestamptz', 'now()');
