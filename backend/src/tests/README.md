# Property-Based Tests

This directory contains property-based tests for the Prediction Platform backend using the fast-check library.

## Overview

Property-based tests verify that certain properties (invariants) hold true across a wide range of inputs, rather than testing specific examples. This approach helps catch edge cases and ensures system correctness across all valid scenarios.

## Current Tests

### 1. Wallet Zero-Balance Initialization (`wallet-zero-balance.property.test.ts`)

**Property 1: Wallet Zero-Balance Initialization**
- **Validates**: Requirements 2.1, 2.2, 2.3
- **Description**: For any newly created user account, the associated wallet SHALL initialize with exactly zero balance in both NGN (kobo) and USD (cents), with both total and available balances set to zero.

**Test Coverage**:
- Main property test with 100 iterations
- Edge case variations with boundary values (50 iterations)
- Atomicity test ensuring user and wallet creation is transactional (25 iterations)

## Database Setup

To run these property tests, you need a PostgreSQL database set up:

### Quick Setup

1. **Install PostgreSQL** (if not already installed)
   ```bash
   # On macOS with Homebrew
   brew install postgresql
   
   # On Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   
   # On Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Start PostgreSQL service**
   ```bash
   # On macOS with Homebrew
   brew services start postgresql
   
   # On Ubuntu/Debian
   sudo systemctl start postgresql
   
   # On Windows
   # Use Services app or pg_ctl
   ```

3. **Create database and user**
   ```bash
   # Create database
   createdb prediction_platform
   
   # Create user with superuser privileges (for testing)
   createuser -s user
   
   # Set password
   psql -c "ALTER USER user PASSWORD 'password';"
   ```

4. **Initialize database schema**
   ```bash
   cd backend
   npm run db:init
   ```

5. **Run property tests**
   ```bash
   npm test wallet-zero-balance.property.test.ts
   ```

### Alternative: Using Docker

You can also use Docker to run PostgreSQL:

```bash
# Start PostgreSQL container
docker run --name postgres-test \
  -e POSTGRES_DB=prediction_platform \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15

# Initialize schema
npm run db:init

# Run tests
npm test wallet-zero-balance.property.test.ts

# Stop container when done
docker stop postgres-test
docker rm postgres-test
```

## Running Tests

### Run All Property Tests
```bash
npm test -- --grep "Property"
```

### Run Specific Property Test
```bash
npm test wallet-zero-balance.property.test.ts
```

### Run with Verbose Output
```bash
npm test wallet-zero-balance.property.test.ts -- --reporter=verbose
```

## Test Structure

Each property test follows this structure:

1. **Setup**: Database connection and service initialization
2. **Property Definition**: Clear statement of what property is being tested
3. **Test Data Generation**: Using fast-check arbitraries to generate test data
4. **Property Verification**: Assertions that must hold for all generated inputs
5. **Cleanup**: Removing test data to avoid interference

## Key Features

- **Graceful Degradation**: Tests skip gracefully if database is not available
- **Clear Instructions**: Helpful setup instructions when database connection fails
- **Comprehensive Coverage**: Multiple test scenarios for each property
- **Proper Cleanup**: Test data is cleaned up after each test run
- **Detailed Logging**: Verbose output for debugging failed properties

## Adding New Property Tests

When adding new property tests:

1. Create a new test file following the naming convention: `feature-name.property.test.ts`
2. Include the property number and validation requirements in comments
3. Use appropriate fast-check arbitraries for test data generation
4. Ensure proper cleanup of test data
5. Add database availability checks
6. Update this README with the new test information

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running: `pg_isready`
- Check connection settings in `.env` file
- Verify database and user exist
- Check firewall settings

### Test Failures
- Review the failing property and counterexample
- Check if the implementation violates the stated property
- Verify test data generation is appropriate
- Ensure cleanup is working correctly

### Performance Issues
- Reduce `numRuns` for faster feedback during development
- Use more specific arbitraries to avoid invalid data generation
- Consider parallel test execution for independent tests

## References

- [fast-check Documentation](https://fast-check.dev/)
- [Property-Based Testing Guide](https://hypothesis.works/articles/what-is-property-based-testing/)
- [Vitest Testing Framework](https://vitest.dev/)