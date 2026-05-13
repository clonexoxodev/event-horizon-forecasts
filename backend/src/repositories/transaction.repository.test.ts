import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TransactionRepository } from './transaction.repository.js';
import { query } from '../db/index.js';
import { Transaction, CreateTransactionRequest } from '../types/transaction.js';

// Mock the database query function
vi.mock('../db/index.js');

describe('TransactionRepository', () => {
  let transactionRepository: TransactionRepository;
  let mockQuery: any;

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

  const mockCreateRequest: CreateTransactionRequest = {
    user_id: 'user-123',
    wallet_id: 'wallet-123',
    type: 'deposit',
    amount_smallest_unit: 50000,
    currency: 'NGN',
    direction: 'IN',
    status: 'completed'
  };

  beforeEach(() => {
    transactionRepository = new TransactionRepository();
    mockQuery = vi.mocked(query);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a transaction successfully', async () => {
      mockQuery.mockResolvedValue({ rows: [mockTransaction] });

      const result = await transactionRepository.create(mockCreateRequest);

      expect(result).toEqual(mockTransaction);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        [
          'user-123',
          'wallet-123',
          'deposit',
          50000,
          'NGN',
          'IN',
          null,
          null,
          'completed',
          null
        ]
      );
    });

    it('should create transaction with metadata', async () => {
      const requestWithMetadata = {
        ...mockCreateRequest,
        metadata: { method: 'bank_transfer', bank: 'Test Bank' }
      };

      mockQuery.mockResolvedValue({ rows: [mockTransaction] });

      await transactionRepository.create(requestWithMetadata);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        expect.arrayContaining([
          JSON.stringify({ method: 'bank_transfer', bank: 'Test Bank' })
        ])
      );
    });

    it('should throw error when creation fails', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(transactionRepository.create(mockCreateRequest))
        .rejects.toThrow('Failed to create transaction');
    });
  });

  describe('createInTransaction', () => {
    it('should create transaction within database transaction', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [mockTransaction] })
      };

      const result = await transactionRepository.createInTransaction(
        mockClient,
        mockCreateRequest
      );

      expect(result).toEqual(mockTransaction);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        expect.arrayContaining(['user-123', 'wallet-123'])
      );
    });
  });

  describe('findByUserId', () => {
    it('should find transactions by user ID', async () => {
      const mockTransactions = [mockTransaction];
      mockQuery.mockResolvedValue({ rows: mockTransactions });

      const result = await transactionRepository.findByUserId('user-123');

      expect(result).toEqual(mockTransactions);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-123', 50, 0]
      );
    });

    it('should support pagination', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await transactionRepository.findByUserId('user-123', 10, 20);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        ['user-123', 10, 20]
      );
    });
  });

  describe('findByWalletId', () => {
    it('should find transactions by wallet ID', async () => {
      const mockTransactions = [mockTransaction];
      mockQuery.mockResolvedValue({ rows: mockTransactions });

      const result = await transactionRepository.findByWalletId('wallet-123');

      expect(result).toEqual(mockTransactions);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE wallet_id = $1'),
        ['wallet-123', 50, 0]
      );
    });
  });

  describe('findByType', () => {
    it('should find transactions by type', async () => {
      const mockTransactions = [mockTransaction];
      mockQuery.mockResolvedValue({ rows: mockTransactions });

      const result = await transactionRepository.findByType('user-123', 'deposit');

      expect(result).toEqual(mockTransactions);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND type = $2'),
        ['user-123', 'deposit', 50, 0]
      );
    });
  });

  describe('findById', () => {
    it('should find transaction by ID', async () => {
      mockQuery.mockResolvedValue({ rows: [mockTransaction] });

      const result = await transactionRepository.findById('txn-123');

      expect(result).toEqual(mockTransaction);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['txn-123']
      );
    });

    it('should return null when transaction not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await transactionRepository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update transaction status', async () => {
      const updatedTransaction = { ...mockTransaction, status: 'failed' };
      mockQuery.mockResolvedValue({ rows: [updatedTransaction] });

      const result = await transactionRepository.updateStatus('txn-123', 'failed');

      expect(result).toEqual(updatedTransaction);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE transactions'),
        ['txn-123', 'failed']
      );
    });

    it('should throw error when transaction not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(transactionRepository.updateStatus('nonexistent', 'failed'))
        .rejects.toThrow('Transaction not found');
    });
  });

  describe('getTransactionCount', () => {
    it('should return transaction count', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '25' }] });

      const result = await transactionRepository.getTransactionCount('user-123');

      expect(result).toBe(25);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)'),
        ['user-123']
      );
    });
  });

  describe('getTotalDeposits', () => {
    it('should return total deposits for all currencies', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total: '150000' }] });

      const result = await transactionRepository.getTotalDeposits('user-123');

      expect(result).toBe(150000);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('type = \'deposit\''),
        ['user-123']
      );
    });

    it('should return total deposits for specific currency', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total: '100000' }] });

      const result = await transactionRepository.getTotalDeposits('user-123', 'NGN');

      expect(result).toBe(100000);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND currency = $2'),
        ['user-123', 'NGN']
      );
    });
  });

  describe('getTotalWithdrawals', () => {
    it('should return total withdrawals for all currencies', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total: '50000' }] });

      const result = await transactionRepository.getTotalWithdrawals('user-123');

      expect(result).toBe(50000);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('type = \'withdrawal\''),
        ['user-123']
      );
    });

    it('should return total withdrawals for specific currency', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total: '30000' }] });

      const result = await transactionRepository.getTotalWithdrawals('user-123', 'USD');

      expect(result).toBe(30000);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND currency = $2'),
        ['user-123', 'USD']
      );
    });
  });
});