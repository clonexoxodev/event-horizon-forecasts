-- RUN 17th: Create saved_bank_details table

create table if not exists public.saved_bank_details (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  bank_name       text not null,
  account_number  text not null,
  account_name    text not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id)
);

create index if not exists idx_saved_bank_details_user_id on public.saved_bank_details(user_id);
