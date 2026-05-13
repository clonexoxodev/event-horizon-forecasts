import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import fc from 'fast-check';
import { query, transaction, testConnection } from './connection.js';
import { initializeDatabase, resetDatabase } from './initialize.js';

/**
 * Property 34: Data Persistence for All Entities
 * 
 * For any entity created in the system (user account, wallet transaction, position, 
 * or market), the entity's data SHALL be persisted to the database and retrievable 
 * in subsequent queries.
 * 
 * Validates: Requirements 25.1, 25.2, 25.3, 25.4
 */

describe('Feature: prediction-platform-overhaul, Property 34: Data Persistence for All Entities', () => {
  beforeAll(async () => {
    // Ensure database is connected
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed. Please ensure PostgreSQL is running.');
    }
    
    // Initialize database schema
    await initializeDatabase();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await resetDatabase();
  });

  it('should persist and retrieve user entities with all constraints respected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          email: fc.emailAddress(),
          password_hash: fc.string({ minLength: 10, maxLength: 255 }),
          profile_picture_url: fc.option(fc.webUrl(), { nil: null }),
          instagram_handle: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
          twitter_handle: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null })
        }),
        async (userData) => {
          // Create user entity
          const insertResult = await query(`
            INSERT INTO users (username, email, password_hash, profile_picture_url, instagram_handle, twitter_handle)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `, [
            userData.username,
            userData.email,
            userData.password_hash,
            userData.profile_picture_url,
            userData.instagram_handle,
            userData.twitter_handle
          ]);

          expect(insertResult.rows).toHaveLength(1);
          const createdUser = insertResult.rows[0];

          // Verify entity was persisted correctly
          const retrieveResult = await query('SELECT * FROM users WHERE id = $1', [createdUser.id]);
          expect(retrieveResult.rows).toHaveLength(1);
          
          const retrievedUser = retrieveResult.rows[0];
          expect(retrievedUser.username).toBe(userData.username);
          expect(retrievedUser.email).toBe(userData.email);
          expect(retrievedUser.password_hash).toBe(userData.password_hash);
          expect(retrievedUser.profile_picture_url).toBe(userData.profile_picture_url);
          expect(retrievedUser.instagram_handle).toBe(userData.instagram_handle);
          expect(retrievedUser.twitter_handle).toBe(userData.twitter_handle);
          expect(retrievedUser.created_at).toBeDefined();
          expect(retrievedUser.updated_at).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should persist and retrieve wallet entities with zero-balance initialization and constraints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          email: fc.emailAddress(),
          password_hash: fc.string({ minLength: 10, maxLength: 255 })
        }),
        async (userData) => {
          // First create a user
          const userResult = await query(`
            INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id
          `, [userData.username, userData.email, userData.password_hash]);

          const userId = userResult.rows[0].id;

          // Create wallet entity with zero balance (as per requirements)
          const insertResult = await query(`
            INSERT INTO wallets (user_id, balance_ngn_kobo, balance_usd_cents, available_ngn_kobo, available_usd_cents)
            VALUES ($1, 0, 0, 0, 0)
            RETURNING *
          `, [userId]);

          expect(insertResult.rows).toHaveLength(1);
          const createdWallet = insertResult.rows[0];

          // Verify entity was persisted correctly
          const retrieveResult = await query('SELECT * FROM wallets WHERE id = $1', [createdWallet.id]);
          expect(retrieveResult.rows).toHaveLength(1);
          
          const retrievedWallet = retrieveResult.rows[0];
          expect(retrievedWallet.user_id).toBe(userId);
          expect(retrievedWallet.balance_ngn_kobo).toBe(0); // Zero-balance initialization
          expect(retrievedWallet.balance_usd_cents).toBe(0); // Zero-balance initialization
          expect(retrievedWallet.available_ngn_kobo).toBe(0);
          expect(retrievedWallet.available_usd_cents).toBe(0);
          expect(retrievedWallet.created_at).toBeDefined();
          expect(retrievedWallet.updated_at).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should persist and retrieve market entities with pool consistency constraints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          question: fc.string({ minLength: 10, maxLength: 500 }),
          description: fc.option(fc.string({ minLength: 1, maxLength: 1000 }), { nil: null }),
          currency: fc.constantFrom('NGN', 'USD'),
          min_position_smallest_unit: fc.integer({ min: 100, max: 100000 }),
          max_position_smallest_unit: fc.option(fc.integer({ min: 100000, max: 10000000 }), { nil: null }),
          closes_at: fc.date({ min: new Date(Date.now() + 3600000) }) // At least 1 hour in future
        }),
        async (marketData) => {
          // Create market entity
          const insertResult = await query(`
            INSERT INTO markets (
              question, description, currency, min_position_smallest_unit, 
              max_position_smallest_unit, state, closes_at
            )
            VALUES ($1, $2, $3, $4, $5, 'active', $6)
            RETURNING *
          `, [
            marketData.question,
            marketData.description,
            marketData.currency,
            marketData.min_position_smallest_unit,
            marketData.max_position_smallest_unit,
            marketData.closes_at
          ]);

          expect(insertResult.rows).toHaveLength(1);
          const createdMarket = insertResult.rows[0];

          // Verify entity was persisted correctly
          const retrieveResult = await query('SELECT * FROM markets WHERE id = $1', [createdMarket.id]);
          expect(retrieveResult.rows).toHaveLength(1);
          
          const retrievedMarket = retrieveResult.rows[0];
          expect(retrievedMarket.question).toBe(marketData.question);
          expect(retrievedMarket.description).toBe(marketData.description);
          expect(retrievedMarket.currency).toBe(marketData.currency);
          expect(retrievedMarket.pool_amount_smallest_unit).toBe(0); // Initial pool is zero
          expect(retrievedMarket.yes_pool_smallest_unit).toBe(0);
          expect(retrievedMarket.no_pool_smallest_unit).toBe(0);
          expect(retrievedMarket.min_position_smallest_unit).toBe(marketData.min_position_smallest_unit);
          expect(retrievedMarket.max_position_smallest_unit).toBe(marketData.max_position_smallest_unit);
          expect(retrievedMarket.state).toBe('active');
          expect(retrievedMarket.closes_at.getTime()).toBe(marketData.closes_at.getTime());
          expect(retrievedMarket.created_at).toBeDefined();
          expect(retrievedMarket.updated_at).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should persist and retrieve position entities with foreign key constraints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // User data
          username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          email: fc.emailAddress(),
          password_hash: fc.string({ minLength: 10, maxLength: 255 }),
          // Market data
          question: fc.string({ minLength: 10, maxLength: 500 }),
          currency: fc.constantFrom('NGN', 'USD'),
          min_position_smallest_unit: fc.integer({ min: 100, max: 100000 }),
          closes_at: fc.date({ min: new Date(Date.now() + 3600000) }),
          // Position data
          side: fc.constantFrom('YES', 'NO'),
          amount_smallest_unit: fc.integer({ min: 1000, max: 1000000 }),
          potential_return_smallest_unit: fc.integer({ min: 1000, max: 2000000 })
        }),
        async (testData) => {
          // Create user first
          const userResult = await query(`
            INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id
          `, [testData.username, testData.email, testData.password_hash]);
          const userId = userResult.rows[0].id;

          // Create market
          const marketResult = await query(`
            INSERT INTO markets (question, currency, min_position_smallest_unit, state, closes_at)
            VALUES ($1, $2, $3, 'active', $4)
            RETURNING id
          `, [testData.question, testData.currency, testData.min_position_smallest_unit, testData.closes_at]);
          const marketId = marketResult.rows[0].id;

          // Create position entity
          const insertResult = await query(`
            INSERT INTO positions (
              user_id, market_id, side, amount_smallest_unit, 
              currency, potential_return_smallest_unit
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `, [
            userId,
            marketId,
            testData.side,
            testData.amount_smallest_unit,
            testData.currency,
            testData.potential_return_smallest_unit
          ]);

          expect(insertResult.rows).toHaveLength(1);
          const createdPosition = insertResult.rows[0];

          // Verify entity was persisted correctly
          const retrieveResult = await query('SELECT * FROM positions WHERE id = $1', [createdPosition.id]);
          expect(retrieveResult.rows).toHaveLength(1);
          
          const retrievedPosition = retrieveResult.rows[0];
          expect(retrievedPosition.user_id).toBe(userId);
          expect(retrievedPosition.market_id).toBe(marketId);
          expect(retrievedPosition.side).toBe(testData.side);
          expect(retrievedPosition.amount_smallest_unit).toBe(testData.amount_smallest_unit);
          expect(retrievedPosition.currency).toBe(testData.currency);
          expect(retrievedPosition.potential_return_smallest_unit).toBe(testData.potential_return_smallest_unit);
          expect(retrievedPosition.is_winner).toBeNull(); // Not resolved yet
          expect(retrievedPosition.payout_smallest_unit).toBeNull();
          expect(retrievedPosition.created_at).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should persist and retrieve transaction entities with reference tracking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // User data
          username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          email: fc.emailAddress(),
          password_hash: fc.string({ minLength: 10, maxLength: 255 }),
          // Transaction data
          type: fc.constantFrom('deposit', 'withdrawal', 'position_entry', 'position_payout'),
          amount_smallest_unit: fc.integer({ min: 100, max: 10000000 }),
          currency: fc.constantFrom('NGN', 'USD'),
          direction: fc.constantFrom('IN', 'OUT'),
          status: fc.constantFrom('pending', 'completed', 'failed'),
          metadata: fc.option(fc.record({
            method: fc.constantFrom('bank_transfer', 'card', 'crypto'),
            reference: fc.string({ minLength: 5, maxLength: 50 })
          }), { nil: null })
        }),
        async (testData) => {
          // Create user and wallet first
          const userResult = await query(`
            INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id
          `, [testData.username, testData.email, testData.password_hash]);
          const userId = userResult.rows[0].id;

          const walletResult = await query(`
            INSERT INTO wallets (user_id)
            VALUES ($1)
            RETURNING id
          `, [userId]);
          const walletId = walletResult.rows[0].id;

          // Create transaction entity
          const insertResult = await query(`
            INSERT INTO transactions (
              user_id, wallet_id, type, amount_smallest_unit, 
              currency, direction, status, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
          `, [
            userId,
            walletId,
            testData.type,
            testData.amount_smallest_unit,
            testData.currency,
            testData.direction,
            testData.status,
            testData.metadata ? JSON.stringify(testData.metadata) : null
          ]);

          expect(insertResult.rows).toHaveLength(1);
          const createdTransaction = insertResult.rows[0];

          // Verify entity was persisted correctly
          const retrieveResult = await query('SELECT * FROM transactions WHERE id = $1', [createdTransaction.id]);
          expect(retrieveResult.rows).toHaveLength(1);
          
          const retrievedTransaction = retrieveResult.rows[0];
          expect(retrievedTransaction.user_id).toBe(userId);
          expect(retrievedTransaction.wallet_id).toBe(walletId);
          expect(retrievedTransaction.type).toBe(testData.type);
          expect(retrievedTransaction.amount_smallest_unit).toBe(testData.amount_smallest_unit);
          expect(retrievedTransaction.currency).toBe(testData.currency);
          expect(retrievedTransaction.direction).toBe(testData.direction);
          expect(retrievedTransaction.status).toBe(testData.status);
          
          if (testData.metadata) {
            expect(retrievedTransaction.metadata).toEqual(testData.metadata);
          } else {
            expect(retrievedTransaction.metadata).toBeNull();
          }
          
          expect(retrievedTransaction.created_at).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should persist and retrieve leaderboard entries with accuracy constraints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // User data
          username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          email: fc.emailAddress(),
          password_hash: fc.string({ minLength: 10, maxLength: 255 }),
          // Leaderboard data
          total_points: fc.integer({ min: 0, max: 1000000 }),
          total_predictions: fc.integer({ min: 0, max: 10000 }),
          correct_predictions: fc.integer({ min: 0, max: 10000 })
        }),
        async (testData) => {
          // Ensure correct_predictions <= total_predictions
          const correctPredictions = Math.min(testData.correct_predictions, testData.total_predictions);
          const accuracyPercentage = testData.total_predictions > 0 
            ? (correctPredictions / testData.total_predictions) * 100 
            : 0;

          // Create user first
          const userResult = await query(`
            INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id
          `, [testData.username, testData.email, testData.password_hash]);
          const userId = userResult.rows[0].id;

          // Create leaderboard entry
          const insertResult = await query(`
            INSERT INTO leaderboard_entries (
              user_id, total_points, total_predictions, 
              correct_predictions, accuracy_percentage
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `, [
            userId,
            testData.total_points,
            testData.total_predictions,
            correctPredictions,
            accuracyPercentage
          ]);

          expect(insertResult.rows).toHaveLength(1);
          const createdEntry = insertResult.rows[0];

          // Verify entity was persisted correctly
          const retrieveResult = await query('SELECT * FROM leaderboard_entries WHERE id = $1', [createdEntry.id]);
          expect(retrieveResult.rows).toHaveLength(1);
          
          const retrievedEntry = retrieveResult.rows[0];
          expect(retrievedEntry.user_id).toBe(userId);
          expect(retrievedEntry.total_points).toBe(testData.total_points);
          expect(retrievedEntry.total_predictions).toBe(testData.total_predictions);
          expect(retrievedEntry.correct_predictions).toBe(correctPredictions);
          expect(parseFloat(retrievedEntry.accuracy_percentage)).toBeCloseTo(accuracyPercentage, 2);
          expect(retrievedEntry.updated_at).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should persist and retrieve notification entities with type constraints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // User data
          username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          email: fc.emailAddress(),
          password_hash: fc.string({ minLength: 10, maxLength: 255 }),
          // Notification data
          type: fc.constantFrom('market_resolved', 'deposit_confirmed', 'withdrawal_confirmed', 'position_won', 'position_lost'),
          title: fc.string({ minLength: 1, maxLength: 255 }),
          message: fc.string({ minLength: 1, maxLength: 1000 }),
          is_read: fc.boolean()
        }),
        async (testData) => {
          // Create user first
          const userResult = await query(`
            INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id
          `, [testData.username, testData.email, testData.password_hash]);
          const userId = userResult.rows[0].id;

          // Create notification entity
          const insertResult = await query(`
            INSERT INTO notifications (user_id, type, title, message, is_read)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `, [
            userId,
            testData.type,
            testData.title,
            testData.message,
            testData.is_read
          ]);

          expect(insertResult.rows).toHaveLength(1);
          const createdNotification = insertResult.rows[0];

          // Verify entity was persisted correctly
          const retrieveResult = await query('SELECT * FROM notifications WHERE id = $1', [createdNotification.id]);
          expect(retrieveResult.rows).toHaveLength(1);
          
          const retrievedNotification = retrieveResult.rows[0];
          expect(retrievedNotification.user_id).toBe(userId);
          expect(retrievedNotification.type).toBe(testData.type);
          expect(retrievedNotification.title).toBe(testData.title);
          expect(retrievedNotification.message).toBe(testData.message);
          expect(retrievedNotification.is_read).toBe(testData.is_read);
          expect(retrievedNotification.created_at).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain referential integrity across all entities in complex scenarios', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // User data
          username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          email: fc.emailAddress(),
          password_hash: fc.string({ minLength: 10, maxLength: 255 }),
          // Market data
          question: fc.string({ minLength: 10, maxLength: 500 }),
          currency: fc.constantFrom('NGN', 'USD'),
          min_position_smallest_unit: fc.integer({ min: 100, max: 100000 }),
          closes_at: fc.date({ min: new Date(Date.now() + 3600000) }),
          // Position data
          side: fc.constantFrom('YES', 'NO'),
          amount_smallest_unit: fc.integer({ min: 1000, max: 1000000 })
        }),
        async (testData) => {
          await transaction(async (client) => {
            // Create user
            const userResult = await client.query(`
              INSERT INTO users (username, email, password_hash)
              VALUES ($1, $2, $3)
              RETURNING id
            `, [testData.username, testData.email, testData.password_hash]);
            const userId = userResult.rows[0].id;

            // Create wallet
            const walletResult = await client.query(`
              INSERT INTO wallets (user_id)
              VALUES ($1)
              RETURNING id
            `, [userId]);
            const walletId = walletResult.rows[0].id;

            // Create market
            const marketResult = await client.query(`
              INSERT INTO markets (question, currency, min_position_smallest_unit, state, closes_at)
              VALUES ($1, $2, $3, 'active', $4)
              RETURNING id
            `, [testData.question, testData.currency, testData.min_position_smallest_unit, testData.closes_at]);
            const marketId = marketResult.rows[0].id;

            // Create position
            const positionResult = await client.query(`
              INSERT INTO positions (user_id, market_id, side, amount_smallest_unit, currency, potential_return_smallest_unit)
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id
            `, [userId, marketId, testData.side, testData.amount_smallest_unit, testData.currency, testData.amount_smallest_unit * 2]);
            const positionId = positionResult.rows[0].id;

            // Create transaction
            const transactionResult = await client.query(`
              INSERT INTO transactions (user_id, wallet_id, type, amount_smallest_unit, currency, direction, reference_id, reference_type, status)
              VALUES ($1, $2, 'position_entry', $3, $4, 'OUT', $5, 'position', 'completed')
              RETURNING id
            `, [userId, walletId, testData.amount_smallest_unit, testData.currency, positionId]);
            const transactionId = transactionResult.rows[0].id;

            // Create leaderboard entry
            const leaderboardResult = await client.query(`
              INSERT INTO leaderboard_entries (user_id, total_points, total_predictions, correct_predictions, accuracy_percentage)
              VALUES ($1, 100, 1, 0, 0.00)
              RETURNING id
            `, [userId]);
            const leaderboardId = leaderboardResult.rows[0].id;

            // Create notification
            const notificationResult = await client.query(`
              INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
              VALUES ($1, 'position_won', 'Position Created', 'Your position has been created', $2, 'position')
              RETURNING id
            `, [userId, positionId]);
            const notificationId = notificationResult.rows[0].id;

            // Verify all entities exist and are properly linked
            const verifyResult = await client.query(`
              SELECT 
                u.id as user_id,
                w.id as wallet_id,
                m.id as market_id,
                p.id as position_id,
                t.id as transaction_id,
                l.id as leaderboard_id,
                n.id as notification_id
              FROM users u
              JOIN wallets w ON w.user_id = u.id
              JOIN positions p ON p.user_id = u.id
              JOIN markets m ON m.id = p.market_id
              JOIN transactions t ON t.user_id = u.id AND t.reference_id = p.id
              JOIN leaderboard_entries l ON l.user_id = u.id
              JOIN notifications n ON n.user_id = u.id
              WHERE u.id = $1
            `, [userId]);

            expect(verifyResult.rows).toHaveLength(1);
            const result = verifyResult.rows[0];
            
            expect(result.user_id).toBe(userId);
            expect(result.wallet_id).toBe(walletId);
            expect(result.market_id).toBe(marketId);
            expect(result.position_id).toBe(positionId);
            expect(result.transaction_id).toBe(transactionId);
            expect(result.leaderboard_id).toBe(leaderboardId);
            expect(result.notification_id).toBe(notificationId);
          });
        }
      ),
      { numRuns: 50 } // Reduced runs for complex scenario
    );
  });
});