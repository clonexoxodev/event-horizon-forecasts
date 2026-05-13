import { query } from '../db/index.js';
import { Transaction, CreateTransactionRequest } from '../types/transaction.js';

export class TransactionRepository {
  /**
   * Create a new transaction record
   */
  async create(transactionData: CreateTransactionRequest): Promise<Transaction> {
    const sql = `
      INSERT INTO transactions (
        user_id, wallet_id, type, amount_smallest_unit, currency, 
        direction, reference_id, reference_type, status, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await query<Transaction>(sql, [
      transactionData.user_id,
      transactionData.wallet_id,
      transactionData.type,
      transactionData.amount_smallest_unit,
      transactionData.currency,
      transactionData.direction,
      transactionData.reference_id || null,
      transactionData.reference_type || null,
      transactionData.status || 'completed',
      transactionData.metadata ? JSON.stringify(transactionData.metadata) : null
    ]);

    if (result.rows.length === 0) {
      throw new Error('Failed to create transaction');
    }

    return result.rows[0];
  }

  /**
   * Create transaction within a database transaction
   */
  async createInTransaction(
    client: any, 
    transactionData: CreateTransactionRequest
  ): Promise<Transaction> {
    const sql = `
      INSERT INTO transactions (
        user_id, wallet_id, type, amount_smallest_unit, currency, 
        direction, reference_id, reference_type, status, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await client.query(sql, [
      transactionData.user_id,
      transactionData.wallet_id,
      transactionData.type,
      transactionData.amount_smallest_unit,
      transactionData.currency,
      transactionData.direction,
      transactionData.reference_id || null,
      transactionData.reference_type || null,
      transactionData.status || 'completed',
      transactionData.metadata ? JSON.stringify(transactionData.metadata) : null
    ]);

    if (result.rows.length === 0) {
      throw new Error('Failed to create transaction');
    }

    return result.rows[0];
  }

  /**
   * Get transaction history for a user
   */
  async findByUserId(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<Transaction[]> {
    const sql = `
      SELECT * FROM transactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const result = await query<Transaction>(sql, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Get transaction history for a wallet
   */
  async findByWalletId(
    walletId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<Transaction[]> {
    const sql = `
      SELECT * FROM transactions 
      WHERE wallet_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const result = await query<Transaction>(sql, [walletId, limit, offset]);
    return result.rows;
  }

  /**
   * Get transactions by type
   */
  async findByType(
    userId: string,
    type: 'deposit' | 'withdrawal' | 'position_entry' | 'position_payout',
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    const sql = `
      SELECT * FROM transactions 
      WHERE user_id = $1 AND type = $2 
      ORDER BY created_at DESC 
      LIMIT $3 OFFSET $4
    `;
    
    const result = await query<Transaction>(sql, [userId, type, limit, offset]);
    return result.rows;
  }

  /**
   * Get transaction by ID
   */
  async findById(id: string): Promise<Transaction | null> {
    const sql = `
      SELECT * FROM transactions 
      WHERE id = $1
    `;
    
    const result = await query<Transaction>(sql, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Update transaction status
   */
  async updateStatus(
    id: string, 
    status: 'pending' | 'completed' | 'failed'
  ): Promise<Transaction> {
    const sql = `
      UPDATE transactions 
      SET status = $2 
      WHERE id = $1 
      RETURNING *
    `;
    
    const result = await query<Transaction>(sql, [id, status]);

    if (result.rows.length === 0) {
      throw new Error('Transaction not found');
    }

    return result.rows[0];
  }

  /**
   * Get transaction count for a user
   */
  async getTransactionCount(userId: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE user_id = $1
    `;
    
    const result = await query<{ count: string }>(sql, [userId]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get total deposit amount for a user
   */
  async getTotalDeposits(userId: string, currency?: 'NGN' | 'USD'): Promise<number> {
    let sql = `
      SELECT COALESCE(SUM(amount_smallest_unit), 0) as total 
      FROM transactions 
      WHERE user_id = $1 AND type = 'deposit' AND status = 'completed'
    `;
    
    const params: any[] = [userId];
    
    if (currency) {
      sql += ' AND currency = $2';
      params.push(currency);
    }
    
    const result = await query<{ total: string }>(sql, params);
    return parseInt(result.rows[0].total, 10);
  }

  /**
   * Get total withdrawal amount for a user
   */
  async getTotalWithdrawals(userId: string, currency?: 'NGN' | 'USD'): Promise<number> {
    let sql = `
      SELECT COALESCE(SUM(amount_smallest_unit), 0) as total 
      FROM transactions 
      WHERE user_id = $1 AND type = 'withdrawal' AND status = 'completed'
    `;
    
    const params: any[] = [userId];
    
    if (currency) {
      sql += ' AND currency = $2';
      params.push(currency);
    }
    
    const result = await query<{ total: string }>(sql, params);
    return parseInt(result.rows[0].total, 10);
  }
}