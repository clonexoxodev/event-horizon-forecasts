import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WalletService, InsufficientBalanceError, WalletNotFoundError, InvalidAmountError } from './wallet.service.js';
import { WalletRepository } from '../repositories/wallet.repository.js';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { currencyService } from './currency.service.js';
import { Wallet } from '../types/wallet.js';
import { Transaction } from '../types/transaction.js';

// Mock the repositories and currency service
vi.mock('../repositories/wallet.repository.js');
vi.mock('../repositories/transaction.repository.js');
vi.mock('./currency.service.js');

describe('WalletService', () => {
  let walletService: WalletService;
  let mockWalletRepository: any;
  let mockTransactionRepository: any;
  let mockCurrencyService: any;

  const mockWallet: Wallet = {
    id: 'wallet-123',
    user_id: 'user-123',
    balance_ngn_kobo: 100000, // 1000 NGN
    balance_usd_cents: 50000,  // 500 USD
    available_ngn_kobo: 80000, // 800 NGN
    available_usd_cents: 40000, // 400 USD
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockTransaction: Transaction = {
    id: 'txn-123',
    user_id: 'user-123',
    wallet_id: 'wallet-123',
    type: 'deposit',
    amount_smallest_unit: 50000,
    currency: 'NGN',
    direction: 'IN',
    status: 'completed',
    created_at: new Date()
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock instances
    mockWalletRepository = {
      findByUserId: vi.fn().mockResolvedValue(mockWallet),
      withTransaction: vi.fn().mockImplementation(async (callback) => {
        return await callback({});
      }),
      incrementBalanceInTransaction: vi.fn(),
      decrementBalanceInTransaction: vi.fn(),
      decrementAvailableBalanceInTransaction: vi.fn()
    };

    mockTransactionRepository = {
      createInTransaction: vi.fn().mockResolvedValue(mockTransaction),
      findByUserId: vi.fn(),
      getTotalDeposits: vi.fn(),
      getTotalWithdrawals: vi.fn(),
      getTransactionCount: vi.fn()
    };

    mockCurrencyService = vi.mocked(currencyService);
    mockCurrencyService.formatBalance = vi.fn().mockImplementation((amount, currency) => {
      const symbol = currency === 'NGN' ? '₦' : '$';
      return `${symbol}${(amount / 100).toFixed(2)}`;
    });
    mockCurrencyService.convertBalance = vi.fn().mockResolvedValue(0);
    mockCurrencyService.getExchangeRate = vi.fn().mockResolvedValue(1);
    mockCurrencyService.convert = vi.fn().mockResolvedValue(0);
    
    // Create service instance with mocked dependencies
    walletService = new WalletService(mockWalletRepository, mockTransactionRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getWallet', () => {
    it('should return wallet for valid user ID', async () => {
      const result = await walletService.getWallet('user-123');
      
      expect(result).toEqual(mockWallet);
      expect(mockWalletRepository.findByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should throw WalletNotFoundError when wallet does not exist', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(null);
      
      await expect(walletService.getWallet('nonexistent-user'))
        .rejects.toThrow(WalletNotFoundError);
    });
  });

  describe('getWalletDisplay', () => {
    it('should return NGN display with correct formatting', async () => {
      mockCurrencyService.convertBalance
        .mockResolvedValueOnce(25000) // USD to NGN balance
        .mockResolvedValueOnce(20000); // USD to NGN available

      const result = await walletService.getWalletDisplay('user-123', 'NGN');
      
      expect(result.currency).toBe('NGN');
      expect(mockCurrencyService.formatBalance).toHaveBeenCalledWith(125000, 'NGN'); // 100000 + 25000
      expect(mockCurrencyService.formatBalance).toHaveBeenCalledWith(100000, 'NGN'); // 80000 + 20000
    });

    it('should return USD display with correct formatting', async () => {
      mockCurrencyService.convertBalance
        .mockResolvedValueOnce(50000) // NGN to USD balance
        .mockResolvedValueOnce(40000); // NGN to USD available

      const result = await walletService.getWalletDisplay('user-123', 'USD');
      
      expect(result.currency).toBe('USD');
      expect(mockCurrencyService.formatBalance).toHaveBeenCalledWith(100000, 'USD'); // 50000 + 50000
      expect(mockCurrencyService.formatBalance).toHaveBeenCalledWith(80000, 'USD'); // 40000 + 40000
    });
  });

  describe('processDeposit', () => {
    it('should successfully process a valid deposit', async () => {
      const updatedWallet = { ...mockWallet, balance_ngn_kobo: 150000 };
      mockWalletRepository.incrementBalanceInTransaction.mockResolvedValue(updatedWallet);
      mockTransactionRepository.createInTransaction.mockResolvedValue(mockTransaction);

      const depositRequest = {
        amount_smallest_unit: 50000,
        currency: 'NGN' as const,
        method: 'bank_transfer' as const,
        metadata: { bank: 'Test Bank' }
      };

      const result = await walletService.processDeposit('user-123', depositRequest);

      expect(result.wallet).toEqual(updatedWallet);
      expect(result.transaction).toEqual(mockTransaction);
      expect(mockWalletRepository.incrementBalanceInTransaction).toHaveBeenCalledWith(
        {},
        'user-123',
        'NGN',
        50000,
        true
      );
    });

    it('should throw InvalidAmountError for zero or negative amount', async () => {
      const depositRequest = {
        amount_smallest_unit: 0,
        currency: 'NGN' as const,
        method: 'bank_transfer' as const
      };

      await expect(walletService.processDeposit('user-123', depositRequest))
        .rejects.toThrow(InvalidAmountError);
    });
  });

  describe('processWithdrawal', () => {
    it('should successfully process a valid withdrawal', async () => {
      const updatedWallet = { ...mockWallet, balance_ngn_kobo: 50000 };
      mockWalletRepository.decrementBalanceInTransaction.mockResolvedValue(updatedWallet);
      mockTransactionRepository.createInTransaction.mockResolvedValue(mockTransaction);

      const withdrawalRequest = {
        amount_smallest_unit: 30000,
        currency: 'NGN' as const,
        destination: 'bank-account-123'
      };

      const result = await walletService.processWithdrawal('user-123', withdrawalRequest);

      expect(result.wallet).toEqual(updatedWallet);
      expect(result.transaction).toEqual(mockTransaction);
      expect(mockWalletRepository.decrementBalanceInTransaction).toHaveBeenCalledWith(
        {},
        'user-123',
        'NGN',
        30000
      );
    });

    it('should throw InsufficientBalanceError when balance is insufficient', async () => {
      const withdrawalRequest = {
        amount_smallest_unit: 100000, // More than available (80000)
        currency: 'NGN' as const,
        destination: 'bank-account-123'
      };

      await expect(walletService.processWithdrawal('user-123', withdrawalRequest))
        .rejects.toThrow(InsufficientBalanceError);
    });

    it('should throw InvalidAmountError for zero or negative amount', async () => {
      const withdrawalRequest = {
        amount_smallest_unit: -1000,
        currency: 'NGN' as const,
        destination: 'bank-account-123'
      };

      await expect(walletService.processWithdrawal('user-123', withdrawalRequest))
        .rejects.toThrow(InvalidAmountError);
    });
  });

  describe('validateBalanceForPosition', () => {
    it('should return true when balance is sufficient', async () => {
      const result = await walletService.validateBalanceForPosition('user-123', 'NGN', 50000);
      
      expect(result).toBe(true);
    });

    it('should return false when balance is insufficient', async () => {
      const result = await walletService.validateBalanceForPosition('user-123', 'NGN', 100000);
      
      expect(result).toBe(false);
    });

    it('should throw InvalidAmountError for zero or negative amount', async () => {
      await expect(walletService.validateBalanceForPosition('user-123', 'NGN', 0))
        .rejects.toThrow(InvalidAmountError);
    });
  });

  describe('reserveBalanceForPosition', () => {
    it('should successfully reserve balance for position', async () => {
      const updatedWallet = { ...mockWallet, available_ngn_kobo: 50000 };
      mockWalletRepository.decrementAvailableBalanceInTransaction.mockResolvedValue(updatedWallet);
      mockTransactionRepository.createInTransaction.mockResolvedValue(mockTransaction);

      const result = await walletService.reserveBalanceForPosition(
        'user-123',
        'NGN',
        30000,
        'position-123'
      );

      expect(result.wallet).toEqual(updatedWallet);
      expect(result.transaction).toEqual(mockTransaction);
      expect(mockWalletRepository.decrementAvailableBalanceInTransaction).toHaveBeenCalledWith(
        {},
        'user-123',
        'NGN',
        30000
      );
    });

    it('should throw InsufficientBalanceError when balance is insufficient', async () => {
      await expect(walletService.reserveBalanceForPosition(
        'user-123',
        'NGN',
        100000, // More than available
        'position-123'
      )).rejects.toThrow(InsufficientBalanceError);
    });
  });

  describe('processPositionPayout', () => {
    it('should successfully process position payout', async () => {
      const updatedWallet = { ...mockWallet, balance_ngn_kobo: 150000 };
      mockWalletRepository.incrementBalanceInTransaction.mockResolvedValue(updatedWallet);
      mockTransactionRepository.createInTransaction.mockResolvedValue(mockTransaction);

      const result = await walletService.processPositionPayout(
        'user-123',
        'NGN',
        50000,
        'position-123'
      );

      expect(result.wallet).toEqual(updatedWallet);
      expect(result.transaction).toEqual(mockTransaction);
      expect(mockWalletRepository.incrementBalanceInTransaction).toHaveBeenCalledWith(
        {},
        'user-123',
        'NGN',
        50000,
        true
      );
    });

    it('should throw InvalidAmountError for zero or negative payout', async () => {
      await expect(walletService.processPositionPayout(
        'user-123',
        'NGN',
        0,
        'position-123'
      )).rejects.toThrow(InvalidAmountError);
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history', async () => {
      const mockTransactions = [mockTransaction];
      mockTransactionRepository.findByUserId.mockResolvedValue(mockTransactions);

      const result = await walletService.getTransactionHistory('user-123', 10, 0);

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionRepository.findByUserId).toHaveBeenCalledWith('user-123', 10, 0);
    });
  });

  describe('getCurrencyConversionRate', () => {
    it('should return exchange rate', async () => {
      mockCurrencyService.getExchangeRate.mockResolvedValue(770);

      const result = await walletService.getCurrencyConversionRate('USD', 'NGN');

      expect(result).toBe(770);
      expect(mockCurrencyService.getExchangeRate).toHaveBeenCalledWith('USD', 'NGN');
    });
  });

  describe('convertCurrency', () => {
    it('should convert currency amount', async () => {
      mockCurrencyService.convert.mockResolvedValue(77000);

      const result = await walletService.convertCurrency(100, 'USD', 'NGN');

      expect(result).toBe(77000);
      expect(mockCurrencyService.convert).toHaveBeenCalledWith(100, 'USD', 'NGN');
    });
  });

  describe('getWalletStats', () => {
    it('should return wallet statistics', async () => {
      mockTransactionRepository.getTotalDeposits
        .mockResolvedValueOnce(100000) // NGN deposits
        .mockResolvedValueOnce(50000);  // USD deposits
      mockTransactionRepository.getTotalWithdrawals
        .mockResolvedValueOnce(20000)  // NGN withdrawals
        .mockResolvedValueOnce(10000); // USD withdrawals
      mockTransactionRepository.getTransactionCount.mockResolvedValue(25);

      const result = await walletService.getWalletStats('user-123');

      expect(result).toEqual({
        totalDepositsNGN: 100000,
        totalDepositsUSD: 50000,
        totalWithdrawalsNGN: 20000,
        totalWithdrawalsUSD: 10000,
        transactionCount: 25
      });
    });
  });
});