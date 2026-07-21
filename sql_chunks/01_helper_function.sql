-- RUN THIS FIRST: Creates the helper function used by all later chunks

create or replace function public.add_column_if_missing(
  p_table text, p_column text, p_type text, p_default text default null
) returns void
language plpgsql as $$
declare
  v_sql text;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = p_table and column_name = p_column
  ) then
    v_sql := format('alter table public.%I add column %I %s', p_table, p_column, p_type);
    if p_default is not null then
      v_sql := v_sql || format(' default %s', p_default);
    end if;
    execute v_sql;
  end if;
end;
$$;
