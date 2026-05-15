import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Create Express app
const app = express();

// CORS - Allow your frontend
app.use(cors({
  origin: [
    'https://event-horizon-forecasts.vercel.app',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Prediction Platform API is running',
    timestamp: new Date().toISOString(),
    env: {
      supabaseConfigured: !!supabaseUrl,
      jwtConfigured: !!JWT_SECRET,
      supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'not set',
      nodeEnv: process.env.NODE_ENV || 'not set'
    }
  });
});

// Debug endpoint - Check if user exists (temporary)
app.post('/api/debug/check-user', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username, created_at')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error) {
      return res.json({
        exists: false,
        error: error.message,
        hint: 'User not found in database. Try signup first.'
      });
    }

    res.json({
      exists: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.created_at
      },
      hint: 'User exists. If login fails, password might be incorrect.'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to check user',
      message: error.message
    });
  }
});

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Flippe Prediction Platform API',
    status: 'running',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      signup: '/api/auth/signup',
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      me: '/api/auth/me',
      admin: '/api/admin/*'
    }
  });
});

// Root API info
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'Prediction Platform API',
    status: 'running',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      signup: '/api/auth/signup',
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      me: '/api/auth/me'
    }
  });
});

// ============================================================================
// AUTH ROUTES - INLINE (NO IMPORTS)
// ============================================================================

// Auth middleware for protected routes
const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.auth_token;

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Fetch user from database to get current role
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, role, balance_ngn_kobo')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Attach user to request
    (req as any).user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
      balance: user.balance_ngn_kobo || 0
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Role middleware
const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
          timestamp: new Date().toISOString()
        }
      });
    }

    const roleHierarchy: Record<string, number> = {
      user: 0,
      admin: 1,
      super_admin: 2
    };

    const userRoleLevel = roleHierarchy[user.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  };
};

// Primary super admin email
const PRIMARY_SUPER_ADMIN_EMAIL = 'fehintoluwaolu@gmail.com';

/**
 * POST /api/auth/signup
 * Register a new user
 */
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || username.length < 3) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username must be at least 3 characters long',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters long',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, username')
      .or(`email.eq.${email},username.eq.${username}`)
      .single();

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(409).json({
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email already exists',
            timestamp: new Date().toISOString()
          }
        });
      } else {
        return res.status(409).json({
          error: {
            code: 'USERNAME_EXISTS',
            message: 'This username is already taken',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password_hash
      })
      .select()
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      return res.status(500).json({
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Failed to create user',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create wallet
    const { error: walletError } = await supabase
      .from('wallets')
      .insert({
        user_id: newUser.id,
        balance_ngn_kobo: 0,
        balance_usd_cents: 0,
        available_ngn_kobo: 0,
        available_usd_cents: 0
      });

    if (walletError) {
      console.error('Wallet creation error:', walletError);
      // Delete user if wallet creation fails
      await supabase.from('users').delete().eq('id', newUser.id);
      return res.status(500).json({
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Failed to create wallet',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: newUser.id,
        username: newUser.username,
        email: newUser.email
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Return success
    res.status(201).json({
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      },
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during registration',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for:', email);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (userError || !user) {
      console.log('User not found:', email);
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('Invalid password for:', email);
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    console.log('Login successful for:', email);

    // Return success
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during login',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  res.json({
    message: 'Logout successful'
  });
});

/**
 * POST /api/auth/reset-password
 * Reset password for any user (temporary solution for broken passwords)
 */
app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;

    // Validate input
    if (!email || !newPassword) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and new password are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters long',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find user
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('email', email.trim().toLowerCase())
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

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', user.id);

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update password',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
      user: {
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: {
        code: 'RESET_FAILED',
        message: 'Failed to reset password',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user
 */
app.get('/api/auth/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance
      }
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ============================================================================
// WALLET ROUTES
// ============================================================================

/**
 * GET /api/wallet
 * Get wallet balance
 */
app.get('/api/wallet', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !wallet) {
      return res.status(404).json({
        error: {
          code: 'WALLET_NOT_FOUND',
          message: 'Wallet not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      wallet: {
        id: wallet.id,
        userId: wallet.user_id,
        balanceNgn: wallet.balance_ngn_kobo / 100,
        balanceUsd: wallet.balance_usd_cents / 100,
        availableNgn: wallet.available_ngn_kobo / 100,
        availableUsd: wallet.available_usd_cents / 100
      }
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      error: {
        code: 'GET_WALLET_FAILED',
        message: 'Failed to retrieve wallet',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/wallet/deposit
 * Deposit funds
 */
app.post('/api/wallet/deposit', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { amount, currency } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Amount must be greater than 0',
          timestamp: new Date().toISOString()
        }
      });
    }

    const validCurrency = currency || 'NGN';
    if (validCurrency !== 'NGN' && validCurrency !== 'USD') {
      return res.status(400).json({
        error: {
          code: 'INVALID_CURRENCY',
          message: 'Currency must be NGN or USD',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get current wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return res.status(404).json({
        error: {
          code: 'WALLET_NOT_FOUND',
          message: 'Wallet not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Convert amount to smallest unit (kobo/cents)
    const amountSmallestUnit = Math.round(amount * 100);

    // Update wallet balance
    const updateField = validCurrency === 'NGN' ? 'balance_ngn_kobo' : 'balance_usd_cents';
    const availableField = validCurrency === 'NGN' ? 'available_ngn_kobo' : 'available_usd_cents';
    
    const { data: updatedWallet, error: updateError } = await supabase
      .from('wallets')
      .update({
        [updateField]: wallet[updateField] + amountSmallestUnit,
        [availableField]: wallet[availableField] + amountSmallestUnit
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Wallet update error:', updateError);
      return res.status(500).json({
        error: {
          code: 'DEPOSIT_FAILED',
          message: 'Failed to process deposit',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create transaction record
    await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        type: 'deposit',
        amount_smallest_unit: amountSmallestUnit,
        currency: validCurrency,
        direction: 'credit',
        status: 'completed'
      });

    res.json({
      message: 'Deposit successful',
      wallet: {
        balanceNgn: updatedWallet.balance_ngn_kobo / 100,
        balanceUsd: updatedWallet.balance_usd_cents / 100,
        availableNgn: updatedWallet.available_ngn_kobo / 100,
        availableUsd: updatedWallet.available_usd_cents / 100
      }
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({
      error: {
        code: 'DEPOSIT_FAILED',
        message: 'Failed to process deposit',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/wallet/withdraw
 * Withdraw funds
 */
app.post('/api/wallet/withdraw', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { amount, currency } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Amount must be greater than 0',
          timestamp: new Date().toISOString()
        }
      });
    }

    const validCurrency = currency || 'NGN';
    if (validCurrency !== 'NGN' && validCurrency !== 'USD') {
      return res.status(400).json({
        error: {
          code: 'INVALID_CURRENCY',
          message: 'Currency must be NGN or USD',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get current wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return res.status(404).json({
        error: {
          code: 'WALLET_NOT_FOUND',
          message: 'Wallet not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Convert amount to smallest unit
    const amountSmallestUnit = Math.round(amount * 100);

    // Check sufficient balance
    const availableField = validCurrency === 'NGN' ? 'available_ngn_kobo' : 'available_usd_cents';
    if (wallet[availableField] < amountSmallestUnit) {
      return res.status(422).json({
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update wallet balance
    const updateField = validCurrency === 'NGN' ? 'balance_ngn_kobo' : 'balance_usd_cents';
    
    const { data: updatedWallet, error: updateError } = await supabase
      .from('wallets')
      .update({
        [updateField]: wallet[updateField] - amountSmallestUnit,
        [availableField]: wallet[availableField] - amountSmallestUnit
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Wallet update error:', updateError);
      return res.status(500).json({
        error: {
          code: 'WITHDRAWAL_FAILED',
          message: 'Failed to process withdrawal',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create transaction record
    await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        type: 'withdrawal',
        amount_smallest_unit: amountSmallestUnit,
        currency: validCurrency,
        direction: 'debit',
        status: 'completed'
      });

    res.json({
      message: 'Withdrawal successful',
      wallet: {
        balanceNgn: updatedWallet.balance_ngn_kobo / 100,
        balanceUsd: updatedWallet.balance_usd_cents / 100,
        availableNgn: updatedWallet.available_ngn_kobo / 100,
        availableUsd: updatedWallet.available_usd_cents / 100
      }
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({
      error: {
        code: 'WITHDRAWAL_FAILED',
        message: 'Failed to process withdrawal',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/wallet/transactions
 * Get transaction history
 */
app.get('/api/wallet/transactions', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get transactions error:', error);
      return res.status(500).json({
        error: {
          code: 'GET_TRANSACTIONS_FAILED',
          message: 'Failed to retrieve transactions',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      transactions: transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount_smallest_unit / 100,
        currency: tx.currency,
        direction: tx.direction,
        status: tx.status,
        createdAt: tx.created_at
      })),
      pagination: {
        limit,
        offset,
        count: transactions.length
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      error: {
        code: 'GET_TRANSACTIONS_FAILED',
        message: 'Failed to retrieve transactions',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/wallet/convert
 * Get currency conversion rate
 */
app.get('/api/wallet/convert', authenticate, async (req: Request, res: Response) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    const amount = parseFloat(req.query.amount as string);

    if (!from || !to) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'from and to currencies are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Simple conversion rate (NGN to USD)
    const NGN_TO_USD_RATE = 0.0013; // 1 NGN = 0.0013 USD (approximate)
    const USD_TO_NGN_RATE = 1 / NGN_TO_USD_RATE;

    let rate = 1;
    let convertedAmount = amount;

    if (from === 'NGN' && to === 'USD') {
      rate = NGN_TO_USD_RATE;
      convertedAmount = amount * NGN_TO_USD_RATE;
    } else if (from === 'USD' && to === 'NGN') {
      rate = USD_TO_NGN_RATE;
      convertedAmount = amount * USD_TO_NGN_RATE;
    }

    res.json({
      from,
      to,
      rate,
      amount,
      convertedAmount
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({
      error: {
        code: 'CONVERSION_FAILED',
        message: 'Failed to convert currency',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * POST /api/admin/add-admin
 * Add admin role to a user (super_admin only)
 */
app.post('/api/admin/add-admin', authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
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
app.post('/api/admin/remove-admin', authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const currentUser = (req as any).user;

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

    // Protect primary super admin
    if (user.email === PRIMARY_SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        error: {
          code: 'PROTECTED_USER',
          message: 'Cannot remove primary super admin',
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
app.get('/api/admin/list-admins', authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
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
app.get('/api/admin/analytics', authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
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
      // Sum all NGN positions
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

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
      timestamp: new Date().toISOString()
    }
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    }
  });
});

// Vercel serverless handler
export default (req: VercelRequest, res: VercelResponse) => {
  app(req as any, res as any);
};
