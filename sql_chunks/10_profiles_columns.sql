-- RUN 10th: Add missing columns to profiles table

select public.add_column_if_missing('profiles', 'display_name', 'text');
select public.add_column_if_missing('profiles', 'avatar_url', 'text');
select public.add_column_if_missing('profiles', 'profile_image_url', 'text');
select public.add_column_if_missing('profiles', 'balance', 'numeric', '0');
