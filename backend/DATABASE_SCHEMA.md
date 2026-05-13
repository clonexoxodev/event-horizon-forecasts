# Database Schema Documentation

## Overview

The Prediction Platform uses PostgreSQL as its primary database with a carefully designed schema that supports:

- Zero-balance wallet initialization
- Multi-currency support (NGN/USD)
- Atomic transaction processing
- Real-time leaderboard updates
- Comprehensive audit trails

## Schema Design Principles

1. **Currency Storage**: All monetary values stored as integers in smallest units (kobo/cents)
2. **Data Integrity**: Comprehensive constraints and foreign keys
3. **Performance**: Optimized indexes for common query patterns
4. **Auditability**: Complete transaction history and timestamps
5. **Scalability**: Connection pooling and efficient queries

## Tables

### Users Table
Stores user account information and authentication data.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_picture_url VARCHAR(500),
  instagram_handle VARCHAR(100),
  twitter_handle VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- UUID primary keys for security
- Unique constraints on username and email
- Social media integration fields
- Automatic timestamp management

**Indexes:**
- `idx_users_username` - Fast username lookups
- `idx_users_email` - Fast email lookups

### Wallets Table
Manages user wallet balances with multi-currency support.

```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance_ngn_kobo BIGINT NOT NULL DEFAULT 0,
  balance_usd_cents BIGINT NOT NULL DEFAULT 0,
  available_ngn_kobo BIGINT NOT NULL DEFAULT 0,
  available_usd_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- Zero-balance initialization (as per requirements)
- Separate total and available balances
- Multi-currency support (NGN kobo, USD cents)
- Balance constraints ensure data integrity

**Constraints:**
- Balances must be non-negative
- Available balance ≤ total balance
- One wallet per user

**Indexes:**
- `idx_wallets_user_id` - Fast user wallet lookups

### Markets Table
Stores prediction market information with pool tracking.

```sql
CREATE TABLE markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  description TEXT,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'USD')),
  pool_amount_smallest_unit BIGINT NOT NULL DEFAULT 0,
  yes_pool_smallest_unit BIGINT NOT NULL DEFAULT 0,
  no_pool_smallest_unit BIGINT NOT NULL DEFAULT 0,
  min_position_smallest_unit BIGINT NOT NULL,
  max_position_smallest_unit BIGINT,
  state VARCHAR(20) NOT NULL CHECK (state IN ('active', 'closed', 'resolved')),
  winning_side VARCHAR(3) CHECK (winning_side IN ('YES', 'NO')),
  closes_at TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- Pool consistency checks (total = yes + no)
- Market lifecycle management (active → closed → resolved)
- Position amount limits
- Currency-specific markets

**Constraints:**
- Pool amount must equal sum of YES and NO pools
- State must be valid (active/closed/resolved)
- Currency must be NGN or USD

**Indexes:**
- `idx_markets_state` - Filter by market state
- `idx_markets_closes_at` - Sort by closing time
- `idx_markets_created_at` - Sort by creation time
- `idx_markets_currency` - Filter by currency
- `idx_markets_state_closes_at` - Composite for active markets

### Positions Table
Records user positions on markets with payout tracking.

```sql
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  side VARCHAR(3) NOT NULL CHECK (side IN ('YES', 'NO')),
  amount_smallest_unit BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'USD')),
  potential_return_smallest_unit BIGINT NOT NULL,
  is_winner BOOLEAN,
  payout_smallest_unit BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);
```

**Key Features:**
- Links users to markets with their predictions
- Tracks potential and actual returns
- Resolution status tracking
- Currency matching with market

**Constraints:**
- Amount must be positive
- Side must be YES or NO
- Foreign key relationships maintained

**Indexes:**
- `idx_positions_user_id` - User's positions
- `idx_positions_market_id` - Market positions
- `idx_positions_created_at` - Chronological order
- `idx_positions_user_market` - User-market combinations
- `idx_positions_side` - Filter by prediction side
- `idx_positions_is_winner` - Filter winning positions

### Transactions Table
Complete audit trail of all wallet activities.

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'position_entry', 'position_payout')),
  amount_smallest_unit BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('NGN', 'USD')),
  direction VARCHAR(3) NOT NULL CHECK (direction IN ('IN', 'OUT')),
  reference_id UUID,
  reference_type VARCHAR(20) CHECK (reference_type IN ('position', 'deposit', 'withdrawal')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- Complete transaction history
- Reference tracking to related entities
- Status management for async operations
- Flexible metadata storage

**Indexes:**
- `idx_transactions_user_id` - User transaction history
- `idx_transactions_wallet_id` - Wallet-specific transactions
- `idx_transactions_created_at` - Chronological order
- `idx_transactions_reference` - Reference lookups
- `idx_transactions_type` - Filter by transaction type
- `idx_transactions_status` - Filter by status

### Leaderboard Entries Table
User rankings and prediction statistics.

```sql
CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_predictions INTEGER NOT NULL DEFAULT 0,
  correct_predictions INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  rank INTEGER,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- Automatic ranking calculation
- Accuracy percentage tracking
- Points-based scoring system
- Real-time updates via triggers

**Constraints:**
- Accuracy between 0-100%
- Correct predictions ≤ total predictions
- One entry per user

**Indexes:**
- `idx_leaderboard_rank` - Ranking order
- `idx_leaderboard_points` - Points-based sorting
- `idx_leaderboard_user_id` - User lookups
- `idx_leaderboard_accuracy` - Accuracy-based sorting

### Notifications Table
User notification system.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('market_resolved', 'deposit_confirmed', 'withdrawal_confirmed', 'position_won', 'position_lost')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  reference_id UUID,
  reference_type VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- Typed notifications for different events
- Read/unread status tracking
- Reference linking to related entities
- Rich message content

**Indexes:**
- `idx_notifications_user_id` - User notifications
- `idx_notifications_created_at` - Chronological order
- `idx_notifications_is_read` - Unread notifications
- `idx_notifications_type` - Filter by notification type

## Database Functions

### calculate_potential_return
Calculates potential payout for a position based on current pool distribution.

```sql
SELECT calculate_potential_return(10000, 'YES', 50000, 30000);
```

### update_leaderboard_entry
Updates leaderboard statistics for a specific user.

```sql
SELECT update_leaderboard_entry('user-uuid-here');
```

### update_leaderboard_ranks
Recalculates ranks for all leaderboard entries.

```sql
SELECT update_leaderboard_ranks();
```

### get_wallet_display_balance
Returns formatted wallet balance for display.

```sql
SELECT * FROM get_wallet_display_balance('user-uuid', 'NGN');
```

### validate_position_constraints
Validates if a position can be created based on market and wallet constraints.

```sql
SELECT validate_position_constraints('user-uuid', 'market-uuid', 10000);
```

## Triggers

### Automatic Timestamp Updates
- `update_users_updated_at` - Updates user timestamps
- `update_wallets_updated_at` - Updates wallet timestamps
- `update_markets_updated_at` - Updates market timestamps
- `update_leaderboard_updated_at` - Updates leaderboard timestamps

### Leaderboard Management
- `trigger_position_resolved` - Updates leaderboard when positions are resolved
- `trigger_wallet_created` - Creates leaderboard entry for new users

### Market Resolution
- `trigger_market_resolved` - Automatically resolves positions and processes payouts

## Migration System

The database uses a versioned migration system for schema changes:

### Migration Files
- Format: `YYYYMMDDHHMMSS_description.sql`
- Location: `src/db/migrations/`
- Include both UP and DOWN migrations

### Migration Commands
```bash
npm run db:migrate          # Apply pending migrations
npm run db:migrate:status   # Check migration status
npm run db:migrate:rollback # Rollback last migration
```

### Current Migrations
1. `20240115120000_add_performance_indexes.sql` - Additional performance indexes
2. `20240115130000_add_utility_functions.sql` - Database utility functions
3. `20240115140000_add_leaderboard_triggers.sql` - Automatic leaderboard updates

## Setup Commands

### Database Initialization
```bash
npm run db:init              # Create initial schema
npm run db:setup:schema      # Complete schema setup with migrations
npm run db:setup:full        # Schema + sample data
npm run db:verify            # Verify schema completeness
```

### Development Commands
```bash
npm run db:reset             # Drop and recreate all tables
npm run db:setup:sample      # Create sample data for development
```

## Performance Considerations

### Connection Pooling
- Maximum 20 connections
- 30-second idle timeout
- 2-second connection timeout
- Automatic retry with exponential backoff

### Query Optimization
- Comprehensive indexing strategy
- Composite indexes for common query patterns
- Partial indexes for filtered queries
- JSONB for flexible metadata storage

### Currency Handling
- Integer storage eliminates floating-point errors
- Consistent smallest-unit representation
- Efficient currency conversion calculations

## Security Features

### Data Protection
- UUID primary keys prevent enumeration attacks
- Password hashing with bcrypt
- Parameterized queries prevent SQL injection
- Foreign key constraints maintain referential integrity

### Access Control
- Connection pooling limits resource usage
- Transaction isolation prevents race conditions
- Constraint validation at database level
- Audit trail for all financial transactions

## Backup and Recovery

### Recommended Backup Strategy
1. **Daily full backups** of the entire database
2. **Continuous WAL archiving** for point-in-time recovery
3. **Weekly backup verification** with restore testing
4. **Cross-region backup replication** for disaster recovery

### Critical Tables Priority
1. `users` - User accounts and authentication
2. `wallets` - Financial balances
3. `transactions` - Complete audit trail
4. `positions` - User predictions and payouts
5. `markets` - Market definitions and states

## Monitoring and Maintenance

### Key Metrics to Monitor
- Connection pool utilization
- Query execution times
- Index usage statistics
- Table size growth
- Transaction throughput

### Regular Maintenance Tasks
- `VACUUM` and `ANALYZE` for performance
- Index maintenance and optimization
- Log rotation and cleanup
- Statistics updates
- Connection pool monitoring

## Development Guidelines

### Schema Changes
1. Always create migrations for schema changes
2. Test migrations on development data
3. Include rollback procedures
4. Document breaking changes
5. Coordinate with application code changes

### Query Best Practices
1. Use parameterized queries
2. Leverage existing indexes
3. Avoid N+1 query patterns
4. Use transactions for multi-step operations
5. Monitor query performance

### Testing
1. Unit tests for database functions
2. Integration tests for complex operations
3. Performance tests for critical queries
4. Migration testing on realistic data
5. Backup and recovery testing