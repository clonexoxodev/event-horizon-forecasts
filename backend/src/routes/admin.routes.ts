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
    // Query total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Query total forecasts (positions) count
    const { count: totalForecasts, error: forecastsError } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true });

    // Query total volume (sum of all position amounts in NGN kobo)
    const { data: volumeData, error: volumeError } = await supabase
      .from('positions')
      .select('amount_smallest_unit, currency');

    let totalVolume = 0;
    if (volumeData) {
      // Sum all NGN positions (convert USD to NGN if needed, or just sum NGN)
      totalVolume = volumeData
        .filter(p => p.currency === 'NGN')
        .reduce((sum, p) => sum + (p.amount_smallest_unit || 0), 0);
    }

    // Query active markets count
    const { count: activeMarkets, error: activeError } = await supabase
      .from('markets')
      .select('*', { count: 'exact', head: true })
      .eq('state', 'active');

    // Query resolved markets count
    const { count: resolvedMarkets, error: resolvedError } = await supabase
      .from('markets')
      .select('*', { count: 'exact', head: true })
      .eq('state', 'resolved');

    // Query pending markets count (closed but not resolved)
    const { count: pendingMarkets, error: pendingError } = await supabase
      .from('markets')
      .select('*', { count: 'exact', head: true })
      .eq('state', 'closed');

    // Check for errors
    if (usersError || forecastsError || volumeError || activeError || resolvedError || pendingError) {
      console.error('Analytics query errors:', {
        usersError,
        forecastsError,
        volumeError,
        activeError,
        resolvedError,
        pendingError
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
      totalVolume: totalVolume,
      activeMarkets: activeMarkets || 0,
      resolvedMarkets: resolvedMarkets || 0,
      pendingMarkets: pendingMarkets || 0
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

export default router;
