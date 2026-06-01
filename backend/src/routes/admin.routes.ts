import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole, protectPrimarySuperAdmin } from '../middleware/role.middleware.js';
import { supabase } from '../db/supabase-client.js';

const router = Router();

// Primary super admin email
const PRIMARY_SUPER_ADMIN_EMAIL = 'fehintoluwaolu@gmail.com';

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

export default router;
