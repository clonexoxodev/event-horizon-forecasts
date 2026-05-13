import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { pool } from '../db/index.js';
import walletRoutes from './wallet.routes.js';
import authRoutes from './auth.routes.js';

describe('Wallet Routes Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    // Setup express app
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);
    app.use('/api/wallet', walletRoutes);

    // Create a test user and get auth token
    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send({
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'TestPassword123!'
      });

    // Extract token from cookie
    const cookies = signupResponse.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      const tokenCookie = cookies.find((cookie: string) => cookie.startsWith('auth_token='));
      if (tokenCookie) {
        authToken = tokenCookie.split(';')[0].split('=')[1];
      }
    }

    // Get user ID from response
    userId = signupResponse.body.user.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (userId) {
      await pool.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM wallets WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  describe('GET /api/wallet', () => {
    it('should return wallet with zero balance for new user', async () => {
      const response = await request(app)
        .get('/api/wallet')
        .set('Cookie', [`auth_token=${authToken}`])
        .expect(200);

      expect(response.body.wallet).toBeDefined();
      expect(response.body.wallet.balanceNgnKobo).toBe(0);
      expect(response.body.wallet.balanceUsdCents).toBe(0);
      expect(response.body.wallet.availableNgnKobo).toBe(0);
      expect(response.body.wallet.availableUsdCents).toBe(0);
      expect(response.body.display.totalBalance).toBe('₦0.00');
      expect(response.body.display.availableBalance).toBe('₦0.00');
    });

    it('should return wallet in USD when currency parameter is USD', async () => {
      const response = await request(app)
        .get('/api/wallet?currency=USD')
        .set('Cookie', [`auth_token=${authToken}`])
        .expect(200);

      expect(response.body.display.currency).toBe('USD');
      expect(response.body.display.totalBalance).toBe('$0.00');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/wallet')
        .expect(401);
    });
  });

  describe('POST /api/wallet/deposit', () => {
    it('should process deposit and update wallet balance', async () => {
      const depositAmount = 100000; // 1000 NGN in kobo

      const response = await request(app)
        .post('/api/wallet/deposit')
        .set('Cookie', [`auth_token=${authToken}`])
        .send({
          amount_smallest_unit: depositAmount,
          currency: 'NGN',
          method: 'bank_transfer'
        })
        .expect(201);

      expect(response.body.message).toBe('Deposit processed successfully');
      expect(response.body.wallet.balanceNgnKobo).toBe(depositAmount);
      expect(response.body.wallet.availableNgnKobo).toBe(depositAmount);
      expect(response.body.transaction.type).toBe('deposit');
      expect(response.body.transaction.direction).toBe('IN');
      expect(response.body.transaction.status).toBe('completed');

      // Verify wallet was actually updated
      const walletResponse = await request(app)
        .get('/api/wallet')
        .set('Cookie', [`auth_token=${authToken}`])
        .expect(200);

      expect(walletResponse.body.wallet.balanceNgnKobo).toBe(depositAmount);
    });

    it('should process multiple deposits and accumulate balance', async () => {
      // First deposit
      await request(app)
        .post('/api/wallet/deposit')
        .set('Cookie', [`auth_token=${authToken}`])
        .send({
          amount_smallest_unit: 50000,
          currency: 'NGN',
          method: 'card'
        })
        .expect(201);

      // Second deposit
      const response = await request(app)
        .post('/api/wallet/deposit')
        .set('Cookie', [`auth_token=${authToken}`])
        .send({
          amount_smallest_unit: 30000,
          currency: 'NGN',
          method: 'bank_transfer'
        })
        .expect(201);

      expect(response.body.wallet.balanceNgnKobo).toBe(80000);
    });
  });

  describe('POST /api/wallet/withdraw', () => {
    it('should process withdrawal and update wallet balance', async () => {
      // First deposit some funds
      await request(app)
        .post('/api/wallet/deposit')
        .set('Cookie', [`auth_token=${authToken}`])
        .send({
          amount_smallest_unit: 100000,
          currency: 'NGN',
          method: 'bank_transfer'
        })
        .expect(201);

      // Then withdraw
      const withdrawalAmount = 30000;
      const response = await request(app)
        .post('/api/wallet/withdraw')
        .set('Cookie', [`auth_token=${authToken}`])
        .send({
          amount_smallest_unit: withdrawalAmount,
          currency: 'NGN',
          destination: 'bank_account_123'
        })
        .expect(201);

      expect(response.body.message).toBe('Withdrawal processed successfully');
      expect(response.body.wallet.balanceNgnKobo).toBe(70000);
      expect(response.body.wallet.availableNgnKobo).toBe(70000);
      expect(response.body.transaction.type).toBe('withdrawal');
      expect(response.body.transaction.direction).toBe('OUT');
    });

    it('should return 422 when withdrawing more than available balance', async () => {
      // Deposit 500 NGN
      await request(app)
        .post('/api/wallet/deposit')
        .set('Cookie', [`auth_token=${authToken}`])
        .send({
          amount_smallest_unit: 50000,
          currency: 'NGN',
          method: 'bank_transfer'
        })
        .expect(201);

      // Try to withdraw 1000 NGN
      const response = await request(app)
        .post('/api/wallet/withdraw')
        .set('Cookie', [`auth_token=${authToken}`])
        .send({
          amount_smallest_unit: 100000,
          currency: 'NGN',
          destination: 'bank_account_123'
        })
        .expect(422);

      expect(response.body.error.code).toBe('INSUFFICIENT_BALANCE');
      expect(response.body.error.details).toBeDefined();
    });
  });

  describe('GET /api/wallet/transactions', () => {
    it('should return empty transaction history for new wallet', async () => {
      const response = await request(app)
        .get('/api/wallet/transactions')
        .set('Cookie', [`auth_token=${authToken}`])
        .expect(200);

      expect(response.body.transactions).toEqual([]);
      expect(response.body.pagination.count).toBe(0);
    });

    it('should return transaction history after deposits and withdrawals', async () => {
      // Make a deposit
      await request(app)
        .post('/api/wallet/deposit')
        .set('Cookie', [`auth_token=${authToken}`])
        .send({
          amount_smallest_unit: 100000,
          currency: 'NGN',
          method: 'bank_transfer'
        })
        .expect(201);

      // Make a withdrawal
      await request(app)
        .post('/api/wallet/withdraw')
        .set('Cookie', [`auth_token=${authToken}`])
        .send({
          amount_smallest_unit: 30000,
          currency: 'NGN',
          destination: 'bank_account_123'
        })
        .expect(201);

      // Get transaction history
      const response = await request(app)
        .get('/api/wallet/transactions')
        .set('Cookie', [`auth_token=${authToken}`])
        .expect(200);

      expect(response.body.transactions).toHaveLength(2);
      
      // Transactions should be in reverse chronological order
      const [withdrawal, deposit] = response.body.transactions;
      expect(withdrawal.type).toBe('withdrawal');
      expect(withdrawal.direction).toBe('OUT');
      expect(deposit.type).toBe('deposit');
      expect(deposit.direction).toBe('IN');
    });

    it('should support pagination', async () => {
      // Create multiple transactions
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/wallet/deposit')
          .set('Cookie', [`auth_token=${authToken}`])
          .send({
            amount_smallest_unit: 10000,
            currency: 'NGN',
            method: 'bank_transfer'
          })
          .expect(201);
      }

      // Get first page
      const page1 = await request(app)
        .get('/api/wallet/transactions?limit=2&offset=0')
        .set('Cookie', [`auth_token=${authToken}`])
        .expect(200);

      expect(page1.body.transactions).toHaveLength(2);
      expect(page1.body.pagination.limit).toBe(2);
      expect(page1.body.pagination.offset).toBe(0);

      // Get second page
      const page2 = await request(app)
        .get('/api/wallet/transactions?limit=2&offset=2')
        .set('Cookie', [`auth_token=${authToken}`])
        .expect(200);

      expect(page2.body.transactions).toHaveLength(2);
      expect(page2.body.pagination.offset).toBe(2);

      // Ensure different transactions
      expect(page1.body.transactions[0].id).not.toBe(page2.body.transactions[0].id);
    });
  });

  describe('GET /api/wallet/convert', () => {
    it('should return currency conversion rate', async () => {
      const response = await request(app)
        .get('/api/wallet/convert?from=USD&to=NGN')
        .set('Cookie', [`auth_token=${authToken}`])
        .expect(200);

      expect(response.body.from).toBe('USD');
      expect(response.body.to).toBe('NGN');
      expect(response.body.rate).toBeGreaterThan(0);
    });

    it('should convert amount when provided', async () => {
      const response = await request(app)
        .get('/api/wallet/convert?from=USD&to=NGN&amount=100')
        .set('Cookie', [`auth_token=${authToken}`])
        .expect(200);

      expect(response.body.amount).toBe(100);
      expect(response.body.convertedAmount).toBeGreaterThan(0);
    });

    it('should return rate of 1 for same currency conversion', async () => {
      const response = await request(app)
        .get('/api/wallet/convert?from=NGN&to=NGN')
        .set('Cookie', [`auth_token=${authToken}`])
        .expect(200);

      expect(response.body.rate).toBe(1);
    });
  });
});
