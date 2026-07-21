-- RUN 23rd: Performance indexes (part 1 of 2)

create index if not exists idx_positions_market_id on public.positions(market_id);
create index if not exists idx_positions_user_id on public.positions(user_id);
create index if not exists idx_positions_status on public.positions(status);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_type on public.transactions(type);
create index if not exists idx_transactions_status on public.transactions(status);
create index if not exists idx_transactions_created_at on public.transactions(created_at desc);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_is_read on public.notifications(is_read);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
