-- RUN 14th: Create market_trades table

create table if not exists public.market_trades (
  id                      uuid primary key default gen_random_uuid(),
  market_id               text not null references public.markets(id) on delete cascade,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  position_id             uuid references public.positions(id) on delete set null,
  side                    text not null check (side in ('YES', 'NO')),
  amount_smallest_unit    bigint not null,
  price_before            numeric,
  price_after             numeric,
  yes_price_after         numeric,
  no_price_after          numeric,
  currency                text not null default 'NGN',
  created_at              timestamptz default now()
);

create index if not exists idx_market_trades_market_id on public.market_trades(market_id);
create index if not exists idx_market_trades_user_id on public.market_trades(user_id);
create index if not exists idx_market_trades_created_at on public.market_trades(created_at desc);
