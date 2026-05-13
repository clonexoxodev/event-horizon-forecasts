import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        email: string;
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
   * Middleware to verify JWT token from httpOnly cookie
   */
  authenticate = (req: Request, res: Response, next: NextFunction): void => {
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

      // Attach user data to request
      req.user = {
        userId: decoded.userId,
        username: decoded.username,
        email: decoded.email
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
  optionalAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const token = req.cookies.auth_token;

      if (token) {
        const decoded = this.authService.verifyToken(token);
        req.user = {
          userId: decoded.userId,
          username: decoded.username,
          email: decoded.email
        };
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