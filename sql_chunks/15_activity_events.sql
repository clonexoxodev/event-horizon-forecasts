-- RUN 15th: Create market_activity_events table

create table if not exists public.market_activity_events (
  id                            uuid primary key default gen_random_uuid(),
  market_id                     text not null references public.markets(id) on delete cascade,
  user_id                       uuid references auth.users(id) on delete set null,
  position_id                   uuid references public.positions(id) on delete set null,
  event_type                    text not null,
  side                          text check (side in ('YES', 'NO')),
  amount_smallest_unit          bigint,
  price                         numeric,
  shares                        numeric,
  position_value_smallest_unit  bigint,
  metadata                      jsonb,
  created_at                    timestamptz default now()
);

create index if not exists idx_market_activity_market_id on public.market_activity_events(market_id);
create index if not exists idx_market_activity_created_at on public.market_activity_events(created_at desc);
