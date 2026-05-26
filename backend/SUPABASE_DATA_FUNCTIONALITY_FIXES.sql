create extension if not exists pgcrypto;

create table if not exists public.market_price_history (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  yes_price numeric not null default 50,
  no_price numeric not null default 50,
  yes_pool_smallest_unit bigint not null default 0,
  no_pool_smallest_unit bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.market_price_history add column if not exists market_id uuid;
alter table public.market_price_history add column if not exists yes_price numeric not null default 50;
alter table public.market_price_history add column if not exists no_price numeric not null default 50;
alter table public.market_price_history add column if not exists yes_pool_smallest_unit bigint not null default 0;
alter table public.market_price_history add column if not exists no_pool_smallest_unit bigint not null default 0;
alter table public.market_price_history add column if not exists created_at timestamptz not null default now();

create index if not exists market_price_history_market_created_idx
  on public.market_price_history (market_id, created_at);

create table if not exists public.market_comments (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.market_comments add column if not exists market_id uuid;
alter table public.market_comments add column if not exists user_id uuid;
alter table public.market_comments add column if not exists body text;
alter table public.market_comments add column if not exists like_count integer not null default 0;
alter table public.market_comments add column if not exists created_at timestamptz not null default now();
alter table public.market_comments add column if not exists updated_at timestamptz not null default now();

create index if not exists market_comments_market_created_idx
  on public.market_comments (market_id, created_at desc);

create index if not exists market_comments_market_likes_idx
  on public.market_comments (market_id, like_count desc, created_at desc);

alter table public.markets add column if not exists image_url text;
alter table public.markets add column if not exists video_url text;

insert into storage.buckets (id, name, public)
values ('market-images', 'market-images', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('market-videos', 'market-videos', true)
on conflict (id) do update set public = true;

alter table public.market_price_history enable row level security;
alter table public.market_comments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'market_price_history'
      and policyname = 'Public can read market price history'
  ) then
    create policy "Public can read market price history"
      on public.market_price_history
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'market_comments'
      and policyname = 'Public can read market comments'
  ) then
    create policy "Public can read market comments"
      on public.market_comments
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'market_comments'
      and policyname = 'Users can insert own market comments'
  ) then
    create policy "Users can insert own market comments"
      on public.market_comments
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read market media'
  ) then
    create policy "Public can read market media"
      on storage.objects
      for select
      using (bucket_id in ('market-images', 'market-videos'));
  end if;
end $$;
