import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool, { testConnection, closePool } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Initialize the database by running the init.sql script
 * This creates all tables, indexes, constraints, and triggers
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Starting database initialization...');

    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Read the SQL initialization script
    const sqlPath = join(__dirname, 'init.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    // Execute the SQL script
    await pool.query(sql);

    console.log('Database initialization completed successfully');
    console.log('Created tables:');
    console.log('  - users');
    console.log('  - wallets');
    console.log('  - markets');
    console.log('  - positions');
    console.log('  - transactions');
    console.log('  - leaderboard_entries');
    console.log('  - notifications');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Drop all tables (use with caution!)
 * This is useful for development and testing
 */
export async function dropAllTables(): Promise<void> {
  try {
    console.log('Dropping all tables...');

    await pool.query(`DROP TABLE IF EXISTS notifications CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS leaderboard_entries CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS transactions CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS positions CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS markets CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS wallets CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS users CASCADE`);
    await pool.query(`DROP FUNCTION IF EXISTS update_updated_at_column CASCADE`);

    console.log('All tables dropped successfully');
  } catch (error) {
    console.error('Failed to drop tables:', error);
    throw error;
  }
}

/**
 * Reset the database (drop and recreate all tables)
 * This is useful for development and testing
 */
export async function resetDatabase(): Promise<void> {
  try {
    console.log('Resetting database...');
    await dropAllTables();
    await initializeDatabase();
    console.log('Database reset completed successfully');
  } catch (error) {
    console.error('Database reset failed:', error);
    throw error;
  }
}

// Run initialization if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  (async () => {
    try {
      switch (command) {
        case 'init':
          await initializeDatabase();
          break;
        case 'drop':
          await dropAllTables();
          break;
        case 'reset':
          await resetDatabase();
          break;
        default:
          console.log('Usage:');
          console.log('  npm run db:init   - Initialize database');
          console.log('  npm run db:drop   - Drop all tables');
          console.log('  npm run db:reset  - Reset database (drop and init)');
      }
    } catch (error) {
      console.error('Command failed:', error);
      process.exit(1);
    } finally {
      await closePool();
    }
  })();
}
