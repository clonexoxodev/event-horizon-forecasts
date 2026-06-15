-- Adds a separate trading close time so markets can stop accepting predictions
-- before the final result/resolution time.

alter table public.markets
  add column if not exists trading_close_at timestamptz;

update public.markets
set trading_close_at = coalesce(trading_close_at, closes_at, close_date)
where trading_close_at is null;

alter table public.markets
  drop constraint if exists markets_trading_close_before_close_v1_check;

alter table public.markets
  add constraint markets_trading_close_before_close_v1_check
  check (
    trading_close_at is null
    or coalesce(closes_at, close_date) is null
    or trading_close_at <= coalesce(closes_at, close_date)
  );

create index if not exists idx_markets_trading_close_at
  on public.markets(trading_close_at);
