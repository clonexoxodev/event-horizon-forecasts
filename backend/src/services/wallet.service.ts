import { WalletRepository } from '../repositories/wallet.repository.js';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { currencyService } from './currency.service.js';
import { Wallet, WalletDisplay } from '../types/wallet.js';
import { Transaction, DepositRequest, WithdrawalRequest } from '../types/transaction.js';

/**
 * Business logic errors
 */
export class InsufficientBalanceError extends Error {
  constructor(
    message: string,
    public details: {
      required: number;
      available: number;
      currency: 'NGN' | 'USD';
    }
  ) {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

export class WalletNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletNotFoundError';
  }
}

export class InvalidAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAmountError';
  }
}

/**
 * Wallet service layer - handles business logic for wallet operations
 */
export class WalletService {
  private walletRepository: WalletRepository;
  private transactionRepository: TransactionRepository;

  constructor(
    walletRepository?: WalletRepository,
    transactionRepository?: TransactionRepository
  ) {
    this.walletRepository = walletRepository || new WalletRepository();
    this.transactionRepository = transactionRepository || new TransactionRepository();
  }

  /**
   * Get wallet by user ID
   */
  async getWallet(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findByUserId(userId);
    
    if (!wallet) {
      throw new WalletNotFoundError(`Wallet not found for user ${userId}`);
    }

    return wallet;
  }

  /**
   * Get wallet display information with currency conversion
   */
  async getWalletDisplay(
    userId: string, 
    displayCurrency: 'NGN' | 'USD'
  ): Promise<WalletDisplay> {
    const wallet = await this.getWallet(userId);

    // Get balance in the requested display currency
    let totalBalanceSmallestUnit: number;
    let availableBalanceSmallestUnit: number;

    if (displayCurrency === 'NGN') {
      // Convert USD to NGN if needed and add to NGN balance
      const usdToNgnBalance = await currencyService.convertBalance(
        wallet.balance_usd_cents,
        'USD',
        'NGN'
      );
      const usdToNgnAvailable = await currencyService.convertBalance(
        wallet.available_usd_cents,
        'USD',
        'NGN'
      );
      
      totalBalanceSmallestUnit = wallet.balance_ngn_kobo + usdToNgnBalance;
      availableBalanceSmallestUnit = wallet.available_ngn_kobo + usdToNgnAvailable;
    } else {
      // Convert NGN to USD if needed and add to USD balance
      const ngnToUsdBalance = await currencyService.convertBalance(
        wallet.balance_ngn_kobo,
        'NGN',
        'USD'
      );
      const ngnToUsdAvailable = await currencyService.convertBalance(
        wallet.available_ngn_kobo,
        'NGN',
        'USD'
      );
      
      totalBalanceSmallestUnit = wallet.balance_usd_cents + ngnToUsdBalance;
      availableBalanceSmallestUnit = wallet.available_usd_cents + ngnToUsdAvailable;
    }

    return {
      totalBalance: currencyService.formatBalance(totalBalanceSmallestUnit, displayCurrency),
      availableBalance: currencyService.formatBalance(availableBalanceSmallestUnit, displayCurrency),
      currency: displayCurrency
    };
  }

  /**
   * Process deposit request. Money is not added until a payment provider or
   * admin approval confirms the payment.
   */
  async processDeposit(
    userId: string,
    depositRequest: DepositRequest
  ): Promise<{ wallet: Wallet; transaction: Transaction }> {
    // Validate amount
    if (depositRequest.amount_smallest_unit <= 0) {
      throw new InvalidAmountError('Deposit amount must be greater than zero');
    }

    const wallet = await this.getWallet(userId);

    return await this.walletRepository.withTransaction(async (client) => {
      const transaction = await this.transactionRepository.createInTransaction(client, {
        user_id: userId,
        wallet_id: wallet.id,
        type: 'deposit',
        amount_smallest_unit: depositRequest.amount_smallest_unit,
        currency: depositRequest.currency,
        direction: 'IN',
        status: 'pending',
        metadata: {
          method: depositRequest.method,
          paymentStatus: 'manual_pending',
          note: 'Waiting for payment confirmation',
          ...depositRequest.metadata
        }
      });

      return { wallet, transaction };
    });
  }

  /**
   * Process withdrawal request. Available balance is reserved while the request
   * is pending; total balance changes only when an approval flow settles it.
   */
  async processWithdrawal(
    userId: string,
    withdrawalRequest: WithdrawalRequest
  ): Promise<{ wallet: Wallet; transaction: Transaction }> {
    // Validate amount
    if (withdrawalRequest.amount_smallest_unit <= 0) {
      throw new InvalidAmountError('Withdrawal amount must be greater than zero');
    }

    const wallet = await this.getWallet(userId);

    // Check available balance
    const availableBalance = withdrawalRequest.currency === 'NGN' 
      ? wallet.available_ngn_kobo 
      : wallet.available_usd_cents;

    if (availableBalance < withdrawalRequest.amount_smallest_unit) {
      throw new InsufficientBalanceError(
        'Insufficient balance for withdrawal',
        {
          required: withdrawalRequest.amount_smallest_unit,
          available: availableBalance,
          currency: withdrawalRequest.currency
        }
      );
    }

    return await this.walletRepository.withTransaction(async (client) => {
      const updatedWallet = await this.walletRepository.decrementAvailableBalanceInTransaction(
        client,
        userId,
        withdrawalRequest.currency,
        withdrawalRequest.amount_smallest_unit
      );

      // Create transaction record
      const transaction = await this.transactionRepository.createInTransaction(client, {
        user_id: userId,
        wallet_id: wallet.id,
        type: 'withdrawal',
        amount_smallest_unit: withdrawalRequest.amount_smallest_unit,
        currency: withdrawalRequest.currency,
        direction: 'OUT',
        status: 'pending',
        metadata: {
          destination: withdrawalRequest.destination,
          withdrawalStatus: 'pending_review',
          note: 'Money reserved while withdrawal is reviewed',
          ...withdrawalRequest.metadata
        }
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  /**
   * Validate balance for position entry
   */
  async validateBalanceForPosition(
    userId: string,
    currency: 'NGN' | 'USD',
    amountSmallestUnit: number
  ): Promise<boolean> {
    if (amountSmallestUnit <= 0) {
      throw new InvalidAmountError('Position amount must be greater than zero');
    }

    const wallet = await this.getWallet(userId);
    
    const availableBalance = currency === 'NGN' 
      ? wallet.available_ngn_kobo 
      : wallet.available_usd_cents;

    return availableBalance >= amountSmallestUnit;
  }

  /**
   * Reserve balance for position entry (decrements available balance only)
   */
  async reserveBalanceForPosition(
    userId: string,
    currency: 'NGN' | 'USD',
    amountSmallestUnit: number,
    referenceId: string
  ): Promise<{ wallet: Wallet; transaction: Transaction }> {
    // Validate amount
    if (amountSmallestUnit <= 0) {
      throw new InvalidAmountError('Position amount must be greater than zero');
    }

    const wallet = await this.getWallet(userId);

    // Check available balance
    const availableBalance = currency === 'NGN' 
      ? wallet.available_ngn_kobo 
      : wallet.available_usd_cents;

    if (availableBalance < amountSmallestUnit) {
      throw new InsufficientBalanceError(
        'Insufficient balance for position entry',
        {
          required: amountSmallestUnit,
          available: availableBalance,
          currency
        }
      );
    }

    return await this.walletRepository.withTransaction(async (client) => {
      // Decrement available balance only (total balance remains the same)
      const updatedWallet = await this.walletRepository.decrementAvailableBalanceInTransaction(
        client,
        userId,
        currency,
        amountSmallestUnit
      );

      // Create transaction record
      const transaction = await this.transactionRepository.createInTransaction(client, {
        user_id: userId,
        wallet_id: wallet.id,
        type: 'position_entry',
        amount_smallest_unit: amountSmallestUnit,
        currency,
        direction: 'OUT',
        reference_id: referenceId,
        reference_type: 'position',
        status: 'completed'
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  /**
   * Process position payout (adds winnings to wallet)
   */
  async processPositionPayout(
    userId: string,
    currency: 'NGN' | 'USD',
    payoutAmountSmallestUnit: number,
    referenceId: string
  ): Promise<{ wallet: Wallet; transaction: Transaction }> {
    // Validate amount
    if (payoutAmountSmallestUnit <= 0) {
      throw new InvalidAmountError('Payout amount must be greater than zero');
    }

    const wallet = await this.getWallet(userId);

    return await this.walletRepository.withTransaction(async (client) => {
      // Increment both total and available balance
      const updatedWallet = await this.walletRepository.incrementBalanceInTransaction(
        client,
        userId,
        currency,
        payoutAmountSmallestUnit,
        true
      );

      // Create transaction record
      const transaction = await this.transactionRepository.createInTransaction(client, {
        user_id: userId,
        wallet_id: wallet.id,
        type: 'position_payout',
        amount_smallest_unit: payoutAmountSmallestUnit,
        currency,
        direction: 'IN',
        reference_id: referenceId,
        reference_type: 'position',
        status: 'completed'
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    return await this.transactionRepository.findByUserId(userId, limit, offset);
  }

  /**
   * Get currency conversion rate
   */
  async getCurrencyConversionRate(
    from: 'NGN' | 'USD',
    to: 'NGN' | 'USD'
  ): Promise<number> {
    return await currencyService.getExchangeRate(from, to);
  }

  /**
   * Convert amount between currencies
   */
  async convertCurrency(
    amount: number,
    from: 'NGN' | 'USD',
    to: 'NGN' | 'USD'
  ): Promise<number> {
    return await currencyService.convert(amount, from, to);
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(userId: string): Promise<{
    totalDepositsNGN: number;
    totalDepositsUSD: number;
    totalWithdrawalsNGN: number;
    totalWithdrawalsUSD: number;
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

    return {
      totalDepositsNGN,
      totalDepositsUSD,
      totalWithdrawalsNGN,
      totalWithdrawalsUSD,
      transactionCount
    };
  }
}

// Export singleton instance
export const walletService = new WalletService();
