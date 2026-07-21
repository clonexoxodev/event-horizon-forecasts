-- RUN 20th: RLS policies for market_comments, market_trades, market_activity_events

alter table public.market_comments enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "market_comments: public read" ON public.market_comments;
  DROP POLICY IF EXISTS "market_comments: own insert" ON public.market_comments;
  DROP POLICY IF EXISTS "market_comments: own delete" ON public.market_comments;
EXCEPTION WHEN OTHERS THEN null;
END $$;

create policy "market_comments: public read"
  on public.market_comments for select using (true);
create policy "market_comments: own insert"
  on public.market_comments for insert
  with check (auth.uid() = user_id);
create policy "market_comments: own delete"
  on public.market_comments for delete
  using (auth.uid() = user_id);

alter table public.market_trades enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "market_trades: public read" ON public.market_trades;
  DROP POLICY IF EXISTS "market_trades: own insert" ON public.market_trades;
EXCEPTION WHEN OTHERS THEN null;
END $$;

create policy "market_trades: public read"
  on public.market_trades for select using (true);
create policy "market_trades: own insert"
  on public.market_trades for insert
  with check (auth.uid() = user_id);

alter table public.market_activity_events enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "market_activity_events: public read" ON public.market_activity_events;
  DROP POLICY IF EXISTS "market_activity_events: own insert" ON public.market_activity_events;
EXCEPTION WHEN OTHERS THEN null;
END $$;

create policy "market_activity_events: public read"
  on public.market_activity_events for select using (true);
create policy "market_activity_events: own insert"
  on public.market_activity_events for insert
  with check (auth.uid() = user_id);
