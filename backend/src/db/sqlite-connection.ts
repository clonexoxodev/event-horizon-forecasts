import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

// SQLite Schema
const SCHEMA = `
-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  profile_picture_url TEXT,
  instagram_handle TEXT,
  twitter_handle TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (length(username) >= 3)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance_ngn_kobo INTEGER NOT NULL DEFAULT 0,
  balance_usd_cents INTEGER NOT NULL DEFAULT 0,
  available_ngn_kobo INTEGER NOT NULL DEFAULT 0,
  available_usd_cents INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (balance_ngn_kobo >= 0 AND balance_usd_cents >= 0),
  CHECK (available_ngn_kobo >= 0 AND available_usd_cents >= 0),
  CHECK (available_ngn_kobo <= balance_ngn_kobo AND available_usd_cents <= balance_usd_cents)
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- Markets Table
CREATE TABLE IF NOT EXISTS markets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  question TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL CHECK (currency IN ('NGN', 'USD')),
  pool_amount_smallest_unit INTEGER NOT NULL DEFAULT 0,
  yes_pool_smallest_unit INTEGER NOT NULL DEFAULT 0,
  no_pool_smallest_unit INTEGER NOT NULL DEFAULT 0,
  min_position_smallest_unit INTEGER NOT NULL,
  max_position_smallest_unit INTEGER,
  state TEXT NOT NULL CHECK (state IN ('active', 'closed', 'resolved')),
  winning_side TEXT CHECK (winning_side IN ('YES', 'NO')),
  closes_at DATETIME NOT NULL,
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (pool_amount_smallest_unit = yes_pool_smallest_unit + no_pool_smallest_unit)
);

CREATE INDEX IF NOT EXISTS idx_markets_state ON markets(state);
CREATE INDEX IF NOT EXISTS idx_markets_closes_at ON markets(closes_at);
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at DESC);

-- Positions Table
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id TEXT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('YES', 'NO')),
  amount_smallest_unit INTEGER NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('NGN', 'USD')),
  potential_return_smallest_unit INTEGER NOT NULL,
  is_winner INTEGER,
  payout_smallest_unit INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  CHECK (amount_smallest_unit > 0)
);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_market_id ON positions(market_id);
CREATE INDEX IF NOT EXISTS idx_positions_created_at ON positions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_positions_user_market ON positions(user_id, market_id);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'position_entry', 'position_payout')),
  amount_smallest_unit INTEGER NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('NGN', 'USD')),
  direction TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
  reference_id TEXT,
  reference_type TEXT CHECK (reference_type IN ('position', 'deposit', 'withdrawal')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (amount_smallest_unit > 0)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_id, reference_type);

-- Leaderboard Table
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_predictions INTEGER NOT NULL DEFAULT 0,
  correct_predictions INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage REAL NOT NULL DEFAULT 0.00,
  rank INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (accuracy_percentage >= 0 AND accuracy_percentage <= 100),
  CHECK (correct_predictions <= total_predictions)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard_entries(rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard_entries(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id ON leaderboard_entries(user_id);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('market_resolved', 'deposit_confirmed', 'withdrawal_confirmed', 'position_won', 'position_lost')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  reference_id TEXT,
  reference_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
`;

// Initialize SQLite database
export async function initializeDatabase(): Promise<Database> {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'prediction_platform.db');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Run schema initialization
  await initializeSchema();

  console.log('SQLite database initialized at:', dbPath);
  return db;
}

// Initialize database schema
async function initializeSchema(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  try {
    await db.exec(SCHEMA);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing schema:', error);
    throw error;
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    console.log('Testing SQLite connection...');
    const database = await initializeDatabase();
    const result = await database.get('SELECT datetime("now") as now');
    console.log('SQLite connected successfully at:', result.now);
    return true;
  } catch (error) {
    console.error('SQLite connection error:', error);
    return false;
  }
}

// Query helper
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const database = await initializeDatabase();
  
  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    const rows = await database.all(sql, params);
    return { rows, rowCount: rows.length };
  } else {
    const result = await database.run(sql, params);
    return { rows: [], rowCount: result.changes || 0 };
  }
}

// Transaction helper
export async function transaction<T>(
  callback: (db: Database) => Promise<T>
): Promise<T> {
  const database = await initializeDatabase();
  
  await database.exec('BEGIN TRANSACTION');
  
  try {
    const result = await callback(database);
    await database.exec('COMMIT');
    return result;
  } catch (error) {
    await database.exec('ROLLBACK');
    throw error;
  }
}

// Close database connection
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log('SQLite database closed');
  }
}

export default { initializeDatabase, testConnection, query, transaction, closeDatabase };