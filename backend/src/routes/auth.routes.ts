import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { CreateUserRequest, LoginRequest } from '../types/user.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();
const authService = new AuthService();

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const userData: CreateUserRequest = req.body;

    // Register user and create wallet
    const authResponse = await authService.register(userData);

    // Set httpOnly cookie
    res.cookie('auth_token', authResponse.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Return user data (without token in response body for security)
    res.status(201).json({
      user: authResponse.user,
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message === 'Email already exists') {
        return res.status(409).json({
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email already exists',
            timestamp: new Date().toISOString()
          }
        });
      }

      if (error.message === 'Username already exists') {
        return res.status(409).json({
          error: {
            code: 'USERNAME_EXISTS',
            message: 'This username is already taken',
            timestamp: new Date().toISOString()
          }
        });
      }

      if (error.message.includes('Username') || 
          error.message.includes('Email') || 
          error.message.includes('Password')) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Generic server error
    res.status(500).json({
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Failed to register user. Please try again.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const loginData: LoginRequest = req.body;

    // Authenticate user
    const authResponse = await authService.login(loginData);

    // Set httpOnly cookie
    res.cookie('auth_token', authResponse.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Return user data
    res.json({
      user: authResponse.user,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);

    if (error instanceof Error) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString()
          }
        });
      }

      if (error.message.includes('email') || error.message.includes('Password')) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Generic server error
    res.status(500).json({
      error: {
        code: 'LOGIN_FAILED',
        message: 'Login failed. Please try again.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', (req: Request, res: Response) => {
  try {
    // Clear httpOnly cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Logout failed. Please try again.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authMiddleware.authenticate, async (req: Request, res: Response) => {
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

    // You could fetch fresh user data from database here if needed
    res.json({
      user: {
        id: req.user.userId,
        username: req.user.username,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: {
        code: 'GET_USER_FAILED',
        message: 'Failed to get user information',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;