-- RUN 18th: Create admin_audit_log table (fixes old schema if needed)

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_audit_log') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_audit_log' AND column_name='actor_email'
    ) THEN
      DROP POLICY IF EXISTS "audit_log: authenticated read" ON public.admin_audit_log;
      DROP TABLE public.admin_audit_log;
    END IF;
  END IF;
END $$;

create table if not exists public.admin_audit_log (
  id              uuid primary key default gen_random_uuid(),
  action          text not null,
  actor_id        uuid references auth.users(id),
  actor_email     text,
  actor_role      text,
  target_type     text,
  target_id       text,
  target_label    text,
  details         jsonb,
  created_at      timestamptz default now()
);

create index if not exists idx_audit_log_action on public.admin_audit_log(action);
create index if not exists idx_audit_log_actor_id on public.admin_audit_log(actor_id);
create index if not exists idx_audit_log_created_at on public.admin_audit_log(created_at desc);
