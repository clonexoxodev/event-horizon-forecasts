import { Router, Request, Response } from 'express';
import { walletService } from '../services/wallet.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { supabase } from '../db/supabase-client.js';
import { DepositRequest, WithdrawalRequest } from '../types/transaction.js';
import { 
  InsufficientBalanceError, 
  WalletNotFoundError, 
  InvalidAmountError 
} from '../services/wallet.service.js';

const router = Router();

// All wallet routes require authentication
router.use(authMiddleware.authenticate);

/**
 * GET /api/wallet
 * Get wallet balance and info
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString()
        }
      });
    }

    const userId = req.user.userId;
    const displayCurrency = (req.query.currency as 'NGN' | 'USD') || 'NGN';

    // Validate currency parameter
    if (displayCurrency !== 'NGN' && displayCurrency !== 'USD') {
      return res.status(400).json({
        error: {
          code: 'INVALID_CURRENCY',
          message: 'Currency must be either NGN or USD',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get wallet data
    const wallet = await walletService.getWallet(userId);
    const walletDisplay = await walletService.getWalletDisplay(userId, displayCurrency);

    res.json({
      wallet: {
        id: wallet.id,
        userId: wallet.user_id,
        balanceNgnKobo: wallet.balance_ngn_kobo,
        balanceUsdCents: wallet.balance_usd_cents,
        availableNgnKobo: wallet.available_ngn_kobo,
        availableUsdCents: wallet.available_usd_cents,
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
      },
      display: walletDisplay
    });
  } catch (error) {
    console.error('Get wallet error:', error);

    if (error instanceof WalletNotFoundError) {
      return res.status(404).json({
        error: {
          code: 'WALLET_NOT_FOUND',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'GET_WALLET_FAILED',
        message: 'Failed to retrieve wallet information',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/wallet/deposit
 * Initiate deposit
 */
router.post('/deposit', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString()
        }
      });
    }

    const userId = req.user.userId;
    const depositRequest: DepositRequest = {
      ...req.body,
      amount_smallest_unit: req.body.amount_smallest_unit || req.body.amountSmallestUnit || Math.round(Number(req.body.amount || 0) * 100),
      method: req.body.method || 'bank_transfer'
    };

    // Validate required fields
    if (!depositRequest.amount_smallest_unit || !depositRequest.currency || !depositRequest.method) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: amount_smallest_unit, currency, and method are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate currency
    if (depositRequest.currency !== 'NGN' && depositRequest.currency !== 'USD') {
      return res.status(400).json({
        error: {
          code: 'INVALID_CURRENCY',
          message: 'Currency must be either NGN or USD',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate method
    const validMethods = ['bank_transfer', 'card', 'crypto'];
    if (!validMethods.includes(depositRequest.method)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_METHOD',
          message: 'Method must be one of: bank_transfer, card, crypto',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Process deposit
    const result = await walletService.processDeposit(userId, depositRequest);

    res.status(201).json({
      message: 'Add money request saved',
      wallet: {
        id: result.wallet.id,
        userId: result.wallet.user_id,
        balanceNgnKobo: result.wallet.balance_ngn_kobo,
        balanceUsdCents: result.wallet.balance_usd_cents,
        availableNgnKobo: result.wallet.available_ngn_kobo,
        availableUsdCents: result.wallet.available_usd_cents,
        updatedAt: result.wallet.updated_at
      },
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        amount: result.transaction.amount_smallest_unit / 100,
        amountSmallestUnit: result.transaction.amount_smallest_unit,
        currency: result.transaction.currency,
        direction: result.transaction.direction,
        status: result.transaction.status,
        createdAt: result.transaction.created_at
      }
    });
  } catch (error) {
    console.error('Deposit error:', error);

    if (error instanceof InvalidAmountError) {
      return res.status(400).json({
        error: {
          code: 'INVALID_AMOUNT',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (error instanceof WalletNotFoundError) {
      return res.status(404).json({
        error: {
          code: 'WALLET_NOT_FOUND',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'DEPOSIT_FAILED',
        message: 'Failed to process deposit. Please try again.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/wallet/withdraw
 * Initiate withdrawal
 */
router.post('/withdraw', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString()
        }
      });
    }

    const userId = req.user.userId;
    const withdrawalRequest: WithdrawalRequest = {
      ...req.body,
      amount_smallest_unit: req.body.amount_smallest_unit || req.body.amountSmallestUnit || Math.round(Number(req.body.amount || 0) * 100),
      destination: req.body.destination || 'bank_account'
    };

    // Validate required fields
    if (!withdrawalRequest.amount_smallest_unit || !withdrawalRequest.currency || !withdrawalRequest.destination) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: amount_smallest_unit, currency, and destination are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate currency
    if (withdrawalRequest.currency !== 'NGN' && withdrawalRequest.currency !== 'USD') {
      return res.status(400).json({
        error: {
          code: 'INVALID_CURRENCY',
          message: 'Currency must be either NGN or USD',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Process withdrawal
    const result = await walletService.processWithdrawal(userId, withdrawalRequest);

    res.status(201).json({
      message: 'Withdrawal request saved',
      wallet: {
        id: result.wallet.id,
        userId: result.wallet.user_id,
        balanceNgnKobo: result.wallet.balance_ngn_kobo,
        balanceUsdCents: result.wallet.balance_usd_cents,
        availableNgnKobo: result.wallet.available_ngn_kobo,
        availableUsdCents: result.wallet.available_usd_cents,
        updatedAt: result.wallet.updated_at
      },
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        amount: result.transaction.amount_smallest_unit / 100,
        amountSmallestUnit: result.transaction.amount_smallest_unit,
        currency: result.transaction.currency,
        direction: result.transaction.direction,
        status: result.transaction.status,
        createdAt: result.transaction.created_at
      }
    });
  } catch (error) {
    console.error('Withdrawal error:', error);

    if (error instanceof InvalidAmountError) {
      return res.status(400).json({
        error: {
          code: 'INVALID_AMOUNT',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (error instanceof InsufficientBalanceError) {
      return res.status(422).json({
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: error.message,
          details: error.details,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (error instanceof WalletNotFoundError) {
      return res.status(404).json({
        error: {
          code: 'WALLET_NOT_FOUND',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'WITHDRAWAL_FAILED',
        message: 'Failed to process withdrawal. Please try again.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/wallet/transactions
 * Get transaction history with optional filtering
 * Query parameters:
 * - limit: number of transactions to return (1-100, default 50)
 * - offset: number of transactions to skip (default 0)
 * - type: filter by transaction type (deposit, withdrawal, position_entry, position_payout)
 * - currency: filter by currency (NGN, USD)
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString()
        }
      });
    }

    const userId = req.user.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as 'deposit' | 'withdrawal' | 'position_entry' | 'position_payout' | undefined;
    const currency = req.query.currency as 'NGN' | 'USD' | undefined;

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 100',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (offset < 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_OFFSET',
          message: 'Offset must be non-negative',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate type parameter if provided
    if (type) {
      const validTypes = ['deposit', 'withdrawal', 'position_entry', 'position_payout'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_TYPE',
            message: 'Type must be one of: deposit, withdrawal, position_entry, position_payout',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Validate currency parameter if provided
    if (currency && currency !== 'NGN' && currency !== 'USD') {
      return res.status(400).json({
        error: {
          code: 'INVALID_CURRENCY',
          message: 'Currency must be either NGN or USD',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get transaction history with filters
    let transactions;
    if (type) {
      // Use type-specific query from transaction repository
      const { TransactionRepository } = await import('../repositories/transaction.repository.js');
      const transactionRepo = new TransactionRepository();
      transactions = await transactionRepo.findByType(userId, type, limit, offset);
      
      // Apply currency filter if specified
      if (currency) {
        transactions = transactions.filter(tx => tx.currency === currency);
      }
    } else {
      // Get all transactions
      transactions = await walletService.getTransactionHistory(userId, limit, offset);
      
      // Apply currency filter if specified
      if (currency) {
        transactions = transactions.filter(tx => tx.currency === currency);
      }
    }

    const positionIds = (transactions || [])
      .filter((tx) => tx.reference_type === 'position' && tx.reference_id)
      .map((tx) => tx.reference_id);
    const { data: referencedPositions } = positionIds.length
      ? await supabase
        .from('positions')
        .select('id, markets(question)')
        .in('id', positionIds)
      : { data: [] as any[] };
    const marketQuestionByPosition = new Map(
      (referencedPositions || []).map((position: any) => [position.id, position.markets?.question])
    );

    res.json({
      transactions: transactions.map(tx => ({
        id: tx.id,
        userId: tx.user_id,
        walletId: tx.wallet_id,
        type: tx.type,
        amount: tx.amount_smallest_unit / 100,
        amountSmallestUnit: tx.amount_smallest_unit,
        currency: tx.currency,
        direction: tx.direction,
        referenceId: tx.reference_id,
        referenceType: tx.reference_type,
        status: tx.status,
        metadata: {
          ...(tx.metadata || {}),
          marketQuestion: marketQuestionByPosition.get(tx.reference_id) || tx.metadata?.marketQuestion || null
        },
        createdAt: tx.created_at
      })),
      pagination: {
        limit,
        offset,
        count: transactions.length
      },
      filters: {
        ...(type && { type }),
        ...(currency && { currency })
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);

    res.status(500).json({
      error: {
        code: 'GET_TRANSACTIONS_FAILED',
        message: 'Failed to retrieve transaction history',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/wallet/convert
 * Get currency conversion rate
 */
router.get('/convert', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString()
        }
      });
    }

    const from = req.query.from as 'NGN' | 'USD';
    const to = req.query.to as 'NGN' | 'USD';
    const amount = req.query.amount ? parseFloat(req.query.amount as string) : undefined;

    // Validate required parameters
    if (!from || !to) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required parameters: from and to currencies are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate currencies
    if ((from !== 'NGN' && from !== 'USD') || (to !== 'NGN' && to !== 'USD')) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CURRENCY',
          message: 'Currencies must be either NGN or USD',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get exchange rate
    const rate = await walletService.getCurrencyConversionRate(from, to);

    // If amount is provided, also return converted amount
    let convertedAmount: number | undefined;
    if (amount !== undefined) {
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be a non-negative number',
            timestamp: new Date().toISOString()
          }
        });
      }
      convertedAmount = await walletService.convertCurrency(amount, from, to);
    }

    res.json({
      from,
      to,
      rate,
      ...(amount !== undefined && { amount, convertedAmount })
    });
  } catch (error) {
    console.error('Currency conversion error:', error);

    res.status(500).json({
      error: {
        code: 'CONVERSION_FAILED',
        message: 'Failed to get currency conversion rate',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;
