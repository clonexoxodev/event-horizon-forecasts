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
const MIN_WITHDRAWAL_KOBO = 500 * 100;
const FAST_REVIEW_THRESHOLD_KOBO = 10000 * 100;
const MAX_DAILY_WITHDRAWAL_KOBO = 250000 * 100;

const toAmount = (smallestUnit: number) => Number(smallestUnit || 0) / 100;
const toSmallestUnit = (amount: unknown) => Math.round(Number(amount || 0) * 100);
const makeReference = (prefix: 'DEP' | 'WDR') => `FLP-${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90000 + 10000)}`;
const depositInstruction = (amountSmallestUnit: number, reference: string) =>
  `Transfer exactly ₦${toAmount(amountSmallestUnit).toLocaleString()} and use ${reference} as your payment reference. Your wallet will be credited after admin confirmation.`;

type PaymentProvider = 'paystack' | 'flutterwave' | 'monnify';
const supportedProviders: PaymentProvider[] = ['paystack', 'flutterwave', 'monnify'];
const getPaymentProvider = (requested?: unknown): PaymentProvider => {
  const provider = String(requested || process.env.PAYMENT_PROVIDER || 'paystack').toLowerCase();
  return supportedProviders.includes(provider as PaymentProvider) ? provider as PaymentProvider : 'paystack';
};
const getAppBaseUrl = (req: Request) => `${req.protocol}://${req.get('host')}`;
const paymentSetupError = (provider: PaymentProvider) => ({
  error: {
    code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
    message: `${provider} is not configured yet. Add the required provider secret keys on the backend before accepting deposits.`,
    timestamp: new Date().toISOString()
  }
});

const initializeCheckout = async (provider: PaymentProvider, input: { email: string; amount: number; amountSmallestUnit: number; reference: string; callbackUrl: string }) => {
  if (provider === 'paystack') {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return null;
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: input.email, amount: input.amountSmallestUnit, currency: 'NGN', reference: input.reference, callback_url: input.callbackUrl, metadata: { reference: input.reference, provider } })
    });
    const payload: any = await response.json();
    if (!response.ok || !payload?.status || !payload?.data?.authorization_url) throw new Error(payload?.message || 'Paystack checkout could not be initialized.');
    return payload.data.authorization_url as string;
  }
  if (provider === 'flutterwave') {
    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) return null;
    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_ref: input.reference, amount: input.amount, currency: 'NGN', redirect_url: input.callbackUrl, customer: { email: input.email }, customizations: { title: 'FLIPPE Wallet', description: 'Add money to your FLIPPE wallet' } })
    });
    const payload: any = await response.json();
    if (!response.ok || payload?.status !== 'success' || !payload?.data?.link) throw new Error(payload?.message || 'Flutterwave checkout could not be initialized.');
    return payload.data.link as string;
  }
  const apiKey = process.env.MONNIFY_API_KEY;
  const secret = process.env.MONNIFY_SECRET_KEY;
  const contractCode = process.env.MONNIFY_CONTRACT_CODE;
  if (!apiKey || !secret || !contractCode) return null;
  const authResponse = await fetch('https://api.monnify.com/api/v1/auth/login', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${secret}`).toString('base64')}` } });
  const authPayload: any = await authResponse.json();
  const accessToken = authPayload?.responseBody?.accessToken;
  if (!authResponse.ok || !accessToken) throw new Error(authPayload?.responseMessage || 'Monnify auth failed.');
  const response = await fetch('https://api.monnify.com/api/v1/merchant/transactions/init-transaction', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: input.amount, customerName: input.email, customerEmail: input.email, paymentReference: input.reference, paymentDescription: 'Add money to FLIPPE wallet', currencyCode: 'NGN', contractCode, redirectUrl: input.callbackUrl, paymentMethods: ['CARD', 'ACCOUNT_TRANSFER'] })
  });
  const payload: any = await response.json();
  if (!response.ok || !payload?.requestSuccessful || !payload?.responseBody?.checkoutUrl) throw new Error(payload?.responseMessage || 'Monnify checkout could not be initialized.');
  return payload.responseBody.checkoutUrl as string;
};

const stripNotificationMetadata = (payload: Record<string, any>) => {
  const { metadata, ...rest } = payload;
  return rest;
};

const notifyUser = async (payload: Record<string, any>) => {
  const result = await supabase.from('notifications').insert(payload);
  if (result.error && /metadata/i.test(result.error.message || '')) {
    await supabase.from('notifications').insert(stripNotificationMetadata(payload));
  }
};

const serializeWallet = (wallet: any) => ({
  id: wallet.id,
  userId: wallet.user_id,
  balanceNgn: toAmount(wallet.balance_ngn_kobo),
  balanceUsd: toAmount(wallet.balance_usd_cents),
  availableNgn: toAmount(wallet.available_ngn_kobo),
  availableUsd: toAmount(wallet.available_usd_cents),
  lockedNgn: toAmount(wallet.locked_ngn_kobo || 0),
  totalDepositedNgn: toAmount(wallet.total_deposited_ngn_kobo || 0),
  totalWithdrawnNgn: toAmount(wallet.total_withdrawn_ngn_kobo || 0),
  totalWinningsNgn: toAmount(wallet.total_winnings_ngn_kobo || 0),
  totalStakedNgn: toAmount(wallet.total_staked_ngn_kobo || 0),
  currency: wallet.currency || 'NGN',
  createdAt: wallet.created_at,
  updatedAt: wallet.updated_at,
});

const serializeTransaction = (tx: any) => ({
  id: tx.id,
  userId: tx.user_id,
  walletId: tx.wallet_id,
  type: tx.type,
  amount: toAmount(tx.amount_smallest_unit),
  amountSmallestUnit: tx.amount_smallest_unit,
  currency: tx.currency,
  direction: tx.direction,
  reference: tx.reference || tx.metadata?.reference || null,
  referenceId: tx.reference_id,
  referenceType: tx.reference_type,
  status: tx.status,
  description: tx.description || null,
  metadata: tx.metadata || {},
  approvedBy: tx.approved_by || null,
  approvedAt: tx.approved_at || null,
  createdAt: tx.created_at,
  updatedAt: tx.updated_at,
});

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
        ...serializeWallet(wallet),
        balanceNgnKobo: wallet.balance_ngn_kobo,
        balanceUsdCents: wallet.balance_usd_cents,
        availableNgnKobo: wallet.available_ngn_kobo,
        availableUsdCents: wallet.available_usd_cents,
        lockedNgnKobo: (wallet as any).locked_ngn_kobo || 0,
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
 * POST /api/wallet/deposit-session
 * Create a payment-provider checkout session. Wallet is credited only after
 * provider verification/callback, not when this session is created.
 */
router.post('/deposit-session', async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated', timestamp: new Date().toISOString() } });
    const userId = req.user.userId;
    const provider = getPaymentProvider(req.body.provider);
    const amountSmallestUnit = Number(req.body.amount_smallest_unit || req.body.amountSmallestUnit || toSmallestUnit(req.body.amount));
    if (!Number.isFinite(amountSmallestUnit) || amountSmallestUnit <= 0) {
      return res.status(400).json({ error: { code: 'INVALID_AMOUNT', message: 'Amount must be greater than 0.', timestamp: new Date().toISOString() } });
    }

    const { data: wallet, error: walletError } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
    if (walletError || !wallet) return res.status(404).json({ error: { code: 'WALLET_NOT_FOUND', message: 'Wallet not found', timestamp: new Date().toISOString() } });
    const { data: userRecord } = await supabase.from('users').select('email, username').eq('id', userId).single();
    const reference = makeReference('DEP');
    const email = userRecord?.email || `${userRecord?.username || userId}@flippe.local`;
    const authorizationUrl = await initializeCheckout(provider, {
      email,
      amount: toAmount(amountSmallestUnit),
      amountSmallestUnit,
      reference,
      callbackUrl: `${getAppBaseUrl(req)}/api/wallet/payment/callback?provider=${provider}`,
    });
    if (!authorizationUrl) return res.status(503).json(paymentSetupError(provider));

    const { data: transaction, error: txError } = await supabase.from('transactions').insert({
      user_id: userId,
      wallet_id: wallet.id,
      type: 'deposit_request',
      direction: 'IN',
      amount_smallest_unit: amountSmallestUnit,
      currency: 'NGN',
      status: 'pending',
      reference,
      reference_type: 'deposit',
      description: `Payment checkout ${reference}`,
      metadata: { provider, reference, authorizationUrl }
    }).select().single();
    if (txError || !transaction) throw txError || new Error('Could not create deposit transaction');

    const { data: request, error: requestError } = await supabase.from('deposit_requests').insert({
      user_id: userId,
      wallet_id: wallet.id,
      transaction_id: transaction.id,
      amount_smallest_unit: amountSmallestUnit,
      currency: 'NGN',
      reference,
      provider,
      payment_instruction: `Complete payment with ${provider}.`,
      status: 'pending',
      metadata: { provider, checkout: 'hosted' }
    }).select().single();
    if (requestError || !request) throw requestError || new Error('Could not create deposit request');

    await notifyUser({
      user_id: userId,
      type: 'deposit_request_created',
      title: 'Payment started',
      message: `Complete your ₦${toAmount(amountSmallestUnit).toLocaleString()} payment with ${provider}.`,
      reference_id: request.id,
      reference_type: 'deposit_request',
      metadata: { reference, provider }
    });

    res.status(201).json({
      message: 'Payment session created',
      provider,
      reference,
      authorizationUrl,
      depositRequest: {
        id: request.id,
        amount: toAmount(request.amount_smallest_unit),
        amountSmallestUnit: request.amount_smallest_unit,
        currency: request.currency,
        reference: request.reference,
        paymentInstruction: request.payment_instruction,
        status: request.status,
        createdAt: request.created_at,
      },
    });
  } catch (error: any) {
    console.error('Deposit session error:', error);
    res.status(500).json({ error: { code: 'DEPOSIT_SESSION_FAILED', message: error.message || 'Could not start payment session.', timestamp: new Date().toISOString() } });
  }
});

/**
 * POST /api/wallet/deposit-request
 * Create a manual deposit request. Wallet is credited only after admin approval.
 */
router.post('/deposit-request', async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated', timestamp: new Date().toISOString() } });
    const userId = req.user.userId;
    const amountSmallestUnit = Number(req.body.amount_smallest_unit || req.body.amountSmallestUnit || toSmallestUnit(req.body.amount));
    if (!Number.isFinite(amountSmallestUnit) || amountSmallestUnit <= 0) {
      return res.status(400).json({ error: { code: 'INVALID_AMOUNT', message: 'Amount must be greater than 0.', timestamp: new Date().toISOString() } });
    }

    const { data: wallet, error: walletError } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
    if (walletError || !wallet) return res.status(404).json({ error: { code: 'WALLET_NOT_FOUND', message: 'Wallet not found', timestamp: new Date().toISOString() } });

    const reference = makeReference('DEP');
    const instruction = depositInstruction(amountSmallestUnit, reference);
    const { data: transaction, error: txError } = await supabase.from('transactions').insert({
      user_id: userId,
      wallet_id: wallet.id,
      type: 'deposit_request',
      direction: 'IN',
      amount_smallest_unit: amountSmallestUnit,
      currency: 'NGN',
      status: 'pending',
      reference,
      reference_type: 'deposit',
      description: `Deposit request ${reference}`,
      metadata: { provider: 'manual', reference, paymentInstruction: instruction }
    }).select().single();
    if (txError || !transaction) throw txError || new Error('Could not create transaction');

    const { data: request, error: requestError } = await supabase.from('deposit_requests').insert({
      user_id: userId,
      wallet_id: wallet.id,
      transaction_id: transaction.id,
      amount_smallest_unit: amountSmallestUnit,
      currency: 'NGN',
      reference,
      provider: 'manual',
      payment_instruction: instruction,
      status: 'pending',
      metadata: { method: req.body.method || 'bank_transfer' }
    }).select().single();
    if (requestError || !request) throw requestError || new Error('Could not create deposit request');

    await notifyUser({
      user_id: userId,
      type: 'deposit_request_created',
      title: 'Deposit request created',
      message: `Transfer ₦${toAmount(amountSmallestUnit).toLocaleString()} with reference ${reference}.`,
      reference_id: request.id,
      reference_type: 'deposit_request',
      metadata: { reference, amount: toAmount(amountSmallestUnit) }
    });

    res.status(201).json({
      message: 'Deposit request created',
      wallet: serializeWallet(wallet),
      depositRequest: {
        id: request.id,
        amount: toAmount(request.amount_smallest_unit),
        amountSmallestUnit: request.amount_smallest_unit,
        currency: request.currency,
        reference: request.reference,
        paymentInstruction: request.payment_instruction,
        status: request.status,
        createdAt: request.created_at,
      },
      transaction: serializeTransaction(transaction),
    });
  } catch (error) {
    console.error('Deposit request error:', error);
    res.status(500).json({ error: { code: 'DEPOSIT_REQUEST_FAILED', message: 'Failed to create deposit request.', timestamp: new Date().toISOString() } });
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
 * POST /api/wallet/withdrawal-request
 * Create a withdrawal request and move funds from available to locked balance.
 */
router.post('/withdrawal-request', async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated', timestamp: new Date().toISOString() } });
    const userId = req.user.userId;
    const amountSmallestUnit = Number(req.body.amount_smallest_unit || req.body.amountSmallestUnit || toSmallestUnit(req.body.amount));
    const bankName = String(req.body.bankName || req.body.bank_name || '').trim();
    const accountNumber = String(req.body.accountNumber || req.body.account_number || '').trim();
    const accountName = String(req.body.accountName || req.body.account_name || '').trim();

    if (!Number.isFinite(amountSmallestUnit) || amountSmallestUnit < MIN_WITHDRAWAL_KOBO) {
      return res.status(400).json({ error: { code: 'INVALID_AMOUNT', message: 'Minimum withdrawal is ₦500.', timestamp: new Date().toISOString() } });
    }
    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({ error: { code: 'BANK_DETAILS_REQUIRED', message: 'Bank name, account number, and account name are required.', timestamp: new Date().toISOString() } });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const { data: todayRows } = await supabase
      .from('withdrawal_requests')
      .select('amount_smallest_unit')
      .eq('user_id', userId)
      .in('status', ['pending', 'completed'])
      .gte('created_at', startOfToday.toISOString());
    const todayTotal = (todayRows || []).reduce((sum, row) => sum + Number(row.amount_smallest_unit || 0), 0);
    if (todayTotal + amountSmallestUnit > MAX_DAILY_WITHDRAWAL_KOBO) {
      return res.status(422).json({ error: { code: 'DAILY_LIMIT_EXCEEDED', message: `Daily withdrawal limit is ₦${toAmount(MAX_DAILY_WITHDRAWAL_KOBO).toLocaleString()}.`, timestamp: new Date().toISOString() } });
    }

    const { data: wallet, error: walletError } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
    if (walletError || !wallet) return res.status(404).json({ error: { code: 'WALLET_NOT_FOUND', message: 'Wallet not found', timestamp: new Date().toISOString() } });
    if (Number(wallet.available_ngn_kobo || 0) < amountSmallestUnit) {
      return res.status(422).json({ error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient available balance.', timestamp: new Date().toISOString() } });
    }

    const reference = makeReference('WDR');
    const reviewTier = amountSmallestUnit > FAST_REVIEW_THRESHOLD_KOBO ? 'manual_review' : 'fast_review';
    const { data: updatedWallet, error: updateError } = await supabase.from('wallets').update({
      available_ngn_kobo: Number(wallet.available_ngn_kobo || 0) - amountSmallestUnit,
      locked_ngn_kobo: Number(wallet.locked_ngn_kobo || 0) + amountSmallestUnit,
      updated_at: new Date().toISOString(),
    }).eq('id', wallet.id).gte('available_ngn_kobo', amountSmallestUnit).select().single();
    if (updateError || !updatedWallet) throw updateError || new Error('Could not reserve withdrawal funds');

    const { data: transaction, error: txError } = await supabase.from('transactions').insert({
      user_id: userId,
      wallet_id: wallet.id,
      type: 'withdrawal_request',
      direction: 'HOLD',
      amount_smallest_unit: amountSmallestUnit,
      currency: 'NGN',
      status: 'pending',
      reference,
      reference_type: 'withdrawal',
      description: `Withdrawal request ${reference}`,
      metadata: { reference, bankName, accountNumber, accountName, reviewTier }
    }).select().single();
    if (txError || !transaction) throw txError || new Error('Could not create withdrawal transaction');

    const { data: request, error: requestError } = await supabase.from('withdrawal_requests').insert({
      user_id: userId,
      wallet_id: wallet.id,
      transaction_id: transaction.id,
      amount_smallest_unit: amountSmallestUnit,
      currency: 'NGN',
      reference,
      provider: 'manual',
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      review_tier: reviewTier,
      status: 'pending',
      metadata: { destination: 'bank_account' }
    }).select().single();
    if (requestError || !request) throw requestError || new Error('Could not create withdrawal request');

    await notifyUser({
      user_id: userId,
      type: 'withdrawal_requested',
      title: 'Withdrawal requested',
      message: `Your ₦${toAmount(amountSmallestUnit).toLocaleString()} withdrawal is pending review.`,
      reference_id: request.id,
      reference_type: 'withdrawal_request',
      metadata: { reference, amount: toAmount(amountSmallestUnit), reviewTier }
    });

    res.status(201).json({
      message: 'Withdrawal request created',
      wallet: serializeWallet(updatedWallet),
      withdrawalRequest: {
        id: request.id,
        amount: toAmount(request.amount_smallest_unit),
        amountSmallestUnit: request.amount_smallest_unit,
        currency: request.currency,
        reference: request.reference,
        status: request.status,
        reviewTier: request.review_tier,
        createdAt: request.created_at,
      },
      transaction: serializeTransaction(transaction),
    });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    res.status(500).json({ error: { code: 'WITHDRAWAL_REQUEST_FAILED', message: 'Failed to create withdrawal request.', timestamp: new Date().toISOString() } });
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
    const type = req.query.type as string | undefined;
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
      const validTypes = ['deposit', 'withdrawal', 'position_entry', 'position_payout', 'refund', 'deposit_request', 'deposit_approved', 'deposit_rejected', 'withdrawal_request', 'withdrawal_approved', 'withdrawal_rejected', 'prediction_stake', 'market_payout', 'admin_adjustment'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_TYPE',
            message: 'Invalid transaction type.',
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
      transactions = await transactionRepo.findByType(userId, type as any, limit, offset);
      
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
      transactions: transactions.map(tx => serializeTransaction({
        ...tx,
        metadata: {
          ...(tx.metadata || {}),
          marketQuestion: marketQuestionByPosition.get(tx.reference_id) || tx.metadata?.marketQuestion || null
        }
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
