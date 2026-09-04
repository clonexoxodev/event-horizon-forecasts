import { TransactionRepository } from '../repositories/transaction.repository.js';
import { Transaction } from '../types/transaction.js';

/**
 * Transaction service layer - handles business logic for transaction operations
 */
export class TransactionService {
  private transactionRepository: TransactionRepository;

  constructor(transactionRepository?: TransactionRepository) {
    this.transactionRepository = transactionRepository || new TransactionRepository();
  }

  /**
   * Get transaction history for a user with optional filtering
   */
  async getTransactionHistory(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: 'deposit' | 'withdrawal' | 'position_entry' | 'position_payout';
      currency?: 'NGN' | 'USD';
    } = {}
  ): Promise<Transaction[]> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    // If type filter is specified, use type-specific query
    if (options.type) {
      const transactions = await this.transactionRepository.findByType(
        userId,
        options.type,
        limit,
        offset
      );

      // Apply currency filter if specified
      if (options.currency) {
        return transactions.filter(tx => tx.currency === options.currency);
      }

      return transactions;
    }

    // Otherwise, get all transactions
    const transactions = await this.transactionRepository.findByUserId(
      userId,
      limit,
      offset
    );

    // Apply currency filter if specified
    if (options.currency) {
      return transactions.filter(tx => tx.currency === options.currency);
    }

    return transactions;
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string): Promise<Transaction | null> {
    return await this.transactionRepository.findById(id);
  }

  /**
   * Get transaction count for a user
   */
  async getTransactionCount(userId: string): Promise<number> {
    return await this.transactionRepository.getTransactionCount(userId);
  }

  /**
   * Get transaction statistics for a user
   */
  async getTransactionStats(userId: string): Promise<{
    totalDepositsNGN: number;
    totalDepositsUSD: number;
    totalWithdrawalsNGN: number;
    totalWithdrawalsUSD: number;
    totalPositionEntriesNGN: number;
    totalPositionEntriesUSD: number;
    totalPayoutsNGN: number;
    totalPayoutsUSD: number;
    transactionCount: number;
  }> {
    const [
      totalDepositsNGN,
      totalDepositsUSD,
      totalWithdrawalsNGN,
      totalWithdrawalsUSD,
      transactionCount
    ] = await Promise.all([
      this.transactionRepository.getTotalDeposits(userId, 'NGN'),
      this.transactionRepository.getTotalDeposits(userId, 'USD'),
      this.transactionRepository.getTotalWithdrawals(userId, 'NGN'),
      this.transactionRepository.getTotalWithdrawals(userId, 'USD'),
      this.transactionRepository.getTransactionCount(userId)
    ]);

    // Get position entries and payouts
    const positionEntriesNGN = await this.transactionRepository.findByType(userId, 'position_entry', 1000, 0);
    const positionPayoutsNGN = await this.transactionRepository.findByType(userId, 'position_payout', 1000, 0);

    const totalPositionEntriesNGN = positionEntriesNGN
      .filter(tx => tx.currency === 'NGN' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.amount_smallest_unit, 0);

    const totalPositionEntriesUSD = positionEntriesNGN
      .filter(tx => tx.currency === 'USD' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.amount_smallest_unit, 0);

    const totalPayoutsNGN = positionPayoutsNGN
      .filter(tx => tx.currency === 'NGN' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.amount_smallest_unit, 0);

    const totalPayoutsUSD = positionPayoutsNGN
      .filter(tx => tx.currency === 'USD' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.amount_smallest_unit, 0);

    return {
      totalDepositsNGN,
      totalDepositsUSD,
      totalWithdrawalsNGN,
      totalWithdrawalsUSD,
      totalPositionEntriesNGN,
      totalPositionEntriesUSD,
      totalPayoutsNGN,
      totalPayoutsUSD,
      transactionCount
    };
  }

  /**
   * Get recent transactions (last N transactions)
   */
  async getRecentTransactions(
    userId: string,
    limit: number = 10
  ): Promise<Transaction[]> {
    return await this.transactionRepository.findByUserId(userId, limit, 0);
  }

  /**
   * Get transactions by reference
   */
  async getTransactionsByReference(
    _referenceId: string,
    _referenceType: 'position' | 'deposit' | 'withdrawal'
  ): Promise<Transaction[]> {
    // This would require a new repository method
    // For now, we'll return an empty array as a placeholder
    // TODO: Implement findByReference in repository
    return [];
  }
}

// Export singleton instance
export const transactionService = new TransactionService();
