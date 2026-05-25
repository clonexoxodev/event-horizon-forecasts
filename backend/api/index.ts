import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Initialize Supabase
const supabaseUrl = requireEnv('SUPABASE_URL');
const supabaseKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

// JWT Secret
const JWT_SECRET = requireEnv('JWT_SECRET');
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' as const : 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000
};
const clearAuthCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' as const : 'lax' as const
};
const defaultAllowedOrigins = [
  'https://event-horizon-forecasts.vercel.app',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8082',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];
const configuredAllowedOrigins = `${process.env.FRONTEND_URL || ''},${process.env.FRONTEND_URLS || ''}`;
const allowedOrigins = `${defaultAllowedOrigins.join(',')},${configuredAllowedOrigins}`
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .filter((origin, index, origins) => origins.indexOf(origin) === index);

// Create Express app
const app = express();

// CORS - Allow your frontend
app.use(cors({
  origin: allowedOrigins,
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
    version: '2.3.0-role-in-auth-response',
    bcryptVersion: 'bcryptjs',
    cookieSettings: 'sameSite=none, secure=true',
    env: {
      supabaseConfigured: !!supabaseUrl,
      jwtConfigured: !!JWT_SECRET,
      supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'not set',
      nodeEnv: process.env.NODE_ENV || 'not set'
    }
  });
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
      .select('id, username, email, role')
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
      balance: 0
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

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeUsername = (username: string) => username.trim();

const toAuthUser = (user: any, balance: number = 0) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role || 'user',
  balance
});

const signAuthToken = (user: any) => jwt.sign(
  {
    userId: user.id,
    username: user.username,
    email: user.email
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

const setAuthCookie = (res: Response, token: string) => {
  res.cookie('auth_token', token, authCookieOptions);
};

/**
 * POST /api/auth/signup
 * Register a new user
 */
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    const normalizedUsername = typeof username === 'string' ? normalizeUsername(username) : '';
    const normalizedEmail = typeof email === 'string' ? normalizeEmail(email) : '';

    // Validate input
    if (!normalizedUsername || normalizedUsername.length < 3) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username must be at least 3 characters long',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (normalizedUsername.length > 50 || !/^[a-zA-Z0-9_]+$/.test(normalizedUsername)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username can only contain letters, numbers, and underscores',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
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
    const { data: existingEmail, error: emailCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (emailCheckError) {
      console.error('Email lookup error:', emailCheckError);
      return res.status(500).json({
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Failed to validate account details',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (existingEmail) {
      return res.status(409).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { data: existingUsername, error: usernameCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('username', normalizedUsername)
      .maybeSingle();

    if (usernameCheckError) {
      console.error('Username lookup error:', usernameCheckError);
      return res.status(500).json({
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Failed to validate account details',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (existingUsername) {
      return res.status(409).json({
        error: {
          code: 'USERNAME_EXISTS',
          message: 'This username is already taken',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);
    const role = normalizedEmail === PRIMARY_SUPER_ADMIN_EMAIL ? 'super_admin' : 'user';

    // Create user
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        username: normalizedUsername,
        email: normalizedEmail,
        password_hash,
        role
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
    const token = signAuthToken(newUser);

    // Set cookie
    setAuthCookie(res, token);

    // Return success
    res.status(201).json({
      user: toAuthUser(newUser, 0),
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
    const normalizedEmail = typeof email === 'string' ? normalizeEmail(email) : '';

    // Validate input
    if (!normalizedEmail || !password) {
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
      .eq('email', normalizedEmail)
      .single();

    if (userError) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Verify password
    try {
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (bcryptError: any) {
      console.error('Bcrypt error:', bcryptError);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Password verification failed',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (normalizedEmail === PRIMARY_SUPER_ADMIN_EMAIL && user.role !== 'super_admin') {
      const { data: updatedUser, error: roleError } = await supabase
        .from('users')
        .update({ role: 'super_admin' })
        .eq('id', user.id)
        .select()
        .single();

      if (roleError) {
        console.error('Failed to update primary super admin role:', roleError);
      } else {
        user.role = updatedUser.role;
      }
    }

    // Generate JWT
    const token = signAuthToken(user);

    // Set cookie
    setAuthCookie(res, token);

    // Return success
    res.json({
      user: toAuthUser(user),
      message: 'Login successful'
    });
  } catch (error: any) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during login',
        details: error.message,
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
  res.clearCookie('auth_token', clearAuthCookieOptions);

  res.json({
    message: 'Logout successful'
  });
});

/**
 * GET /api/auth/me
 * Get current user
 */
app.get('/api/auth/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance_ngn_kobo')
      .eq('user_id', user.id)
      .maybeSingle();

    res.json({
      user: toAuthUser(user, wallet?.balance_ngn_kobo ? wallet.balance_ngn_kobo / 100 : 0)
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

const toAmount = (smallestUnit: number | null | undefined) => Number(smallestUnit || 0) / 100;
const VIRTUAL_LIQUIDITY_SMALLEST_UNIT = 5_000_000;
const MIN_ACTIVE_PRICE = 5;
const MAX_ACTIVE_PRICE = 95;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const calculateBoundedPrices = (yesPoolSmallestUnit: number, noPoolSmallestUnit: number) => {
  const adjustedYesPool = yesPoolSmallestUnit + VIRTUAL_LIQUIDITY_SMALLEST_UNIT;
  const adjustedNoPool = noPoolSmallestUnit + VIRTUAL_LIQUIDITY_SMALLEST_UNIT;
  const adjustedTotalPool = adjustedYesPool + adjustedNoPool;
  const yesPrice = clamp(
    Math.round((adjustedYesPool / adjustedTotalPool) * 100),
    MIN_ACTIVE_PRICE,
    MAX_ACTIVE_PRICE
  );

  return {
    yesPrice,
    noPrice: 100 - yesPrice
  };
};

const normalizePredictionSide = (side: unknown): 'YES' | 'NO' | null => {
  const normalizedSide = String(side || '').toUpperCase();
  if (normalizedSide === 'YES' || normalizedSide === 'UP') return 'YES';
  if (normalizedSide === 'NO' || normalizedSide === 'DOWN') return 'NO';
  return null;
};

const calculatePotentialReturn = (amountSmallestUnit: number, sidePrice: number) => {
  if (sidePrice <= 0) return amountSmallestUnit;
  return Math.floor(amountSmallestUnit * (100 / sidePrice));
};

const savePriceHistory = async (
  marketId: string,
  yesPrice: number,
  noPrice: number,
  yesPoolSmallestUnit: number,
  noPoolSmallestUnit: number
) => {
  const { error } = await supabase
    .from('market_price_history')
    .insert({
      market_id: marketId,
      yes_price: yesPrice,
      no_price: noPrice,
      yes_pool_smallest_unit: yesPoolSmallestUnit,
      no_pool_smallest_unit: noPoolSmallestUnit
    });

  if (error) {
    console.warn('Failed to save market price history:', error.message);
  }
};

const normalizeMarket = (market: any, positionCount = 0) => {
  const yesPoolSmallestUnit = Number(market.yes_pool_smallest_unit ?? market.yes_pool ?? 0);
  const noPoolSmallestUnit = Number(market.no_pool_smallest_unit ?? market.no_pool ?? 0);
  const totalPoolSmallestUnit = Number(
    market.pool_amount_smallest_unit ?? market.pool ?? yesPoolSmallestUnit + noPoolSmallestUnit
  );
  const { yesPrice, noPrice } = calculateBoundedPrices(yesPoolSmallestUnit, noPoolSmallestUnit);
  const closeTime = market.closes_at || market.close_time || '';
  const status = market.state || market.status || 'active';

  return {
    id: market.id,
    question: market.question,
    category: market.category || 'General',
    yesPercent: yesPrice,
    pool: toAmount(totalPoolSmallestUnit),
    closesIn: market.closes_in || '',
    description: market.description || '',
    source: market.source || '',
    icon: market.icon || '',
    yesPool: toAmount(yesPoolSmallestUnit),
    noPool: toAmount(noPoolSmallestUnit),
    totalPool: toAmount(totalPoolSmallestUnit),
    participants: Number(market.participant_count ?? market.participants ?? positionCount),
    yesPrice,
    noPrice,
    closeTime,
    status: status === 'open' ? 'active' : status,
    priceHistory: []
  };
};

const normalizePosition = (position: any, market: any) => {
  const normalizedMarket = normalizeMarket(market || {}, 0);
  const stake = toAmount(position.amount_smallest_unit ?? position.stake);
  const currentPrice = position.side === 'YES' ? normalizedMarket.yesPrice : normalizedMarket.noPrice;

  return {
    id: position.id,
    userId: position.user_id,
    marketId: position.market_id,
    side: position.side,
    stake,
    entryPrice: Number(position.entry_price ?? currentPrice),
    currentPrice,
    currentValue: toAmount(position.potential_return_smallest_unit) || stake,
    marketQuestion: normalizedMarket.question || 'Unknown Market',
    marketIcon: normalizedMarket.icon,
    marketStatus: normalizedMarket.status,
    createdAt: position.created_at,
    isListed: false
  };
};

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
    const amountSmallestUnit = Number(
      req.body.amount_smallest_unit || req.body.amountSmallestUnit || Math.round(Number(amount || 0) * 100)
    );

    if (!Number.isFinite(amountSmallestUnit) || amountSmallestUnit <= 0) {
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

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        type: 'deposit',
        amount_smallest_unit: amountSmallestUnit,
        currency: validCurrency,
        direction: 'IN',
        status: 'pending',
        metadata: {
          method: req.body.method || 'bank_transfer',
          paymentStatus: 'manual_pending',
          note: 'Waiting for payment confirmation'
        }
      })
      .select()
      .single();

    if (transactionError || !transaction) {
      console.error('Deposit transaction error:', transactionError);
      return res.status(500).json({
        error: {
          code: 'DEPOSIT_FAILED',
          message: 'Failed to create deposit request',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      message: 'Add money request saved',
      wallet: {
        balanceNgn: wallet.balance_ngn_kobo / 100,
        balanceUsd: wallet.balance_usd_cents / 100,
        availableNgn: wallet.available_ngn_kobo / 100,
        availableUsd: wallet.available_usd_cents / 100
      },
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount_smallest_unit / 100,
        amountSmallestUnit: transaction.amount_smallest_unit,
        currency: transaction.currency,
        direction: transaction.direction,
        status: transaction.status,
        metadata: transaction.metadata,
        createdAt: transaction.created_at
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
    const amountSmallestUnit = Number(
      req.body.amount_smallest_unit || req.body.amountSmallestUnit || Math.round(Number(amount || 0) * 100)
    );

    if (!Number.isFinite(amountSmallestUnit) || amountSmallestUnit <= 0) {
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

    const { data: updatedWallet, error: updateError } = await supabase
      .from('wallets')
      .update({
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

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        type: 'withdrawal',
        amount_smallest_unit: amountSmallestUnit,
        currency: validCurrency,
        direction: 'OUT',
        status: 'pending',
        metadata: {
          destination: req.body.destination || 'bank_account',
          withdrawalStatus: 'pending_review',
          note: 'Money reserved while withdrawal is reviewed'
        }
      })
      .select()
      .single();

    if (transactionError || !transaction) {
      console.error('Withdrawal transaction error:', transactionError);
      return res.status(500).json({
        error: {
          code: 'WITHDRAWAL_FAILED',
          message: 'Failed to create withdrawal request',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      message: 'Withdrawal request saved',
      wallet: {
        balanceNgn: updatedWallet.balance_ngn_kobo / 100,
        balanceUsd: updatedWallet.balance_usd_cents / 100,
        availableNgn: updatedWallet.available_ngn_kobo / 100,
        availableUsd: updatedWallet.available_usd_cents / 100
      },
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount_smallest_unit / 100,
        amountSmallestUnit: transaction.amount_smallest_unit,
        currency: transaction.currency,
        direction: transaction.direction,
        status: transaction.status,
        metadata: transaction.metadata,
        createdAt: transaction.created_at
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
        amountSmallestUnit: tx.amount_smallest_unit,
        currency: tx.currency,
        direction: tx.direction,
        referenceId: tx.reference_id,
        referenceType: tx.reference_type,
        status: tx.status,
        metadata: tx.metadata,
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
// MARKET AND USER ACTIVITY ROUTES
// ============================================================================

app.get('/api/markets', async (_req: Request, res: Response) => {
  try {
    const { data: markets, error } = await supabase
      .from('markets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const activeMarkets = (markets || []).filter((market) => {
      const status = market.state || market.status || 'active';
      return status === 'active' || status === 'open';
    });

    const normalizedMarkets = await Promise.all(activeMarkets.map(async (market) => {
      const { count } = await supabase
        .from('positions')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', market.id);

      return normalizeMarket(market, count || 0);
    }));

    res.json({ markets: normalizedMarkets, count: normalizedMarkets.length });
  } catch (error) {
    console.error('Get markets error:', error);
    res.status(500).json({
      error: {
        code: 'GET_MARKETS_FAILED',
        message: 'Failed to fetch markets',
        timestamp: new Date().toISOString()
      }
    });
  }
});

app.get('/api/markets/:id', async (req: Request, res: Response) => {
  try {
    const { data: market, error } = await supabase
      .from('markets')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !market) {
      return res.status(404).json({
        error: {
          code: 'MARKET_NOT_FOUND',
          message: 'Market not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { count } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true })
      .eq('market_id', market.id);

    res.json({ market: normalizeMarket(market, count || 0) });
  } catch (error) {
    console.error('Get market error:', error);
    res.status(500).json({
      error: {
        code: 'GET_MARKET_FAILED',
        message: 'Failed to fetch market',
        timestamp: new Date().toISOString()
      }
    });
  }
});

app.post('/api/markets/:id/predictions', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const side = normalizePredictionSide(req.body.side);
    const currency = req.body.currency || 'NGN';
    const amountSmallestUnit = Number(
      req.body.amount_smallest_unit || req.body.amountSmallestUnit || Math.round(Number(req.body.amount || 0) * 100)
    );

    if (!side) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SIDE',
          message: 'Prediction side must be YES, NO, UP, or DOWN',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!Number.isFinite(amountSmallestUnit) || amountSmallestUnit <= 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Prediction amount must be greater than zero',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (marketError || !market) {
      return res.status(404).json({
        error: {
          code: 'MARKET_NOT_FOUND',
          message: 'Market not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const marketStatus = market.state || market.status || 'active';
    const closesAt = market.closes_at || market.close_time;
    const isClosedByTime = closesAt ? new Date(closesAt).getTime() <= Date.now() : false;
    if (!['active', 'open'].includes(marketStatus) || isClosedByTime) {
      return res.status(422).json({
        error: {
          code: 'MARKET_NOT_ACTIVE',
          message: 'This market is not accepting predictions',
          timestamp: new Date().toISOString()
        }
      });
    }

    const minPosition = Number(market.min_position_smallest_unit || 0);
    const maxPosition = Number(market.max_position_smallest_unit || 0);
    if (minPosition > 0 && amountSmallestUnit < minPosition) {
      return res.status(400).json({
        error: {
          code: 'INVALID_AMOUNT',
          message: `Minimum prediction amount is ${toAmount(minPosition).toLocaleString()} ${currency}`,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (maxPosition > 0 && amountSmallestUnit > maxPosition) {
      return res.status(400).json({
        error: {
          code: 'INVALID_AMOUNT',
          message: `Maximum prediction amount is ${toAmount(maxPosition).toLocaleString()} ${currency}`,
          timestamp: new Date().toISOString()
        }
      });
    }

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

    const balanceField = currency === 'USD' ? 'available_usd_cents' : 'available_ngn_kobo';
    if (Number(wallet[balanceField] || 0) < amountSmallestUnit) {
      return res.status(422).json({
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient available balance',
          timestamp: new Date().toISOString()
        }
      });
    }

    const yesPool = Number(market.yes_pool_smallest_unit ?? market.yes_pool ?? 0);
    const noPool = Number(market.no_pool_smallest_unit ?? market.no_pool ?? 0);
    const currentTotal = Number(market.pool_amount_smallest_unit ?? market.pool ?? yesPool + noPool);
    const nextYesPool = side === 'YES' ? yesPool + amountSmallestUnit : yesPool;
    const nextNoPool = side === 'NO' ? noPool + amountSmallestUnit : noPool;
    const nextTotal = currentTotal + amountSmallestUnit;
    const pricesBefore = calculateBoundedPrices(yesPool, noPool);
    const pricesAfter = calculateBoundedPrices(nextYesPool, nextNoPool);
    const entryPrice = side === 'YES' ? pricesAfter.yesPrice : pricesAfter.noPrice;
    const potentialReturn = calculatePotentialReturn(amountSmallestUnit, entryPrice);
    const priceChange = side === 'YES'
      ? pricesAfter.yesPrice - pricesBefore.yesPrice
      : pricesAfter.noPrice - pricesBefore.noPrice;

    let positionResult = await supabase
      .from('positions')
      .insert({
        user_id: user.id,
        market_id: req.params.id,
        side,
        amount_smallest_unit: amountSmallestUnit,
        currency,
        potential_return_smallest_unit: potentialReturn,
        entry_price: entryPrice
      })
      .select()
      .single();

    if (positionResult.error?.message?.includes('entry_price')) {
      positionResult = await supabase
        .from('positions')
        .insert({
          user_id: user.id,
          market_id: req.params.id,
          side,
          amount_smallest_unit: amountSmallestUnit,
          currency,
          potential_return_smallest_unit: potentialReturn
        })
        .select()
        .single();
    }

    if (positionResult.error || !positionResult.data) throw positionResult.error;
    const position = { ...positionResult.data, entry_price: entryPrice };

    const { data: updatedWallet, error: walletUpdateError } = await supabase
      .from('wallets')
      .update({
        [balanceField]: Number(wallet[balanceField] || 0) - amountSmallestUnit,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id)
      .select()
      .single();

    if (walletUpdateError || !updatedWallet) throw walletUpdateError;

    const { data: updatedMarket, error: marketUpdateError } = await supabase
      .from('markets')
      .update({
        yes_pool_smallest_unit: nextYesPool,
        no_pool_smallest_unit: nextNoPool,
        pool_amount_smallest_unit: nextTotal
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (marketUpdateError || !updatedMarket) throw marketUpdateError;

    await savePriceHistory(req.params.id, pricesAfter.yesPrice, pricesAfter.noPrice, nextYesPool, nextNoPool);

    const { data: transaction } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        type: 'position_entry',
        amount_smallest_unit: amountSmallestUnit,
        currency,
        direction: 'OUT',
        reference_id: position.id,
        reference_type: 'position',
        status: 'completed',
        metadata: {
          marketId: req.params.id,
          side,
          entryPrice,
          potentialReturnSmallestUnit: potentialReturn,
          yesPriceBefore: pricesBefore.yesPrice,
          noPriceBefore: pricesBefore.noPrice,
          yesPriceAfter: pricesAfter.yesPrice,
          noPriceAfter: pricesAfter.noPrice,
          priceChange
        }
      })
      .select()
      .single();

    const activity = transaction ? [{
      id: transaction.id,
      type: transaction.type,
      label: String(transaction.type).replace(/_/g, ' '),
      amount: toAmount(transaction.amount_smallest_unit),
      currency: transaction.currency,
      direction: transaction.direction,
      status: transaction.status,
      createdAt: transaction.created_at
    }] : [];

    res.status(201).json({
      position: normalizePosition(position, updatedMarket),
      market: {
        ...normalizeMarket(updatedMarket),
        priceHistory: [{
          timestamp: new Date().toISOString(),
          yesPrice: pricesAfter.yesPrice,
          noPrice: pricesAfter.noPrice
        }]
      },
      wallet: {
        id: updatedWallet.id,
        userId: updatedWallet.user_id,
        balanceNgn: toAmount(updatedWallet.balance_ngn_kobo),
        balanceUsd: toAmount(updatedWallet.balance_usd_cents),
        availableNgn: toAmount(updatedWallet.available_ngn_kobo),
        availableUsd: toAmount(updatedWallet.available_usd_cents),
        balanceNgnKobo: updatedWallet.balance_ngn_kobo,
        balanceUsdCents: updatedWallet.balance_usd_cents,
        availableNgnKobo: updatedWallet.available_ngn_kobo,
        availableUsdCents: updatedWallet.available_usd_cents
      },
      transaction: transaction ? {
        id: transaction.id,
        type: transaction.type,
        amount: toAmount(transaction.amount_smallest_unit),
        amountSmallestUnit: transaction.amount_smallest_unit,
        currency: transaction.currency,
        direction: transaction.direction,
        referenceId: transaction.reference_id,
        referenceType: transaction.reference_type,
        status: transaction.status,
        metadata: transaction.metadata,
        createdAt: transaction.created_at
      } : null,
      activity
    });
  } catch (error) {
    console.error('Place prediction error:', error);
    res.status(500).json({
      error: {
        code: 'PLACE_PREDICTION_FAILED',
        message: 'Failed to place prediction',
        timestamp: new Date().toISOString()
      }
    });
  }
});

app.get('/api/positions', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabase
      .from('positions')
      .select('*, markets (*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const positions = (data || []).map(normalizePosition);
    res.json({ positions, count: positions.length });
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({
      error: {
        code: 'GET_POSITIONS_FAILED',
        message: 'Failed to fetch positions',
        timestamp: new Date().toISOString()
      }
    });
  }
});

app.get('/api/activity', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({
      activity: (data || []).map((tx) => ({
        id: tx.id,
        type: tx.type,
        label: String(tx.type).replace(/_/g, ' '),
        amount: toAmount(tx.amount_smallest_unit),
        currency: tx.currency,
        direction: tx.direction,
        status: tx.status,
        createdAt: tx.created_at
      }))
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      error: {
        code: 'GET_ACTIVITY_FAILED',
        message: 'Failed to fetch activity',
        timestamp: new Date().toISOString()
      }
    });
  }
});

app.get('/api/profile/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { data: positions, error } = await supabase
      .from('positions')
      .select('amount_smallest_unit, payout_smallest_unit, is_winner, resolved_at')
      .eq('user_id', user.id);

    if (error) throw error;

    const totalPredictions = positions?.length || 0;
    const wonPredictions = (positions || []).filter((position) => position.is_winner).length;
    const activePredictions = (positions || []).filter((position) => !position.resolved_at).length;
    const totalStaked = toAmount((positions || []).reduce((total, position) => (
      total + Number(position.amount_smallest_unit || 0)
    ), 0));
    const totalEarnings = toAmount((positions || []).reduce((total, position) => (
      total + Number(position.payout_smallest_unit || 0)
    ), 0));

    res.json({
      stats: {
        totalPredictions,
        activePredictions,
        wonPredictions,
        winRate: totalPredictions > 0 ? Math.round((wonPredictions / totalPredictions) * 100) : 0,
        totalStaked,
        totalEarnings
      }
    });
  } catch (error) {
    console.error('Get profile stats error:', error);
    res.status(500).json({
      error: {
        code: 'GET_PROFILE_STATS_FAILED',
        message: 'Failed to fetch profile stats',
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
