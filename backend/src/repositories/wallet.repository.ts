import { supabase } from '../db/supabase-client.js';
import { Wallet, CreateWalletRequest } from '../types/wallet.js';

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
        available_usd_cents: 0
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
        // No rows returned
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
        // No rows returned
        return null;
      }
      throw new Error('Failed to find wallet: ' + error.message);
    }

    return data;
  }

  /**
   * Update wallet balance
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
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update wallet: ' + error.message);
    }

    return data;
  }

  /**
   * Increment balance atomically (for deposits and payouts)
   */
  async incrementBalance(
    userId: string,
    currency: 'NGN' | 'USD',
    amount: number,
    incrementAvailable: boolean = true
  ): Promise<Wallet> {
    // First get current wallet
    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const newBalanceNgn = currency === 'NGN' 
      ? wallet.balance_ngn_kobo + amount 
      : wallet.balance_ngn_kobo;
    const newBalanceUsd = currency === 'USD' 
      ? wallet.balance_usd_cents + amount 
      : wallet.balance_usd_cents;
    const newAvailableNgn = currency === 'NGN' 
      ? wallet.available_ngn_kobo + (incrementAvailable ? amount : 0)
      : wallet.available_ngn_kobo;
    const newAvailableUsd = currency === 'USD' 
      ? wallet.available_usd_cents + (incrementAvailable ? amount : 0)
      : wallet.available_usd_cents;

    return await this.updateBalance(
      userId,
      newBalanceNgn,
      newBalanceUsd,
      newAvailableNgn,
      newAvailableUsd
    );
  }

  /**
   * Decrement available balance atomically (for position entries)
   */
  async decrementAvailableBalance(
    userId: string,
    currency: 'NGN' | 'USD',
    amount: number
  ): Promise<Wallet> {
    // First get current wallet
    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const currentAvailable = currency === 'NGN' 
      ? wallet.available_ngn_kobo 
      : wallet.available_usd_cents;

    if (currentAvailable < amount) {
      throw new Error('Insufficient balance');
    }

    const newAvailableNgn = currency === 'NGN' 
      ? wallet.available_ngn_kobo - amount
      : wallet.available_ngn_kobo;
    const newAvailableUsd = currency === 'USD' 
      ? wallet.available_usd_cents - amount
      : wallet.available_usd_cents;

    return await this.updateBalance(
      userId,
      wallet.balance_ngn_kobo,
      wallet.balance_usd_cents,
      newAvailableNgn,
      newAvailableUsd
    );
  }

  /**
   * Decrement total balance atomically (for withdrawals)
   */
  async decrementBalance(
    userId: string,
    currency: 'NGN' | 'USD',
    amount: number
  ): Promise<Wallet> {
    // First get current wallet
    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const currentAvailable = currency === 'NGN' 
      ? wallet.available_ngn_kobo 
      : wallet.available_usd_cents;

    if (currentAvailable < amount) {
      throw new Error('Insufficient balance');
    }

    const newBalanceNgn = currency === 'NGN' 
      ? wallet.balance_ngn_kobo - amount
      : wallet.balance_ngn_kobo;
    const newBalanceUsd = currency === 'USD' 
      ? wallet.balance_usd_cents - amount
      : wallet.balance_usd_cents;
    const newAvailableNgn = currency === 'NGN' 
      ? wallet.available_ngn_kobo - amount
      : wallet.available_ngn_kobo;
    const newAvailableUsd = currency === 'USD' 
      ? wallet.available_usd_cents - amount
      : wallet.available_usd_cents;

    return await this.updateBalance(
      userId,
      newBalanceNgn,
      newBalanceUsd,
      newAvailableNgn,
      newAvailableUsd
    );
  }

  // Note: Transaction methods are simplified for Supabase
  // In a real app, you'd use Supabase's transaction support or handle this differently
  async withTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    // For now, just execute the callback without transaction support
    // In production, you'd implement proper transaction handling
    return await callback(supabase);
  }

  async incrementBalanceInTransaction(
    client: any,
    userId: string,
    currency: 'NGN' | 'USD',
    amount: number,
    incrementAvailable: boolean = true
  ): Promise<Wallet> {
    return await this.incrementBalance(userId, currency, amount, incrementAvailable);
  }

  async decrementAvailableBalanceInTransaction(
    client: any,
    userId: string,
    currency: 'NGN' | 'USD',
    amount: number
  ): Promise<Wallet> {
    return await this.decrementAvailableBalance(userId, currency, amount);
  }

  async decrementBalanceInTransaction(
    client: any,
    userId: string,
    currency: 'NGN' | 'USD',
    amount: number
  ): Promise<Wallet> {
    return await this.decrementBalance(userId, currency, amount);
  }

  async findByUserIdInTransaction(client: any, userId: string): Promise<Wallet | null> {
    return await this.findByUserId(userId);
  }
}