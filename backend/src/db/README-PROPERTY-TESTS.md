# Database Schema Constraints Property Test

## Overview

This directory contains **Property 34: Data Persistence for All Entities** - a comprehensive property-based test that validates database schema constraints and data persistence across all entities in the Prediction Platform.

## Test File

- `schema-constraints.property.test.ts` - Property test for database schema constraints

## What This Test Validates

**Property 34: Data Persistence for All Entities**
*For any entity created in the system (user account, wallet transaction, position, or market), the entity's data SHALL be persisted to the database and retrievable in subsequent queries.*

**Validates Requirements:** 25.1, 25.2, 25.3, 25.4

### Test Coverage

The property test validates:

1. **User Entity Persistence**
   - User creation with all fields (username, email, password_hash, profile_picture_url, social handles)
   - Username length constraints (minimum 3 characters)
   - Email format validation
   - Unique constraints on username and email
   - Automatic timestamp generation

2. **Wallet Entity Persistence**
   - Zero-balance initialization (Requirements 2.1, 2.2, 2.3)
   - Multi-currency support (NGN kobo, USD cents)
   - Balance constraints (non-negative, available ≤ total)
   - Foreign key relationship to users

3. **Market Entity Persistence**
   - Market creation with question, currency, position limits
   - Pool consistency constraints (total = yes + no pools)
   - Currency validation (NGN or USD only)
   - State management (active/closed/resolved)
   - Future date validation for closes_at

4. **Position Entity Persistence**
   - Position creation with foreign key relationships
   - Amount validation (positive values)
   - Side validation (YES or NO only)
   - Currency matching with market
   - Potential return calculations

5. **Transaction Entity Persistence**
   - Transaction creation with reference tracking
   - Type validation (deposit, withdrawal, position_entry, position_payout)
   - Direction indicators (IN/OUT)
   - Status management (pending/completed/failed)
   - JSONB metadata storage

6. **Leaderboard Entry Persistence**
   - User statistics tracking
   - Accuracy percentage constraints (0-100%)
   - Prediction consistency (correct ≤ total)
   - Automatic ranking calculations

7. **Notification Entity Persistence**
   - Notification creation with type validation
   - Reference linking to related entities
   - Read/unread status tracking
   - Message content validation

8. **Referential Integrity**
   - Complex multi-entity scenarios
   - Foreign key constraint enforcement
   - Transaction atomicity across entities
   - Cascade deletion behavior

## Prerequisites

### 1. PostgreSQL Installation

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### 2. Database Setup

Create the database and user:
```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE prediction_platform;
CREATE USER prediction_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE prediction_platform TO prediction_user;
\c prediction_platform
GRANT ALL ON SCHEMA public TO prediction_user;
\q
```

### 3. Environment Configuration

Ensure your `backend/.env` file has the correct database configuration:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prediction_platform
DB_USER=prediction_user
DB_PASSWORD=your_secure_password
```

### 4. Database Initialization

Initialize the database schema:
```bash
cd backend
npm run db:init
```

## Running the Property Test

### Single Test Run
```bash
cd backend
npm test -- schema-constraints.property.test.ts
```

### Watch Mode (for development)
```bash
cd backend
npm run test:watch -- schema-constraints.property.test.ts
```

### All Tests
```bash
cd backend
npm test
```

## Test Configuration

The property test uses fast-check with the following configuration:
- **100 iterations** per property (as required by the spec)
- **50 iterations** for complex multi-entity scenarios (to balance thoroughness with execution time)
- **Automatic test data generation** using fast-check generators
- **Database cleanup** after each test to ensure isolation

## Expected Output

When the test runs successfully, you should see:
```
✓ Feature: prediction-platform-overhaul, Property 34: Data Persistence for All Entities (8)
  ✓ should persist and retrieve user entities with all constraints respected
  ✓ should persist and retrieve wallet entities with zero-balance initialization and constraints
  ✓ should persist and retrieve market entities with pool consistency constraints
  ✓ should persist and retrieve position entities with foreign key constraints
  ✓ should persist and retrieve transaction entities with reference tracking
  ✓ should persist and retrieve leaderboard entries with accuracy constraints
  ✓ should persist and retrieve notification entities with type constraints
  ✓ should maintain referential integrity across all entities in complex scenarios

Test Files  1 passed (1)
Tests  8 passed (8)
```

## Troubleshooting

### Database Connection Issues

**Error:** `ECONNREFUSED ::1:5432` or `ECONNREFUSED 127.0.0.1:5432`
**Solution:** 
1. Ensure PostgreSQL is running: `brew services start postgresql@15` (macOS) or `sudo systemctl start postgresql` (Linux)
2. Check if PostgreSQL is listening: `sudo netstat -plunt | grep postgres`
3. Verify database configuration in `.env`

**Error:** `Authentication failed`
**Solution:**
1. Verify username and password in `.env`
2. Ensure user has proper privileges: `GRANT ALL PRIVILEGES ON DATABASE prediction_platform TO prediction_user;`

**Error:** `Database does not exist`
**Solution:**
1. Create the database: `CREATE DATABASE prediction_platform;`
2. Verify database name in `.env`

### Schema Issues

**Error:** `relation "users" does not exist`
**Solution:**
1. Initialize the database schema: `npm run db:init`
2. Verify schema creation: `npm run db:verify`

### Test Failures

If specific property tests fail:
1. Check the failing example output for details
2. Verify database constraints are properly implemented
3. Ensure test data generators produce valid data
4. Check for race conditions in concurrent tests

## Performance Considerations

- Each test run creates and destroys multiple database entities
- Tests use database transactions for atomicity
- Database is reset between tests to ensure isolation
- Consider running tests against a dedicated test database

## Integration with CI/CD

To run these tests in CI/CD:
1. Set up PostgreSQL service in your CI environment
2. Configure test database credentials
3. Run database initialization before tests
4. Include in your test pipeline:
   ```yaml
   - name: Run property tests
     run: npm run test -- schema-constraints.property.test.ts
   ```

## Related Files

- `connection.ts` - Database connection and query utilities
- `initialize.ts` - Database schema initialization
- `init.sql` - SQL schema definition
- `../DATABASE_SCHEMA.md` - Complete schema documentation
- `../DATABASE_SETUP.md` - Detailed setup instructions

## Property Test Theory

This test implements property-based testing principles:
- **Universality**: Properties hold for all valid inputs
- **Randomization**: fast-check generates diverse test cases
- **Shrinking**: Minimal failing examples when tests fail
- **Reproducibility**: Seed-based generation for consistent results

The test validates that database constraints work correctly across the entire input space, not just specific examples, providing higher confidence in the schema implementation.