# Database Migrations

This directory contains database migration files for the Prediction Platform.

## Migration System

The migration system tracks schema changes over time and allows for:
- Applying new schema changes to existing databases
- Rolling back changes if needed
- Tracking which migrations have been applied

## Migration File Format

Migration files follow the naming convention: `YYYYMMDDHHMMSS_description.sql`

Example: `20240115120000_add_user_preferences.sql`

Each migration file should contain:
```sql
-- Migration: Add user preferences table
-- Created: 2024-01-15

-- UP Migration
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DOWN Migration (for rollback)
-- DROP TABLE user_preferences;
```

## Running Migrations

### Apply all pending migrations
```bash
npm run db:migrate
```

### Rollback the last migration
```bash
npm run db:migrate:rollback
```

### Check migration status
```bash
npm run db:migrate:status
```

## Creating a New Migration

1. Create a new file in this directory with the timestamp and description
2. Write the UP migration (schema changes to apply)
3. Write the DOWN migration as comments (for rollback reference)
4. Run `npm run db:migrate` to apply the migration

## Initial Schema

The initial database schema is defined in `init.sql` and includes:
- users table with authentication fields
- wallets table with multi-currency balance tracking
- markets table with pool consistency checks
- positions table with user and market foreign keys
- transactions table with reference tracking
- leaderboard_entries table with ranking logic
- notifications table with user references

All tables include appropriate indexes for query performance.
