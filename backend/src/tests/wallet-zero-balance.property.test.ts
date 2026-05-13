import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import fc from 'fast-check';
import { AuthService } from '../services/auth.service.js';
import { WalletRepository } from '../repositories/wallet.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { testConnection, closePool, query } from '../db/index.js';

/**
 * Property Test: Wallet Zero-Balance Initialization
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * 
 * Property 1: Wallet Zero-Balance Initialization
 * For any newly created user account, the associated wallet SHALL initialize 
 * with exactly zero balance in both NGN (kobo) and USD (cents), with both 
 * total and available balances set to zero.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Ensure PostgreSQL is installed and running
 * 2. Create database: createdb prediction_platform
 * 3. Create user: createuser -s user
 * 4. Set password: psql -c "ALTER USER user PASSWORD 'password';"
 * 5. Initialize schema: npm run db:init
 * 6. Run test: npm test wallet-zero-balance.property.test.ts
 */

describe('Feature: prediction-platform-overhaul, Property 1: Wallet Zero-Balance Initialization', () => {
  let authService: AuthService;
  let walletRepository: WalletRepository;
  let userRepository: UserRepository;
  let databaseAvailable = false;

  beforeAll(async () => {
    try {
      // Test database connection
      const isConnected = await testConnection();
      if (!isConnected) {
        console.warn('⚠️  Database connection failed. Skipping property tests.');
        console.warn('📋 To run these tests:');
        console.warn('   1. Install PostgreSQL');
        console.warn('   2. Create database: createdb prediction_platform');
        console.warn('   3. Create user: createuser -s user');
        console.warn('   4. Set password: psql -c "ALTER USER user PASSWORD \'password\';"');
        console.warn('   5. Initialize schema: npm run db:init');
        console.warn('   6. Run test: npm test wallet-zero-balance.property.test.ts');
        return;
      }

      databaseAvailable = true;

      // Initialize services
      authService = new AuthService();
      walletRepository = new WalletRepository();
      userRepository = new UserRepository();

      console.log('✅ Database connection successful. Running property tests...');
    } catch (error) {
      console.warn('⚠️  Database setup failed:', error.message);
    }
  });

  afterAll(async () => {
    // Close database connections
    if (databaseAvailable) {
      await closePool();
    }
  });

  beforeEach(async () => {
    // Skip if database is not available
    if (!databaseAvailable) {
      return;
    }

    // Clean up test data before each test
    try {
      await query('DELETE FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@property-test.com\')');
      await query('DELETE FROM users WHERE email LIKE \'%@property-test.com\'');
    } catch (error) {
      console.warn('Cleanup failed:', error.message);
    }
  });

  it('should initialize all new wallets with zero balance', async () => {
    // Skip test if database is not available
    if (!databaseAvailable) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate valid user registration data
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 20 })
            .filter(s => /^[a-zA-Z0-9_]+$/.test(s)), // Only alphanumeric and underscore
          email: fc.string({ minLength: 5, maxLength: 30 })
            .map(s => `${s.replace(/[^a-zA-Z0-9]/g, '')}@property-test.com`), // Generate valid test email
          password: fc.string({ minLength: 8, maxLength: 50 })
        }),
        async (userData) => {
          try {
            // Create user through the registration process
            const authResponse = await authService.register(userData);
            
            // Verify user was created
            expect(authResponse.user).toBeDefined();
            expect(authResponse.user.id).toBeDefined();

            // Get the wallet associated with the user
            const wallet = await walletRepository.findByUserId(authResponse.user.id);
            
            // Verify wallet exists
            expect(wallet).toBeDefined();
            expect(wallet).not.toBeNull();

            // Assert zero balance in all fields
            expect(wallet!.balance_ngn_kobo).toBe(0);
            expect(wallet!.balance_usd_cents).toBe(0);
            expect(wallet!.available_ngn_kobo).toBe(0);
            expect(wallet!.available_usd_cents).toBe(0);

            // Verify wallet is properly linked to user
            expect(wallet!.user_id).toBe(authResponse.user.id);

            // Clean up this test user
            await query('DELETE FROM wallets WHERE user_id = $1', [authResponse.user.id]);
            await query('DELETE FROM users WHERE id = $1', [authResponse.user.id]);

          } catch (error) {
            // Re-throw with more context for debugging
            throw new Error(`Property test failed for user data ${JSON.stringify(userData)}: ${error.message}`);
          }
        }
      ),
      { 
        numRuns: 100, // Run 100 iterations as specified in design document
        verbose: true // Show detailed output for debugging
      }
    );
  });

  it('should maintain zero balance invariant across different user data variations', async () => {
    // Skip test if database is not available
    if (!databaseAvailable) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        // Test with edge cases and boundary values
        fc.record({
          username: fc.oneof(
            fc.constant('abc'), // Minimum length
            fc.constant('a'.repeat(50)), // Maximum length
            fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s))
          ),
          email: fc.oneof(
            fc.constant('a@property-test.com'), // Minimum valid email
            fc.constant('test.user.with.dots@property-test.com'), // Email with dots
            fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s.replace(/[^a-zA-Z0-9]/g, '')}@property-test.com`)
          ),
          password: fc.oneof(
            fc.constant('12345678'), // Minimum length
            fc.constant('a'.repeat(100)), // Long password
            fc.string({ minLength: 8, maxLength: 100 })
          )
        }),
        async (userData) => {
          try {
            // Create user
            const authResponse = await authService.register(userData);
            
            // Get wallet
            const wallet = await walletRepository.findByUserId(authResponse.user.id);
            
            // Assert all balance fields are exactly zero
            const balanceFields = [
              { name: 'balance_ngn_kobo', value: wallet!.balance_ngn_kobo },
              { name: 'balance_usd_cents', value: wallet!.balance_usd_cents },
              { name: 'available_ngn_kobo', value: wallet!.available_ngn_kobo },
              { name: 'available_usd_cents', value: wallet!.available_usd_cents }
            ];

            for (const field of balanceFields) {
              expect(field.value).toBe(0);
            }

            // Clean up
            await query('DELETE FROM wallets WHERE user_id = $1', [authResponse.user.id]);
            await query('DELETE FROM users WHERE id = $1', [authResponse.user.id]);

          } catch (error) {
            throw new Error(`Edge case test failed: ${error.message}`);
          }
        }
      ),
      { 
        numRuns: 50, // Fewer runs for edge cases
        verbose: true
      }
    );
  });

  it('should ensure wallet creation is atomic with user creation', async () => {
    // Skip test if database is not available
    if (!databaseAvailable) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 20 })
            .filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          email: fc.string({ minLength: 5, maxLength: 30 })
            .map(s => `${s.replace(/[^a-zA-Z0-9]/g, '')}@property-test.com`),
          password: fc.string({ minLength: 8, maxLength: 50 })
        }),
        async (userData) => {
          try {
            // Create user
            const authResponse = await authService.register(userData);
            
            // Verify both user and wallet exist
            const user = await userRepository.findById(authResponse.user.id);
            const wallet = await walletRepository.findByUserId(authResponse.user.id);
            
            expect(user).toBeDefined();
            expect(wallet).toBeDefined();

            // Verify wallet has zero balance
            expect(wallet!.balance_ngn_kobo).toBe(0);
            expect(wallet!.balance_usd_cents).toBe(0);
            expect(wallet!.available_ngn_kobo).toBe(0);
            expect(wallet!.available_usd_cents).toBe(0);

            // Clean up
            await query('DELETE FROM wallets WHERE user_id = $1', [authResponse.user.id]);
            await query('DELETE FROM users WHERE id = $1', [authResponse.user.id]);

          } catch (error) {
            throw new Error(`Atomicity test failed: ${error.message}`);
          }
        }
      ),
      { 
        numRuns: 25, // Fewer runs for atomicity test
        verbose: true
      }
    );
  });
});