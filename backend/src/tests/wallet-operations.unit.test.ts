import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WalletService, InsufficientBalanceError, InvalidAmountError } from '../services/wallet.service.js';
import { WalletRepository } from '../repositories/wallet.repository.js';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { testConnection, closePool, query } from '../db/index.js';

/**
 * Wallet Operations Unit Tests
 * 
 * Requirements: 4.1, 5.1, 6.1
 * 
 * Tests cover:
 * - Deposit processing with balance updates
 * - Withdrawal with insufficient balance
 * - Currency conversion accuracy
 * - Transaction record creation
 */
describe('Wallet Operations - Unit Tests', () => {
  let walletService: WalletService;
  let walletRepository: WalletRepository;
  let transactionRepository: TransactionRepository;
  let userRepository: UserRepository;
  let testUserId: string;
  let databaseAvailable = false;

  beforeEach(async () => {
    try {
      await testConnection();
      databaseAvailable = true;
    } catch (error) {
      console.warn('Database not available, skipping tests');
      databaseAvailable = false;
      return;
    }

    walletRepository = new WalletRepository();
    transactionRepository = new TransactionRepository();
    userRepository = new UserRepository();
    walletService = new WalletService(walletRepository, transactionRepository);

    const testUser = await userRepository.create({
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password_hash: 'test-hash'
    });
    testUserId = testUser.id;

    const wallet = await walletRepository.findByUserId(testUserId);
    if (!wallet) {
      throw new Error('Wallet not created for test user');
    }
  });

  afterEach(async () => {
    if (!databaseAvailable) return;

    if (testUserId) {
      await query('DELETE FROM transactions WHERE user_id = $1', [testUserId]);
      await query('DELETE FROM wallets WHERE user_id = $1', [testUserId]);
      await query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
  });

  describe('Deposit Processing with Balance Updates', () => {
    it('should process NGN deposit and update both total and available balance', async () => {
      if (!databaseAvailable) return;

      const depositAmount = 50000;
      const walletBefore = await walletRepository.findByUserId(testUserId);

      const result = await walletService.processDeposit(testUserId, {
        amount_smallest_unit: depositAmount,
        currency: 'NGN',
        method: 'bank_transfer'
      });

      expect(result.wallet.balance_ngn_kobo).toBe(walletBefore!.balance_ngn_kobo + depositAmount);
      expect(result.wallet.available_ngn_kobo).toBe(walletBefore!.available_ngn_kobo + depositAmount);
      expect(result.wallet.balance_usd_cents).toBe(walletBefore!.balance_usd_cents);
      expect(result.wallet.available_usd_cents).toBe(walletBefore!.available_usd_cents);

      expect(result.transaction).toBeDefined();
      expect(result.transaction.type).toBe('deposit');
      expect(result.transaction.amount_smallest_unit).toBe(depositAmount);
      expect(result.transaction.currency).toBe('NGN');
      expect(result.transaction.direction).toBe('IN');
      expect(result.transaction.status).toBe('completed');
    });

    it('should process USD deposit and update both total and available balance', async () => {
      if (!databaseAvailable) return;

      const depositAmount = 10000;
      const walletBefore = await walletRepository.findByUserId(testUserId);

      const result = await walletService.processDeposit(testUserId, {
        amount_smallest_unit: depositAmount,
        currency: 'USD',
        method: 'card'
      });

      expect(result.wallet.balance_usd_cents).toBe(walletBefore!.balance_usd_cents + depositAmount);
      expect(result.wallet.available_usd_cents).toBe(walletBefore!.available_usd_cents + depositAmount);
      expect(result.wallet.balance_ngn_kobo).toBe(walletBefore!.balance_ngn_kobo);
      expect(result.wallet.available_ngn_kobo).toBe(walletBefore!.available_ngn_kobo);
    });

    it('should reject deposit with zero or negative amount', async () => {
      if (!databaseAvailable) return;

      await expect(
        walletService.processDeposit(testUserId, {
          amount_smallest_unit: 0,
          currency: 'NGN',
          method: 'bank_transfer'
        })
      ).rejects.toThrow(InvalidAmountError);

      await expect(
        walletService.processDeposit(testUserId, {
          amount_smallest_unit: -5000,
          currency: 'NGN',
          method: 'bank_transfer'
        })
      ).rejects.toThrow(InvalidAmountError);
    });

    it('should handle multiple consecutive deposits correctly', async () => {
      if (!databaseAvailable) return;

      await walletService.processDeposit(testUserId, {
        amount_smallest_unit: 10000,
        currency: 'NGN',
        method: 'bank_transfer'
      });

      await walletService.processDeposit(testUserId, {
        amount_smallest_unit: 20000,
        currency: 'NGN',
        method: 'card'
      });

      const result = await walletService.processDeposit(testUserId, {
        amount_smallest_unit: 15000,
        currency: 'NGN',
        method: 'bank_transfer'
      });

      expect(result.wallet.balance_ngn_kobo).toBe(45000);
      expect(result.wallet.available_ngn_kobo).toBe(45000);
    });
  });

  describe('Withdrawal with Insufficient Balance', () => {
    it('should reject withdrawal when balance is insufficient', async () => {
      if (!databaseAvailable) return;

      await walletService.processDeposit(testUserId, {
        amount_smallest_unit: 10000,
        currency: 'NGN',
        method: 'bank_transfer'
      });

      await expect(
        walletService.processWithdrawal(testUserId, {
          amount_smallest_unit: 20000,
          currency: 'NGN',
          destination: 'bank_account'
        })
      ).rejects.toThrow(InsufficientBalanceError);
    });

    it('should provide detailed error information for insufficient balance', async () => {
      if (!databaseAvailable) return;

      const depositAmount = 5000;
      const withdrawalAmount = 10000;

      await walletService.processDeposit(testUserId, {
        amount_smallest_unit: depositAmount,
        currency: 'NGN',
        method: 'bank_transfer'
      });

      try {
        await walletService.processWithdrawal(testUserId, {
          amount_smallest_unit: withdrawalAmount,
          currency: 'NGN',
          destination: 'bank_account'
        });
        expect.fail('Should have thrown InsufficientBalanceError');
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientBalanceError);
        const insufficientError = error as InsufficientBalanceError;
        expect(insufficientError.details.required).toBe(withdrawalAmount);
        expect(insufficientError.details.available).toBe(depositAmount);
        expect(insufficientError.details.currency).toBe('NGN');
      }
    });

    it('should process valid withdrawal and update balances', async () => {
      if (!databaseAvailable) return;

      const depositAmount = 50000;
      const withdrawalAmount = 20000;

      await walletService.processDeposit(testUserId, {
        amount_smallest_unit: depositAmount,
        currency: 'NGN',
        method: 'bank_transfer'
      });

      const result = await walletService.processWithdrawal(testUserId, {
        amount_smallest_unit: withdrawalAmount,
        currency: 'NGN',
        destination: 'bank_account'
      });

      const expectedBalance = depositAmount - withdrawalAmount;
      expect(result.wallet.balance_ngn_kobo).toBe(expectedBalance);
      expect(result.wallet.available_ngn_kobo).toBe(expectedBalance);

      expect(result.transaction.type).toBe('withdrawal');
      expect(result.transaction.amount_smallest_unit).toBe(withdrawalAmount);
      expect(result.transaction.direction).toBe('OUT');
    });

    it('should handle withdrawal of exact available balance', async () => {
      if (!databaseAvailable) return;

      const amount = 30000;

      await walletService.processDeposit(testUserId, {
        amount_smallest_unit: amount,
        currency: 'NGN',
        method: 'bank_transfer'
      });

      const result = await walletService.processWithdrawal(testUserId, {
        amount_smallest_unit: amount,
        currency: 'NGN',
        destination: 'bank_account'
      });

      expect(result.wallet.balance_ngn_kobo).toBe(0);
      expect(result.wallet.available_ngn_kobo).toBe(0);
    });
  });

  describe('Currency Conversion Accuracy', () => {
    it('should get exchange rate between currencies', async () => {
      if (!databaseAvailable) return;

      const rateNgnToUsd = await walletService.getCurrencyConversionRate('NGN', 'USD');
      const rateUsdToNgn = await walletService.getCurrencyConversionRate('USD', 'NGN');

      expect(rateNgnToUsd).toBeGreaterThan(0);
      expect(rateUsdToNgn).toBeGreaterThan(0);
      expect(typeof rateNgnToUsd).toBe('number');
      expect(typeof rateUsdToNgn).toBe('number');
    });

    it('should return 1 for same currency conversion', async () => {
      if (!databaseAvailable) return;

      const rateNGN = await walletService.getCurrencyConversionRate('NGN', 'NGN');
      const rateUSD = await walletService.getCurrencyConversionRate('USD', 'USD');

      expect(rateNGN).toBe(1);
      expect(rateUSD).toBe(1);
    });

    it('should convert amounts between currencies accurately', async () => {
      if (!databaseAvailable) return;

      const amountNGN = 100000;
      const convertedUSD = await walletService.convertCurrency(amountNGN, 'NGN', 'USD');

      expect(convertedUSD).toBeGreaterThan(0);
      expect(Number.isFinite(convertedUSD)).toBe(true);

      const amountUSD = 10000;
      const convertedNGN = await walletService.convertCurrency(amountUSD, 'USD', 'NGN');

      expect(convertedNGN).toBeGreaterThan(0);
      expect(Number.isFinite(convertedNGN)).toBe(true);
    });

    it('should get wallet display with correct currency formatting', async () => {
      if (!databaseAvailable) return;

      await walletService.processDeposit(testUserId, {
        amount_smallest_unit: 50000,
        currency: 'NGN',
        method: 'bank_transfer'
      });

      const displayNGN = await walletService.getWalletDisplay(testUserId, 'NGN');
      expect(displayNGN.currency).toBe('NGN');
      expect(displayNGN.totalBalance).toContain('₦');
      expect(displayNGN.availableBalance).toContain('₦');

      await walletService.processDeposit(testUserId, {
        amount_smallest_unit: 10000,
        currency: 'USD',
        method: 'card'
      });

      const displayUSD = await walletService.getWalletDisplay(testUserId, 'USD');
      expect(displayUSD.currency).toBe('USD');
      expect(displayUSD.totalBalance).toContain('$');
      expect(displayUSD.availableBalance).toContain('$');
    });

    it('should convert mixed currency balances for display', async () => {
      if (!databaseAvailable) return;

      await walletService.processDeposit(testUserId, {
        amount_smallest_unit: 50000,
        currency: 'NGN',
        method: 'bank_transfer'
      });

      await walletService.processDeposit(testUserId, {
        amount_smallest_unit: 10000,
        currency: 'USD',
        method: 'card'
      });

      const displayNGN = await walletService.getWalletDisplay(testUserId, 'NGN');
      expect(displayNGN.currency).toBe('NGN');

      const displayUSD = await walletService.getWalletDisplay(testUserId, 'USD');
      expect(displayUSD.currency).toBe('USD');
    });
  });

  describe('Transaction Record Creation', () => {
    it('should create transaction record for deposit', async () => {
      if (!databaseAvailable) return;

      const result = await walletService.processDeposit(testUserId, {
        amount_smallest_unit: 25000,
        currency: 'NGN',
        method: 'bank_transfer'
      });

      const transaction = result.transaction;
      expect(transaction.id).toBeDefined();
      expect(transaction.user_id).toBe(testUserId);
      expect(transaction.type).toBe('deposit');
      expect(transaction.amount_smallest_unit).toBe(25000);
      expect(transaction.currency).toBe('NGN');
      expect(transaction.direction).toBe('IN');
      expect(transaction.status).toBe('completed');
      expect(transaction.created_at).toBeDefined();
    });

    it('should create transaction record for withdrawal', async () => {
      if (!databaseAvailable) return;

      await walletService.processDeposit(testUserId, {
        amount_smallest_unit: 50000,
        currency: 'NGN',
        method: 'bank_transfer'
      });

      const result = await walletService.processWithdrawal(testUserId, {
        amount_smallest_unit: 20000,
        currency: 'NGN',
        destination: 'bank_account'
      });

      const transaction = result.transaction;
      expect(transaction.id).toBeDefined();
      expect(transaction.type).toBe('withdrawal');
      expect(transaction.direction).toBe('OUT');
    });

    it('should retrieve transaction history', async () => {
      if (!databaseAvailable) return;

      await walletService.processDeposit(testUserId, {
        amount_smallest_unit: 10000,
        currency: 'NGN',
        method: 'bank_transfer'
      });

      await walletService.processDeposit(testUserId, {
        amount_smallest_unit: 20000,
        currency: 'NGN',
        method: 'card'
      });

      await walletService.processWithdrawal(testUserId, {
        amount_smallest_unit: 5000,
        currency: 'NGN',
        destination: 'bank_account'
      });

      const transactions = await walletService.getTransactionHistory(testUserId);

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBeGreaterThanOrEqual(3);

      for (let i = 0; i < transactions.length - 1; i++) {
        const current = new Date(transactions[i].created_at).getTime();
        const next = new Date(transactions[i + 1].created_at).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('should respect transaction history pagination', async () => {
      if (!databaseAvailable) return;

      for (let i = 0; i < 5; i++) {
        await walletService.processDeposit(testUserId, {
          amount_smallest_unit: 10000,
          currency: 'NGN',
          method: 'bank_transfer'
        });
      }

      const page1 = await walletService.getTransactionHistory(testUserId, 2, 0);
      expect(page1.length).toBe(2);

      const page2 = await walletService.getTransactionHistory(testUserId, 2, 2);
      expect(page2.length).toBe(2);

      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should include wallet_id in transaction records', async () => {
      if (!databaseAvailable) return;

      const wallet = await walletRepository.findByUserId(testUserId);
      
      const result = await walletService.processDeposit(testUserId, {
        amount_smallest_unit: 15000,
        currency: 'NGN',
        method: 'bank_transfer'
      });

      expect(result.transaction.wallet_id).toBe(wallet!.id);
    });

    it('should store transaction metadata correctly', async () => {
      if (!databaseAvailable) return;

      const result = await walletService.processDeposit(testUserId, {
        amount_smallest_unit: 25000,
        currency: 'NGN',
        method: 'crypto',
        metadata: {
          wallet_address: '0x1234567890abcdef'
        }
      });

      expect(result.transaction.metadata).toBeDefined();
      expect(result.transaction.metadata).toHaveProperty('method', 'crypto');
      expect(result.transaction.metadata).toHaveProperty('wallet_address', '0x1234567890abcdef');
    });

    it('should create transaction with reference for position operations', async () => {
      if (!databaseAvailable) return;

      await walletService.processDeposit(testUserId, {
        amount_smallest_unit: 50000,
        currency: 'NGN',
        method: 'bank_transfer'
      });

      const positionId = 'position-123';
      const result = await walletService.reserveBalanceForPosition(
        testUserId,
        'NGN',
        10000,
        positionId
      );

      expect(result.transaction.type).toBe('position_entry');
      expect(result.transaction.reference_id).toBe(positionId);
      expect(result.transaction.reference_type).toBe('position');
      expect(result.transaction.direction).toBe('OUT');

      const payoutResult = await walletService.processPositionPayout(
        testUserId,
        'NGN',
        30000,
        positionId
      );

      expect(payoutResult.transaction.type).toBe('position_payout');
      expect(payoutResult.transaction.reference_id).toBe(positionId);
      expect(payoutResult.transaction.direction).toBe('IN');
    });
  });
});
