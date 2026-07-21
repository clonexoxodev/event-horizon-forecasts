-- RUN 21st: RLS policies for resolution_logs, saved_bank_details, admin_audit_log, price_history, notifications

alter table public.market_resolution_logs enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "market_resolution_logs: public read" ON public.market_resolution_logs;
EXCEPTION WHEN OTHERS THEN null;
END $$;
create policy "market_resolution_logs: public read"
  on public.market_resolution_logs for select using (true);

alter table public.saved_bank_details enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "saved_bank_details: own read" ON public.saved_bank_details;
  DROP POLICY IF EXISTS "saved_bank_details: own upsert" ON public.saved_bank_details;
  DROP POLICY IF EXISTS "saved_bank_details: own update" ON public.saved_bank_details;
EXCEPTION WHEN OTHERS THEN null;
END $$;
create policy "saved_bank_details: own read"
  on public.saved_bank_details for select using (auth.uid() = user_id);
create policy "saved_bank_details: own insert"
  on public.saved_bank_details for insert
  with check (auth.uid() = user_id);
create policy "saved_bank_details: own update"
  on public.saved_bank_details for update
  using (auth.uid() = user_id);

alter table public.admin_audit_log enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "audit_log: authenticated read" ON public.admin_audit_log;
EXCEPTION WHEN OTHERS THEN null;
END $$;
create policy "audit_log: authenticated read"
  on public.admin_audit_log for select
  using (auth.role() = 'authenticated');
