# Database Setup Guide

This guide explains how to set up and configure PostgreSQL for the Prediction Platform.

## Quick Start

For immediate setup with all features:

```bash
# 1. Ensure PostgreSQL is running
# 2. Configure environment variables in .env
# 3. Run complete setup
npm run db:setup:full
```

This will:
- Create all tables with proper constraints and indexes
- Apply all migrations for performance optimizations
- Add utility functions and triggers
- Create sample data for development

## Prerequisites

- PostgreSQL 12 or higher installed
- Node.js 18 or higher
- Access to create databases and users

## Installation Steps

### 1. Install PostgreSQL

#### macOS (using Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### 2. Create Database and User

Connect to PostgreSQL as the postgres user:
```bash
sudo -u postgres psql
```

Create the database and user:
```sql
-- Create database
CREATE DATABASE prediction_platform;

-- Create user with password
CREATE USER prediction_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE prediction_platform TO prediction_user;

-- Connect to the database
\c prediction_platform

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO prediction_user;

-- Exit psql
\q
```

### 3. Configure Environment Variables

Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Update the database configuration in `.env`:
```env
# Database Configuration
DATABASE_URL=postgresql://prediction_user:your_secure_password@localhost:5432/prediction_platform
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prediction_platform
DB_USER=prediction_user
DB_PASSWORD=your_secure_password
```

## Database Setup Commands

### Complete Setup (Recommended)
```bash
npm run db:setup:full        # Complete setup with sample data
npm run db:setup:schema      # Schema setup only (no sample data)
npm run db:validate          # Validate complete setup
```

### Individual Components
```bash
npm run db:init              # Create initial schema only
npm run db:migrate           # Apply pending migrations
npm run db:setup:sample      # Create sample data for development
```

### Development Commands
```bash
npm run db:reset             # Drop and recreate all tables
npm run db:drop              # Drop all tables (destructive!)
npm run db:verify            # Verify basic schema
```

### Migration Management
```bash
npm run db:migrate:status    # Check migration status
npm run db:migrate:rollback  # Rollback last migration
```

## Database Schema Overview

The database includes the following tables with all requirements from task 1.3:

### Core Tables
- **users** - User accounts with constraints and indexes ✅
- **wallets** - Multi-currency balances with balance constraints ✅
- **markets** - Prediction markets with pool consistency checks ✅
- **positions** - User positions with foreign key relationships ✅
- **transactions** - Complete transaction history with reference tracking ✅
- **leaderboard_entries** - User rankings with automatic ranking logic ✅
- **notifications** - User notifications with proper references ✅

### Performance Features
- **Comprehensive Indexing** - All necessary indexes for query performance ✅
- **Utility Functions** - Database functions for common operations
- **Automatic Triggers** - Real-time leaderboard updates and data consistency
- **Migration System** - Version-controlled schema changes

### Key Features Implemented

#### Zero-Balance Wallet Initialization (Requirements 2.1-2.3)
```sql
-- Wallets start with zero balance in both currencies
balance_ngn_kobo BIGINT NOT NULL DEFAULT 0,
balance_usd_cents BIGINT NOT NULL DEFAULT 0,
available_ngn_kobo BIGINT NOT NULL DEFAULT 0,
available_usd_cents BIGINT NOT NULL DEFAULT 0
```

#### Multi-Currency Support (Requirement 3.4)
- NGN stored as kobo (smallest unit)
- USD stored as cents (smallest unit)
- Eliminates floating-point precision errors

#### Pool Consistency Checks (Markets Table)
```sql
CONSTRAINT pool_consistency CHECK (
  pool_amount_smallest_unit = yes_pool_smallest_unit + no_pool_smallest_unit
)
```

#### Complete Transaction Tracking (Requirements 6.1-6.5)
- All wallet activities recorded
- Reference tracking to related entities
- Direction indicators (IN/OUT)
- Status management (pending/completed/failed)

#### Automatic Leaderboard Updates (Requirements 13.1-13.7)
- Triggers update rankings when positions resolve
- Points calculation: 10 points per win + accuracy bonus
- Automatic rank assignment based on points and accuracy

## Migration System

The database uses a versioned migration system for schema evolution:

### Current Migrations
1. **20240115120000_add_performance_indexes.sql**
   - Additional indexes for common query patterns
   - Composite indexes for complex queries
   - Partial indexes for filtered data

2. **20240115130000_add_utility_functions.sql**
   - `calculate_potential_return()` - Position payout calculations
   - `update_leaderboard_entry()` - User statistics updates
   - `validate_position_constraints()` - Business rule validation

3. **20240115140000_add_leaderboard_triggers.sql**
   - Automatic leaderboard updates on position resolution
   - Market resolution triggers for batch processing
   - Wallet balance updates for payouts

### Creating New Migrations
```bash
# Create migration file: YYYYMMDDHHMMSS_description.sql
# Example: 20240116120000_add_user_preferences.sql

-- UP Migration
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  theme VARCHAR(20) DEFAULT 'light'
);

-- DOWN Migration (for rollback)
-- DROP TABLE user_preferences;
```

## Performance Optimizations

### Connection Pooling
- Maximum 20 connections
- 30-second idle timeout
- Automatic retry with exponential backoff
- Connection health monitoring

### Query Performance
- Comprehensive indexing strategy
- Composite indexes for multi-column queries
- Partial indexes for filtered data
- JSONB for flexible metadata storage

### Currency Handling
- Integer storage eliminates floating-point errors
- Consistent smallest-unit representation (kobo/cents)
- Efficient conversion calculations

## Validation and Testing

### Schema Validation
```bash
npm run db:validate          # Complete setup validation
npm run db:verify            # Basic schema verification
```

The validation checks:
- All required tables and columns exist
- All indexes are properly created
- Constraints are correctly implemented
- Utility functions are available
- Triggers are properly set up
- Requirements from design document are satisfied

### Sample Data
The setup includes sample data for development:
- 3 test users with wallets (zero-balance initialization)
- 3 sample markets in different currencies
- Initial balances for testing (development only)

## Troubleshooting

### Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check if PostgreSQL is listening
sudo netstat -plunt | grep postgres

# Test connection manually
psql -h localhost -U prediction_user -d prediction_platform
```

### Permission Issues
```sql
-- Grant all privileges to user
GRANT ALL PRIVILEGES ON DATABASE prediction_platform TO prediction_user;
GRANT ALL ON SCHEMA public TO prediction_user;
```

### Migration Issues
```bash
# Check migration status
npm run db:migrate:status

# Reset migrations (development only)
npm run db:reset
npm run db:setup:schema
```

## Production Deployment

### Security Checklist
- [ ] Use strong, unique passwords
- [ ] Enable SSL/TLS connections
- [ ] Configure firewall rules
- [ ] Set up connection limits
- [ ] Enable query logging
- [ ] Configure backup strategy

### Performance Tuning
- [ ] Adjust connection pool size based on load
- [ ] Monitor query performance
- [ ] Set up database monitoring
- [ ] Configure automatic vacuuming
- [ ] Optimize PostgreSQL configuration

### Backup Strategy
- [ ] Daily full database backups
- [ ] Continuous WAL archiving
- [ ] Cross-region backup replication
- [ ] Regular backup restoration testing

## Monitoring

### Key Metrics
- Connection pool utilization
- Query execution times
- Index usage statistics
- Table size growth
- Transaction throughput

### Maintenance Tasks
- Regular `VACUUM` and `ANALYZE`
- Index maintenance
- Log rotation
- Statistics updates
- Performance monitoring

## Support

For database-related issues:
1. Check the logs: `tail -f /var/log/postgresql/postgresql-*.log`
2. Verify configuration: `npm run db:validate`
3. Test connection: `npm run db:verify`
4. Check migration status: `npm run db:migrate:status`

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Schema Documentation](./DATABASE_SCHEMA.md)
- [Migration System Guide](./src/db/migrations/README.md)
- [Performance Tuning Guide](https://wiki.postgresql.org/wiki/Performance_Optimization)
