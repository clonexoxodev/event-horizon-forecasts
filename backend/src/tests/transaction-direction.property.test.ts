import { describe, it, beforeEach, expect, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { WalletService } from '../services/wallet.service.js';
import { WalletRepository } from '../repositories/wallet.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { CreateTransactionRequest, Transaction } from '../types/transaction.js';
import { query, getClient, releaseClient } from '../db/index.js';

/**
 * Property Test: Transaction History Direction Indicators
 * 
 * **Validates: Requirements 6.2, 6.3, 6.4**
 * 
 * Property 4: Transaction History Direction Indicators
 * For any transaction in the wallet history, deposits and position payouts SHALL display 
 * an "IN" indicator, while withdrawals and position entries SHALL display an "OUT" indicator.
 * 
 * This property test verifies that:
 * - All deposit transactions have direction = 'IN'
 * - All position_payout transactions have direction = 'IN'
 * - All withdrawal transactions have direction = 'OUT'
 * - All position_entry transactions have direction = 'OUT'
 * - The direction field is correctly set during transaction creation
 * - The direction field persists correctly in the database
 */

describe('Feature: prediction-platform-overhaul, Property 4: Transaction History Direction Indicators', () => {
  let transactionRepository: TransactionRepository;
  let walletService: WalletService;
  let walletRepository: WalletRepository;
  let userRepository: UserRepository;
  let testUserId: string;
  let testWalletId: string;

  beforeEach(async () => {
    transactionRepository = new TransactionRepository();
    walletRepository = new WalletRepository();
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

  it('should assign IN direction to all deposit transactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various deposit amounts and currencies
        fc.integer({ min: 100, max: 10000000 }), // Amount in smallest unit
        fc.constantFrom('NGN' as const, 'USD' as const),
        fc.constantFrom('bank_transfer' as const, 'card' as const, 'crypto' as const),
        async (amount, currency, method) => {
          // Create a deposit transaction
          const depositRequest = {
            amount_smallest_unit: amount,
            currency,
            method,
            metadata: { test: true }
          };

          const result = await walletService.processDeposit(testUserId, depositRequest);
          
          // Verify the transaction has IN direction
          expect(result.transaction.direction).toBe('IN');
          expect(result.transaction.type).toBe('deposit');
          
          // Verify it persists correctly in the database
          const retrievedTransaction = await transactionRepository.findById(result.transaction.id);
          expect(retrievedTransaction).not.toBeNull();
          expect(retrievedTransaction!.direction).toBe('IN');
          expect(retrievedTransaction!.type).toBe('deposit');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should assign OUT direction to all withdrawal transactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various withdrawal amounts and currencies
        fc.integer({ min: 100, max: 100000 }), // Smaller amounts to ensure sufficient balance
        fc.constantFrom('NGN' as const, 'USD' as const),
        fc.string({ minLength: 10, maxLength: 50 }), // Destination
        async (amount, currency, destination) => {
          // First, deposit enough funds to cover the withdrawal
          const depositAmount = amount + 10000; // Extra buffer
          await walletService.processDeposit(testUserId, {
            amount_smallest_unit: depositAmount,
            currency,
            method: 'bank_transfer'
          });

          // Create a withdrawal transaction
          const withdrawalRequest = {
            amount_smallest_unit: amount,
            currency,
            destination,
            metadata: { test: true }
          };

          const result = await walletService.processWithdrawal(testUserId, withdrawalRequest);
          
          // Verify the transaction has OUT direction
          expect(result.transaction.direction).toBe('OUT');
          expect(result.transaction.type).toBe('withdrawal');
          
          // Verify it persists correctly in the database
          const retrievedTransaction = await transactionRepository.findById(result.transaction.id);
          expect(retrievedTransaction).not.toBeNull();
          expect(retrievedTransaction!.direction).toBe('OUT');
          expect(retrievedTransaction!.type).toBe('withdrawal');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should assign OUT direction to all position_entry transactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various position entry amounts and currencies
        fc.integer({ min: 100, max: 100000 }), // Amount in smallest unit
        fc.constantFrom('NGN' as const, 'USD' as const),
        fc.uuid(), // Reference ID (position ID)
        async (amount, currency, referenceId) => {
          // First, deposit enough funds
          await walletService.processDeposit(testUserId, {
            amount_smallest_unit: amount + 10000,
            currency,
            method: 'bank_transfer'
          });

          // Create a position entry transaction
          const result = await walletService.processPositionEntry(
            testUserId,
            currency,
            amount,
            referenceId
          );
          
          // Verify the transaction has OUT direction
          expect(result.transaction.direction).toBe('OUT');
          expect(result.transaction.type).toBe('position_entry');
          expect(result.transaction.reference_id).toBe(referenceId);
          expect(result.transaction.reference_type).toBe('position');
          
          // Verify it persists correctly in the database
          const retrievedTransaction = await transactionRepository.findById(result.transaction.id);
          expect(retrievedTransaction).not.toBeNull();
          expect(retrievedTransaction!.direction).toBe('OUT');
          expect(retrievedTransaction!.type).toBe('position_entry');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should assign IN direction to all position_payout transactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various payout amounts and currencies
        fc.integer({ min: 100, max: 10000000 }), // Payout amount in smallest unit
        fc.constantFrom('NGN' as const, 'USD' as const),
        fc.uuid(), // Reference ID (position ID)
        async (payoutAmount, currency, referenceId) => {
          // Create a position payout transaction
          const result = await walletService.processPositionPayout(
            testUserId,
            currency,
            payoutAmount,
            referenceId
          );
          
          // Verify the transaction has IN direction
          expect(result.transaction.direction).toBe('IN');
          expect(result.transaction.type).toBe('position_payout');
          expect(result.transaction.reference_id).toBe(referenceId);
          expect(result.transaction.reference_type).toBe('position');
          
          // Verify it persists correctly in the database
          const retrievedTransaction = await transactionRepository.findById(result.transaction.id);
          expect(retrievedTransaction).not.toBeNull();
          expect(retrievedTransaction!.direction).toBe('IN');
          expect(retrievedTransaction!.type).toBe('position_payout');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain correct direction indicators across mixed transaction types', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a sequence of mixed transactions
        fc.array(
          fc.record({
            type: fc.constantFrom('deposit' as const, 'withdrawal' as const, 'position_entry' as const, 'position_payout' as const),
            amount: fc.integer({ min: 100, max: 50000 }),
            currency: fc.constantFrom('NGN' as const, 'USD' as const)
          }),
          { minLength: 5, maxLength: 20 }
        ),
        async (transactions) => {
          // Ensure sufficient balance by depositing a large amount first
          await walletService.processDeposit(testUserId, {
            amount_smallest_unit: 10000000,
            currency: 'NGN',
            method: 'bank_transfer'
          });
          await walletService.processDeposit(testUserId, {
            amount_smallest_unit: 10000000,
            currency: 'USD',
            method: 'bank_transfer'
          });

          const createdTransactions: Transaction[] = [];

          // Create all transactions
          for (const tx of transactions) {
            let result;
            const referenceId = `ref_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            try {
              switch (tx.type) {
                case 'deposit':
                  result = await walletService.processDeposit(testUserId, {
                    amount_smallest_unit: tx.amount,
                    currency: tx.currency,
                    method: 'bank_transfer'
                  });
                  createdTransactions.push(result.transaction);
                  break;

                case 'withdrawal':
                  result = await walletService.processWithdrawal(testUserId, {
                    amount_smallest_unit: tx.amount,
                    currency: tx.currency,
                    destination: 'test_destination'
                  });
                  createdTransactions.push(result.transaction);
                  break;

                case 'position_entry':
                  result = await walletService.processPositionEntry(
                    testUserId,
                    tx.currency,
                    tx.amount,
                    referenceId
                  );
                  createdTransactions.push(result.transaction);
                  break;

                case 'position_payout':
                  result = await walletService.processPositionPayout(
                    testUserId,
                    tx.currency,
                    tx.amount,
                    referenceId
                  );
                  createdTransactions.push(result.transaction);
                  break;
              }
            } catch (error) {
              // Skip transactions that fail due to insufficient balance
              // This is expected behavior and not what we're testing
              continue;
            }
          }

          // Verify all created transactions have correct direction indicators
          for (const transaction of createdTransactions) {
            if (transaction.type === 'deposit' || transaction.type === 'position_payout') {
              expect(transaction.direction).toBe('IN');
            } else if (transaction.type === 'withdrawal' || transaction.type === 'position_entry') {
              expect(transaction.direction).toBe('OUT');
            }
          }

          // Retrieve all transactions from database and verify persistence
          const allTransactions = await transactionRepository.findByUserId(testUserId, 1000, 0);
          
          for (const transaction of allTransactions) {
            if (transaction.type === 'deposit' || transaction.type === 'position_payout') {
              expect(transaction.direction).toBe('IN');
            } else if (transaction.type === 'withdrawal' || transaction.type === 'position_entry') {
              expect(transaction.direction).toBe('OUT');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should never have mismatched type-direction pairs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('deposit' as const, 'withdrawal' as const, 'position_entry' as const, 'position_payout' as const),
        fc.integer({ min: 100, max: 100000 }),
        fc.constantFrom('NGN' as const, 'USD' as const),
        async (type, amount, currency) => {
          // Ensure sufficient balance
          await walletService.processDeposit(testUserId, {
            amount_smallest_unit: amount + 100000,
            currency,
            method: 'bank_transfer'
          });

          let transaction: Transaction;
          const referenceId = `ref_${Date.now()}_${Math.random().toString(36).substring(7)}`;

          // Create transaction based on type
          switch (type) {
            case 'deposit':
              const depositResult = await walletService.processDeposit(testUserId, {
                amount_smallest_unit: amount,
                currency,
                method: 'bank_transfer'
              });
              transaction = depositResult.transaction;
              break;

            case 'withdrawal':
              const withdrawalResult = await walletService.processWithdrawal(testUserId, {
                amount_smallest_unit: amount,
                currency,
                destination: 'test_destination'
              });
              transaction = withdrawalResult.transaction;
              break;

            case 'position_entry':
              const entryResult = await walletService.processPositionEntry(
                testUserId,
                currency,
                amount,
                referenceId
              );
              transaction = entryResult.transaction;
              break;

            case 'position_payout':
              const payoutResult = await walletService.processPositionPayout(
                testUserId,
                currency,
                amount,
                referenceId
              );
              transaction = payoutResult.transaction;
              break;
          }

          // Define the expected direction for each type
          const expectedDirection = (type === 'deposit' || type === 'position_payout') ? 'IN' : 'OUT';

          // Verify the transaction has the correct direction
          expect(transaction.direction).toBe(expectedDirection);
          expect(transaction.type).toBe(type);

          // Verify no invalid combinations exist
          if (type === 'deposit' || type === 'position_payout') {
            expect(transaction.direction).not.toBe('OUT');
          } else {
            expect(transaction.direction).not.toBe('IN');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly filter transactions by direction when querying history', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            type: fc.constantFrom('deposit' as const, 'position_payout' as const),
            amount: fc.integer({ min: 100, max: 50000 }),
            currency: fc.constantFrom('NGN' as const, 'USD' as const)
          }),
          { minLength: 3, maxLength: 10 }
        ),
        fc.array(
          fc.record({
            type: fc.constantFrom('withdrawal' as const, 'position_entry' as const),
            amount: fc.integer({ min: 100, max: 50000 }),
            currency: fc.constantFrom('NGN' as const, 'USD' as const)
          }),
          { minLength: 3, maxLength: 10 }
        ),
        async (inTransactions, outTransactions) => {
          // Ensure sufficient balance
          await walletService.processDeposit(testUserId, {
            amount_smallest_unit: 10000000,
            currency: 'NGN',
            method: 'bank_transfer'
          });
          await walletService.processDeposit(testUserId, {
            amount_smallest_unit: 10000000,
            currency: 'USD',
            method: 'bank_transfer'
          });

          // Create IN transactions
          for (const tx of inTransactions) {
            const referenceId = `ref_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            if (tx.type === 'deposit') {
              await walletService.processDeposit(testUserId, {
                amount_smallest_unit: tx.amount,
                currency: tx.currency,
                method: 'bank_transfer'
              });
            } else {
              await walletService.processPositionPayout(
                testUserId,
                tx.currency,
                tx.amount,
                referenceId
              );
            }
          }

          // Create OUT transactions
          for (const tx of outTransactions) {
            const referenceId = `ref_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            try {
              if (tx.type === 'withdrawal') {
                await walletService.processWithdrawal(testUserId, {
                  amount_smallest_unit: tx.amount,
                  currency: tx.currency,
                  destination: 'test_destination'
                });
              } else {
                await walletService.processPositionEntry(
                  testUserId,
                  tx.currency,
                  tx.amount,
                  referenceId
                );
              }
            } catch (error) {
              // Skip if insufficient balance
              continue;
            }
          }

          // Retrieve all transactions
          const allTransactions = await transactionRepository.findByUserId(testUserId, 1000, 0);

          // Verify all IN transactions
          const inTxs = allTransactions.filter(tx => tx.direction === 'IN');
          for (const tx of inTxs) {
            expect(['deposit', 'position_payout']).toContain(tx.type);
          }

          // Verify all OUT transactions
          const outTxs = allTransactions.filter(tx => tx.direction === 'OUT');
          for (const tx of outTxs) {
            expect(['withdrawal', 'position_entry']).toContain(tx.type);
          }

          // Verify no transaction has both IN and OUT (impossible but good to check)
          for (const tx of allTransactions) {
            expect(tx.direction === 'IN' || tx.direction === 'OUT').toBe(true);
            expect(tx.direction === 'IN' && tx.direction === 'OUT').toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
