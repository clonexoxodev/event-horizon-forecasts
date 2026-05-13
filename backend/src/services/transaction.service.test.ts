import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TransactionService } from './transaction.service.js';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { Transaction } from '../types/transaction.js';

// Mock the transaction repository
vi.mock('../repositories/transaction.repository.js');

describe('TransactionService', () => {
  let transactionService: TransactionService;
  let mockTransactionRepository: any;

  const mockTransaction: Transaction = {
    id: 'txn-123',
    user_id: 'user-123',
    wallet_id: 'wallet-123',
    type: 'deposit',
    amount_smallest_unit: 50000,
    currency: 'NGN',
    direction: 'IN',
    reference_id: null,
    reference_type: null,
    status: 'completed',
    metadata: null,
    created_at: new Date()
  };

  beforeEach(() => {
    mockTransactionRepository = {
      findByUserId: vi.fn(),
      findByType: vi.fn(),
      findById: vi.fn(),
      getTransactionCount: vi.fn(),
      getTotalDeposits: vi.fn(),
      getTotalWithdrawals: vi.fn()
    };

    transactionService = new TransactionService(mockTransactionRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getTransactionHistory', () => {
    it('should get all transactions without filters', async () => {
      const mockTransactions = [mockTransaction];
      mockTransactionRepository.findByUserId.mockResolvedValue(mockTransactions);

      const result = await transactionService.getTransactionHistory('user-123');

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionRepository.findByUserId).toHaveBeenCalledWith('user-123', 50, 0);
    });

    it('should support custom limit and offset', async () => {
      mockTransactionRepository.findByUserId.mockResolvedValue([]);

      await transactionService.getTransactionHistory('user-123', {
        limit: 10,
        offset: 20
      });

      expect(mockTransactionRepository.findByUserId).toHaveBeenCalledWith('user-123', 10, 20);
    });

    it('should filter by transaction type', async () => {
      const mockTransactions = [mockTransaction];
      mockTransactionRepository.findByType.mockResolvedValue(mockTransactions);

      const result = await transactionService.getTransactionHistory('user-123', {
        type: 'deposit'
      });

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionRepository.findByType).toHaveBeenCalledWith(
        'user-123',
        'deposit',
        50,
        0
      );
    });

    it('should filter by currency', async () => {
      const ngnTransaction = { ...mockTransaction, currency: 'NGN' as const };
      const usdTransaction = { ...mockTransaction, id: 'txn-456', currency: 'USD' as const };
      mockTransactionRepository.findByUserId.mockResolvedValue([ngnTransaction, usdTransaction]);

      const result = await transactionService.getTransactionHistory('user-123', {
        currency: 'NGN'
      });

      expect(result).toHaveLength(1);
      expect(result[0].currency).toBe('NGN');
    });

    it('should filter by both type and currency', async () => {
      const ngnDeposit = { ...mockTransaction, type: 'deposit' as const, currency: 'NGN' as const };
      const usdDeposit = { ...mockTransaction, id: 'txn-456', type: 'deposit' as const, currency: 'USD' as const };
      mockTransactionRepository.findByType.mockResolvedValue([ngnDeposit, usdDeposit]);

      const result = await transactionService.getTransactionHistory('user-123', {
        type: 'deposit',
        currency: 'NGN'
      });

      expect(result).toHaveLength(1);
      expect(result[0].currency).toBe('NGN');
      expect(mockTransactionRepository.findByType).toHaveBeenCalledWith(
        'user-123',
        'deposit',
        50,
        0
      );
    });
  });

  describe('getTransactionById', () => {
    it('should get transaction by ID', async () => {
      mockTransactionRepository.findById.mockResolvedValue(mockTransaction);

      const result = await transactionService.getTransactionById('txn-123');

      expect(result).toEqual(mockTransaction);
      expect(mockTransactionRepository.findById).toHaveBeenCalledWith('txn-123');
    });

    it('should return null when transaction not found', async () => {
      mockTransactionRepository.findById.mockResolvedValue(null);

      const result = await transactionService.getTransactionById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTransactionCount', () => {
    it('should get transaction count', async () => {
      mockTransactionRepository.getTransactionCount.mockResolvedValue(42);

      const result = await transactionService.getTransactionCount('user-123');

      expect(result).toBe(42);
      expect(mockTransactionRepository.getTransactionCount).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getTransactionStats', () => {
    it('should get comprehensive transaction statistics', async () => {
      mockTransactionRepository.getTotalDeposits.mockImplementation((userId, currency) => {
        if (currency === 'NGN') return Promise.resolve(100000);
        if (currency === 'USD') return Promise.resolve(50000);
        return Promise.resolve(0);
      });

      mockTransactionRepository.getTotalWithdrawals.mockImplementation((userId, currency) => {
        if (currency === 'NGN') return Promise.resolve(30000);
        if (currency === 'USD') return Promise.resolve(10000);
        return Promise.resolve(0);
      });

      mockTransactionRepository.getTransactionCount.mockResolvedValue(25);

      const positionEntry = {
        ...mockTransaction,
        type: 'position_entry' as const,
        amount_smallest_unit: 20000,
        currency: 'NGN' as const
      };

      const positionPayout = {
        ...mockTransaction,
        type: 'position_payout' as const,
        amount_smallest_unit: 40000,
        currency: 'NGN' as const
      };

      mockTransactionRepository.findByType.mockImplementation((userId, type) => {
        if (type === 'position_entry') return Promise.resolve([positionEntry]);
        if (type === 'position_payout') return Promise.resolve([positionPayout]);
        return Promise.resolve([]);
      });

      const result = await transactionService.getTransactionStats('user-123');

      expect(result).toEqual({
        totalDepositsNGN: 100000,
        totalDepositsUSD: 50000,
        totalWithdrawalsNGN: 30000,
        totalWithdrawalsUSD: 10000,
        totalPositionEntriesNGN: 20000,
        totalPositionEntriesUSD: 0,
        totalPayoutsNGN: 40000,
        totalPayoutsUSD: 0,
        transactionCount: 25
      });
    });
  });

  describe('getRecentTransactions', () => {
    it('should get recent transactions with default limit', async () => {
      const mockTransactions = [mockTransaction];
      mockTransactionRepository.findByUserId.mockResolvedValue(mockTransactions);

      const result = await transactionService.getRecentTransactions('user-123');

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionRepository.findByUserId).toHaveBeenCalledWith('user-123', 10, 0);
    });

    it('should support custom limit', async () => {
      mockTransactionRepository.findByUserId.mockResolvedValue([]);

      await transactionService.getRecentTransactions('user-123', 5);

      expect(mockTransactionRepository.findByUserId).toHaveBeenCalledWith('user-123', 5, 0);
    });
  });

  describe('getTransactionsByReference', () => {
    it('should return empty array (placeholder implementation)', async () => {
      const result = await transactionService.getTransactionsByReference(
        'position-123',
        'position'
      );

      expect(result).toEqual([]);
    });
  });
});
