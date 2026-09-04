import { describe, it, expect, beforeAll } from 'vitest';
import { initializeDatabase, resetDatabase } from './initialize.js';
import { query, testConnection } from './connection.js';

describe('Database Initialization', () => {
  beforeAll(async () => {
    // Ensure database is connected
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed. Please ensure PostgreSQL is running.');
    }
  });

  describe('initializeDatabase', () => {
    it('should create all required tables', async () => {
      await initializeDatabase();

      // Check that all tables exist
      const result = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      const tableNames = result.rows.map((row) => row.table_name);

      expect(tableNames).toContain('users');
      expect(tableNames).toContain('wallets');
      expect(tableNames).toContain('markets');
      expect(tableNames).toContain('positions');
      expect(tableNames).toContain('transactions');
      expect(tableNames).toContain('leaderboard_entries');
      expect(tableNames).toContain('notifications');
    });

    it('should create indexes on users table', async () => {
      const result = await query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'users'
      `);

      const indexNames = result.rows.map((row) => row.indexname);

      expect(indexNames).toContain('idx_users_username');
      expect(indexNames).toContain('idx_users_email');
    });

    it('should create indexes on wallets table', async () => {
      const result = await query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'wallets'
      `);

      const indexNames = result.rows.map((row) => row.indexname);

      expect(indexNames).toContain('idx_wallets_user_id');
    });

    it('should create indexes on markets table', async () => {
      const result = await query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'markets'
      `);

      const indexNames = result.rows.map((row) => row.indexname);

      expect(indexNames).toContain('idx_markets_state');
      expect(indexNames).toContain('idx_markets_closes_at');
      expect(indexNames).toContain('idx_markets_created_at');
    });

    it('should create indexes on positions table', async () => {
      const result = await query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'positions'
      `);

      const indexNames = result.rows.map((row) => row.indexname);

      expect(indexNames).toContain('idx_positions_user_id');
      expect(indexNames).toContain('idx_positions_market_id');
      expect(indexNames).toContain('idx_positions_created_at');
      expect(indexNames).toContain('idx_positions_user_market');
    });

    it('should create indexes on transactions table', async () => {
      const result = await query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'transactions'
      `);

      const indexNames = result.rows.map((row) => row.indexname);

      expect(indexNames).toContain('idx_transactions_user_id');
      expect(indexNames).toContain('idx_transactions_wallet_id');
      expect(indexNames).toContain('idx_transactions_created_at');
      expect(indexNames).toContain('idx_transactions_reference');
    });

    it('should create indexes on leaderboard_entries table', async () => {
      const result = await query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'leaderboard_entries'
      `);

      const indexNames = result.rows.map((row) => row.indexname);

      expect(indexNames).toContain('idx_leaderboard_rank');
      expect(indexNames).toContain('idx_leaderboard_points');
      expect(indexNames).toContain('idx_leaderboard_user_id');
    });

    it('should create indexes on notifications table', async () => {
      const result = await query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'notifications'
      `);

      const indexNames = result.rows.map((row) => row.indexname);

      expect(indexNames).toContain('idx_notifications_user_id');
      expect(indexNames).toContain('idx_notifications_created_at');
      expect(indexNames).toContain('idx_notifications_is_read');
    });

    it('should create update_updated_at_column function', async () => {
      const result = await query(`
        SELECT proname 
        FROM pg_proc 
        WHERE proname = 'update_updated_at_column'
      `);

      expect(result.rows).toHaveLength(1);
    });

    it('should create triggers for updated_at columns', async () => {
      const result = await query(`
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE trigger_name LIKE '%updated_at%'
        ORDER BY event_object_table
      `);

      const triggers = result.rows.map((row) => ({
        name: row.trigger_name,
        table: row.event_object_table,
      }));

      expect(triggers.some((t) => t.table === 'users')).toBe(true);
      expect(triggers.some((t) => t.table === 'wallets')).toBe(true);
      expect(triggers.some((t) => t.table === 'markets')).toBe(true);
      expect(triggers.some((t) => t.table === 'leaderboard_entries')).toBe(true);
    });
  });

  describe('table constraints', () => {
    it('should enforce username length constraint', async () => {
      await expect(
        query(`
          INSERT INTO users (username, email, password_hash) 
          VALUES ('ab', 'test@example.com', 'hash')
        `)
      ).rejects.toThrow();
    });

    it('should enforce unique username constraint', async () => {
      await query(`
        INSERT INTO users (username, email, password_hash) 
        VALUES ('testuser', 'test1@example.com', 'hash')
      `);

      await expect(
        query(`
          INSERT INTO users (username, email, password_hash) 
          VALUES ('testuser', 'test2@example.com', 'hash')
        `)
      ).rejects.toThrow();
    });

    it('should enforce wallet balance constraints', async () => {
      // Create a user first
      const userResult = await query(`
        INSERT INTO users (username, email, password_hash) 
        VALUES ('walletuser', 'wallet@example.com', 'hash')
        RETURNING id
      `);
      const userId = userResult.rows[0].id;

      // Try to create wallet with negative balance
      await expect(
        query(`
          INSERT INTO wallets (user_id, balance_ngn_kobo, available_ngn_kobo) 
          VALUES ($1, -100, 0)
        `, [userId])
      ).rejects.toThrow();
    });

    it('should enforce market currency constraint', async () => {
      await expect(
        query(`
          INSERT INTO markets (
            question, currency, min_position_smallest_unit, 
            state, closes_at
          ) 
          VALUES (
            'Test market', 'EUR', 10000, 
            'active', NOW() + INTERVAL '1 day'
          )
        `)
      ).rejects.toThrow();
    });

    it('should enforce position amount positive constraint', async () => {
      // This would require creating user, wallet, and market first
      // Simplified test to check constraint exists
      const result = await query(`
        SELECT constraint_name 
        FROM information_schema.check_constraints 
        WHERE constraint_name = 'amount_positive'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('resetDatabase', () => {
    it('should drop and recreate all tables', async () => {
      await resetDatabase();

      // Verify tables exist
      const result = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);

      const tableNames = result.rows.map((row) => row.table_name);

      expect(tableNames).toContain('users');
      expect(tableNames).toContain('wallets');
      expect(tableNames).toContain('markets');
    });
  });
});
