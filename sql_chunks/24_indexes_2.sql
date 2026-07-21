-- RUN 24th (LAST): Performance indexes (part 2 of 2)

create index if not exists idx_wallets_user_id on public.wallets(user_id);
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_username on public.users(username);
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_account_status on public.users(account_status);
create index if not exists idx_markets_status on public.markets(status);
create index if not exists idx_markets_state on public.markets(state);
create index if not exists idx_markets_category on public.markets(category);
create index if not exists idx_markets_closes_at on public.markets(closes_at);
create index if not exists idx_markets_activation_state on public.markets(activation_state);
create index if not exists idx_markets_created_at on public.markets(created_at desc);
