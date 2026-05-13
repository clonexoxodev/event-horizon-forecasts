import { describe, it, beforeEach, expect, afterEach } from 'vitest';
import fc from 'fast-check';
import { WalletService } from '../services/wallet.service.js';
import { WalletRepository } from '../repositories/wallet.repository.js';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { query } from '../db/index.js';

/**
 * Property Tests: Wallet Balance Updates
 * 
 * **Validates: Requirements 24.1, 24.2, 24.3, 24.4**
 * 
 * Property 30: Wallet Balance Update on Position Entry
 * For any successful position entry, the system SHALL deduct the position amount 
 * from the user's available wallet balance in the corresponding currency.
 * 
 * Property 31: Wallet Balance Update on Position Win
 * For any position resolved as a winner, the system SHALL add the payout amount 
 * to the user's available wallet balance in the corresponding currency.
 * 
 * Property 32: Wallet Balance Update on Deposit
 * For any completed deposit, the system SHALL add the deposit amount to both 
 * the user's total and available wallet balance in the corresponding currency.
 * 
 * Property 33: Wallet Balance Update on Withdrawal
 * For any completed withdrawal, the system SHALL deduct the withdrawal amount 
 * from both the user's total and available wallet balance in the corresponding currency.
 * 
 * These property tests verify that:
 * - Balance updates happen atomically within database transactions
 * - Balance updates are accurate and match the transaction amounts
 * - Balance updates occur within specified time limits
 * - Balance updates maintain wallet invariants (available <= total, non-negative)
 */

describe('Feature: prediction-platform-overhaul, Wallet Balance Update Properties', () => {
  let walletService: WalletService;
  let walletRepository: WalletRepository;
  let transactionRepository: TransactionRepository;
  let userRepository: UserRepository;
  let testUserId: string;
  let testWalletId: string;

  beforeEach(async () => {
    walletRepository = new WalletRepository();
    transactionRepository = new TransactionRepository();
    userRepository = new UserRepository();
    walletService = new WalletService(walletRepository, transactionRepository);

    // Create a test user and wallet for all tests
    const testUser = await userRepository.create({
      username: `testuser_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      email: `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
      password_hash: 'hashed_password'
    });
    testUserId = testUser.id;

    const testWallet = await walletRepository.findByUserId(testUserId);
    if (!testWallet) {
      throw new Error('Wallet not created for test user');
    }
    testWalletId = testWallet.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await query('DELETE FROM transactions WHERE user_id = $1', [testUserId]);
      await query('DELETE FROM wallets WHERE user_id = $1', [testUserId]);
      await query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
  });

  /**
   * Property 30: Wallet Balance Update on Position Entry
   * **Validates: Requirements 24.1**
   */
  describe('Property 30: Wallet Balance Update on Position Entry', () => {
    it('should deduct position amount from available balance within 1 second', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 500000 }), // Position amount
          fc.constantFrom('NGN' as const, 'USD' as const),
          fc.uuid(), // Reference ID (position ID)
          async (positionAmount, currency, referenceId) => {
            // Setup: Deposit initial funds (2x position amount to ensure sufficient balance)
            const initialDeposit = positionAmount * 2;
            await walletService.processDeposit(testUserId, {
              amount_smallest_unit: initialDeposit,
              currency,
              method: 'bank_transfer'
            });

            // Get initial balance
            const walletBefore = await walletRepository.findByUserId(testUserId);
            const initialAvailableBalance = currency === 'NGN' 
              ? walletBefore!.available_ngn_kobo 
              : walletBefore!.available_usd_cents;

            // Execute: Reserve balance for position entry
            const startTime = Date.now();
            const result = await walletService.reserveBalanceForPosition(
              testUserId,
              currency,
              positionAmount,
              referenceId
            );
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            // Verify: Balance updated within 1 second (1000ms)
            expect(executionTime).toBeLessThan(1000);

            // Verify: Available balance decreased by position amount
            const expectedAvailableBalance = initialAvailableBalance - positionAmount;
            const actualAvailableBalance = currency === 'NGN'
              ? result.wallet.available_ngn_kobo
              : result.wallet.available_usd_cents;
            
            expect(actualAvailableBalance).toBe(expectedAvailableBalance);

            // Verify: Total balance remains unchanged (only available decreases)
            const totalBalance = currency === 'NGN'
              ? result.wallet.balance_ngn_kobo
              : result.wallet.balance_usd_cents;
            
            expect(totalBalance).toBe(initialDeposit);

            // Verify: Transaction recorded correctly
            expect(result.transaction.type).toBe('position_entry');
            expect(result.transaction.amount_smallest_unit).toBe(positionAmount);
            expect(result.transaction.currency).toBe(currency);
            expect(result.transaction.direction).toBe('OUT');
            expect(result.transaction.reference_id).toBe(referenceId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain wallet invariants after position entry', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 500000 }),
          fc.constantFrom('NGN' as const, 'USD' as const),
          fc.uuid(),
          async (positionAmount, currency, referenceId) => {
            // Setup: Deposit funds
            await walletService.processDeposit(testUserId, {
              amount_smallest_unit: positionAmount * 2,
              currency,
              method: 'bank_transfer'
            });

            // Execute: Reserve balance
            const result = await walletService.reserveBalanceForPosition(
              testUserId,
              currency,
              positionAmount,
              referenceId
            );

            // Verify: Wallet invariants maintained
            // 1. Available balance <= Total balance
            if (currency === 'NGN') {
              expect(result.wallet.available_ngn_kobo).toBeLessThanOrEqual(result.wallet.balance_ngn_kobo);
              expect(result.wallet.available_ngn_kobo).toBeGreaterThanOrEqual(0);
              expect(result.wallet.balance_ngn_kobo).toBeGreaterThanOrEqual(0);
            } else {
              expect(result.wallet.available_usd_cents).toBeLessThanOrEqual(result.wallet.balance_usd_cents);
              expect(result.wallet.available_usd_cents).toBeGreaterThanOrEqual(0);
              expect(result.wallet.balance_usd_cents).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject position entry when balance is insufficient', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 100000 }),
          fc.integer({ min: 100001, max: 500000 }), // Larger amount than deposit
          fc.constantFrom('NGN' as const, 'USD' as const),
          fc.uuid(),
          async (depositAmount, positionAmount, currency, referenceId) => {
            // Setup: Deposit smaller amount
            await walletService.processDeposit(testUserId, {
              amount_smallest_unit: depositAmount,
              currency,
              method: 'bank_transfer'
            });

            // Execute & Verify: Should throw InsufficientBalanceError
            await expect(
              walletService.reserveBalanceForPosition(
                testUserId,
                currency,
                positionAmount,
                referenceId
              )
            ).rejects.toThrow('Insufficient balance');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 31: Wallet Balance Update on Position Win
   * **Validates: Requirements 24.2**
   */
  describe('Property 31: Wallet Balance Update on Position Win', () => {
    it('should add payout amount to available balance within 5 seconds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 1000000 }), // Payout amount
          fc.constantFrom('NGN' as const, 'USD' as const),
          fc.uuid(), // Reference ID (position ID)
          async (payoutAmount, currency, referenceId) => {
            // Get initial balance
            const walletBefore = await walletRepository.findByUserId(testUserId);
            const initialTotalBalance = currency === 'NGN' 
              ? walletBefore!.balance_ngn_kobo 
              : walletBefore!.balance_usd_cents;
            const initialAvailableBalance = currency === 'NGN'
              ? walletBefore!.available_ngn_kobo
              : walletBefore!.available_usd_cents;

            // Execute: Process position payout
            const startTime = Date.now();
            const result = await walletService.processPositionPayout(
              testUserId,
              currency,
              payoutAmount,
              referenceId
            );
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            // Verify: Balance updated within 5 seconds (5000ms)
            expect(executionTime).toBeLessThan(5000);

            // Verify: Both total and available balance increased by payout amount
            const expectedTotalBalance = initialTotalBalance + payoutAmount;
            const expectedAvailableBalance = initialAvailableBalance + payoutAmount;
            
            const actualTotalBalance = currency === 'NGN'
              ? result.wallet.balance_ngn_kobo
              : result.wallet.balance_usd_cents;
            const actualAvailableBalance = currency === 'NGN'
              ? result.wallet.available_ngn_kobo
              : result.wallet.available_usd_cents;

            expect(actualTotalBalance).toBe(expectedTotalBalance);
            expect(actualAvailableBalance).toBe(expectedAvailableBalance);

            // Verify: Transaction recorded correctly
            expect(result.transaction.type).toBe('position_payout');
            expect(result.transaction.amount_smallest_unit).toBe(payoutAmount);
            expect(result.transaction.currency).toBe(currency);
            expect(result.transaction.direction).toBe('IN');
            expect(result.transaction.reference_id).toBe(referenceId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain wallet invariants after position payout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 1000000 }),
          fc.constantFrom('NGN' as const, 'USD' as const),
          fc.uuid(),
          async (payoutAmount, currency, referenceId) => {
            // Execute: Process payout
            const result = await walletService.processPositionPayout(
              testUserId,
              currency,
              payoutAmount,
              referenceId
            );

            // Verify: Wallet invariants maintained
            if (currency === 'NGN') {
              expect(result.wallet.available_ngn_kobo).toBeLessThanOrEqual(result.wallet.balance_ngn_kobo);
              expect(result.wallet.available_ngn_kobo).toBeGreaterThanOrEqual(0);
              expect(result.wallet.balance_ngn_kobo).toBeGreaterThanOrEqual(0);
              // After payout, available should equal total (no locked funds)
              expect(result.wallet.available_ngn_kobo).toBe(result.wallet.balance_ngn_kobo);
            } else {
              expect(result.wallet.available_usd_cents).toBeLessThanOrEqual(result.wallet.balance_usd_cents);
              expect(result.wallet.available_usd_cents).toBeGreaterThanOrEqual(0);
              expect(result.wallet.balance_usd_cents).toBeGreaterThanOrEqual(0);
              // After payout, available should equal total (no locked funds)
              expect(result.wallet.available_usd_cents).toBe(result.wallet.balance_usd_cents);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 32: Wallet Balance Update on Deposit
   * **Validates: Requirements 24.3**
   */
  describe('Property 32: Wallet Balance Update on Deposit', () => {
    it('should add deposit amount to both total and available balance', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 10000000 }), // Deposit amount
          fc.constantFrom('NGN' as const, 'USD' as const),
          fc.constantFrom('bank_transfer' as const, 'card' as const, 'crypto' as const),
          async (depositAmount, currency, method) => {
            // Get initial balance
            const walletBefore = await walletRepository.findByUserId(testUserId);
            const initialTotalBalance = currency === 'NGN' 
              ? walletBefore!.balance_ngn_kobo 
              : walletBefore!.balance_usd_cents;
            const initialAvailableBalance = currency === 'NGN'
              ? walletBefore!.available_ngn_kobo
              : walletBefore!.available_usd_cents;

            // Execute: Process deposit
            const result = await walletService.processDeposit(testUserId, {
              amount_smallest_unit: depositAmount,
              currency,
              method,
              metadata: { test: true }
            });

            // Verify: Both total and available balance increased by deposit amount
            const expectedTotalBalance = initialTotalBalance + depositAmount;
            const expectedAvailableBalance = initialAvailableBalance + depositAmount;
            
            const actualTotalBalance = currency === 'NGN'
              ? result.wallet.balance_ngn_kobo
              : result.wallet.balance_usd_cents;
            const actualAvailableBalance = currency === 'NGN'
              ? result.wallet.available_ngn_kobo
              : result.wallet.available_usd_cents;

            expect(actualTotalBalance).toBe(expectedTotalBalance);
            expect(actualAvailableBalance).toBe(expectedAvailableBalance);

            // Verify: Transaction recorded correctly
            expect(result.transaction.type).toBe('deposit');
            expect(result.transaction.amount_smallest_unit).toBe(depositAmount);
            expect(result.transaction.currency).toBe(currency);
            expect(result.transaction.direction).toBe('IN');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain wallet invariants after deposit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 10000000 }),
          fc.constantFrom('NGN' as const, 'USD' as const),
          fc.constantFrom('bank_transfer' as const, 'card' as const, 'crypto' as const),
          async (depositAmount, currency, method) => {
            // Execute: Process deposit
            const result = await walletService.processDeposit(testUserId, {
              amount_smallest_unit: depositAmount,
              currency,
              method
            });

            // Verify: Wallet invariants maintained
            if (currency === 'NGN') {
              expect(result.wallet.available_ngn_kobo).toBeLessThanOrEqual(result.wallet.balance_ngn_kobo);
              expect(result.wallet.available_ngn_kobo).toBeGreaterThanOrEqual(0);
              expect(result.wallet.balance_ngn_kobo).toBeGreaterThanOrEqual(0);
              // After deposit, available should equal total (no locked funds yet)
              expect(result.wallet.available_ngn_kobo).toBe(result.wallet.balance_ngn_kobo);
            } else {
              expect(result.wallet.available_usd_cents).toBeLessThanOrEqual(result.wallet.balance_usd_cents);
              expect(result.wallet.available_usd_cents).toBeGreaterThanOrEqual(0);
              expect(result.wallet.balance_usd_cents).toBeGreaterThanOrEqual(0);
              // After deposit, available should equal total (no locked funds yet)
              expect(result.wallet.available_usd_cents).toBe(result.wallet.balance_usd_cents);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject deposits with zero or negative amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -10000, max: 0 }), // Zero or negative amount
          fc.constantFrom('NGN' as const, 'USD' as const),
          async (invalidAmount, currency) => {
            // Execute & Verify: Should throw InvalidAmountError
            await expect(
              walletService.processDeposit(testUserId, {
                amount_smallest_unit: invalidAmount,
                currency,
                method: 'bank_transfer'
              })
            ).rejects.toThrow('Deposit amount must be greater than zero');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 33: Wallet Balance Update on Withdrawal
   * **Validates: Requirements 24.4**
   */
  describe('Property 33: Wallet Balance Update on Withdrawal', () => {
    it('should deduct withdrawal amount from both total and available balance', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 500000 }), // Withdrawal amount
          fc.constantFrom('NGN' as const, 'USD' as const),
          fc.string({ minLength: 10, maxLength: 50 }), // Destination
          async (withdrawalAmount, currency, destination) => {
            // Setup: Deposit funds (2x withdrawal amount)
            const depositAmount = withdrawalAmount * 2;
            await walletService.processDeposit(testUserId, {
              amount_smallest_unit: depositAmount,
              currency,
              method: 'bank_transfer'
            });

            // Get balance after deposit
            const walletBefore = await walletRepository.findByUserId(testUserId);
            const initialTotalBalance = currency === 'NGN' 
              ? walletBefore!.balance_ngn_kobo 
              : walletBefore!.balance_usd_cents;
            const initialAvailableBalance = currency === 'NGN'
              ? walletBefore!.available_ngn_kobo
              : walletBefore!.available_usd_cents;

            // Execute: Process withdrawal
            const result = await walletService.processWithdrawal(testUserId, {
              amount_smallest_unit: withdrawalAmount,
              currency,
              destination,
              metadata: { test: true }
            });

            // Verify: Both total and available balance decreased by withdrawal amount
            const expectedTotalBalance = initialTotalBalance - withdrawalAmount;
            const expectedAvailableBalance = initialAvailableBalance - withdrawalAmount;
            
            const actualTotalBalance = currency === 'NGN'
              ? result.wallet.balance_ngn_kobo
              : result.wallet.balance_usd_cents;
            const actualAvailableBalance = currency === 'NGN'
              ? result.wallet.available_ngn_kobo
              : result.wallet.available_usd_cents;

            expect(actualTotalBalance).toBe(expectedTotalBalance);
            expect(actualAvailableBalance).toBe(expectedAvailableBalance);

            // Verify: Transaction recorded correctly
            expect(result.transaction.type).toBe('withdrawal');
            expect(result.transaction.amount_smallest_unit).toBe(withdrawalAmount);
            expect(result.transaction.currency).toBe(currency);
            expect(result.transaction.direction).toBe('OUT');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain wallet invariants after withdrawal', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 500000 }),
          fc.constantFrom('NGN' as const, 'USD' as const),
          fc.string({ minLength: 10, maxLength: 50 }),
          async (withdrawalAmount, currency, destination) => {
            // Setup: Deposit funds
            await walletService.processDeposit(testUserId, {
              amount_smallest_unit: withdrawalAmount * 2,
              currency,
              method: 'bank_transfer'
            });

            // Execute: Process withdrawal
            const result = await walletService.processWithdrawal(testUserId, {
              amount_smallest_unit: withdrawalAmount,
              currency,
              destination
            });

            // Verify: Wallet invariants maintained
            if (currency === 'NGN') {
              expect(result.wallet.available_ngn_kobo).toBeLessThanOrEqual(result.wallet.balance_ngn_kobo);
              expect(result.wallet.available_ngn_kobo).toBeGreaterThanOrEqual(0);
              expect(result.wallet.balance_ngn_kobo).toBeGreaterThanOrEqual(0);
              // After withdrawal, available should equal total (no locked funds)
              expect(result.wallet.available_ngn_kobo).toBe(result.wallet.balance_ngn_kobo);
            } else {
              expect(result.wallet.available_usd_cents).toBeLessThanOrEqual(result.wallet.balance_usd_cents);
              expect(result.wallet.available_usd_cents).toBeGreaterThanOrEqual(0);
              expect(result.wallet.balance_usd_cents).toBeGreaterThanOrEqual(0);
              // After withdrawal, available should equal total (no locked funds)
              expect(result.wallet.available_usd_cents).toBe(result.wallet.balance_usd_cents);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject withdrawal when balance is insufficient', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 100000 }),
          fc.integer({ min: 100001, max: 500000 }), // Larger amount than deposit
          fc.constantFrom('NGN' as const, 'USD' as const),
          fc.string({ minLength: 10, maxLength: 50 }),
          async (depositAmount, withdrawalAmount, currency, destination) => {
            // Setup: Deposit smaller amount
            await walletService.processDeposit(testUserId, {
              amount_smallest_unit: depositAmount,
              currency,
              method: 'bank_transfer'
            });

            // Execute & Verify: Should throw InsufficientBalanceError
            await expect(
              walletService.processWithdrawal(testUserId, {
                amount_smallest_unit: withdrawalAmount,
                currency,
                destination
              })
            ).rejects.toThrow('Insufficient balance');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject withdrawals with zero or negative amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -10000, max: 0 }), // Zero or negative amount
          fc.constantFrom('NGN' as const, 'USD' as const),
          fc.string({ minLength: 10, maxLength: 50 }),
          async (invalidAmount, currency, destination) => {
            // Execute & Verify: Should throw InvalidAmountError
            await expect(
              walletService.processWithdrawal(testUserId, {
                amount_smallest_unit: invalidAmount,
                currency,
                destination
              })
            ).rejects.toThrow('Withdrawal amount must be greater than zero');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Combined property: Balance updates are atomic and consistent
   */
  describe('Combined: Atomic and Consistent Balance Updates', () => {
    it('should maintain balance consistency across multiple operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('deposit' as const, 'withdrawal' as const, 'position_entry' as const, 'payout' as const),
              amount: fc.integer({ min: 1000, max: 100000 }),
              currency: fc.constantFrom('NGN' as const, 'USD' as const)
            }),
            { minLength: 3, maxLength: 10 }
          ),
          async (operations) => {
            // Start with a large initial deposit to handle various operations
            await walletService.processDeposit(testUserId, {
              amount_smallest_unit: 1000000,
              currency: 'NGN',
              method: 'bank_transfer'
            });
            await walletService.processDeposit(testUserId, {
              amount_smallest_unit: 1000000,
              currency: 'USD',
              method: 'bank_transfer'
            });

            // Track expected balances
            let expectedNGNTotal = 1000000;
            let expectedNGNAvailable = 1000000;
            let expectedUSDTotal = 1000000;
            let expectedUSDAvailable = 1000000;

            // Execute operations sequentially
            for (const op of operations) {
              const isNGN = op.currency === 'NGN';
              const currentAvailable = isNGN ? expectedNGNAvailable : expectedUSDAvailable;

              try {
                switch (op.operation) {
                  case 'deposit':
                    await walletService.processDeposit(testUserId, {
                      amount_smallest_unit: op.amount,
                      currency: op.currency,
                      method: 'bank_transfer'
                    });
                    if (isNGN) {
                      expectedNGNTotal += op.amount;
                      expectedNGNAvailable += op.amount;
                    } else {
                      expectedUSDTotal += op.amount;
                      expectedUSDAvailable += op.amount;
                    }
                    break;

                  case 'withdrawal':
                    if (currentAvailable >= op.amount) {
                      await walletService.processWithdrawal(testUserId, {
                        amount_smallest_unit: op.amount,
                        currency: op.currency,
                        destination: 'test_destination'
                      });
                      if (isNGN) {
                        expectedNGNTotal -= op.amount;
                        expectedNGNAvailable -= op.amount;
                      } else {
                        expectedUSDTotal -= op.amount;
                        expectedUSDAvailable -= op.amount;
                      }
                    }
                    break;

                  case 'position_entry':
                    if (currentAvailable >= op.amount) {
                      await walletService.reserveBalanceForPosition(
                        testUserId,
                        op.currency,
                        op.amount,
                        `ref_${Date.now()}`
                      );
                      if (isNGN) {
                        expectedNGNAvailable -= op.amount;
                      } else {
                        expectedUSDAvailable -= op.amount;
                      }
                    }
                    break;

                  case 'payout':
                    await walletService.processPositionPayout(
                      testUserId,
                      op.currency,
                      op.amount,
                      `ref_${Date.now()}`
                    );
                    if (isNGN) {
                      expectedNGNTotal += op.amount;
                      expectedNGNAvailable += op.amount;
                    } else {
                      expectedUSDTotal += op.amount;
                      expectedUSDAvailable += op.amount;
                    }
                    break;
                }
              } catch (error) {
                // Skip operations that fail validation (e.g., insufficient balance)
                // This is expected behavior
              }
            }

            // Verify final balances match expected values
            const finalWallet = await walletRepository.findByUserId(testUserId);
            expect(finalWallet!.balance_ngn_kobo).toBe(expectedNGNTotal);
            expect(finalWallet!.available_ngn_kobo).toBe(expectedNGNAvailable);
            expect(finalWallet!.balance_usd_cents).toBe(expectedUSDTotal);
            expect(finalWallet!.available_usd_cents).toBe(expectedUSDAvailable);

            // Verify invariants
            expect(finalWallet!.available_ngn_kobo).toBeLessThanOrEqual(finalWallet!.balance_ngn_kobo);
            expect(finalWallet!.available_usd_cents).toBeLessThanOrEqual(finalWallet!.balance_usd_cents);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
