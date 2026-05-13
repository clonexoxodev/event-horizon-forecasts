import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WalletRepository } from './wallet.repository.js';
import { initializeDatabase, dropAllTables } from '../db/initialize.js';
import { testConnection } from '../db/index.js';

describe('WalletRepository', () => {
  let walletRepository: WalletRepository;
  const testUserId = 'test-user-123';

  beforeEach(async () => {
    // Ensure database connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Initialize database with fresh schema
    await dropAllTables();
    await initializeDatabase();
    
    walletRepository = new WalletRepository();
  });

  afterEach(async () => {
    // Clean up after each test
    await dropAllTables();
  });

  describe('create', () => {
    it('should create a wallet with zero balance', async () => {
      const wallet = await walletRepository.create({ user_id: testUserId });

      expect(wallet).toBeDefined();
      expect(wallet.user_id).toBe(testUserId);
      expect(wallet.balance_ngn_kobo).toBe(0);
      expect(wallet.balance_usd_cents).toBe(0);
      expect(wallet.available_ngn_kobo).toBe(0);
      expect(wallet.available_usd_cents).toBe(0);
      expect(wallet.id).toBeDefined();
      expect(wallet.created_at).toBeDefined();
      expect(wallet.updated_at).toBeDefined();
    });
  });

  describe('findByUserId', () => {
    it('should find wallet by user ID', async () => {
      const createdWallet = await walletRepository.create({ user_id: testUserId });
      const foundWallet = await walletRepository.findByUserId(testUserId);

      expect(foundWallet).toBeDefined();
      expect(foundWallet!.id).toBe(createdWallet.id);
      expect(foundWallet!.user_id).toBe(testUserId);
    });

    it('should return null for non-existent user', async () => {
      const wallet = await walletRepository.findByUserId('non-existent-user');
      expect(wallet).toBeNull();
    });
  });

  describe('incrementBalance', () => {
    beforeEach(async () => {
      await walletRepository.create({ user_id: testUserId });
    });

    it('should increment NGN balance and available balance', async () => {
      const amount = 10000; // 100 NGN in kobo
      const wallet = await walletRepository.incrementBalance(testUserId, 'NGN', amount);

      expect(wallet.balance_ngn_kobo).toBe(amount);
      expect(wallet.available_ngn_kobo).toBe(amount);
      expect(wallet.balance_usd_cents).toBe(0);
      expect(wallet.available_usd_cents).toBe(0);
    });

    it('should increment USD balance and available balance', async () => {
      const amount = 5000; // $50 in cents
      const wallet = await walletRepository.incrementBalance(testUserId, 'USD', amount);

      expect(wallet.balance_usd_cents).toBe(amount);
      expect(wallet.available_usd_cents).toBe(amount);
      expect(wallet.balance_ngn_kobo).toBe(0);
      expect(wallet.available_ngn_kobo).toBe(0);
    });

    it('should increment balance without incrementing available when specified', async () => {
      const amount = 10000;
      const wallet = await walletRepository.incrementBalance(testUserId, 'NGN', amount, false);

      expect(wallet.balance_ngn_kobo).toBe(amount);
      expect(wallet.available_ngn_kobo).toBe(0);
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        walletRepository.incrementBalance('non-existent-user', 'NGN', 1000)
      ).rejects.toThrow('Wallet not found');
    });
  });

  describe('decrementAvailableBalance', () => {
    beforeEach(async () => {
      await walletRepository.create({ user_id: testUserId });
      // Add some balance first
      await walletRepository.incrementBalance(testUserId, 'NGN', 10000);
    });

    it('should decrement available balance when sufficient funds exist', async () => {
      const amount = 5000;
      const wallet = await walletRepository.decrementAvailableBalance(testUserId, 'NGN', amount);

      expect(wallet.balance_ngn_kobo).toBe(10000); // Total balance unchanged
      expect(wallet.available_ngn_kobo).toBe(5000); // Available reduced
    });

    it('should throw error when insufficient available balance', async () => {
      await expect(
        walletRepository.decrementAvailableBalance(testUserId, 'NGN', 15000)
      ).rejects.toThrow('Insufficient balance or wallet not found');
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        walletRepository.decrementAvailableBalance('non-existent-user', 'NGN', 1000)
      ).rejects.toThrow('Insufficient balance or wallet not found');
    });
  });

  describe('decrementBalance', () => {
    beforeEach(async () => {
      await walletRepository.create({ user_id: testUserId });
      // Add some balance first
      await walletRepository.incrementBalance(testUserId, 'NGN', 10000);
    });

    it('should decrement both total and available balance', async () => {
      const amount = 5000;
      const wallet = await walletRepository.decrementBalance(testUserId, 'NGN', amount);

      expect(wallet.balance_ngn_kobo).toBe(5000);
      expect(wallet.available_ngn_kobo).toBe(5000);
    });

    it('should throw error when insufficient balance', async () => {
      await expect(
        walletRepository.decrementBalance(testUserId, 'NGN', 15000)
      ).rejects.toThrow('Insufficient balance or wallet not found');
    });
  });

  describe('transaction methods', () => {
    beforeEach(async () => {
      await walletRepository.create({ user_id: testUserId });
    });

    it('should execute operations within a transaction', async () => {
      const result = await walletRepository.withTransaction(async (client) => {
        // Increment balance within transaction
        const wallet1 = await walletRepository.incrementBalanceInTransaction(
          client, testUserId, 'NGN', 10000
        );
        
        // Decrement available balance within transaction
        const wallet2 = await walletRepository.decrementAvailableBalanceInTransaction(
          client, testUserId, 'NGN', 3000
        );

        return { wallet1, wallet2 };
      });

      expect(result.wallet1.balance_ngn_kobo).toBe(10000);
      expect(result.wallet2.available_ngn_kobo).toBe(7000);

      // Verify final state
      const finalWallet = await walletRepository.findByUserId(testUserId);
      expect(finalWallet!.balance_ngn_kobo).toBe(10000);
      expect(finalWallet!.available_ngn_kobo).toBe(7000);
    });

    it('should rollback transaction on error', async () => {
      try {
        await walletRepository.withTransaction(async (client) => {
          // Increment balance
          await walletRepository.incrementBalanceInTransaction(
            client, testUserId, 'NGN', 10000
          );
          
          // This should cause an error (insufficient balance)
          await walletRepository.decrementAvailableBalanceInTransaction(
            client, testUserId, 'NGN', 15000
          );
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify rollback - balance should still be zero
      const wallet = await walletRepository.findByUserId(testUserId);
      expect(wallet!.balance_ngn_kobo).toBe(0);
      expect(wallet!.available_ngn_kobo).toBe(0);
    });

    it('should find wallet within transaction', async () => {
      await walletRepository.incrementBalance(testUserId, 'NGN', 5000);

      const result = await walletRepository.withTransaction(async (client) => {
        return await walletRepository.findByUserIdInTransaction(client, testUserId);
      });

      expect(result).toBeDefined();
      expect(result!.balance_ngn_kobo).toBe(5000);
    });
  });

  describe('atomic operations', () => {
    beforeEach(async () => {
      await walletRepository.create({ user_id: testUserId });
    });

    it('should handle concurrent balance updates correctly', async () => {
      // Simulate concurrent operations
      const promises = [
        walletRepository.incrementBalance(testUserId, 'NGN', 1000),
        walletRepository.incrementBalance(testUserId, 'NGN', 2000),
        walletRepository.incrementBalance(testUserId, 'NGN', 3000),
      ];

      await Promise.all(promises);

      const wallet = await walletRepository.findByUserId(testUserId);
      expect(wallet!.balance_ngn_kobo).toBe(6000);
      expect(wallet!.available_ngn_kobo).toBe(6000);
    });

    it('should prevent race conditions in balance decrements', async () => {
      // Add initial balance
      await walletRepository.incrementBalance(testUserId, 'NGN', 5000);

      // Try to decrement more than available concurrently
      const promises = [
        walletRepository.decrementAvailableBalance(testUserId, 'NGN', 3000),
        walletRepository.decrementAvailableBalance(testUserId, 'NGN', 3000),
      ];

      // One should succeed, one should fail
      const results = await Promise.allSettled(promises);
      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;

      expect(successes).toBe(1);
      expect(failures).toBe(1);

      // Final balance should be correct
      const wallet = await walletRepository.findByUserId(testUserId);
      expect(wallet!.available_ngn_kobo).toBe(2000);
    });
  });
});