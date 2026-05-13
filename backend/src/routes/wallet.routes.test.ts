import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import walletRoutes from './wallet.routes.js';
import { walletService } from '../services/wallet.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { 
  InsufficientBalanceError, 
  WalletNotFoundError, 
  InvalidAmountError 
} from '../services/wallet.service.js';

// Mock the services and middleware
vi.mock('../services/wallet.service.js');
vi.mock('../middleware/auth.middleware.js');

describe('Wallet Routes', () => {
  let app: Express;
  const mockUserId = 'test-user-id';
  const mockWalletId = 'test-wallet-id';

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup express app
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/wallet', walletRoutes);

    // Mock authentication middleware to always authenticate
    vi.mocked(authMiddleware.authenticate).mockImplementation((req, res, next) => {
      req.user = {
        userId: mockUserId,
        username: 'testuser',
        email: 'test@example.com'
      };
      next();
    });
  });

  describe('GET /api/wallet', () => {
    it('should return wallet information with default NGN currency', async () => {
      const mockWallet = {
        id: mockWalletId,
        user_id: mockUserId,
        balance_ngn_kobo: 100000,
        balance_usd_cents: 5000,
        available_ngn_kobo: 80000,
        available_usd_cents: 4000,
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockDisplay = {
        totalBalance: '₦1,000.00',
        availableBalance: '₦800.00',
        currency: 'NGN' as const
      };

      vi.mocked(walletService.getWallet).mockResolvedValue(mockWallet);
      vi.mocked(walletService.getWalletDisplay).mockResolvedValue(mockDisplay);

      const response = await request(app)
        .get('/api/wallet')
        .expect(200);

      expect(response.body.wallet).toBeDefined();
      expect(response.body.wallet.id).toBe(mockWalletId);
      expect(response.body.wallet.balanceNgnKobo).toBe(100000);
      expect(response.body.display).toEqual(mockDisplay);
      expect(walletService.getWallet).toHaveBeenCalledWith(mockUserId);
      expect(walletService.getWalletDisplay).toHaveBeenCalledWith(mockUserId, 'NGN');
    });

    it('should return wallet information with USD currency when specified', async () => {
      const mockWallet = {
        id: mockWalletId,
        user_id: mockUserId,
        balance_ngn_kobo: 100000,
        balance_usd_cents: 5000,
        available_ngn_kobo: 80000,
        available_usd_cents: 4000,
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockDisplay = {
        totalBalance: '$50.00',
        availableBalance: '$40.00',
        currency: 'USD' as const
      };

      vi.mocked(walletService.getWallet).mockResolvedValue(mockWallet);
      vi.mocked(walletService.getWalletDisplay).mockResolvedValue(mockDisplay);

      const response = await request(app)
        .get('/api/wallet?currency=USD')
        .expect(200);

      expect(response.body.display.currency).toBe('USD');
      expect(walletService.getWalletDisplay).toHaveBeenCalledWith(mockUserId, 'USD');
    });

    it('should return 400 for invalid currency', async () => {
      const response = await request(app)
        .get('/api/wallet?currency=EUR')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_CURRENCY');
    });

    it('should return 404 when wallet not found', async () => {
      vi.mocked(walletService.getWallet).mockRejectedValue(
        new WalletNotFoundError('Wallet not found')
      );

      const response = await request(app)
        .get('/api/wallet')
        .expect(404);

      expect(response.body.error.code).toBe('WALLET_NOT_FOUND');
    });
  });

  describe('POST /api/wallet/deposit', () => {
    it('should process deposit successfully', async () => {
      const depositRequest = {
        amount_smallest_unit: 50000,
        currency: 'NGN' as const,
        method: 'bank_transfer' as const
      };

      const mockResult = {
        wallet: {
          id: mockWalletId,
          user_id: mockUserId,
          balance_ngn_kobo: 150000,
          balance_usd_cents: 5000,
          available_ngn_kobo: 150000,
          available_usd_cents: 5000,
          created_at: new Date(),
          updated_at: new Date()
        },
        transaction: {
          id: 'tx-id',
          user_id: mockUserId,
          wallet_id: mockWalletId,
          type: 'deposit' as const,
          amount_smallest_unit: 50000,
          currency: 'NGN' as const,
          direction: 'IN' as const,
          status: 'completed' as const,
          created_at: new Date()
        }
      };

      vi.mocked(walletService.processDeposit).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/wallet/deposit')
        .send(depositRequest)
        .expect(201);

      expect(response.body.message).toBe('Deposit processed successfully');
      expect(response.body.wallet.balanceNgnKobo).toBe(150000);
      expect(response.body.transaction.type).toBe('deposit');
      expect(walletService.processDeposit).toHaveBeenCalledWith(mockUserId, depositRequest);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/wallet/deposit')
        .send({ amount_smallest_unit: 50000 })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid currency', async () => {
      const response = await request(app)
        .post('/api/wallet/deposit')
        .send({
          amount_smallest_unit: 50000,
          currency: 'EUR',
          method: 'bank_transfer'
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_CURRENCY');
    });

    it('should return 400 for invalid method', async () => {
      const response = await request(app)
        .post('/api/wallet/deposit')
        .send({
          amount_smallest_unit: 50000,
          currency: 'NGN',
          method: 'invalid_method'
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_METHOD');
    });

    it('should return 400 for invalid amount', async () => {
      vi.mocked(walletService.processDeposit).mockRejectedValue(
        new InvalidAmountError('Deposit amount must be greater than zero')
      );

      const response = await request(app)
        .post('/api/wallet/deposit')
        .send({
          amount_smallest_unit: -100,
          currency: 'NGN',
          method: 'bank_transfer'
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_AMOUNT');
    });
  });

  describe('POST /api/wallet/withdraw', () => {
    it('should process withdrawal successfully', async () => {
      const withdrawalRequest = {
        amount_smallest_unit: 30000,
        currency: 'NGN' as const,
        destination: 'bank_account_123'
      };

      const mockResult = {
        wallet: {
          id: mockWalletId,
          user_id: mockUserId,
          balance_ngn_kobo: 70000,
          balance_usd_cents: 5000,
          available_ngn_kobo: 70000,
          available_usd_cents: 5000,
          created_at: new Date(),
          updated_at: new Date()
        },
        transaction: {
          id: 'tx-id',
          user_id: mockUserId,
          wallet_id: mockWalletId,
          type: 'withdrawal' as const,
          amount_smallest_unit: 30000,
          currency: 'NGN' as const,
          direction: 'OUT' as const,
          status: 'completed' as const,
          created_at: new Date()
        }
      };

      vi.mocked(walletService.processWithdrawal).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/wallet/withdraw')
        .send(withdrawalRequest)
        .expect(201);

      expect(response.body.message).toBe('Withdrawal processed successfully');
      expect(response.body.wallet.balanceNgnKobo).toBe(70000);
      expect(response.body.transaction.type).toBe('withdrawal');
      expect(walletService.processWithdrawal).toHaveBeenCalledWith(mockUserId, withdrawalRequest);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/wallet/withdraw')
        .send({ amount_smallest_unit: 30000 })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 422 for insufficient balance', async () => {
      const error = new InsufficientBalanceError('Insufficient balance for withdrawal', {
        required: 100000,
        available: 50000,
        currency: 'NGN'
      });
      
      vi.mocked(walletService.processWithdrawal).mockRejectedValue(error);

      const response = await request(app)
        .post('/api/wallet/withdraw')
        .send({
          amount_smallest_unit: 100000,
          currency: 'NGN',
          destination: 'bank_account_123'
        })
        .expect(422);

      expect(response.body.error.code).toBe('INSUFFICIENT_BALANCE');
      // The details should be present when the actual error is thrown
      // In the mock scenario, we verify the error handling works correctly
    });
  });

  describe('GET /api/wallet/transactions', () => {
    it('should return transaction history with default pagination', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          user_id: mockUserId,
          wallet_id: mockWalletId,
          type: 'deposit' as const,
          amount_smallest_unit: 50000,
          currency: 'NGN' as const,
          direction: 'IN' as const,
          status: 'completed' as const,
          created_at: new Date()
        },
        {
          id: 'tx-2',
          user_id: mockUserId,
          wallet_id: mockWalletId,
          type: 'withdrawal' as const,
          amount_smallest_unit: 20000,
          currency: 'NGN' as const,
          direction: 'OUT' as const,
          status: 'completed' as const,
          created_at: new Date()
        }
      ];

      vi.mocked(walletService.getTransactionHistory).mockResolvedValue(mockTransactions);

      const response = await request(app)
        .get('/api/wallet/transactions')
        .expect(200);

      expect(response.body.transactions).toHaveLength(2);
      expect(response.body.pagination.limit).toBe(50);
      expect(response.body.pagination.offset).toBe(0);
      expect(walletService.getTransactionHistory).toHaveBeenCalledWith(mockUserId, 50, 0);
    });

    it('should return transaction history with custom pagination', async () => {
      vi.mocked(walletService.getTransactionHistory).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/wallet/transactions?limit=10&offset=20')
        .expect(200);

      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(20);
      expect(walletService.getTransactionHistory).toHaveBeenCalledWith(mockUserId, 10, 20);
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/wallet/transactions?limit=200')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_LIMIT');
    });

    it('should return 400 for negative offset', async () => {
      const response = await request(app)
        .get('/api/wallet/transactions?offset=-1')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_OFFSET');
    });
  });

  describe('GET /api/wallet/convert', () => {
    it('should return exchange rate', async () => {
      vi.mocked(walletService.getCurrencyConversionRate).mockResolvedValue(1500);

      const response = await request(app)
        .get('/api/wallet/convert?from=USD&to=NGN')
        .expect(200);

      expect(response.body.from).toBe('USD');
      expect(response.body.to).toBe('NGN');
      expect(response.body.rate).toBe(1500);
      expect(walletService.getCurrencyConversionRate).toHaveBeenCalledWith('USD', 'NGN');
    });

    it('should return exchange rate and converted amount when amount provided', async () => {
      vi.mocked(walletService.getCurrencyConversionRate).mockResolvedValue(1500);
      vi.mocked(walletService.convertCurrency).mockResolvedValue(150000);

      const response = await request(app)
        .get('/api/wallet/convert?from=USD&to=NGN&amount=100')
        .expect(200);

      expect(response.body.amount).toBe(100);
      expect(response.body.convertedAmount).toBe(150000);
      expect(walletService.convertCurrency).toHaveBeenCalledWith(100, 'USD', 'NGN');
    });

    it('should return 400 for missing required parameters', async () => {
      const response = await request(app)
        .get('/api/wallet/convert?from=USD')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid currencies', async () => {
      const response = await request(app)
        .get('/api/wallet/convert?from=EUR&to=NGN')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_CURRENCY');
    });

    it('should return 400 for invalid amount', async () => {
      const response = await request(app)
        .get('/api/wallet/convert?from=USD&to=NGN&amount=-10')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_AMOUNT');
    });
  });
});
