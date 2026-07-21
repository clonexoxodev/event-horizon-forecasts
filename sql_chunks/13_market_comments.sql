-- RUN 13th: Create market_comments table

create table if not exists public.market_comments (
  id          uuid primary key default gen_random_uuid(),
  market_id   text not null references public.markets(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null,
  like_count  integer default 0,
  created_at  timestamptz default now()
);

create index if not exists idx_market_comments_market_id on public.market_comments(market_id);
create index if not exists idx_market_comments_user_id on public.market_comments(user_id);
