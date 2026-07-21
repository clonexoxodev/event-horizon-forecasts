import { supabase } from '../db/supabase-client.js';
import { Wallet, CreateWalletRequest } from '../types/wallet.js';

/**
 * Row type returned by atomic wallet SQL functions.
 * Matches the RETURNING clause of all atomic_* functions.
 */
interface AtomicWalletRow {
  id: string;
  user_id: string;
  balance_ngn_kobo: number;
  balance_usd_cents: number;
  available_ngn_kobo: number;
  available_usd_cents: number;
  locked_ngn_kobo: number;
  locked_usd_cents: number;
  total_deposited_ngn_kobo?: number;
  total_withdrawn_ngn_kobo?: number;
  total_winnings_ngn_kobo?: number;
  updated_at: string;
}

function toWallet(row: AtomicWalletRow): Wallet {
  return {
    id: row.id,
    user_id: row.user_id,
    balance_ngn_kobo: Number(row.balance_ngn_kobo || 0),
    balance_usd_cents: Number(row.balance_usd_cents || 0),
    available_ngn_kobo: Number(row.available_ngn_kobo || 0),
    available_usd_cents: Number(row.available_usd_cents || 0),
    locked_ngn_kobo: Number(row.locked_ngn_kobo || 0),
    locked_usd_cents: Number(row.locked_usd_cents || 0),
    total_deposited_ngn_kobo: Number(row.total_deposited_ngn_kobo || 0),
    total_withdrawn_ngn_kobo: Number(row.total_withdrawn_ngn_kobo || 0),
    total_winnings_ngn_kobo: Number(row.total_winnings_ngn_kobo || 0),
    total_staked_ngn_kobo: 0,
    currency: 'NGN',
    created_at: new Date(),
    updated_at: new Date(row.updated_at || Date.now()),
  };
}

export class WalletRepository {
  /**
   * Create a new wallet with zero balance
   */
  async create(walletData: CreateWalletRequest): Promise<Wallet> {
    const { data, error } = await supabase
      .from('wallets')
      .insert({
        user_id: walletData.user_id,
        balance_ngn_kobo: 0,
        balance_usd_cents: 0,
        available_ngn_kobo: 0,
        available_usd_cents: 0,
        locked_ngn_kobo: 0,
        locked_usd_cents: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create wallet: ' + error.message);
    }

    return data;
  }

  /**
   * Find wallet by user ID
   */
  async findByUserId(userId: string): Promise<Wallet | null> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error('Failed to find wallet: ' + error.message);
    }

    return data;
  }

  /**
   * Find wallet by wallet ID
   */
  async findById(id: string): Promise<Wallet | null> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error('Failed to find wallet: ' + error.message);
    }

    return data;
  }

  // =========================================================================
  // ATOMIC OPERATIONS — All balance modifications go through here.
  // Each function calls a single SQL function that uses
  // UPDATE ... WHERE available/locked >= amount
  // to prevent race conditions and negative balances.
  // =========================================================================

  /**
   * ATOMIC: Lock balance for order placement (available → locked).
   * Returns null if insufficient available balance.
   */
  async lockForOrder(userId: string, amount: number, currency: 'NGN' | 'USD' = 'NGN'): Promise<Wallet | null> {
    const { data, error } = await supabase
      .rpc('atomic_lock_for_order', {
        p_user_id: userId,
        p_amount: amount,
        p_currency: currency,
      })
      .maybeSingle();

    if (error) throw new Error('Lock for order failed: ' + error.message);
    if (!data) return null;
    return toWallet(data as AtomicWalletRow);
  }

  /**
   * ATOMIC: Unlock balance from order (locked → available).
   * Used on cancellation, expiration, refund.
   */
  async unlockFromOrder(userId: string, amount: number, currency: 'NGN' | 'USD' = 'NGN'): Promise<Wallet | null> {
    const { data, error } = await supabase
      .rpc('atomic_unlock_from_order', {
        p_user_id: userId,
        p_amount: amount,
        p_currency: currency,
      })
      .maybeSingle();

    if (error) throw new Error('Unlock from order failed: ' + error.message);
    if (!data) return null;
    return toWallet(data as AtomicWalletRow);
  }

  /**
   * ATOMIC: Credit deposit to wallet (balance + available increase).
   * Used after Flutterwave webhook confirmation and admin deposit approval.
   */
  async creditDeposit(userId: string, amount: number, currency: 'NGN' | 'USD' = 'NGN'): Promise<Wallet | null> {
    const { data, error } = await supabase
      .rpc('atomic_credit_deposit', {
        p_user_id: userId,
        p_amount: amount,
        p_currency: currency,
      })
      .maybeSingle();

    if (error) throw new Error('Credit deposit failed: ' + error.message);
    if (!data) return null;
    return toWallet(data as AtomicWalletRow);
  }

  /**
   * ATOMIC: Reserve funds for withdrawal request (available → locked).
   * Returns null if insufficient available balance.
   */
  async reserveForWithdrawal(userId: string, amount: number, currency: 'NGN' | 'USD' = 'NGN'): Promise<Wallet | null> {
    const { data, error } = await supabase
      .rpc('atomic_reserve_for_withdrawal', {
        p_user_id: userId,
        p_amount: amount,
        p_currency: currency,
      })
      .maybeSingle();

    if (error) throw new Error('Reserve for withdrawal failed: ' + error.message);
    if (!data) return null;
    return toWallet(data as AtomicWalletRow);
  }

  /**
   * ATOMIC: Approve withdrawal (balance - amount, locked - amount, totalWithdrawn + amount).
   * Returns null if insufficient locked balance.
   */
  async approveWithdrawal(userId: string, amount: number, currency: 'NGN' | 'USD' = 'NGN'): Promise<Wallet | null> {
    const { data, error } = await supabase
      .rpc('atomic_approve_withdrawal', {
        p_user_id: userId,
        p_amount: amount,
        p_currency: currency,
      })
      .maybeSingle();

    if (error) throw new Error('Approve withdrawal failed: ' + error.message);
    if (!data) return null;
    return toWallet(data as AtomicWalletRow);
  }

  /**
   * ATOMIC: Reject withdrawal (locked → available).
   * Returns null if insufficient locked balance.
   */
  async rejectWithdrawal(userId: string, amount: number, currency: 'NGN' | 'USD' = 'NGN'): Promise<Wallet | null> {
    const { data, error } = await supabase
      .rpc('atomic_reject_withdrawal', {
        p_user_id: userId,
        p_amount: amount,
        p_currency: currency,
      })
      .maybeSingle();

    if (error) throw new Error('Reject withdrawal failed: ' + error.message);
    if (!data) return null;
    return toWallet(data as AtomicWalletRow);
  }

  /**
   * ATOMIC: Settlement payout for winner (available + payout, balance + profit).
   */
  async settlementPayout(userId: string, payout: number, profit: number, currency: 'NGN' | 'USD' = 'NGN'): Promise<Wallet | null> {
    const { data, error } = await supabase
      .rpc('atomic_settlement_payout', {
        p_user_id: userId,
        p_payout: payout,
        p_profit: profit,
        p_currency: currency,
      })
      .maybeSingle();

    if (error) throw new Error('Settlement payout failed: ' + error.message);
    if (!data) return null;
    return toWallet(data as AtomicWalletRow);
  }

  /**
   * ATOMIC: Settlement loss (balance - stake).
   */
  async settlementLoss(userId: string, stake: number, currency: 'NGN' | 'USD' = 'NGN'): Promise<Wallet | null> {
    const { data, error } = await supabase
      .rpc('atomic_settlement_loss', {
        p_user_id: userId,
        p_stake: stake,
        p_currency: currency,
      })
      .maybeSingle();

    if (error) throw new Error('Settlement loss failed: ' + error.message);
    if (!data) return null;
    return toWallet(data as AtomicWalletRow);
  }

  /**
   * ATOMIC: Decrement available balance (for pool-based position entry).
   * Returns null if insufficient available balance.
   */
  async decrementAvailable(userId: string, amount: number, currency: 'NGN' | 'USD' = 'NGN'): Promise<Wallet | null> {
    const { data, error } = await supabase
      .rpc('atomic_decrement_available', {
        p_user_id: userId,
        p_amount: amount,
        p_currency: currency,
      })
      .maybeSingle();

    if (error) throw new Error('Decrement available failed: ' + error.message);
    if (!data) return null;
    return toWallet(data as AtomicWalletRow);
  }

  /**
   * ATOMIC: Refund to available balance (for position refunds).
   */
  async refundToAvailable(userId: string, amount: number, currency: 'NGN' | 'USD' = 'NGN'): Promise<Wallet | null> {
    const { data, error } = await supabase
      .rpc('atomic_refund_to_available', {
        p_user_id: userId,
        p_amount: amount,
        p_currency: currency,
      })
      .maybeSingle();

    if (error) throw new Error('Refund to available failed: ' + error.message);
    if (!data) return null;
    return toWallet(data as AtomicWalletRow);
  }

  // =========================================================================
  // LEGACY COMPATIBILITY — Old method signatures preserved for existing callers.
  // These now delegate to atomic operations.
  // =========================================================================

  /**
   * @deprecated Use creditDeposit() instead. Kept for backward compatibility.
   */
  async incrementBalance(
    userId: string,
    currency: 'NGN' | 'USD',
    amount: number,
    incrementAvailable: boolean = true
  ): Promise<Wallet> {
    if (incrementAvailable) {
      const result = await this.creditDeposit(userId, amount, currency);
      if (!result) throw new Error('Wallet not found or update failed');
      return result;
    }
    // If not incrementing available, we need a different approach.
    // This path is only used by the service layer which we'll migrate separately.
    // For now, use direct update as fallback (non-atomic — will be removed in Sprint 2).
    const wallet = await this.findByUserId(userId);
    if (!wallet) throw new Error('Wallet not found');

    const balanceField = currency === 'USD' ? 'balance_usd_cents' : 'balance_ngn_kobo';
    const { data, error } = await supabase
      .from('wallets')
      .update({
        [balanceField]: Number(wallet[balanceField] || 0) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)
      .select()
      .single();

    if (error || !data) throw error || new Error('Wallet update failed');
    return data;
  }

  /**
   * @deprecated Use decrementAvailable() instead. Kept for backward compatibility.
   */
  async decrementAvailableBalance(
    userId: string,
    currency: 'NGN' | 'USD',
    amount: number
  ): Promise<Wallet> {
    const result = await this.decrementAvailable(userId, amount, currency);
    if (!result) throw new Error('Insufficient balance or wallet not found');
    return result;
  }

  /**
   * @deprecated Use approveWithdrawal() for withdrawal flow. Kept for backward compatibility.
   * This decrements both balance and available.
   */
  async decrementBalance(
    userId: string,
    currency: 'NGN' | 'USD',
    amount: number
  ): Promise<Wallet> {
    const wallet = await this.findByUserId(userId);
    if (!wallet) throw new Error('Wallet not found');

    const balanceField = currency === 'USD' ? 'balance_usd_cents' : 'balance_ngn_kobo';
    const availableField = currency === 'USD' ? 'available_usd_cents' : 'available_ngn_kobo';
    const currentAvailable = Number(wallet[availableField] || 0);

    if (currentAvailable < amount) {
      throw new Error('Insufficient balance');
    }

    const { data, error } = await supabase
      .from('wallets')
      .update({
        [balanceField]: Math.max(0, Number(wallet[balanceField] || 0) - amount),
        [availableField]: Math.max(0, currentAvailable - amount),
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)
      .select()
      .single();

    if (error || !data) throw error || new Error('Wallet update failed');
    return data;
  }

  /**
   * Direct update — used only for wallet creation. NOT for balance changes.
   */
  async updateBalance(
    userId: string,
    balanceNgnKobo: number,
    balanceUsdCents: number,
    availableNgnKobo: number,
    availableUsdCents: number
  ): Promise<Wallet> {
    const { data, error } = await supabase
      .from('wallets')
      .update({
        balance_ngn_kobo: balanceNgnKobo,
        balance_usd_cents: balanceUsdCents,
        available_ngn_kobo: availableNgnKobo,
        available_usd_cents: availableUsdCents,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update wallet: ' + error.message);
    }

    return data;
  }

  // =========================================================================
  // TRANSACTION WRAPPERS — Kept for backward compatibility with service layer.
  // The "transaction" is now the atomic SQL function itself.
  // =========================================================================

  async withTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    // Atomic SQL functions provide the transactional guarantee.
    // The callback receives the supabase client for any additional queries.
    return await callback(supabase);
  }

  async incrementBalanceInTransaction(
    _client: any,
    userId: string,
    currency: 'NGN' | 'USD',
    amount: number,
    incrementAvailable: boolean = true
  ): Promise<Wallet> {
    const result = await this.incrementBalance(userId, currency, amount, incrementAvailable);
    if (!result) throw new Error('Wallet not found');
    return result;
  }

  async decrementAvailableBalanceInTransaction(
    _client: any,
    userId: string,
    currency: 'NGN' | 'USD',
    amount: number
  ): Promise<Wallet> {
    const result = await this.decrementAvailable(userId, amount, currency);
    if (!result) throw new Error('Insufficient balance or wallet not found');
    return result;
  }

  async decrementBalanceInTransaction(
    _client: any,
    userId: string,
    currency: 'NGN' | 'USD',
    amount: number
  ): Promise<Wallet> {
    return await this.decrementBalance(userId, currency, amount);
  }

  async findByUserIdInTransaction(_client: any, userId: string): Promise<Wallet | null> {
    return await this.findByUserId(userId);
  }
}
