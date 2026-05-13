-- Migration: Add utility functions for common operations
-- Created: 2024-01-15
-- Description: Add database functions for calculating returns, updating leaderboards, etc.

-- UP Migration

-- Function to calculate potential return for a position
CREATE OR REPLACE FUNCTION calculate_potential_return(
  position_amount BIGINT,
  position_side VARCHAR(3),
  yes_pool BIGINT,
  no_pool BIGINT
) RETURNS BIGINT AS $$
DECLARE
  total_pool BIGINT;
  opposing_pool BIGINT;
  return_amount BIGINT;
BEGIN
  total_pool := yes_pool + no_pool + position_amount;
  
  IF position_side = 'YES' THEN
    opposing_pool := no_pool;
  ELSE
    opposing_pool := yes_pool;
  END IF;
  
  -- If opposing pool is zero, return the position amount (no profit)
  IF opposing_pool = 0 THEN
    RETURN position_amount;
  END IF;
  
  -- Calculate return using the formula: position_amount + (position_amount * opposing_pool / (current_side_pool + position_amount))
  return_amount := position_amount + (position_amount * opposing_pool / (total_pool - opposing_pool));
  
  RETURN return_amount;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update leaderboard entry for a user
CREATE OR REPLACE FUNCTION update_leaderboard_entry(user_uuid UUID) RETURNS VOID AS $$
DECLARE
  total_preds INTEGER;
  correct_preds INTEGER;
  accuracy DECIMAL(5,2);
  points INTEGER;
BEGIN
  -- Count total predictions
  SELECT COUNT(*) INTO total_preds
  FROM positions 
  WHERE user_id = user_uuid AND resolved_at IS NOT NULL;
  
  -- Count correct predictions
  SELECT COUNT(*) INTO correct_preds
  FROM positions 
  WHERE user_id = user_uuid AND is_winner = TRUE;
  
  -- Calculate accuracy
  IF total_preds > 0 THEN
    accuracy := (correct_preds::DECIMAL / total_preds::DECIMAL) * 100;
  ELSE
    accuracy := 0;
  END IF;
  
  -- Calculate points (10 points per correct prediction + accuracy bonus)
  points := (correct_preds * 10) + FLOOR(accuracy);
  
  -- Insert or update leaderboard entry
  INSERT INTO leaderboard_entries (user_id, total_points, total_predictions, correct_predictions, accuracy_percentage)
  VALUES (user_uuid, points, total_preds, correct_preds, accuracy)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_points = EXCLUDED.total_points,
    total_predictions = EXCLUDED.total_predictions,
    correct_predictions = EXCLUDED.correct_predictions,
    accuracy_percentage = EXCLUDED.accuracy_percentage,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to update all leaderboard ranks
CREATE OR REPLACE FUNCTION update_leaderboard_ranks() RETURNS VOID AS $$
BEGIN
  WITH ranked_entries AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY total_points DESC, accuracy_percentage DESC, total_predictions DESC) as new_rank
    FROM leaderboard_entries
    WHERE total_predictions > 0
  )
  UPDATE leaderboard_entries 
  SET rank = ranked_entries.new_rank
  FROM ranked_entries
  WHERE leaderboard_entries.id = ranked_entries.id;
  
  -- Set rank to NULL for users with no predictions
  UPDATE leaderboard_entries 
  SET rank = NULL 
  WHERE total_predictions = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get wallet balance in display format
CREATE OR REPLACE FUNCTION get_wallet_display_balance(
  user_uuid UUID,
  display_currency VARCHAR(3)
) RETURNS TABLE(
  total_balance DECIMAL(10,2),
  available_balance DECIMAL(10,2),
  currency VARCHAR(3)
) AS $$
BEGIN
  IF display_currency = 'NGN' THEN
    RETURN QUERY
    SELECT 
      (balance_ngn_kobo::DECIMAL / 100) as total_balance,
      (available_ngn_kobo::DECIMAL / 100) as available_balance,
      'NGN'::VARCHAR(3) as currency
    FROM wallets 
    WHERE user_id = user_uuid;
  ELSE
    RETURN QUERY
    SELECT 
      (balance_usd_cents::DECIMAL / 100) as total_balance,
      (available_usd_cents::DECIMAL / 100) as available_balance,
      'USD'::VARCHAR(3) as currency
    FROM wallets 
    WHERE user_id = user_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to validate position constraints
CREATE OR REPLACE FUNCTION validate_position_constraints(
  user_uuid UUID,
  market_uuid UUID,
  position_amount BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
  market_record RECORD;
  wallet_record RECORD;
  available_balance BIGINT;
BEGIN
  -- Get market details
  SELECT * INTO market_record FROM markets WHERE id = market_uuid;
  
  -- Check if market exists and is active
  IF market_record IS NULL OR market_record.state != 'active' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if market is still open
  IF market_record.closes_at <= CURRENT_TIMESTAMP THEN
    RETURN FALSE;
  END IF;
  
  -- Check amount constraints
  IF position_amount <= 0 OR position_amount < market_record.min_position_smallest_unit THEN
    RETURN FALSE;
  END IF;
  
  IF market_record.max_position_smallest_unit IS NOT NULL AND 
     position_amount > market_record.max_position_smallest_unit THEN
    RETURN FALSE;
  END IF;
  
  -- Get wallet details
  SELECT * INTO wallet_record FROM wallets WHERE user_id = user_uuid;
  
  IF wallet_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check available balance
  IF market_record.currency = 'NGN' THEN
    available_balance := wallet_record.available_ngn_kobo;
  ELSE
    available_balance := wallet_record.available_usd_cents;
  END IF;
  
  IF available_balance < position_amount THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- DOWN Migration (for rollback)
-- DROP FUNCTION IF EXISTS calculate_potential_return(BIGINT, VARCHAR(3), BIGINT, BIGINT);
-- DROP FUNCTION IF EXISTS update_leaderboard_entry(UUID);
-- DROP FUNCTION IF EXISTS update_leaderboard_ranks();
-- DROP FUNCTION IF EXISTS get_wallet_display_balance(UUID, VARCHAR(3));
-- DROP FUNCTION IF EXISTS validate_position_constraints(UUID, UUID, BIGINT);