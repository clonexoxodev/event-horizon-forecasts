import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabase-client.js';

// Role hierarchy for comparison
const ROLE_HIERARCHY = {
  user: 0,
  admin: 1,
  super_admin: 2
};

// Primary super admin email (configure via env; empty string means no primary super-admin protection)
const PRIMARY_SUPER_ADMIN_EMAIL = (process.env.PRIMARY_SUPER_ADMIN_EMAIL || '').toLowerCase();

/**
 * Middleware to require a specific role or higher
 * @param requiredRole - The minimum role required ('user', 'admin', or 'super_admin')
 */
export const requireRole = (requiredRole: 'user' | 'admin' | 'super_admin') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const userRole = req.user.role;
      const userRoleLevel = ROLE_HIERARCHY[userRole];
      const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];

      // Check if user has sufficient role
      if (userRoleLevel < requiredRoleLevel) {
        // Log authorization failure
        console.warn(`Authorization failed: User ${req.user.userId} (${userRole}) attempted to access ${requiredRole} route`);

        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to access this resource',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Log successful authorization
      console.log(`Authorization success: User ${req.user.userId} (${userRole}) accessed ${requiredRole} route`);

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      res.status(500).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Failed to verify permissions',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

/**
 * Middleware to protect the primary super admin from role modifications
 * This should be used on endpoints that modify user roles
 */
export const protectPrimarySuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get the target user ID from request body or params
    const targetUserId = req.body.userId || req.params.userId;

    if (!targetUserId) {
      // If no target user ID, continue (validation will catch this)
      next();
      return;
    }

    // Fetch the target user's email
    const { data: targetUser, error } = await supabase
      .from('users')
      .select('email')
      .eq('id', targetUserId)
      .single();

    if (error) {
      console.error('Error fetching target user:', error);
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Target user not found',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Check if target user is the primary super admin
    if (targetUser.email === PRIMARY_SUPER_ADMIN_EMAIL) {
      // Log protection event
      console.warn(`Protection triggered: Attempt to modify primary super admin by user ${req.user?.userId}`);

      res.status(403).json({
        error: {
          code: 'FORBIDDEN_PRIMARY_SUPER_ADMIN',
          message: 'Cannot modify the primary super admin',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Primary super admin protection error:', error);
    res.status(500).json({
      error: {
        code: 'PROTECTION_ERROR',
        message: 'Failed to verify protection',
        timestamp: new Date().toISOString()
      }
    });
  }
};
