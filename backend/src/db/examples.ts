/**
 * Database Usage Examples
 * 
 * This file demonstrates how to use the database connection module
 * in your application code.
 */

import { query, transaction, getClient } from './index.js';

// ============================================================================
// Example 1: Simple Query
// ============================================================================

export async function getUserByEmail(email: string) {
  const result = await query(
    'SELECT id, username, email FROM users WHERE email = $1',
    [email]
  );

  return result.rows[0] || null;
}

// ============================================================================
// Example 2: Insert with Returning
// ============================================================================

export async function createUser(username: string, email: string, passwordHash: string) {
  const result = await query(
    `INSERT INTO users (username, email, password_hash) 
     VALUES ($1, $2, $3) 
     RETURNING id, username, email, created_at`,
    [username, email, passwordHash]
  );

  return result.rows[0];
}

// ============================================================================
// Example 3: Update Query
// ============================================================================

export async function updateUserProfile(
  userId: string,
  profilePictureUrl: string,
  instagramHandle?: string,
  twitterHandle?: string
) {
  const result = await query(
    `UPDATE users 
     SET profile_picture_url = $1,
         instagram_handle = $2,
         twitter_handle = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [profilePictureUrl, instagramHandle, twitterHandle, userId]
  );

  return result.rows[0];
}

// ============================================================================
// Example 4: Transaction - Create User with Wallet
// ============================================================================

export async function createUserWithWallet(
  username: string,
  email: string,
  passwordHash: string
) {
  return await transaction(async (client) => {
    // Create user
    const userResult = await client.query(
      `INSERT INTO users (username, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, email`,
      [username, email, passwordHash]
    );

    const user = userResult.rows[0];

    // Create wallet with zero balance
    const walletResult = await client.query(
      `INSERT INTO wallets (
        user_id, 
        balance_ngn_kobo, 
        balance_usd_cents,
        available_ngn_kobo,
        available_usd_cents
      ) 
      VALUES ($1, 0, 0, 0, 0) 
      RETURNING *`,
      [user.id]
    );

    const wallet = walletResult.rows[0];

    // Create leaderboard entry
    await client.query(
      `INSERT INTO leaderboard_entries (user_id) 
       VALUES ($1)`,
      [user.id]
    );

    return { user, wallet };
  });
}

// ============================================================================
// Example 5: Transaction - Create Position
// ============================================================================

export async function createPosition(
  userId: string,
  marketId: string,
  side: 'YES' | 'NO',
  amountSmallestUnit: number
) {
  return await transaction(async (client) => {
    // 1. Get market details
    const marketResult = await client.query(
      'SELECT * FROM markets WHERE id = $1 AND state = $2',
      [marketId, 'active']
    );

    if (marketResult.rows.length === 0) {
      throw new Error('Market not found or not active');
    }

    const market = marketResult.rows[0];

    // 2. Get wallet
    const walletResult = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );

    const wallet = walletResult.rows[0];

    // 3. Check balance
    const availableBalance = market.currency === 'NGN'
      ? wallet.available_ngn_kobo
      : wallet.available_usd_cents;

    if (availableBalance < amountSmallestUnit) {
      throw new Error('Insufficient balance');
    }

    // 4. Calculate potential return (simplified)
    const potentialReturn = amountSmallestUnit * 2; // Simplified calculation

    // 5. Create position
    const positionResult = await client.query(
      `INSERT INTO positions (
        user_id, market_id, side, amount_smallest_unit, 
        currency, potential_return_smallest_unit
      ) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *`,
      [userId, marketId, side, amountSmallestUnit, market.currency, potentialReturn]
    );

    const position = positionResult.rows[0];

    // 6. Update wallet balance
    if (market.currency === 'NGN') {
      await client.query(
        'UPDATE wallets SET available_ngn_kobo = available_ngn_kobo - $1 WHERE user_id = $2',
        [amountSmallestUnit, userId]
      );
    } else {
      await client.query(
        'UPDATE wallets SET available_usd_cents = available_usd_cents - $1 WHERE user_id = $2',
        [amountSmallestUnit, userId]
      );
    }

    // 7. Update market pool
    await client.query(
      `UPDATE markets 
       SET pool_amount_smallest_unit = pool_amount_smallest_unit + $1,
           ${side === 'YES' ? 'yes_pool_smallest_unit' : 'no_pool_smallest_unit'} = 
           ${side === 'YES' ? 'yes_pool_smallest_unit' : 'no_pool_smallest_unit'} + $1
       WHERE id = $2`,
      [amountSmallestUnit, marketId]
    );

    // 8. Create transaction record
    await client.query(
      `INSERT INTO transactions (
        user_id, wallet_id, type, amount_smallest_unit, 
        currency, direction, reference_id, reference_type, status
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        wallet.id,
        'position_entry',
        amountSmallestUnit,
        market.currency,
        'OUT',
        position.id,
        'position',
        'completed',
      ]
    );

    return position;
  });
}

// ============================================================================
// Example 6: Complex Query with Joins
// ============================================================================

export async function getUserPositionsWithMarkets(userId: string) {
  const result = await query(
    `SELECT 
      p.id,
      p.side,
      p.amount_smallest_unit,
      p.currency,
      p.potential_return_smallest_unit,
      p.is_winner,
      p.payout_smallest_unit,
      p.created_at,
      m.id as market_id,
      m.question as market_question,
      m.state as market_state,
      m.winning_side
    FROM positions p
    JOIN markets m ON p.market_id = m.id
    WHERE p.user_id = $1
    ORDER BY p.created_at DESC`,
    [userId]
  );

  return result.rows;
}

// ============================================================================
// Example 7: Aggregation Query
// ============================================================================

export async function getMarketStatistics(marketId: string) {
  const result = await query(
    `SELECT 
      COUNT(*) as total_positions,
      COUNT(DISTINCT user_id) as unique_users,
      SUM(CASE WHEN side = 'YES' THEN amount_smallest_unit ELSE 0 END) as yes_total,
      SUM(CASE WHEN side = 'NO' THEN amount_smallest_unit ELSE 0 END) as no_total,
      AVG(amount_smallest_unit) as avg_position_size
    FROM positions
    WHERE market_id = $1`,
    [marketId]
  );

  return result.rows[0];
}

// ============================================================================
// Example 8: Batch Insert
// ============================================================================

export async function createBulkPositions(
  userId: string,
  positions: Array<{
    marketId: string;
    side: 'YES' | 'NO';
    amountSmallestUnit: number;
  }>
) {
  return await transaction(async (client) => {
    const createdPositions = [];

    for (const pos of positions) {
      // Get market
      const marketResult = await client.query(
        'SELECT * FROM markets WHERE id = $1',
        [pos.marketId]
      );
      const market = marketResult.rows[0];

      // Create position
      const positionResult = await client.query(
        `INSERT INTO positions (
          user_id, market_id, side, amount_smallest_unit, 
          currency, potential_return_smallest_unit
        ) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *`,
        [
          userId,
          pos.marketId,
          pos.side,
          pos.amountSmallestUnit,
          market.currency,
          pos.amountSmallestUnit * 2, // Simplified
        ]
      );

      createdPositions.push(positionResult.rows[0]);
    }

    return createdPositions;
  });
}

// ============================================================================
// Example 9: Manual Client Management
// ============================================================================

export async function complexOperationWithManualClient() {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Perform multiple operations
    const result1 = await client.query('SELECT * FROM users LIMIT 1');
    const result2 = await client.query('SELECT * FROM markets WHERE state = $1', ['active']);

    // Conditional logic
    if (result1.rows.length > 0) {
      await client.query('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [
        result1.rows[0].id,
      ]);
    }

    await client.query('COMMIT');

    return { users: result1.rows, markets: result2.rows };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// Example 10: Pagination
// ============================================================================

export async function getMarketsPaginated(page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;

  const result = await query(
    `SELECT * FROM markets 
     WHERE state = 'active' 
     ORDER BY created_at DESC 
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) as total FROM markets WHERE state = 'active'`
  );

  return {
    markets: result.rows,
    total: parseInt(countResult.rows[0].total),
    page,
    pageSize,
    totalPages: Math.ceil(parseInt(countResult.rows[0].total) / pageSize),
  };
}
