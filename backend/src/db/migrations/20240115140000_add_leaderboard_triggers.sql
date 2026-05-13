-- Migration: Add triggers for automatic leaderboard updates
-- Created: 2024-01-15
-- Description: Add triggers to automatically update leaderboard when positions are resolved

-- UP Migration

-- Trigger function to update leaderboard when position is resolved
CREATE OR REPLACE FUNCTION trigger_update_leaderboard() RETURNS TRIGGER AS $$
BEGIN
  -- Only update if the position was just resolved (is_winner changed from NULL to a value)
  IF OLD.is_winner IS NULL AND NEW.is_winner IS NOT NULL THEN
    PERFORM update_leaderboard_entry(NEW.user_id);
    -- Update ranks for all users (could be optimized to only update affected ranks)
    PERFORM update_leaderboard_ranks();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on positions table
CREATE TRIGGER trigger_position_resolved
  AFTER UPDATE ON positions
  FOR EACH ROW
  WHEN (OLD.is_winner IS DISTINCT FROM NEW.is_winner)
  EXECUTE FUNCTION trigger_update_leaderboard();

-- Trigger function to create leaderboard entry for new users
CREATE OR REPLACE FUNCTION trigger_create_leaderboard_entry() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO leaderboard_entries (user_id, total_points, total_predictions, correct_predictions, accuracy_percentage)
  VALUES (NEW.user_id, 0, 0, 0, 0.00)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on wallets table (when wallet is created, user is created)
CREATE TRIGGER trigger_wallet_created
  AFTER INSERT ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_leaderboard_entry();

-- Function to automatically resolve positions when market is resolved
CREATE OR REPLACE FUNCTION trigger_resolve_positions() RETURNS TRIGGER AS $$
BEGIN
  -- Only process if market was just resolved (winning_side changed from NULL to a value)
  IF OLD.winning_side IS NULL AND NEW.winning_side IS NOT NULL THEN
    -- Update all positions for this market
    UPDATE positions 
    SET 
      is_winner = (side = NEW.winning_side),
      resolved_at = CURRENT_TIMESTAMP,
      payout_smallest_unit = CASE 
        WHEN side = NEW.winning_side THEN potential_return_smallest_unit
        ELSE 0
      END
    WHERE market_id = NEW.id AND is_winner IS NULL;
    
    -- Update wallet balances for winning positions
    UPDATE wallets 
    SET 
      balance_ngn_kobo = balance_ngn_kobo + COALESCE(payout_amounts.total_payout_ngn, 0),
      available_ngn_kobo = available_ngn_kobo + COALESCE(payout_amounts.total_payout_ngn, 0),
      balance_usd_cents = balance_usd_cents + COALESCE(payout_amounts.total_payout_usd, 0),
      available_usd_cents = available_usd_cents + COALESCE(payout_amounts.total_payout_usd, 0),
      updated_at = CURRENT_TIMESTAMP
    FROM (
      SELECT 
        p.user_id,
        SUM(CASE WHEN p.currency = 'NGN' AND p.is_winner = TRUE THEN p.payout_smallest_unit ELSE 0 END) as total_payout_ngn,
        SUM(CASE WHEN p.currency = 'USD' AND p.is_winner = TRUE THEN p.payout_smallest_unit ELSE 0 END) as total_payout_usd
      FROM positions p
      WHERE p.market_id = NEW.id AND p.is_winner = TRUE
      GROUP BY p.user_id
    ) as payout_amounts
    WHERE wallets.user_id = payout_amounts.user_id;
    
    -- Create payout transactions for winners
    INSERT INTO transactions (user_id, wallet_id, type, amount_smallest_unit, currency, direction, reference_id, reference_type, status)
    SELECT 
      p.user_id,
      w.id as wallet_id,
      'position_payout',
      p.payout_smallest_unit,
      p.currency,
      'IN',
      p.id,
      'position',
      'completed'
    FROM positions p
    JOIN wallets w ON w.user_id = p.user_id
    WHERE p.market_id = NEW.id AND p.is_winner = TRUE AND p.payout_smallest_unit > 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on markets table
CREATE TRIGGER trigger_market_resolved
  AFTER UPDATE ON markets
  FOR EACH ROW
  WHEN (OLD.winning_side IS DISTINCT FROM NEW.winning_side)
  EXECUTE FUNCTION trigger_resolve_positions();

-- DOWN Migration (for rollback)
-- DROP TRIGGER IF EXISTS trigger_position_resolved ON positions;
-- DROP TRIGGER IF EXISTS trigger_wallet_created ON wallets;
-- DROP TRIGGER IF EXISTS trigger_market_resolved ON markets;
-- DROP FUNCTION IF EXISTS trigger_update_leaderboard();
-- DROP FUNCTION IF EXISTS trigger_create_leaderboard_entry();
-- DROP FUNCTION IF EXISTS trigger_resolve_positions();