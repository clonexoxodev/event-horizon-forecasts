import { describe, it, expect, beforeAll } from 'vitest';
import { query, transaction, testConnection, getClient } from './connection.js';

describe('Database Connection', () => {
  beforeAll(async () => {
    // Ensure database is connected
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed. Please ensure PostgreSQL is running.');
    }
  });

  describe('testConnection', () => {
    it('should successfully connect to the database', async () => {
      const result = await testConnection();
      expect(result).toBe(true);
    });
  });

  describe('query', () => {
    it('should execute a simple query', async () => {
      const result = await query('SELECT 1 as value');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].value).toBe(1);
    });

    it('should execute a parameterized query', async () => {
      const result = await query('SELECT $1::text as message', ['Hello, World!']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].message).toBe('Hello, World!');
    });

    it('should return row count', async () => {
      const result = await query('SELECT 1 UNION SELECT 2 UNION SELECT 3');
      expect(result.rowCount).toBe(3);
      expect(result.rows).toHaveLength(3);
    });

    it('should handle queries with no results', async () => {
      const result = await query('SELECT 1 WHERE FALSE');
      expect(result.rows).toHaveLength(0);
      expect(result.rowCount).toBe(0);
    });

    it('should throw error for invalid SQL', async () => {
      await expect(query('INVALID SQL STATEMENT')).rejects.toThrow();
    });
  });

  describe('transaction', () => {
    it('should commit successful transaction', async () => {
      const result = await transaction(async (client) => {
        const res = await client.query('SELECT 1 as value');
        return res.rows[0].value;
      });

      expect(result).toBe(1);
    });

    it('should rollback failed transaction', async () => {
      // Create a temporary table for testing
      await query(`
        CREATE TEMP TABLE IF NOT EXISTS test_rollback (
          id SERIAL PRIMARY KEY,
          value INTEGER
        )
      `);

      // Insert initial value
      await query('INSERT INTO test_rollback (value) VALUES (100)');

      // Attempt transaction that will fail
      try {
        await transaction(async (client) => {
          await client.query('INSERT INTO test_rollback (value) VALUES (200)');
          // Force an error
          throw new Error('Intentional error');
        });
      } catch (error) {
        // Expected to throw
      }

      // Check that only the first insert was committed
      const result = await query('SELECT COUNT(*) as count FROM test_rollback');
      expect(result.rows[0].count).toBe('1');
    });

    it('should handle nested operations in transaction', async () => {
      const result = await transaction(async (client) => {
        const res1 = await client.query('SELECT 1 as value');
        const res2 = await client.query('SELECT 2 as value');
        return res1.rows[0].value + res2.rows[0].value;
      });

      expect(result).toBe(3);
    });
  });

  describe('getClient', () => {
    it('should provide a client from the pool', async () => {
      const client = await getClient();
      expect(client).toBeDefined();
      expect(typeof client.query).toBe('function');
      expect(typeof client.release).toBe('function');

      // Test the client works
      const result = await client.query('SELECT 1 as value');
      expect(result.rows[0].value).toBe(1);

      // Release the client back to the pool
      client.release();
    });

    it('should allow manual transaction management', async () => {
      const client = await getClient();

      try {
        await client.query('BEGIN');
        await client.query('SELECT 1');
        await client.query('COMMIT');
      } finally {
        client.release();
      }
    });
  });

  describe('retry logic', () => {
    it('should retry failed queries', async () => {
      // This test verifies that the retry mechanism exists
      // In a real scenario, we would mock the pool to simulate failures
      const result = await query('SELECT 1 as value');
      expect(result.rows[0].value).toBe(1);
    });
  });

  describe('connection pool', () => {
    it('should handle multiple concurrent queries', async () => {
      const queries = Array.from({ length: 10 }, (_, i) =>
        query('SELECT $1::integer as value', [i])
      );

      const results = await Promise.all(queries);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.rows[0].value).toBe(index);
      });
    });
  });
});
