-- Flippe fixed-share market engine RPCs.
-- Run this in Supabase before enabling real-money settlement.

create or replace function public.flippe_place_prediction_fixed_share(
  p_market_id uuid,
  p_user_id uuid,
  p_side text,
  p_amount_smallest_unit bigint,
  p_currency text default 'NGN'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_market public.markets%rowtype;
  v_wallet public.wallets%rowtype;
  v_side text := upper(p_side);
  v_balance_field text;
  v_yes_pool bigint;
  v_no_pool bigint;
  v_next_yes_pool bigint;
  v_next_no_pool bigint;
  v_next_total_pool bigint;
  v_entry_price numeric;
  v_next_yes_price numeric;
  v_next_no_price numeric;
  v_amount_ngn numeric;
  v_shares numeric;
  v_payout bigint;
  v_profit bigint;
  v_current_liability bigint := 0;
  v_max_pool_stake bigint;
  v_max_solvent_stake bigint;
  v_max_safe_stake bigint;
  v_current_volume bigint;
  v_next_trade_count integer;
  v_position_id uuid;
  v_transaction_id uuid;
  v_participants integer;
begin
  if v_side not in ('YES', 'NO') then
    raise exception 'Prediction side must be YES or NO';
  end if;

  if p_amount_smallest_unit <= 0 then
    raise exception 'Prediction amount must be greater than zero';
  end if;

  select * into v_market
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  if coalesce(v_market.status, 'active') = 'active'
     and coalesce(v_market.closes_at, v_market.close_date) is not null
     and coalesce(v_market.closes_at, v_market.close_date) <= now() then
    update public.markets
      set status = 'pending_resolution',
          state = 'closed',
          updated_at = now()
      where id = p_market_id;
    raise exception 'This market is not accepting predictions';
  end if;

  if coalesce(v_market.status, 'active') not in ('active', 'open') then
    raise exception 'This market is not accepting predictions';
  end if;

  if coalesce(v_market.min_position_smallest_unit, 0) > 0
     and p_amount_smallest_unit < v_market.min_position_smallest_unit then
    raise exception 'Prediction amount is below the market minimum';
  end if;

  if coalesce(v_market.max_position_smallest_unit, 0) > 0
     and p_amount_smallest_unit > v_market.max_position_smallest_unit then
    raise exception 'Prediction amount is above the market maximum';
  end if;

  select * into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found';
  end if;

  v_balance_field := case when upper(p_currency) = 'USD' then 'available_usd_cents' else 'available_ngn_kobo' end;
  if (case when v_balance_field = 'available_usd_cents' then v_wallet.available_usd_cents else v_wallet.available_ngn_kobo end) < p_amount_smallest_unit then
    raise exception 'Insufficient available balance';
  end if;

  v_yes_pool := coalesce(v_market.yes_pool_smallest_unit, 0);
  v_no_pool := coalesce(v_market.no_pool_smallest_unit, 0);
  if v_yes_pool + v_no_pool <= 0 then
    v_entry_price := case when v_side = 'YES' then coalesce(v_market.yes_price, 50) else coalesce(v_market.no_price, 50) end;
  elsif v_side = 'YES' then
    v_entry_price := greatest(1, least(99, round((v_yes_pool::numeric / (v_yes_pool + v_no_pool)) * 100, 1)));
  else
    v_entry_price := greatest(1, least(99, round((v_no_pool::numeric / (v_yes_pool + v_no_pool)) * 100, 1)));
  end if;

  v_next_yes_pool := case when v_side = 'YES' then v_yes_pool + p_amount_smallest_unit else v_yes_pool end;
  v_next_no_pool := case when v_side = 'NO' then v_no_pool + p_amount_smallest_unit else v_no_pool end;
  v_next_total_pool := v_next_yes_pool + v_next_no_pool;
  v_max_pool_stake := floor((case when v_side = 'YES' then v_no_pool else v_yes_pool end) * 0.5);

  select coalesce(sum(
    case
      when coalesce(estimated_payout_smallest_unit, 0) > 0 then estimated_payout_smallest_unit
      when coalesce(shares_received, 0) > 0 then round(shares_received * 10000)
      when coalesce(price_at_purchase, entry_price, 0) > 0 then round((amount_smallest_unit::numeric / coalesce(price_at_purchase, entry_price)) * 100)
      else 0
    end
  ), 0)::bigint
  into v_current_liability
  from public.positions
  where market_id = p_market_id
    and side = v_side
    and settled_at is null
    and resolved_at is null
    and coalesce(status, 'active') not in ('won', 'lost', 'settled');

  if v_entry_price >= 100 then
    v_max_solvent_stake := greatest(0, v_next_total_pool - v_current_liability);
  else
    v_max_solvent_stake := greatest(0, floor((v_next_total_pool - v_current_liability) / ((100 / v_entry_price) - 1)));
  end if;
  v_max_safe_stake := greatest(0, least(v_max_pool_stake, v_max_solvent_stake));

  if p_amount_smallest_unit > v_max_safe_stake then
    raise exception 'Maximum available for this side is NGN % based on current liquidity and payout backing', floor(v_max_safe_stake / 100);
  end if;

  v_amount_ngn := p_amount_smallest_unit::numeric / 100;
  v_shares := v_amount_ngn / v_entry_price;
  v_payout := floor(v_shares * 10000);
  v_profit := v_payout - p_amount_smallest_unit;
  v_current_volume := coalesce(v_market.total_volume_smallest_unit, 0);
  v_next_trade_count := coalesce(v_market.trade_count, 0) + 1;

  if v_next_total_pool <= 0 then
    v_next_yes_price := 50;
  else
    v_next_yes_price := greatest(1, least(99, round((v_next_yes_pool::numeric / v_next_total_pool) * 100, 1)));
  end if;
  v_next_no_price := round(100 - v_next_yes_price, 1);

  insert into public.positions (
    user_id, market_id, side, amount_smallest_unit, stake_amount, currency,
    potential_return_smallest_unit, estimated_payout_smallest_unit,
    estimated_profit_smallest_unit, estimated_payout_at_purchase,
    estimated_profit_at_purchase, shares_received, price_at_purchase,
    entry_price, status
  ) values (
    p_user_id, p_market_id, v_side, p_amount_smallest_unit, v_amount_ngn, p_currency,
    v_payout, v_payout, v_profit, v_payout::numeric / 100,
    v_profit::numeric / 100, v_shares, v_entry_price, v_entry_price, 'active'
  )
  returning id into v_position_id;

  if v_balance_field = 'available_usd_cents' then
    update public.wallets
      set available_usd_cents = available_usd_cents - p_amount_smallest_unit,
          updated_at = now()
      where id = v_wallet.id;
  else
    update public.wallets
      set available_ngn_kobo = available_ngn_kobo - p_amount_smallest_unit,
          updated_at = now()
      where id = v_wallet.id;
  end if;

  insert into public.market_trades (
    market_id, user_id, position_id, side, amount_smallest_unit,
    price_before, price_after, yes_price_after, no_price_after, currency
  ) values (
    p_market_id, p_user_id, v_position_id, v_side, p_amount_smallest_unit,
    v_entry_price, case when v_side = 'YES' then v_next_yes_price else v_next_no_price end,
    v_next_yes_price, v_next_no_price, p_currency
  );

  select count(distinct user_id)::integer into v_participants
  from public.positions
  where market_id = p_market_id;

  update public.markets
    set yes_pool_smallest_unit = v_next_yes_pool,
        no_pool_smallest_unit = v_next_no_pool,
        pool_amount_smallest_unit = v_next_total_pool,
        yes_price = v_next_yes_price,
        no_price = v_next_no_price,
        trade_count = v_next_trade_count,
        participant_count = v_participants,
        total_volume_smallest_unit = v_current_volume + p_amount_smallest_unit,
        updated_at = now()
    where id = p_market_id;

  insert into public.market_price_history (
    market_id, yes_price, no_price, yes_pool_smallest_unit, no_pool_smallest_unit,
    volume_smallest_unit, trade_count, side, amount_smallest_unit
  ) values (
    p_market_id, round(v_next_yes_price), round(v_next_no_price), v_next_yes_pool, v_next_no_pool,
    v_current_volume + p_amount_smallest_unit, v_next_trade_count, v_side, p_amount_smallest_unit
  );

  insert into public.transactions (
    user_id, wallet_id, type, amount_smallest_unit, currency, direction,
    reference_id, reference_type, market_id, position_id, status, metadata
  ) values (
    p_user_id, v_wallet.id, 'position_entry', p_amount_smallest_unit, p_currency, 'OUT',
    v_position_id, 'position', p_market_id, v_position_id, 'completed',
    jsonb_build_object(
      'marketId', p_market_id,
      'marketQuestion', v_market.question,
      'category', v_market.category,
      'side', v_side,
      'entryPrice', v_entry_price,
      'sharesReceived', v_shares,
      'estimatedPayoutSmallestUnit', v_payout,
      'estimatedProfitSmallestUnit', v_profit
    )
  )
  returning id into v_transaction_id;

  insert into public.notifications (
    user_id, type, title, message, reference_id, reference_type, metadata
  ) values (
    p_user_id,
    'forecast_confirmed',
    'Prediction placed',
    'Your ' || v_side || ' prediction on "' || v_market.question || '" is active.',
    p_market_id,
    'market',
    jsonb_build_object('marketId', p_market_id, 'marketQuestion', v_market.question, 'side', v_side, 'amount', v_amount_ngn)
  );

  return jsonb_build_object(
    'positionId', v_position_id,
    'transactionId', v_transaction_id,
    'marketId', p_market_id
  );
end;
$$;

create or replace function public.flippe_resolve_market_fixed_share(
  p_market_id uuid,
  p_admin_user_id uuid,
  p_winning_outcome text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_market public.markets%rowtype;
  v_outcome text := upper(p_winning_outcome);
  v_position record;
  v_wallet public.wallets%rowtype;
  v_stake bigint;
  v_shares numeric;
  v_payout bigint;
  v_profit bigint;
  v_winners integer := 0;
  v_losers integer := 0;
  v_total_payout bigint := 0;
begin
  if v_outcome not in ('YES', 'NO') then
    raise exception 'Choose YES or NO';
  end if;

  select * into v_market
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  if coalesce(v_market.status, 'active') = 'resolved' or v_market.resolved_at is not null then
    return jsonb_build_object('alreadyResolved', true, 'marketId', p_market_id);
  end if;

  if coalesce(v_market.status, 'active') not in ('closed', 'pending_resolution')
     and (coalesce(v_market.closes_at, v_market.close_date) is null or coalesce(v_market.closes_at, v_market.close_date) > now()) then
    raise exception 'Market must be ended or pending resolution before settlement';
  end if;

  for v_position in
    select * from public.positions
    where market_id = p_market_id
    for update
  loop
    if v_position.settled_at is not null
       or v_position.resolved_at is not null
       or coalesce(v_position.status, 'active') in ('won', 'lost', 'settled') then
      continue;
    end if;

    v_stake := coalesce(v_position.amount_smallest_unit, round(coalesce(v_position.stake_amount, 0) * 100));
    v_shares := coalesce(v_position.shares_received, 0);
    if v_shares <= 0 and coalesce(v_position.price_at_purchase, v_position.entry_price, 0) > 0 then
      v_shares := (v_stake::numeric / 100) / coalesce(v_position.price_at_purchase, v_position.entry_price);
    end if;

    if v_position.side = v_outcome then
      v_payout := greatest(0, round(v_shares * 10000));
      v_profit := v_payout - v_stake;
      v_winners := v_winners + 1;
    else
      v_payout := 0;
      v_profit := -v_stake;
      v_losers := v_losers + 1;
    end if;

    update public.positions
      set is_winner = (v_position.side = v_outcome),
          payout_smallest_unit = v_payout,
          final_payout_smallest_unit = v_payout,
          profit_smallest_unit = v_profit,
          status = case when v_position.side = v_outcome then 'won' else 'lost' end,
          resolved_at = now(),
          settled_at = now(),
          winning_outcome = v_outcome,
          market_question_snapshot = v_market.question,
          market_category_snapshot = coalesce(v_market.category, 'General')
      where id = v_position.id;

    select * into v_wallet
    from public.wallets
    where user_id = v_position.user_id
    for update;

    if found then
      if v_payout > 0 then
        if coalesce(v_position.currency, 'NGN') = 'USD' then
          update public.wallets
            set available_usd_cents = available_usd_cents + v_payout,
                balance_usd_cents = balance_usd_cents + greatest(0, v_profit),
                updated_at = now()
            where id = v_wallet.id;
        else
          update public.wallets
            set available_ngn_kobo = available_ngn_kobo + v_payout,
                balance_ngn_kobo = balance_ngn_kobo + greatest(0, v_profit),
                updated_at = now()
            where id = v_wallet.id;
        end if;
      else
        if coalesce(v_position.currency, 'NGN') = 'USD' then
          update public.wallets
            set balance_usd_cents = greatest(0, balance_usd_cents - v_stake),
                updated_at = now()
            where id = v_wallet.id;
        else
          update public.wallets
            set balance_ngn_kobo = greatest(0, balance_ngn_kobo - v_stake),
                updated_at = now()
            where id = v_wallet.id;
        end if;
      end if;

      if v_payout > 0 then
        insert into public.transactions (
          user_id, wallet_id, type, amount_smallest_unit, currency, direction,
          reference_id, reference_type, market_id, position_id, status, metadata
        ) values (
          v_position.user_id, v_wallet.id, 'position_payout', v_payout,
          coalesce(v_position.currency, 'NGN'), 'IN', v_position.id, 'position',
          p_market_id, v_position.id, 'completed',
          jsonb_build_object('marketId', p_market_id, 'marketQuestion', v_market.question, 'outcome', v_outcome, 'payout', v_payout::numeric / 100, 'profit', v_profit::numeric / 100)
        );
      end if;
    end if;

    insert into public.notifications (
      user_id, type, title, message, reference_id, reference_type, metadata
    ) values (
      v_position.user_id,
      case when v_payout > 0 then 'position_payout' else 'market_resolved' end,
      case when v_payout > 0 then 'Prediction won' else 'Market resolved' end,
      '"' || v_market.question || '" resolved as ' || v_outcome || '.',
      p_market_id,
      'market',
      jsonb_build_object('marketId', p_market_id, 'marketQuestion', v_market.question, 'outcome', v_outcome, 'payoutSmallestUnit', v_payout, 'profitSmallestUnit', v_profit)
    );

    v_total_payout := v_total_payout + v_payout;
  end loop;

  insert into public.market_resolution_logs (
    market_id, resolved_by, outcome, payout_pool_smallest_unit, resolved_position_count, payout_summary
  ) values (
    p_market_id,
    p_admin_user_id,
    v_outcome,
    v_total_payout,
    v_winners + v_losers,
    jsonb_build_object('winningOutcome', v_outcome, 'totalWinners', v_winners, 'totalLosers', v_losers, 'totalPayout', v_total_payout::numeric / 100)
  );

  update public.markets
    set status = 'resolved',
        state = 'resolved',
        outcome = v_outcome,
        winning_outcome = v_outcome,
        resolved_outcome = v_outcome,
        resolved_at = now(),
        resolved_by = p_admin_user_id,
        updated_at = now()
    where id = p_market_id;

  return jsonb_build_object(
    'marketId', p_market_id,
    'winningOutcome', v_outcome,
    'totalWinners', v_winners,
    'totalLosers', v_losers,
    'totalPayout', v_total_payout::numeric / 100
  );
end;
$$;
