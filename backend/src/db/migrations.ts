import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool, { testConnection, closePool } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Migration tracking table
 * Stores which migrations have been applied
 */
async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations(): Promise<string[]> {
  const result = await pool.query<{ version: string }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC'
  );
  return result.rows.map((row) => row.version);
}

/**
 * Get list of migration files
 */
function getMigrationFiles(): Array<{ version: string; name: string; path: string }> {
  const migrationsDir = join(__dirname, 'migrations');
  
  try {
    const files = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    return files.map((file) => {
      const [version, ...nameParts] = file.replace('.sql', '').split('_');
      return {
        version: version || '',
        name: nameParts.join('_'),
        path: join(migrationsDir, file),
      };
    });
  } catch (error) {
    // Migrations directory doesn't exist or is empty
    return [];
  }
}

/**
 * Apply a single migration
 */
async function applyMigration(migration: {
  version: string;
  name: string;
  path: string;
}): Promise<void> {
  if (!pool) {
    throw new Error('Database pool is not initialized. Migrations require PostgreSQL.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Read and execute migration SQL
    const sql = readFileSync(migration.path, 'utf-8');
    
    // Extract only the UP migration (before DOWN comment)
    const [upMigration] = sql.split('-- DOWN Migration');
    
    if (upMigration) {
      await client.query(upMigration);
    }

    // Record migration as applied
    await client.query(
      'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
      [migration.version, migration.name]
    );

    await client.query('COMMIT');
    console.log(`✓ Applied migration: ${migration.version}_${migration.name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✗ Failed to apply migration: ${migration.version}_${migration.name}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    console.log('Starting database migrations...');

    // Test connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Ensure migrations tracking table exists
    await ensureMigrationsTable();

    // Get applied and available migrations
    const appliedMigrations = await getAppliedMigrations();
    const migrationFiles = getMigrationFiles();

    // Filter pending migrations
    const pendingMigrations = migrationFiles.filter(
      (migration) => !appliedMigrations.includes(migration.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to apply');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migration(s)`);

    // Apply each pending migration
    for (const migration of pendingMigrations) {
      await applyMigration(migration);
    }

    console.log('All migrations applied successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<void> {
  try {
    console.log('Checking migration status...\n');

    // Test connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Ensure migrations tracking table exists
    await ensureMigrationsTable();

    // Get applied and available migrations
    const appliedMigrations = await getAppliedMigrations();
    const migrationFiles = getMigrationFiles();

    console.log('Migration Status:');
    console.log('================\n');

    if (migrationFiles.length === 0) {
      console.log('No migration files found');
      return;
    }

    for (const migration of migrationFiles) {
      const isApplied = appliedMigrations.includes(migration.version);
      const status = isApplied ? '✓ Applied' : '✗ Pending';
      console.log(`${status} - ${migration.version}_${migration.name}`);
    }

    console.log(`\nTotal: ${migrationFiles.length} migration(s)`);
    console.log(`Applied: ${appliedMigrations.length}`);
    console.log(`Pending: ${migrationFiles.length - appliedMigrations.length}`);
  } catch (error) {
    console.error('Failed to get migration status:', error);
    throw error;
  }
}

/**
 * Rollback the last applied migration
 * Note: This requires manual intervention as DOWN migrations are commented
 */
export async function rollbackLastMigration(): Promise<void> {
  try {
    console.log('Rolling back last migration...');

    // Test connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    if (!pool) {
      throw new Error('Database pool is not initialized. Migrations require PostgreSQL.');
    }

    // Ensure migrations tracking table exists
    await ensureMigrationsTable();

    // Get last applied migration
    const result = await pool.query<{ version: string; name: string }>(
      'SELECT version, name FROM schema_migrations ORDER BY applied_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastMigration = result.rows[0];

    if (!lastMigration) {
      console.log('No migrations to rollback');
      return;
    }

    console.log(`\nLast applied migration: ${lastMigration.version}_${lastMigration.name}`);
    console.log('\nWARNING: Automatic rollback is not implemented.');
    console.log('Please manually execute the DOWN migration from the migration file.');
    console.log('After manual rollback, remove the migration record with:');
    console.log(`  DELETE FROM schema_migrations WHERE version = '${lastMigration.version}';`);
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

// Run migrations if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  (async () => {
    try {
      switch (command) {
        case 'up':
        case 'migrate':
          await runMigrations();
          break;
        case 'status':
          await getMigrationStatus();
          break;
        case 'rollback':
          await rollbackLastMigration();
          break;
        default:
          console.log('Usage:');
          console.log('  npm run db:migrate          - Apply pending migrations');
          console.log('  npm run db:migrate:status   - Check migration status');
          console.log('  npm run db:migrate:rollback - Rollback last migration');
      }
    } catch (error) {
      console.error('Command failed:', error);
      process.exit(1);
    } finally {
      await closePool();
    }
  })();
}
