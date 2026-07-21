-- RUN 16th: Create market_resolution_logs table

create table if not exists public.market_resolution_logs (
  id                            uuid primary key default gen_random_uuid(),
  market_id                     text not null references public.markets(id) on delete cascade,
  resolved_by                   uuid references auth.users(id),
  outcome                       text not null,
  winning_pool_smallest_unit    bigint,
  losing_pool_smallest_unit     bigint,
  payout_pool_smallest_unit     bigint,
  resolved_position_count       integer,
  payout_summary                jsonb,
  created_at                    timestamptz default now()
);

create index if not exists idx_resolution_logs_market_id on public.market_resolution_logs(market_id);
