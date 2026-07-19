import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole, protectPrimarySuperAdmin } from '../middleware/role.middleware.js';
import { supabase } from '../db/supabase-client.js';

const router = Router();

// Primary super admin email (configure via env; empty string means no primary super-admin protection)
const PRIMARY_SUPER_ADMIN_EMAIL = (process.env.PRIMARY_SUPER_ADMIN_EMAIL || '').toLowerCase();
const toAmount = (smallestUnit: number) => Number(smallestUnit || 0) / 100;
const nowIso = () => new Date().toISOString();

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

const serializeFinanceTransaction = (tx: any) => ({
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

const serializeDepositRequest = (request: any) => ({
  id: request.id,
  userId: request.user_id,
  walletId: request.wallet_id,
  transactionId: request.transaction_id,
  amount: toAmount(request.amount_smallest_unit),
  amountSmallestUnit: request.amount_smallest_unit,
  currency: request.currency,
  reference: request.reference,
  provider: request.provider,
  paymentInstruction: request.payment_instruction,
  status: request.status,
  user: request.users ? { email: request.users.email, username: request.users.username } : null,
  createdAt: request.created_at,
  updatedAt: request.updated_at,
});

const serializeWithdrawalRequest = (request: any) => ({
  id: request.id,
  userId: request.user_id,
  walletId: request.wallet_id,
  transactionId: request.transaction_id,
  amount: toAmount(request.amount_smallest_unit),
  amountSmallestUnit: request.amount_smallest_unit,
  currency: request.currency,
  reference: request.reference,
  provider: request.provider,
  bankName: request.bank_name,
  accountNumber: request.account_number,
  accountName: request.account_name,
  reviewTier: request.review_tier,
  status: request.status,
  user: request.users ? { email: request.users.email, username: request.users.username } : null,
  createdAt: request.created_at,
  updatedAt: request.updated_at,
});

/**
 * POST /api/admin/add-admin
 * Add admin role to a user (super_admin only)
 */
router.post('/add-admin', authMiddleware.authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, username, role')
      .eq('email', email)
      .single();

    if (findError || !user) {
      return res.status(400).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User with this email does not exist. They must sign up first.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user already has admin or super_admin role
    if (user.role === 'admin' || user.role === 'super_admin') {
      return res.status(409).json({
        error: {
          code: 'ALREADY_ADMIN',
          message: 'User already has admin privileges',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update user role to admin
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', user.id)
      .select('id, email, username, role')
      .single();

    if (updateError) {
      console.error('Failed to update user role:', updateError);
      return res.status(500).json({
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to add admin role',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Add admin error:', error);
    res.status(500).json({
      error: {
        code: 'ADD_ADMIN_FAILED',
        message: 'Failed to add admin',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/admin/remove-admin
 * Remove admin role from a user (super_admin only)
 */
router.post('/remove-admin', authMiddleware.authenticate, requireRole('super_admin'), protectPrimarySuperAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // Validate userId
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find user
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, username, role')
      .eq('id', userId)
      .single();

    if (findError || !user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update user role to user
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ role: 'user' })
      .eq('id', userId)
      .select('id, email, username, role')
      .single();

    if (updateError) {
      console.error('Failed to update user role:', updateError);
      return res.status(500).json({
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to remove admin role',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Remove admin error:', error);
    res.status(500).json({
      error: {
        code: 'REMOVE_ADMIN_FAILED',
        message: 'Failed to remove admin',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/admin/list-admins
 * Get list of all admins (super_admin only)
 */
router.get('/list-admins', authMiddleware.authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    // Query all users with admin or super_admin role
    const { data: admins, error } = await supabase
      .from('users')
      .select('id, email, username, role')
      .in('role', ['admin', 'super_admin'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch admins:', error);
      return res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch admin list',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Mark primary super admin
    const adminsWithPrimaryFlag = admins.map(admin => ({
      ...admin,
      isPrimary: admin.email === PRIMARY_SUPER_ADMIN_EMAIL
    }));

    res.json({
      admins: adminsWithPrimaryFlag
    });
  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({
      error: {
        code: 'LIST_ADMINS_FAILED',
        message: 'Failed to list admins',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/admin/analytics
 * Get platform analytics (super_admin only)
 */
router.get('/analytics', authMiddleware.authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayIso = startOfToday.toISOString();

    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: totalForecasts, error: forecastsError } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true });

    const { count: predictionsToday, error: predictionsTodayError } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayIso);

    const { data: volumeData, error: volumeError } = await supabase
      .from('positions')
      .select('amount_smallest_unit, currency, created_at, user_id');

    let totalVolume = 0;
    let todayVolume = 0;
    if (volumeData) {
      totalVolume = volumeData
        .filter(p => p.currency === 'NGN')
        .reduce((sum, p) => sum + (p.amount_smallest_unit || 0), 0);
      todayVolume = volumeData
        .filter(p => p.currency === 'NGN' && new Date(p.created_at).getTime() >= startOfToday.getTime())
        .reduce((sum, p) => sum + (p.amount_smallest_unit || 0), 0);
    }

    const { count: activeMarkets, error: activeError } = await supabase
      .from('markets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: resolvedMarkets, error: resolvedError } = await supabase
      .from('markets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved');

    const { count: pendingMarkets, error: pendingError } = await supabase
      .from('markets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['closed', 'pending_resolution']);

    const { data: marketLiquidity, error: liquidityError } = await supabase
      .from('markets')
      .select('seed_liquidity_yes_smallest_unit, seed_liquidity_no_smallest_unit, yes_pool_smallest_unit, no_pool_smallest_unit');

    const platformLiquidityDeployed = (marketLiquidity || []).reduce((sum, market) => (
      sum + Number(market.seed_liquidity_yes_smallest_unit || 0) + Number(market.seed_liquidity_no_smallest_unit || 0)
    ), 0);

    const activeUsersToday = new Set((volumeData || [])
      .filter((p) => new Date(p.created_at).getTime() >= startOfToday.getTime())
      .map((p) => p.user_id)
      .filter(Boolean)).size;

    if (usersError || forecastsError || predictionsTodayError || volumeError || activeError || resolvedError || pendingError || liquidityError) {
      console.error('Analytics query errors:', {
        usersError,
        forecastsError,
        predictionsTodayError,
        volumeError,
        activeError,
        resolvedError,
        pendingError,
        liquidityError
      });
      return res.status(500).json({
        error: {
          code: 'ANALYTICS_FAILED',
          message: 'Failed to fetch analytics',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      totalUsers: totalUsers || 0,
      totalForecasts: totalForecasts || 0,
      totalPredictions: totalForecasts || 0,
      predictionsToday: predictionsToday || 0,
      todayPredictions: predictionsToday || 0,
      totalVolume,
      todayVolume,
      activeMarkets: activeMarkets || 0,
      resolvedMarkets: resolvedMarkets || 0,
      pendingMarkets: pendingMarkets || 0,
      pendingResolution: pendingMarkets || 0,
      activeUsersToday: activeUsersToday || 0,
      platformLiquidityDeployed,
      pendingPayouts: pendingMarkets || 0
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: {
        code: 'ANALYTICS_FAILED',
        message: 'Failed to fetch analytics',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/admin/users
 * View users (super_admin only)
 */
router.get('/users', authMiddleware.authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, username, role, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      throw new Error(error.message);
    }

    res.json({ users: users || [] });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      error: {
        code: 'LIST_USERS_FAILED',
        message: 'Failed to list users',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/admin/transactions
 * View transactions (super_admin only)
 */
router.get('/transactions', authMiddleware.authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('id, user_id, wallet_id, type, amount_smallest_unit, currency, direction, reference_id, reference_type, status, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      transactions: (transactions || []).map((transaction) => ({
        id: transaction.id,
        userId: transaction.user_id,
        walletId: transaction.wallet_id,
        type: transaction.type,
        amount: Number(transaction.amount_smallest_unit || 0) / 100,
        amountSmallestUnit: transaction.amount_smallest_unit,
        currency: transaction.currency,
        direction: transaction.direction,
        referenceId: transaction.reference_id,
        referenceType: transaction.reference_type,
        status: transaction.status,
        metadata: transaction.metadata,
        createdAt: transaction.created_at
      }))
    });
  } catch (error) {
    console.error('List transactions error:', error);
    res.status(500).json({
      error: {
        code: 'LIST_TRANSACTIONS_FAILED',
        message: 'Failed to list transactions',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/admin/finance/overview
 * Real finance metrics for Wallet V1.
 */
router.get('/finance/overview', authMiddleware.authenticate, requireRole('super_admin'), async (_req: Request, res: Response) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayIso = startOfToday.toISOString();

    const [
      walletsResult,
      depositsResult,
      withdrawalsResult,
      pendingDepositsResult,
      pendingWithdrawalsResult,
      todayDepositsResult,
      todayWithdrawalsResult,
      todayPredictionsResult,
      pendingPayoutsResult,
    ] = await Promise.all([
      supabase.from('wallets').select('balance_ngn_kobo, available_ngn_kobo, locked_ngn_kobo'),
      supabase.from('deposit_requests').select('amount_smallest_unit').eq('status', 'completed'),
      supabase.from('withdrawal_requests').select('amount_smallest_unit').eq('status', 'completed'),
      supabase.from('deposit_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('deposit_requests').select('amount_smallest_unit').eq('status', 'completed').gte('approved_at', todayIso),
      supabase.from('withdrawal_requests').select('amount_smallest_unit').eq('status', 'completed').gte('approved_at', todayIso),
      supabase.from('positions').select('amount_smallest_unit').gte('created_at', todayIso),
      supabase.from('positions').select('id', { count: 'exact', head: true }).eq('status', 'won'),
    ]);

    const sum = (rows?: any[] | null) => (rows || []).reduce((total, row) => total + Number(row.amount_smallest_unit || 0), 0);
    const totalUserBalances = (walletsResult.data || []).reduce((total, wallet) => total + Number(wallet.balance_ngn_kobo || 0), 0);
    const totalLocked = (walletsResult.data || []).reduce((total, wallet) => total + Number(wallet.locked_ngn_kobo || 0), 0);

    res.json({
      overview: {
        totalUserBalances: toAmount(totalUserBalances),
        totalLocked: toAmount(totalLocked),
        totalDeposits: toAmount(sum(depositsResult.data)),
        totalWithdrawals: toAmount(sum(withdrawalsResult.data)),
        pendingDeposits: pendingDepositsResult.count || 0,
        pendingWithdrawals: pendingWithdrawalsResult.count || 0,
        todayDeposits: toAmount(sum(todayDepositsResult.data)),
        todayWithdrawals: toAmount(sum(todayWithdrawalsResult.data)),
        todayPredictionVolume: toAmount(sum(todayPredictionsResult.data)),
        pendingPayouts: pendingPayoutsResult.count || 0,
      }
    });
  } catch (error) {
    console.error('Finance overview error:', error);
    res.status(500).json({ error: { code: 'FINANCE_OVERVIEW_FAILED', message: 'Could not load finance overview.', timestamp: nowIso() } });
  }
});

router.get('/finance/deposits', authMiddleware.authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status || 'pending');
    let query = supabase.from('deposit_requests').select('*, users(email, username)').order('created_at', { ascending: false }).limit(200);
    if (status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ deposits: (data || []).map(serializeDepositRequest) });
  } catch (error) {
    console.error('Finance deposits error:', error);
    res.status(500).json({ error: { code: 'FINANCE_DEPOSITS_FAILED', message: 'Could not load deposit queue.', timestamp: nowIso() } });
  }
});

router.post('/finance/deposits/:id/approve', authMiddleware.authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { data: request, error: requestError } = await supabase.from('deposit_requests').select('*').eq('id', req.params.id).single();
    if (requestError || !request) return res.status(404).json({ error: { code: 'DEPOSIT_NOT_FOUND', message: 'Deposit request not found.', timestamp: nowIso() } });
    if (request.status !== 'pending') return res.status(409).json({ error: { code: 'DEPOSIT_ALREADY_HANDLED', message: 'This deposit request has already been handled.', timestamp: nowIso() } });

    const { data: wallet, error: walletError } = await supabase.from('wallets').select('*').eq('id', request.wallet_id).single();
    if (walletError || !wallet) throw walletError || new Error('Wallet not found');
    const approvedAt = nowIso();
    const { data: updatedWallet, error: walletUpdateError } = await supabase.from('wallets').update({
      balance_ngn_kobo: Number(wallet.balance_ngn_kobo || 0) + Number(request.amount_smallest_unit || 0),
      available_ngn_kobo: Number(wallet.available_ngn_kobo || 0) + Number(request.amount_smallest_unit || 0),
      total_deposited_ngn_kobo: Number(wallet.total_deposited_ngn_kobo || 0) + Number(request.amount_smallest_unit || 0),
      updated_at: approvedAt,
    }).eq('id', wallet.id).select().single();
    if (walletUpdateError || !updatedWallet) throw walletUpdateError || new Error('Wallet credit failed');

    await supabase.from('deposit_requests').update({ status: 'completed', approved_by: adminId, approved_at: approvedAt, updated_at: approvedAt }).eq('id', request.id).eq('status', 'pending');
    if (request.transaction_id) {
      await supabase.from('transactions').update({ status: 'completed', approved_by: adminId, approved_at: approvedAt, updated_at: approvedAt }).eq('id', request.transaction_id);
    }
    const { data: approvedTx } = await supabase.from('transactions').insert({
      user_id: request.user_id,
      wallet_id: request.wallet_id,
      type: 'deposit_approved',
      direction: 'IN',
      amount_smallest_unit: request.amount_smallest_unit,
      currency: request.currency,
      status: 'completed',
      reference: request.reference,
      reference_id: request.id,
      reference_type: 'deposit_request',
      approved_by: adminId,
      approved_at: approvedAt,
      description: `Approved deposit ${request.reference}`,
      metadata: { reference: request.reference, provider: request.provider }
    }).select().single();

    await notifyUser({ user_id: request.user_id, type: 'deposit_approved', title: 'Deposit approved', message: `₦${toAmount(request.amount_smallest_unit).toLocaleString()} has been added to your wallet.`, reference_id: request.id, reference_type: 'deposit_request', metadata: { reference: request.reference } });
    res.json({ success: true, wallet: updatedWallet, transaction: approvedTx ? serializeFinanceTransaction(approvedTx) : null });
  } catch (error: any) {
    console.error('Approve deposit error:', error);
    res.status(500).json({ error: { code: 'APPROVE_DEPOSIT_FAILED', message: error.message || 'Could not approve deposit.', timestamp: nowIso() } });
  }
});

router.post('/finance/deposits/:id/reject', authMiddleware.authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { data: request, error: requestError } = await supabase.from('deposit_requests').select('*').eq('id', req.params.id).single();
    if (requestError || !request) return res.status(404).json({ error: { code: 'DEPOSIT_NOT_FOUND', message: 'Deposit request not found.', timestamp: nowIso() } });
    if (request.status !== 'pending') return res.status(409).json({ error: { code: 'DEPOSIT_ALREADY_HANDLED', message: 'This deposit request has already been handled.', timestamp: nowIso() } });
    const rejectedAt = nowIso();
    await supabase.from('deposit_requests').update({ status: 'rejected', rejected_by: adminId, rejected_at: rejectedAt, updated_at: rejectedAt }).eq('id', request.id).eq('status', 'pending');
    if (request.transaction_id) await supabase.from('transactions').update({ status: 'rejected', approved_by: adminId, approved_at: rejectedAt, updated_at: rejectedAt }).eq('id', request.transaction_id);
    const { data: rejectedTx } = await supabase.from('transactions').insert({
      user_id: request.user_id,
      wallet_id: request.wallet_id,
      type: 'deposit_rejected',
      direction: 'RELEASE',
      amount_smallest_unit: request.amount_smallest_unit,
      currency: request.currency,
      status: 'rejected',
      reference: request.reference,
      reference_id: request.id,
      reference_type: 'deposit_request',
      approved_by: adminId,
      approved_at: rejectedAt,
      description: `Rejected deposit ${request.reference}`,
      metadata: { reason: req.body?.reason || 'Rejected by admin' }
    }).select().single();
    await notifyUser({ user_id: request.user_id, type: 'deposit_rejected', title: 'Deposit rejected', message: `Your ₦${toAmount(request.amount_smallest_unit).toLocaleString()} deposit request was rejected.`, reference_id: request.id, reference_type: 'deposit_request', metadata: { reference: request.reference } });
    res.json({ success: true, transaction: rejectedTx ? serializeFinanceTransaction(rejectedTx) : null });
  } catch (error: any) {
    console.error('Reject deposit error:', error);
    res.status(500).json({ error: { code: 'REJECT_DEPOSIT_FAILED', message: error.message || 'Could not reject deposit.', timestamp: nowIso() } });
  }
});

router.get('/finance/withdrawals', authMiddleware.authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status || 'pending');
    let query = supabase.from('withdrawal_requests').select('*, users(email, username)').order('created_at', { ascending: false }).limit(200);
    if (status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ withdrawals: (data || []).map(serializeWithdrawalRequest) });
  } catch (error) {
    console.error('Finance withdrawals error:', error);
    res.status(500).json({ error: { code: 'FINANCE_WITHDRAWALS_FAILED', message: 'Could not load withdrawal queue.', timestamp: nowIso() } });
  }
});

router.post('/finance/withdrawals/:id/approve', authMiddleware.authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { data: request, error: requestError } = await supabase.from('withdrawal_requests').select('*').eq('id', req.params.id).single();
    if (requestError || !request) return res.status(404).json({ error: { code: 'WITHDRAWAL_NOT_FOUND', message: 'Withdrawal request not found.', timestamp: nowIso() } });
    if (request.status !== 'pending') return res.status(409).json({ error: { code: 'WITHDRAWAL_ALREADY_HANDLED', message: 'This withdrawal request has already been handled.', timestamp: nowIso() } });
    const { data: wallet, error: walletError } = await supabase.from('wallets').select('*').eq('id', request.wallet_id).single();
    if (walletError || !wallet) throw walletError || new Error('Wallet not found');
    if (Number(wallet.locked_ngn_kobo || 0) < Number(request.amount_smallest_unit || 0)) throw new Error('Locked balance is lower than withdrawal amount.');
    const approvedAt = nowIso();
    const { data: updatedWallet, error: walletUpdateError } = await supabase.from('wallets').update({
      balance_ngn_kobo: Math.max(0, Number(wallet.balance_ngn_kobo || 0) - Number(request.amount_smallest_unit || 0)),
      locked_ngn_kobo: Math.max(0, Number(wallet.locked_ngn_kobo || 0) - Number(request.amount_smallest_unit || 0)),
      total_withdrawn_ngn_kobo: Number(wallet.total_withdrawn_ngn_kobo || 0) + Number(request.amount_smallest_unit || 0),
      updated_at: approvedAt,
    }).eq('id', wallet.id).select().single();
    if (walletUpdateError || !updatedWallet) throw walletUpdateError || new Error('Wallet withdrawal update failed');
    await supabase.from('withdrawal_requests').update({ status: 'completed', approved_by: adminId, approved_at: approvedAt, updated_at: approvedAt }).eq('id', request.id).eq('status', 'pending');
    if (request.transaction_id) await supabase.from('transactions').update({ status: 'completed', approved_by: adminId, approved_at: approvedAt, updated_at: approvedAt }).eq('id', request.transaction_id);
    const { data: approvedTx } = await supabase.from('transactions').insert({
      user_id: request.user_id,
      wallet_id: request.wallet_id,
      type: 'withdrawal_approved',
      direction: 'OUT',
      amount_smallest_unit: request.amount_smallest_unit,
      currency: request.currency,
      status: 'completed',
      reference: request.reference,
      reference_id: request.id,
      reference_type: 'withdrawal_request',
      approved_by: adminId,
      approved_at: approvedAt,
      description: `Paid withdrawal ${request.reference}`,
      metadata: { bankName: request.bank_name, accountNumber: request.account_number, accountName: request.account_name }
    }).select().single();
    await notifyUser({ user_id: request.user_id, type: 'withdrawal_approved', title: 'Withdrawal paid', message: `Your ₦${toAmount(request.amount_smallest_unit).toLocaleString()} withdrawal has been marked paid.`, reference_id: request.id, reference_type: 'withdrawal_request', metadata: { reference: request.reference } });
    res.json({ success: true, wallet: updatedWallet, transaction: approvedTx ? serializeFinanceTransaction(approvedTx) : null });
  } catch (error: any) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({ error: { code: 'APPROVE_WITHDRAWAL_FAILED', message: error.message || 'Could not approve withdrawal.', timestamp: nowIso() } });
  }
});

router.post('/finance/withdrawals/:id/reject', authMiddleware.authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { data: request, error: requestError } = await supabase.from('withdrawal_requests').select('*').eq('id', req.params.id).single();
    if (requestError || !request) return res.status(404).json({ error: { code: 'WITHDRAWAL_NOT_FOUND', message: 'Withdrawal request not found.', timestamp: nowIso() } });
    if (request.status !== 'pending') return res.status(409).json({ error: { code: 'WITHDRAWAL_ALREADY_HANDLED', message: 'This withdrawal request has already been handled.', timestamp: nowIso() } });
    const { data: wallet, error: walletError } = await supabase.from('wallets').select('*').eq('id', request.wallet_id).single();
    if (walletError || !wallet) throw walletError || new Error('Wallet not found');
    const rejectedAt = nowIso();
    const { data: updatedWallet, error: walletUpdateError } = await supabase.from('wallets').update({
      available_ngn_kobo: Number(wallet.available_ngn_kobo || 0) + Number(request.amount_smallest_unit || 0),
      locked_ngn_kobo: Math.max(0, Number(wallet.locked_ngn_kobo || 0) - Number(request.amount_smallest_unit || 0)),
      updated_at: rejectedAt,
    }).eq('id', wallet.id).select().single();
    if (walletUpdateError || !updatedWallet) throw walletUpdateError || new Error('Wallet release failed');
    await supabase.from('withdrawal_requests').update({ status: 'rejected', rejected_by: adminId, rejected_at: rejectedAt, updated_at: rejectedAt }).eq('id', request.id).eq('status', 'pending');
    if (request.transaction_id) await supabase.from('transactions').update({ status: 'rejected', approved_by: adminId, approved_at: rejectedAt, updated_at: rejectedAt }).eq('id', request.transaction_id);
    const { data: rejectedTx } = await supabase.from('transactions').insert({
      user_id: request.user_id,
      wallet_id: request.wallet_id,
      type: 'withdrawal_rejected',
      direction: 'RELEASE',
      amount_smallest_unit: request.amount_smallest_unit,
      currency: request.currency,
      status: 'completed',
      reference: request.reference,
      reference_id: request.id,
      reference_type: 'withdrawal_request',
      approved_by: adminId,
      approved_at: rejectedAt,
      description: `Rejected withdrawal ${request.reference}`,
      metadata: { reason: req.body?.reason || 'Rejected by admin' }
    }).select().single();
    await notifyUser({ user_id: request.user_id, type: 'withdrawal_rejected', title: 'Withdrawal rejected', message: `Your ₦${toAmount(request.amount_smallest_unit).toLocaleString()} withdrawal was rejected and funds returned.`, reference_id: request.id, reference_type: 'withdrawal_request', metadata: { reference: request.reference } });
    res.json({ success: true, wallet: updatedWallet, transaction: rejectedTx ? serializeFinanceTransaction(rejectedTx) : null });
  } catch (error: any) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({ error: { code: 'REJECT_WITHDRAWAL_FAILED', message: error.message || 'Could not reject withdrawal.', timestamp: nowIso() } });
  }
});

router.get('/finance/transactions', authMiddleware.authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const type = String(req.query.type || '');
    const status = String(req.query.status || '');
    const search = String(req.query.search || '').trim();
    let query = supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(300);
    if (type && type !== 'all') query = query.eq('type', type);
    if (status && status !== 'all') query = query.eq('status', status);
    if (search) {
      const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&');
      query = query.or(`reference.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ transactions: (data || []).map(serializeFinanceTransaction) });
  } catch (error) {
    console.error('Finance transactions error:', error);
    res.status(500).json({ error: { code: 'FINANCE_TRANSACTIONS_FAILED', message: 'Could not load finance transactions.', timestamp: nowIso() } });
  }
});

export default router;
