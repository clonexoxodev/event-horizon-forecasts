import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { supabase } from '../db/supabase-client.js';

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

      // Attach user data with role to request
      req.user = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role as 'user' | 'admin' | 'super_admin'
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
          req.user = {
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role as 'user' | 'admin' | 'super_admin'
          };
        }
      }

      next();
    } catch (error) {
      // Continue without authentication if token is invalid
      next();
    }
  };
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();