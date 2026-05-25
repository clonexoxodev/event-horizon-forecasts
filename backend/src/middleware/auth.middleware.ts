import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { supabase } from '../db/supabase-client.js';

const PRIMARY_SUPER_ADMIN_EMAIL = 'fehintoluwaolu@gmail.com';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        email: string;
        role: 'user' | 'admin' | 'super_admin';
      };
    }
  }
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Middleware to verify JWT token from httpOnly cookie and fetch role from database
   */
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get token from httpOnly cookie
      const token = req.cookies.auth_token;

      if (!token) {
        res.status(401).json({
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authentication token is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Verify token
      const decoded = this.authService.verifyToken(token);

      // Fetch fresh role from database
      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, email, role')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        res.status(401).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const role = await this.ensurePrimarySuperAdminRole(user);

      // Attach user data with role to request
      req.user = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role
      };

      next();
    } catch (error) {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Optional authentication middleware (doesn't fail if no token)
   */
  optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies.auth_token;

      if (token) {
        const decoded = this.authService.verifyToken(token);
        
        // Fetch fresh role from database
        const { data: user, error } = await supabase
          .from('users')
          .select('id, username, email, role')
          .eq('id', decoded.userId)
          .single();

        if (!error && user) {
          const role = await this.ensurePrimarySuperAdminRole(user);

          req.user = {
            userId: user.id,
            username: user.username,
            email: user.email,
            role
          };
        }
      }

      next();
    } catch (error) {
      // Continue without authentication if token is invalid
      next();
    }
  };

  private async ensurePrimarySuperAdminRole(user: {
    id: string;
    email: string;
    role?: string | null;
  }): Promise<'user' | 'admin' | 'super_admin'> {
    const currentRole = (user.role || 'user') as 'user' | 'admin' | 'super_admin';

    if (user.email?.toLowerCase() !== PRIMARY_SUPER_ADMIN_EMAIL) {
      return currentRole;
    }

    if (currentRole === 'super_admin') {
      return currentRole;
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ role: 'super_admin' })
      .eq('id', user.id)
      .select('role')
      .single();

    if (error) {
      console.error('Failed to update primary super admin role during auth check:', error);
    }

    return (updatedUser?.role as 'super_admin') || 'super_admin';
  }
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();
