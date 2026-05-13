import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool, { testConnection, closePool } from './connection.js';
import { runMigrations } from './migrations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Complete database setup including schema initialization and migrations
 */
export async function setupDatabase(): Promise<void> {
  try {
    console.log('Starting complete database setup...\n');

    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Check if tables already exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'wallets', 'markets', 'positions', 'transactions', 'leaderboard_entries', 'notifications')
    `);

    const existingTables = tablesResult.rows.map(row => row.table_name);

    if (existingTables.length === 0) {
      console.log('No existing tables found. Running initial schema setup...');
      
      // Read and execute the initial schema
      const sqlPath = join(__dirname, 'init.sql');
      const sql = readFileSync(sqlPath, 'utf-8');
      await pool.query(sql);
      
      console.log('✓ Initial schema created successfully');
      console.log('Created tables:');
      console.log('  - users');
      console.log('  - wallets');
      console.log('  - markets');
      console.log('  - positions');
      console.log('  - transactions');
      console.log('  - leaderboard_entries');
      console.log('  - notifications');
      console.log();
    } else {
      console.log(`Found ${existingTables.length} existing tables. Skipping initial schema setup.`);
      console.log();
    }

    // Run any pending migrations
    console.log('Checking for pending migrations...');
    await runMigrations();

    console.log('\n✓ Database setup completed successfully!');
    
    // Verify the final schema
    await verifyCompleteSchema();
    
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  }
}

/**
 * Verify that the complete schema is properly set up
 */
async function verifyCompleteSchema(): Promise<void> {
  console.log('\nVerifying complete database schema...');

  // Check all required tables
  const requiredTables = [
    'users', 'wallets', 'markets', 'positions', 
    'transactions', 'leaderboard_entries', 'notifications'
  ];

  for (const tableName of requiredTables) {
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    );

    if (!result.rows[0].exists) {
      throw new Error(`Required table '${tableName}' is missing`);
    }
  }

  // Check for essential indexes
  const requiredIndexes = [
    'idx_users_username', 'idx_users_email',
    'idx_wallets_user_id',
    'idx_markets_state', 'idx_markets_closes_at',
    'idx_positions_user_id', 'idx_positions_market_id',
    'idx_transactions_user_id', 'idx_transactions_wallet_id',
    'idx_leaderboard_user_id', 'idx_leaderboard_rank',
    'idx_notifications_user_id'
  ];

  const indexResult = await pool.query(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`
  );
  const existingIndexes = indexResult.rows.map(row => row.indexname);

  const missingIndexes = requiredIndexes.filter(idx => !existingIndexes.includes(idx));
  if (missingIndexes.length > 0) {
    console.warn(`Warning: Missing some indexes: ${missingIndexes.join(', ')}`);
  }

  // Check for utility functions
  const functionResult = await pool.query(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION'
    AND routine_name IN ('calculate_potential_return', 'update_leaderboard_entry', 'validate_position_constraints')
  `);

  const existingFunctions = functionResult.rows.map(row => row.routine_name);
  console.log(`✓ Found ${existingFunctions.length} utility functions`);

  // Check for triggers
  const triggerResult = await pool.query(`
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
  `);

  const existingTriggers = triggerResult.rows.map(row => row.trigger_name);
  console.log(`✓ Found ${existingTriggers.length} triggers`);

  console.log('✓ Schema verification completed');
}

/**
 * Create sample data for development and testing
 */
export async function createSampleData(): Promise<void> {
  try {
    console.log('Creating sample data for development...');

    // Check if sample data already exists
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) > 0) {
      console.log('Sample data already exists. Skipping creation.');
      return;
    }

    // Create sample users
    const sampleUsers = [
      {
        username: 'alice_predictor',
        email: 'alice@example.com',
        password_hash: '$2b$10$example.hash.for.development.only'
      },
      {
        username: 'bob_trader',
        email: 'bob@example.com',
        password_hash: '$2b$10$example.hash.for.development.only'
      },
      {
        username: 'charlie_analyst',
        email: 'charlie@example.com',
        password_hash: '$2b$10$example.hash.for.development.only'
      }
    ];

    for (const user of sampleUsers) {
      const userResult = await pool.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
        [user.username, user.email, user.password_hash]
      );

      const userId = userResult.rows[0].id;

      // Create wallet for user (starts at zero as per requirements)
      await pool.query(
        'INSERT INTO wallets (user_id) VALUES ($1)',
        [userId]
      );

      // Add some sample balance for development
      await pool.query(`
        UPDATE wallets 
        SET balance_ngn_kobo = 100000, available_ngn_kobo = 100000,
            balance_usd_cents = 10000, available_usd_cents = 10000
        WHERE user_id = $1
      `, [userId]);
    }

    // Create sample markets
    const sampleMarkets = [
      {
        question: 'Will Bitcoin reach $100,000 by end of 2024?',
        description: 'Prediction market for Bitcoin price reaching $100,000 USD',
        currency: 'USD',
        min_position: 100, // $1.00
        closes_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      {
        question: 'Will Nigeria win the next AFCON tournament?',
        description: 'Prediction market for Nigeria winning the African Cup of Nations',
        currency: 'NGN',
        min_position: 10000, // ₦100.00
        closes_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
      },
      {
        question: 'Will it rain in Lagos tomorrow?',
        description: 'Weather prediction market for Lagos rainfall',
        currency: 'NGN',
        min_position: 5000, // ₦50.00
        closes_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      }
    ];

    for (const market of sampleMarkets) {
      await pool.query(`
        INSERT INTO markets (question, description, currency, min_position_smallest_unit, closes_at, state)
        VALUES ($1, $2, $3, $4, $5, 'active')
      `, [market.question, market.description, market.currency, market.min_position, market.closes_at]);
    }

    console.log('✓ Sample data created successfully');
    console.log('  - 3 sample users with wallets');
    console.log('  - 3 sample markets');
    console.log('  - Initial wallet balances for development');

  } catch (error) {
    console.error('Failed to create sample data:', error);
    throw error;
  }
}

// Run setup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  (async () => {
    try {
      switch (command) {
        case 'full':
          await setupDatabase();
          await createSampleData();
          break;
        case 'schema':
          await setupDatabase();
          break;
        case 'sample':
          await createSampleData();
          break;
        default:
          console.log('Usage:');
          console.log('  npm run db:setup:full   - Complete setup with sample data');
          console.log('  npm run db:setup:schema - Schema setup only');
          console.log('  npm run db:setup:sample - Create sample data only');
      }
    } catch (error) {
      console.error('Setup failed:', error);
      process.exit(1);
    } finally {
      await closePool();
    }
  })();
}

export { verifyCompleteSchema };