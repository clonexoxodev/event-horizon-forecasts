-- RUN 22nd: RLS policies for market_price_history and notifications

alter table public.market_price_history enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "market_price_history: public read" ON public.market_price_history;
  DROP POLICY IF EXISTS "market_price_history: service insert" ON public.market_price_history;
EXCEPTION WHEN OTHERS THEN null;
END $$;
create policy "market_price_history: public read"
  on public.market_price_history for select using (true);
create policy "market_price_history: service insert"
  on public.market_price_history for insert
  with check (true);

alter table public.notifications enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "notifications: own read" ON public.notifications;
  DROP POLICY IF EXISTS "notifications: own update" ON public.notifications;
  DROP POLICY IF EXISTS "notifications: service insert" ON public.notifications;
EXCEPTION WHEN OTHERS THEN null;
END $$;
create policy "notifications: own read"
  on public.notifications for select
  using (auth.uid() = user_id);
create policy "notifications: own update"
  on public.notifications for update
  using (auth.uid() = user_id);
create policy "notifications: service insert"
  on public.notifications for insert
  with check (true);
