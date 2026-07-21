-- RUN 19th: RLS policies for withdrawal_requests and deposit_requests

alter table public.withdrawal_requests enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "withdrawal_requests: own read" ON public.withdrawal_requests;
  DROP POLICY IF EXISTS "withdrawal_requests: own insert" ON public.withdrawal_requests;
EXCEPTION WHEN OTHERS THEN null;
END $$;

create policy "withdrawal_requests: own read"
  on public.withdrawal_requests for select
  using (auth.uid() = user_id);
create policy "withdrawal_requests: own insert"
  on public.withdrawal_requests for insert
  with check (auth.uid() = user_id);

alter table public.deposit_requests enable row level security;
do $$ BEGIN
  DROP POLICY IF EXISTS "deposit_requests: own read" ON public.deposit_requests;
  DROP POLICY IF EXISTS "deposit_requests: own insert" ON public.deposit_requests;
EXCEPTION WHEN OTHERS THEN null;
END $$;

create policy "deposit_requests: own read"
  on public.deposit_requests for select
  using (auth.uid() = user_id);
create policy "deposit_requests: own insert"
  on public.deposit_requests for insert
  with check (auth.uid() = user_id);
