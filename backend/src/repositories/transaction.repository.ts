import { supabase } from '../db/supabase-client.js';
import { Transaction, CreateTransactionRequest } from '../types/transaction.js';

export class TransactionRepository {
  async create(transactionData: CreateTransactionRequest): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: transactionData.user_id,
        wallet_id: transactionData.wallet_id,
        type: transactionData.type,
        amount_smallest_unit: transactionData.amount_smallest_unit,
        currency: transactionData.currency,
        direction: transactionData.direction,
        reference_id: transactionData.reference_id || null,
        reference_type: transactionData.reference_type || null,
        status: transactionData.status || 'completed',
        metadata: transactionData.metadata || null
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create transaction: ${error?.message || 'No data returned'}`);
    }

    return data as Transaction;
  }

  async createInTransaction(
    _client: any,
    transactionData: CreateTransactionRequest
  ): Promise<Transaction> {
    return this.create(transactionData);
  }

  async findByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return (data || []) as Transaction[];
  }

  async findByWalletId(
    walletId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch wallet transactions: ${error.message}`);
    }

    return (data || []) as Transaction[];
  }

  async findByType(
    userId: string,
    type: 'deposit' | 'withdrawal' | 'position_entry' | 'position_payout',
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch transactions by type: ${error.message}`);
    }

    return (data || []) as Transaction[];
  }

  async findById(id: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch transaction: ${error.message}`);
    }

    return (data as Transaction) || null;
  }

  async updateStatus(
    id: string,
    status: 'pending' | 'completed' | 'failed'
  ): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Transaction not found: ${error?.message || 'No data returned'}`);
    }

    return data as Transaction;
  }

  async getTransactionCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to count transactions: ${error.message}`);
    }

    return count || 0;
  }

  async getTotalDeposits(userId: string, currency?: 'NGN' | 'USD'): Promise<number> {
    return this.getTotalByType(userId, 'deposit', currency);
  }

  async getTotalWithdrawals(userId: string, currency?: 'NGN' | 'USD'): Promise<number> {
    return this.getTotalByType(userId, 'withdrawal', currency);
  }

  private async getTotalByType(
    userId: string,
    type: 'deposit' | 'withdrawal',
    currency?: 'NGN' | 'USD'
  ): Promise<number> {
    let query = supabase
      .from('transactions')
      .select('amount_smallest_unit')
      .eq('user_id', userId)
      .eq('type', type)
      .eq('status', 'completed');

    if (currency) {
      query = query.eq('currency', currency);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to sum transactions: ${error.message}`);
    }

    return (data || []).reduce((total, transaction) => (
      total + Number(transaction.amount_smallest_unit || 0)
    ), 0);
  }
}
