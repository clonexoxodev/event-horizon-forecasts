#!/usr/bin/env node

/**
 * Quick Database Setup Script for Property Tests
 * 
 * This script helps set up a PostgreSQL database for running property tests.
 * It creates the database, user, and initializes the schema.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`${step}. ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

async function checkPostgreSQL() {
  try {
    execSync('psql --version', { stdio: 'pipe' });
    logSuccess('PostgreSQL is installed');
    return true;
  } catch (error) {
    logError('PostgreSQL is not installed or not in PATH');
    log('Please install PostgreSQL first:', 'yellow');
    log('  macOS: brew install postgresql@15', 'yellow');
    log('  Ubuntu: sudo apt install postgresql postgresql-contrib', 'yellow');
    log('  Windows: Download from https://www.postgresql.org/download/windows/', 'yellow');
    return false;
  }
}

async function checkPostgreSQLRunning() {
  try {
    execSync('pg_isready -h localhost -p 5432', { stdio: 'pipe' });
    logSuccess('PostgreSQL is running');
    return true;
  } catch (error) {
    logError('PostgreSQL is not running');
    log('Start PostgreSQL:', 'yellow');
    log('  macOS: brew services start postgresql@15', 'yellow');
    log('  Ubuntu: sudo systemctl start postgresql', 'yellow');
    log('  Windows: Start PostgreSQL service from Services panel', 'yellow');
    return false;
  }
}

function readEnvFile() {
  try {
    const envPath = join(__dirname, '.env');
    const envContent = readFileSync(envPath, 'utf8');
    const env = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        env[key.trim()] = value.trim();
      }
    });
    
    return {
      host: env.DB_HOST || 'localhost',
      port: env.DB_PORT || '5432',
      database: env.DB_NAME || 'prediction_platform',
      user: env.DB_USER || 'prediction_user',
      password: env.DB_PASSWORD || 'password'
    };
  } catch (error) {
    logWarning('Could not read .env file, using defaults');
    return {
      host: 'localhost',
      port: '5432',
      database: 'prediction_platform',
      user: 'prediction_user',
      password: 'password'
    };
  }
}

async function createDatabaseAndUser(config) {
  const createDbSql = `
    -- Create database if it doesn't exist
    SELECT 'CREATE DATABASE ${config.database}' 
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${config.database}')\\gexec
    
    -- Create user if it doesn't exist
    DO \\$\\$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${config.user}') THEN
        CREATE USER ${config.user} WITH PASSWORD '${config.password}';
      END IF;
    END
    \\$\\$;
    
    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE ${config.database} TO ${config.user};
  `;

  try {
    // Try to connect as postgres user first
    execSync(`echo "${createDbSql}" | psql -h ${config.host} -p ${config.port} -U postgres`, { 
      stdio: 'pipe' 
    });
    logSuccess(`Database '${config.database}' and user '${config.user}' created`);
    return true;
  } catch (error) {
    // Try without specifying user (might work on some systems)
    try {
      execSync(`echo "${createDbSql}" | psql -h ${config.host} -p ${config.port}`, { 
        stdio: 'pipe' 
      });
      logSuccess(`Database '${config.database}' and user '${config.user}' created`);
      return true;
    } catch (error2) {
      logError('Failed to create database and user');
      log('Please run these commands manually:', 'yellow');
      log(`  psql -U postgres`, 'yellow');
      log(`  CREATE DATABASE ${config.database};`, 'yellow');
      log(`  CREATE USER ${config.user} WITH PASSWORD '${config.password}';`, 'yellow');
      log(`  GRANT ALL PRIVILEGES ON DATABASE ${config.database} TO ${config.user};`, 'yellow');
      log(`  \\c ${config.database}`, 'yellow');
      log(`  GRANT ALL ON SCHEMA public TO ${config.user};`, 'yellow');
      return false;
    }
  }
}

async function grantSchemaPrivileges(config) {
  const grantSql = `GRANT ALL ON SCHEMA public TO ${config.user};`;
  
  try {
    execSync(`echo "${grantSql}" | psql -h ${config.host} -p ${config.port} -d ${config.database} -U postgres`, { 
      stdio: 'pipe' 
    });
    logSuccess('Schema privileges granted');
    return true;
  } catch (error) {
    logWarning('Could not grant schema privileges automatically');
    log('Please run this command manually:', 'yellow');
    log(`  psql -U postgres -d ${config.database}`, 'yellow');
    log(`  GRANT ALL ON SCHEMA public TO ${config.user};`, 'yellow');
    return false;
  }
}

async function initializeSchema() {
  try {
    execSync('npm run db:init', { stdio: 'inherit' });
    logSuccess('Database schema initialized');
    return true;
  } catch (error) {
    logError('Failed to initialize database schema');
    log('Please run manually: npm run db:init', 'yellow');
    return false;
  }
}

async function testConnection(config) {
  try {
    execSync(`psql -h ${config.host} -p ${config.port} -d ${config.database} -U ${config.user} -c "SELECT 1;"`, { 
      stdio: 'pipe',
      env: { ...process.env, PGPASSWORD: config.password }
    });
    logSuccess('Database connection test successful');
    return true;
  } catch (error) {
    logError('Database connection test failed');
    return false;
  }
}

async function runPropertyTest() {
  try {
    log('\nRunning Property Test...', 'bold');
    execSync('npm test -- schema-constraints.property.test.ts', { stdio: 'inherit' });
    logSuccess('Property test completed successfully!');
    return true;
  } catch (error) {
    logError('Property test failed');
    return false;
  }
}

async function main() {
  log('🚀 Database Setup for Property Tests', 'bold');
  log('=====================================\n', 'bold');

  // Step 1: Check PostgreSQL installation
  logStep(1, 'Checking PostgreSQL installation...');
  if (!(await checkPostgreSQL())) {
    process.exit(1);
  }

  // Step 2: Check if PostgreSQL is running
  logStep(2, 'Checking if PostgreSQL is running...');
  if (!(await checkPostgreSQLRunning())) {
    process.exit(1);
  }

  // Step 3: Read configuration
  logStep(3, 'Reading database configuration...');
  const config = readEnvFile();
  log(`  Host: ${config.host}:${config.port}`, 'blue');
  log(`  Database: ${config.database}`, 'blue');
  log(`  User: ${config.user}`, 'blue');

  // Step 4: Create database and user
  logStep(4, 'Creating database and user...');
  await createDatabaseAndUser(config);

  // Step 5: Grant schema privileges
  logStep(5, 'Granting schema privileges...');
  await grantSchemaPrivileges(config);

  // Step 6: Test connection
  logStep(6, 'Testing database connection...');
  if (!(await testConnection(config))) {
    log('\nPlease check your database configuration and try again.', 'yellow');
    process.exit(1);
  }

  // Step 7: Initialize schema
  logStep(7, 'Initializing database schema...');
  if (!(await initializeSchema())) {
    process.exit(1);
  }

  // Step 8: Run property test
  logStep(8, 'Running property test...');
  const testSuccess = await runPropertyTest();

  log('\n🎉 Setup Complete!', 'bold');
  if (testSuccess) {
    log('✓ Database is ready and property test passed', 'green');
    log('\nYou can now run property tests with:', 'blue');
    log('  npm test -- schema-constraints.property.test.ts', 'blue');
  } else {
    log('⚠ Database is ready but property test failed', 'yellow');
    log('Check the test output above for details.', 'yellow');
  }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logError(`Unhandled promise rejection: ${error.message}`);
  process.exit(1);
});

main().catch((error) => {
  logError(`Setup failed: ${error.message}`);
  process.exit(1);
});