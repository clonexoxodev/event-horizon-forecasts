import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
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

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error('Only JPEG, PNG, GIF, WebP, MP4, WebM, and MOV files are allowed.'));
  },
  limits: {
    fileSize: 30 * 1024 * 1024
  }
});

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
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const token = req.cookies.auth_token || bearerToken;

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
      .select('id, username, email, role, avatar_url, profile_image_url')
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
  balance,
  avatarUrl: user.avatar_url || user.profile_image_url || null
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

const SUPER_ADMIN_TEST_CREDIT_KOBO = 1_000_000;
const SUPER_ADMIN_TEST_CREDIT_KEY = 'super_admin_seed_10000_v1';

const ensureSuperAdminTestCredit = async (user: any) => {
  if (process.env.ENABLE_SUPER_ADMIN_TEST_CREDIT === 'false') return 0;
  if (normalizeEmail(user.email || '') !== PRIMARY_SUPER_ADMIN_EMAIL) return 0;

  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (walletError || !wallet) return 0;

  const balance = Number(wallet.balance_ngn_kobo || 0);
  const available = Number(wallet.available_ngn_kobo || 0);
  if (balance > 0 || available > 0) return available / 100;

  const { data: existingCredit } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', 'deposit')
    .eq('metadata->>testCredit', SUPER_ADMIN_TEST_CREDIT_KEY)
    .maybeSingle();

  if (existingCredit) return 0;

  const { data: updatedWallet, error: updateError } = await supabase
    .from('wallets')
    .update({
      balance_ngn_kobo: SUPER_ADMIN_TEST_CREDIT_KOBO,
      available_ngn_kobo: SUPER_ADMIN_TEST_CREDIT_KOBO,
      updated_at: new Date().toISOString()
    })
    .eq('id', wallet.id)
    .select('*')
    .single();

  if (updateError || !updatedWallet) {
    console.warn('Failed to apply super admin test credit:', updateError?.message);
    return 0;
  }

  await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      wallet_id: wallet.id,
      type: 'deposit',
      amount_smallest_unit: SUPER_ADMIN_TEST_CREDIT_KOBO,
      currency: 'NGN',
      direction: 'IN',
      status: 'completed',
      metadata: {
        testCredit: SUPER_ADMIN_TEST_CREDIT_KEY,
        note: 'Development/test setup credit for primary super admin wallet only.'
      }
    });

  return Number(updatedWallet.available_ngn_kobo || 0) / 100;
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

    const initialBalance = await ensureSuperAdminTestCredit(newUser);

    // Return success
    res.status(201).json({
      user: toAuthUser(newUser, initialBalance),
      token,
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

    const balance = await ensureSuperAdminTestCredit(user);

    // Return success
    res.json({
      user: toAuthUser(user, balance),
      token,
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

    const testCreditBalance = await ensureSuperAdminTestCredit(user);
    const balance = testCreditBalance || (wallet?.balance_ngn_kobo ? wallet.balance_ngn_kobo / 100 : 0);

    res.json({
      user: toAuthUser(user, balance)
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

app.post('/api/profile/avatar', authenticate, (req: Request, res: Response, next: NextFunction) => {
  upload.single('media')(req, res, (uploadError: any) => {
    if (uploadError) {
      return res.status(400).json({
        error: {
          code: 'UPLOAD_FAILED',
          message: uploadError.message || 'Could not upload profile picture',
          timestamp: new Date().toISOString()
        }
      });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!req.file || !req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        error: {
          code: 'IMAGE_REQUIRED',
          message: 'Choose a profile image.',
          timestamp: new Date().toISOString()
        }
      });
    }

    const extension = req.file.originalname.split('.').pop() || 'jpg';
    const safeName = `${user.id}/avatar-${Date.now()}.${extension}`;

    const { error: bucketError } = await supabase.storage.createBucket('profile-images', { public: true });
    if (bucketError && !/exist|already/i.test(bucketError.message)) {
      console.warn('Could not verify profile-images bucket:', bucketError.message);
    }

    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(safeName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage.from('profile-images').getPublicUrl(safeName);
    const avatarUrl = publicUrlData.publicUrl;

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl, profile_image_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      avatarUrl,
      user: toAuthUser(updatedUser, 0)
    });
  } catch (error: any) {
    console.error('Profile avatar upload error:', error);
    res.status(500).json({
      error: {
        code: 'PROFILE_AVATAR_FAILED',
        message: 'Could not save profile picture. Check the profile-images Supabase Storage bucket and avatar_url column.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

app.get('/api/notifications', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    res.json({ success: true, notifications: data || [] });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      error: {
        code: 'GET_NOTIFICATIONS_FAILED',
        message: 'Failed to load notifications.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

app.patch('/api/notifications/mark-all-read', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { error, count } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    res.json({ success: true, updated_count: count || 0 });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({
      error: {
        code: 'MARK_NOTIFICATIONS_READ_FAILED',
        message: 'Failed to update notifications.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

const toAmount = (smallestUnit: number | null | undefined) => Number(smallestUnit || 0) / 100;
const MIN_WITHDRAWAL_KOBO = 500 * 100;
const FAST_REVIEW_THRESHOLD_KOBO = 10000 * 100;
const MAX_DAILY_WITHDRAWAL_KOBO = 250000 * 100;
const makeWalletReference = (prefix: 'DEP' | 'WDR') => `FLP-${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90000 + 10000)}`;
const depositInstruction = (amountSmallestUnit: number, reference: string) =>
  `Transfer exactly ₦${toAmount(amountSmallestUnit).toLocaleString()} and use ${reference} as your payment reference. Your wallet will be credited after admin confirmation.`;
const serializeWalletV1 = (wallet: any) => ({
  id: wallet.id,
  userId: wallet.user_id,
  balanceNgn: toAmount(wallet.balance_ngn_kobo),
  balanceUsd: toAmount(wallet.balance_usd_cents),
  availableNgn: toAmount(wallet.available_ngn_kobo),
  availableUsd: toAmount(wallet.available_usd_cents),
  lockedNgn: toAmount(wallet.locked_ngn_kobo || 0),
  totalDepositedNgn: toAmount(wallet.total_deposited_ngn_kobo || 0),
  totalWithdrawnNgn: toAmount(wallet.total_withdrawn_ngn_kobo || 0),
  totalWinningsNgn: toAmount(wallet.total_winnings_ngn_kobo || 0),
  totalStakedNgn: toAmount(wallet.total_staked_ngn_kobo || 0),
  currency: wallet.currency || 'NGN',
  createdAt: wallet.created_at,
  updatedAt: wallet.updated_at,
});
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
type MarketStatus = 'draft' | 'active' | 'closed' | 'pending_resolution' | 'resolved' | 'cancelled' | 'archived';
type PredictionSide = 'YES' | 'NO';

const MIN_MARKET_PRICE = 1;
const MAX_MARKET_PRICE = 99;

const roundPrice = (value: number) => Math.round(value * 10) / 10;
const clampPrice = (value: number) => Math.min(MAX_MARKET_PRICE, Math.max(MIN_MARKET_PRICE, roundPrice(value)));

const stripNotificationMetadata = (payload: Record<string, any> | Record<string, any>[]) => {
  if (Array.isArray(payload)) {
    return payload.map(({ metadata: _metadata, ...item }) => item);
  }
  const { metadata: _metadata, ...fallbackPayload } = payload;
  return fallbackPayload;
};

const insertNotificationSafely = async (payload: Record<string, any> | Record<string, any>[], label = 'Notification') => {
  const { error } = await supabase.from('notifications').insert(payload);
  if (!error) return;

  if (/metadata/i.test(error.message || '')) {
    const retry = await supabase.from('notifications').insert(stripNotificationMetadata(payload));
    if (!retry.error) return;
    console.warn(`${label} not saved:`, retry.error.message);
    return;
  }

  console.warn(`${label} not saved:`, error.message);
};

const getStartingPrices = (market: any) => {
  const yesPrice = clampPrice(Number(market.starting_yes_price ?? market.yes_price ?? 50));
  return { yesPrice, noPrice: roundPrice(100 - yesPrice) };
};

const getOwnershipState = (market: any) => {
  const starting = getStartingPrices(market);
  const yesVolume = Number(market.yes_volume_smallest_unit ?? market.yes_pool_smallest_unit ?? 0);
  const noVolume = Number(market.no_volume_smallest_unit ?? market.no_pool_smallest_unit ?? 0);
  const totalVolume = yesVolume + noVolume;
  const yesShares = Number(market.total_yes_shares ?? 0);
  const noShares = Number(market.total_no_shares ?? 0);

  if (totalVolume <= 0) {
    return { yesPrice: starting.yesPrice, noPrice: starting.noPrice, yesVolume, noVolume, totalVolume, yesShares, noShares };
  }

  const activityTargetYes = (yesVolume / totalVolume) * 100;
  const activityWeight = Math.min(0.95, totalVolume / (totalVolume + 500000));
  const yesPrice = clampPrice((starting.yesPrice * (1 - activityWeight)) + (activityTargetYes * activityWeight));
  return { yesPrice, noPrice: roundPrice(100 - yesPrice), yesVolume, noVolume, totalVolume, yesShares, noShares };
};

const calculateOwnershipTrade = (market: any, side: PredictionSide, amountSmallestUnit: number) => {
  const before = getOwnershipState(market);
  const entryPrice = side === 'YES' ? before.yesPrice : before.noPrice;
  const sharesOwned = entryPrice > 0 ? toAmount(amountSmallestUnit) / entryPrice : 0;
  const nextYesVolume = side === 'YES' ? before.yesVolume + amountSmallestUnit : before.yesVolume;
  const nextNoVolume = side === 'NO' ? before.noVolume + amountSmallestUnit : before.noVolume;
  const nextYesShares = side === 'YES' ? before.yesShares + sharesOwned : before.yesShares;
  const nextNoShares = side === 'NO' ? before.noShares + sharesOwned : before.noShares;
  const after = getOwnershipState({
    ...market,
    yes_volume_smallest_unit: nextYesVolume,
    no_volume_smallest_unit: nextNoVolume,
    yes_pool_smallest_unit: nextYesVolume,
    no_pool_smallest_unit: nextNoVolume,
    total_yes_shares: nextYesShares,
    total_no_shares: nextNoShares
  });
  const currentPrice = side === 'YES' ? after.yesPrice : after.noPrice;
  const positionValueSmallestUnit = Math.round(sharesOwned * currentPrice * 100);
  const sideSharesAfter = side === 'YES' ? nextYesShares : nextNoShares;
  return {
    before,
    after,
    entryPrice,
    currentPrice,
    sharesOwned,
    positionValueSmallestUnit,
    ownershipPercent: sideSharesAfter > 0 ? (sharesOwned / sideSharesAfter) * 100 : 0,
    nextYesVolume,
    nextNoVolume,
    nextYesShares,
    nextNoShares,
    nextTotalVolume: nextYesVolume + nextNoVolume,
    priceChange: currentPrice - entryPrice
  };
};

const normalizePredictionSide = (side: unknown): PredictionSide | null => {
  const normalizedSide = String(side || '').toUpperCase();
  if (normalizedSide === 'YES' || normalizedSide === 'UP') return 'YES';
  if (normalizedSide === 'NO' || normalizedSide === 'DOWN') return 'NO';
  return null;
};

const normalizeMarketStatus = (market: any): MarketStatus => {
  const rawStatus = String(market.status || market.state || 'active');
  if (rawStatus === 'open') return 'active';
  if (rawStatus === 'paused') return 'closed';
  if (['draft', 'active', 'closed', 'pending_resolution', 'resolved', 'cancelled', 'archived'].includes(rawStatus)) {
    return rawStatus as MarketStatus;
  }
  return 'active';
};

const getCloseTime = (market: any) => market.closes_at || market.close_date || market.close_time || '';

const isMarketPastClose = (market: any) => {
  const closeTime = getCloseTime(market);
  return closeTime ? new Date(closeTime).getTime() <= Date.now() : false;
};

const displayStatusForMarket = (market: any): MarketStatus => {
  const status = normalizeMarketStatus(market);
  if (status === 'active' && isMarketPastClose(market)) return 'pending_resolution';
  return status;
};

const legacyStateFor = (status: string) => {
  if (status === 'active') return 'active';
  if (status === 'resolved') return 'resolved';
  if (status === 'archived') return 'archived';
  return 'closed';
};

const autoCloseExpiredMarket = async (market: any) => {
  const status = normalizeMarketStatus(market);
  if (status !== 'active' || !isMarketPastClose(market)) return market;

  const { data, error } = await supabase
    .from('markets')
    .update({
      status: 'pending_resolution',
      state: 'closed',
      updated_at: new Date().toISOString()
    })
    .eq('id', market.id)
    .in('status', ['active', 'open'])
    .select()
    .maybeSingle();

  if (error) {
    console.warn('Failed to auto-close expired market:', error.message);
    return { ...market, status: 'pending_resolution', state: 'closed' };
  }

  return data || { ...market, status: 'pending_resolution', state: 'closed' };
};

const savePriceHistory = async (
  marketId: string,
  yesPrice: number,
  noPrice: number,
  yesPoolSmallestUnit: number,
  noPoolSmallestUnit: number,
  volumeSmallestUnit: number,
  tradeCount = 0,
  side?: 'YES' | 'NO',
  amountSmallestUnit?: number
) => {
  const payload = {
    market_id: marketId,
    yes_price: Math.round(yesPrice),
    no_price: Math.round(noPrice),
    yes_pool_smallest_unit: yesPoolSmallestUnit,
    no_pool_smallest_unit: noPoolSmallestUnit,
    volume_smallest_unit: volumeSmallestUnit,
    trade_count: tradeCount,
    ...(side ? { side, amount_smallest_unit: amountSmallestUnit || 0 } : {})
  };

  let { error } = await supabase.from('market_price_history').insert(payload);

  if (error && side && /amount_smallest_unit|side/i.test(error.message || '')) {
    const { error: retryError } = await supabase
      .from('market_price_history')
      .insert({
        market_id: payload.market_id,
        yes_price: payload.yes_price,
        no_price: payload.no_price,
        yes_pool_smallest_unit: payload.yes_pool_smallest_unit,
        no_pool_smallest_unit: payload.no_pool_smallest_unit,
        volume_smallest_unit: payload.volume_smallest_unit,
        trade_count: payload.trade_count
      });
    error = retryError;
  }

  if (error) {
    console.warn('Failed to save market price history:', error.message);
  }
};

const fetchStoredPriceHistory = async (marketId: string) => {
  const baseSelect = 'created_at, yes_price, no_price, yes_pool_smallest_unit, no_pool_smallest_unit, volume_smallest_unit, trade_count';
  const withTradeMetaSelect = `${baseSelect}, side, amount_smallest_unit`;

  let { data, error }: { data: any[] | null; error: any } = await supabase
    .from('market_price_history')
    .select(withTradeMetaSelect)
    .eq('market_id', marketId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error && /side|amount_smallest_unit/i.test(error.message || '')) {
    const retry = await supabase
      .from('market_price_history')
      .select(baseSelect)
      .eq('market_id', marketId)
      .order('created_at', { ascending: true })
      .limit(200);
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.warn('Failed to fetch market price history:', error.message);
    return [];
  }

  return (data || []).map((point) => ({
    timestamp: point.created_at,
    yesPrice: Number(point.yes_price || 0),
    noPrice: Number(point.no_price || 0),
    yesPool: toAmount(point.yes_pool_smallest_unit),
    noPool: toAmount(point.no_pool_smallest_unit),
    volume: toAmount(point.volume_smallest_unit),
    tradeCount: Number(point.trade_count || 0),
    side: normalizePredictionSide(point.side),
    amount: toAmount(point.amount_smallest_unit)
  }));
};

const buildTradeDerivedPriceHistory = async (market: any) => {
  const marketId = market.id || market;
  const { data, error } = await supabase
    .from('market_trades')
    .select('created_at, side, amount_smallest_unit, price_before, price_after, yes_price_after, no_price_after')
    .eq('market_id', marketId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    console.warn('Failed to fetch market trades for price history:', error.message);
    return [];
  }

  const trades = data || [];
  if (!trades.length) return [];

  const firstTrade = trades[0] as any;
  const firstSide = normalizePredictionSide(firstTrade.side) || 'YES';
  const sidePriceBefore = Number(firstTrade.price_before || 50);
  const startingYesPrice = firstSide === 'YES' ? sidePriceBefore : 100 - sidePriceBefore;
  const startingNoPrice = 100 - startingYesPrice;
  const firstTimestamp = new Date(firstTrade.created_at).getTime();
  const startTimestamp = Number.isFinite(firstTimestamp)
    ? new Date(firstTimestamp - 1000).toISOString()
    : (market.created_at || new Date().toISOString());

  let cumulativeVolume = 0;
  const points: any[] = [{
    timestamp: startTimestamp,
    yesPrice: Math.round(startingYesPrice),
    noPrice: Math.round(startingNoPrice),
    yesPool: toAmount(market.yes_pool_smallest_unit),
    noPool: toAmount(market.no_pool_smallest_unit),
    volume: 0,
    tradeCount: 0,
    side: null,
    amount: 0
  }];

  trades.forEach((trade: any, index: number) => {
    const side = normalizePredictionSide(trade.side);
    const amountSmallestUnit = Number(trade.amount_smallest_unit || 0);
    cumulativeVolume += amountSmallestUnit;
    const yesPrice = Number(trade.yes_price_after ?? (side === 'YES' ? trade.price_after : 100 - Number(trade.price_after || 50)));
    const noPrice = Number(trade.no_price_after ?? 100 - yesPrice);

    points.push({
      timestamp: trade.created_at,
      yesPrice: Math.round(yesPrice),
      noPrice: Math.round(noPrice),
      volume: toAmount(cumulativeVolume),
      tradeCount: index + 1,
      side,
      amount: toAmount(amountSmallestUnit)
    });
  });

  return points;
};

const fetchPriceHistory = async (marketOrId: any) => {
  const marketId = typeof marketOrId === 'string' ? marketOrId : marketOrId.id;
  const [storedHistory, tradeDerivedHistory] = await Promise.all([
    fetchStoredPriceHistory(marketId),
    typeof marketOrId === 'string' ? Promise.resolve([]) : buildTradeDerivedPriceHistory(marketOrId)
  ]);

  return tradeDerivedHistory.length > storedHistory.length ? tradeDerivedHistory : storedHistory;
};

const ensureInitialPriceHistory = async (market: any) => {
  const existingHistory = await fetchPriceHistory(market);
  if (existingHistory.length > 0) return existingHistory;

  const state = getOwnershipState(market);

  await savePriceHistory(
    market.id,
    state.yesPrice,
    state.noPrice,
    state.yesVolume,
    state.noVolume,
    Number(market.total_volume_smallest_unit || 0),
    Number(market.trade_count || 0)
  );

  return fetchPriceHistory(market);
};

const normalizeMarket = (market: any, positionCount = 0, priceHistory: any[] = []) => {
  const state = getOwnershipState(market);
  const totalPoolSmallestUnit = Number(
    market.total_volume_smallest_unit ?? market.pool_amount_smallest_unit ?? market.pool ?? state.totalVolume
  ) || state.totalVolume;
  const closeTime = getCloseTime(market);
  const status = displayStatusForMarket(market);
  const starting = getStartingPrices(market);

  return {
    id: market.id,
    question: market.question,
    category: market.category || 'General',
    yesPercent: state.yesPrice,
    pool: toAmount(totalPoolSmallestUnit),
    closesIn: market.closes_in || '',
    description: market.description || '',
    source: market.source || '',
    icon: market.icon || '',
    yesPool: toAmount(state.yesVolume),
    noPool: toAmount(state.noVolume),
    yesVolume: toAmount(state.yesVolume),
    noVolume: toAmount(state.noVolume),
    totalYesShares: state.yesShares,
    totalNoShares: state.noShares,
    seedLiquidityYes: 0,
    seedLiquidityNo: 0,
    totalPool: toAmount(totalPoolSmallestUnit),
    totalVolume: toAmount(market.total_volume_smallest_unit ?? 0),
    participants: Number(market.participant_count ?? market.participants ?? positionCount),
    tradeCount: Number(market.trade_count ?? market.trades ?? 0),
    yesPrice: state.yesPrice,
    noPrice: state.noPrice,
    startingYesPrice: starting.yesPrice,
    startingNoPrice: starting.noPrice,
    closeTime,
    status,
    marketType: market.market_type || 'binary',
    rules: market.rules || market.resolution_instructions || market.description || '',
    minAmount: toAmount(market.min_position_smallest_unit || 0),
    maxAmount: toAmount(market.max_position_smallest_unit || 0),
    winningOutcome: market.winning_outcome || market.outcome || null,
    resolvedAt: market.resolved_at || null,
    imageUrl: market.image_url || null,
    videoUrl: market.video_url || null,
    image_url: market.image_url || null,
    video_url: market.video_url || null,
    isTrending: Boolean(market.is_trending),
    is_trending: Boolean(market.is_trending),
    priceHistory
  };
};

const normalizePosition = (position: any, market: any) => {
  const normalizedMarket = normalizeMarket(market || {}, 0);
  const stake = toAmount(position.amount_smallest_unit ?? position.stake);
  const currentPrice = position.side === 'YES' ? normalizedMarket.yesPrice : normalizedMarket.noPrice;
  const sharesReceived = Number(position.shares_owned || position.shares_received || 0);
  const finalPayout = toAmount(position.settlement_payout_smallest_unit ?? position.final_payout_smallest_unit ?? position.payout_smallest_unit);
  const entryPrice = Number(position.entry_price ?? position.price_at_purchase ?? currentPrice);
  const sideShares = position.side === 'YES'
    ? Number((market || {}).total_yes_shares || 0)
    : Number((market || {}).total_no_shares || 0);
  const oppositeStakeSmallestUnit = position.side === 'YES'
    ? Number((market || {}).no_volume_smallest_unit ?? (market || {}).no_pool_smallest_unit ?? 0)
    : Number((market || {}).yes_volume_smallest_unit ?? (market || {}).yes_pool_smallest_unit ?? 0);
  // Pool-safe projection: active positions do not have withdrawable paper profit.
  // Projected payout estimates the payout if this market resolved right now,
  // using the same losing-pool split used by settlement.
  const sideSharePercent = sideShares > 0 ? (sharesReceived / sideShares) * 100 : 0;
  const projectedProfitSmallestUnit = sideShares > 0 && oppositeStakeSmallestUnit > 0
    ? Math.max(0, Math.round((sharesReceived / sideShares) * oppositeStakeSmallestUnit))
    : 0;
  const projectedPayoutSmallestUnit = Number(position.resolved_at || position.settled_at)
    ? Math.round(finalPayout * 100)
    : Math.round(stake * 100) + projectedProfitSmallestUnit;
  const projectedPayout = toAmount(projectedPayoutSmallestUnit);
  const projectedProfit = toAmount(projectedPayoutSmallestUnit - Math.round(stake * 100));
  const sentimentMarkValue = sharesReceived > 0 ? sharesReceived * currentPrice : stake;
  const currentValue = finalPayout || projectedPayout || stake;

  return {
    id: position.id,
    userId: position.user_id,
    marketId: position.market_id,
    side: position.side,
    stake,
    entryPrice,
    currentPrice,
    sharesReceived,
    sharesOwned: sharesReceived,
    ownershipPercent: sideSharePercent,
    sideSharePercent,
    currentValue,
    positionValue: currentValue,
    projectedPayout,
    projectedProfit,
    sentimentMarkValue,
    unrealizedPnl: projectedProfit,
    estimatedPayout: toAmount(position.estimated_payout_smallest_unit ?? position.potential_return_smallest_unit),
    estimatedProfit: toAmount(position.estimated_profit_smallest_unit),
    finalPayout,
    status: position.status || (position.resolved_at ? (position.is_winner ? 'won' : 'lost') : 'active'),
    marketQuestion: position.market_question_snapshot || normalizedMarket.question || 'Market unavailable',
    marketIcon: normalizedMarket.icon,
    category: position.market_category_snapshot || normalizedMarket.category || 'General',
    marketStatus: normalizedMarket.status,
    isWinner: position.is_winner,
    payout: toAmount(position.payout_smallest_unit),
    resolvedAt: position.resolved_at || null,
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

    res.json({ wallet: serializeWalletV1(wallet) });
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

app.post('/api/wallet/deposit-request', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const amountSmallestUnit = Number(req.body.amount_smallest_unit || req.body.amountSmallestUnit || Math.round(Number(req.body.amount || 0) * 100));
    if (!Number.isFinite(amountSmallestUnit) || amountSmallestUnit <= 0) {
      return res.status(400).json({ error: { code: 'INVALID_AMOUNT', message: 'Amount must be greater than 0.', timestamp: new Date().toISOString() } });
    }
    const { data: wallet, error: walletError } = await supabase.from('wallets').select('*').eq('user_id', user.id).single();
    if (walletError || !wallet) return res.status(404).json({ error: { code: 'WALLET_NOT_FOUND', message: 'Wallet not found', timestamp: new Date().toISOString() } });
    const reference = makeWalletReference('DEP');
    const instruction = depositInstruction(amountSmallestUnit, reference);
    const { data: transaction, error: txError } = await supabase.from('transactions').insert({
      user_id: user.id,
      wallet_id: wallet.id,
      type: 'deposit_request',
      amount_smallest_unit: amountSmallestUnit,
      currency: 'NGN',
      direction: 'IN',
      status: 'pending',
      reference,
      reference_type: 'deposit',
      description: `Deposit request ${reference}`,
      metadata: { provider: 'manual', reference, paymentInstruction: instruction }
    }).select().single();
    if (txError || !transaction) throw txError || new Error('Could not create deposit transaction');
    const { data: depositRequest, error: requestError } = await supabase.from('deposit_requests').insert({
      user_id: user.id,
      wallet_id: wallet.id,
      transaction_id: transaction.id,
      amount_smallest_unit: amountSmallestUnit,
      currency: 'NGN',
      reference,
      provider: 'manual',
      payment_instruction: instruction,
      status: 'pending',
      metadata: { method: req.body.method || 'bank_transfer' }
    }).select().single();
    if (requestError || !depositRequest) throw requestError || new Error('Could not create deposit request');
    await insertNotificationSafely({ user_id: user.id, type: 'deposit_request_created', title: 'Deposit request created', message: `Transfer ₦${toAmount(amountSmallestUnit).toLocaleString()} with reference ${reference}.`, reference_id: depositRequest.id, reference_type: 'deposit_request', metadata: { reference, amount: toAmount(amountSmallestUnit) } }, 'Deposit request notification');
    res.status(201).json({
      message: 'Deposit request created',
      wallet: serializeWalletV1(wallet),
      depositRequest: {
        id: depositRequest.id,
        amount: toAmount(depositRequest.amount_smallest_unit),
        amountSmallestUnit: depositRequest.amount_smallest_unit,
        currency: depositRequest.currency,
        reference: depositRequest.reference,
        paymentInstruction: depositRequest.payment_instruction,
        status: depositRequest.status,
        createdAt: depositRequest.created_at
      },
      transaction: serializeFinanceTransaction(transaction)
    });
  } catch (error) {
    console.error('Deposit request error:', error);
    res.status(500).json({ error: { code: 'DEPOSIT_REQUEST_FAILED', message: 'Failed to create deposit request.', timestamp: new Date().toISOString() } });
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

app.post('/api/wallet/withdrawal-request', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const amountSmallestUnit = Number(req.body.amount_smallest_unit || req.body.amountSmallestUnit || Math.round(Number(req.body.amount || 0) * 100));
    const bankName = String(req.body.bankName || req.body.bank_name || '').trim();
    const accountNumber = String(req.body.accountNumber || req.body.account_number || '').trim();
    const accountName = String(req.body.accountName || req.body.account_name || '').trim();
    if (!Number.isFinite(amountSmallestUnit) || amountSmallestUnit < MIN_WITHDRAWAL_KOBO) {
      return res.status(400).json({ error: { code: 'INVALID_AMOUNT', message: 'Minimum withdrawal is ₦500.', timestamp: new Date().toISOString() } });
    }
    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({ error: { code: 'BANK_DETAILS_REQUIRED', message: 'Bank name, account number, and account name are required.', timestamp: new Date().toISOString() } });
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const { data: todayRows } = await supabase.from('withdrawal_requests').select('amount_smallest_unit').eq('user_id', user.id).in('status', ['pending', 'completed']).gte('created_at', startOfToday.toISOString());
    const todayTotal = (todayRows || []).reduce((sum, row) => sum + Number(row.amount_smallest_unit || 0), 0);
    if (todayTotal + amountSmallestUnit > MAX_DAILY_WITHDRAWAL_KOBO) {
      return res.status(422).json({ error: { code: 'DAILY_LIMIT_EXCEEDED', message: `Daily withdrawal limit is ₦${toAmount(MAX_DAILY_WITHDRAWAL_KOBO).toLocaleString()}.`, timestamp: new Date().toISOString() } });
    }
    const { data: wallet, error: walletError } = await supabase.from('wallets').select('*').eq('user_id', user.id).single();
    if (walletError || !wallet) return res.status(404).json({ error: { code: 'WALLET_NOT_FOUND', message: 'Wallet not found', timestamp: new Date().toISOString() } });
    if (Number(wallet.available_ngn_kobo || 0) < amountSmallestUnit) return res.status(422).json({ error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient available balance.', timestamp: new Date().toISOString() } });
    const reference = makeWalletReference('WDR');
    const reviewTier = amountSmallestUnit > FAST_REVIEW_THRESHOLD_KOBO ? 'manual_review' : 'fast_review';
    const { data: updatedWallet, error: updateError } = await supabase.from('wallets').update({
      available_ngn_kobo: Number(wallet.available_ngn_kobo || 0) - amountSmallestUnit,
      locked_ngn_kobo: Number(wallet.locked_ngn_kobo || 0) + amountSmallestUnit,
      updated_at: new Date().toISOString()
    }).eq('id', wallet.id).gte('available_ngn_kobo', amountSmallestUnit).select().single();
    if (updateError || !updatedWallet) throw updateError || new Error('Could not reserve withdrawal funds');
    const { data: transaction, error: txError } = await supabase.from('transactions').insert({
      user_id: user.id,
      wallet_id: wallet.id,
      type: 'withdrawal_request',
      amount_smallest_unit: amountSmallestUnit,
      currency: 'NGN',
      direction: 'HOLD',
      status: 'pending',
      reference,
      reference_type: 'withdrawal',
      description: `Withdrawal request ${reference}`,
      metadata: { reference, bankName, accountNumber, accountName, reviewTier }
    }).select().single();
    if (txError || !transaction) throw txError || new Error('Could not create withdrawal transaction');
    const { data: withdrawalRequest, error: requestError } = await supabase.from('withdrawal_requests').insert({
      user_id: user.id,
      wallet_id: wallet.id,
      transaction_id: transaction.id,
      amount_smallest_unit: amountSmallestUnit,
      currency: 'NGN',
      reference,
      provider: 'manual',
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      review_tier: reviewTier,
      status: 'pending',
      metadata: { destination: 'bank_account' }
    }).select().single();
    if (requestError || !withdrawalRequest) throw requestError || new Error('Could not create withdrawal request');
    await insertNotificationSafely({ user_id: user.id, type: 'withdrawal_requested', title: 'Withdrawal requested', message: `Your ₦${toAmount(amountSmallestUnit).toLocaleString()} withdrawal is pending review.`, reference_id: withdrawalRequest.id, reference_type: 'withdrawal_request', metadata: { reference, amount: toAmount(amountSmallestUnit), reviewTier } }, 'Withdrawal notification');
    res.status(201).json({
      message: 'Withdrawal request created',
      wallet: serializeWalletV1(updatedWallet),
      withdrawalRequest: {
        id: withdrawalRequest.id,
        amount: toAmount(withdrawalRequest.amount_smallest_unit),
        amountSmallestUnit: withdrawalRequest.amount_smallest_unit,
        currency: withdrawalRequest.currency,
        reference: withdrawalRequest.reference,
        status: withdrawalRequest.status,
        reviewTier: withdrawalRequest.review_tier,
        createdAt: withdrawalRequest.created_at
      },
      transaction: serializeFinanceTransaction(transaction)
    });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    res.status(500).json({ error: { code: 'WITHDRAWAL_REQUEST_FAILED', message: 'Failed to create withdrawal request.', timestamp: new Date().toISOString() } });
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

    const positionIds = (transactions || [])
      .filter((tx) => tx.reference_type === 'position' && tx.reference_id)
      .map((tx) => tx.reference_id);
    const { data: referencedPositions } = positionIds.length
      ? await supabase
        .from('positions')
        .select('id, markets(question)')
        .in('id', positionIds)
      : { data: [] as any[] };
    const marketQuestionByPosition = new Map(
      (referencedPositions || []).map((position: any) => [position.id, position.markets?.question])
    );

    res.json({
      transactions: transactions.map(tx => serializeFinanceTransaction({
        ...tx,
        metadata: {
          ...(tx.metadata || {}),
          marketQuestion: marketQuestionByPosition.get(tx.reference_id) || tx.metadata?.marketQuestion || null
        }
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

    const autoClosedMarkets = await Promise.all((markets || []).map(autoCloseExpiredMarket));
    const activeMarkets = autoClosedMarkets.filter((market) => displayStatusForMarket(market) === 'active');

    const normalizedMarkets = await Promise.all(activeMarkets.map(async (market) => {
      const { count } = await supabase
        .from('positions')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', market.id);

      const priceHistory = await ensureInitialPriceHistory(market);
      return normalizeMarket(market, count || 0, priceHistory);
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

    const currentMarket = await autoCloseExpiredMarket(market);

    const { count } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true })
      .eq('market_id', currentMarket.id);

    const priceHistory = await ensureInitialPriceHistory(currentMarket);

    res.json({ market: normalizeMarket(currentMarket, count || 0, priceHistory) });
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

app.get('/api/markets/:id/price-history', async (req: Request, res: Response) => {
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

    const priceHistory = await ensureInitialPriceHistory(market);
    res.json({ priceHistory, count: priceHistory.length });
  } catch (error) {
    console.error('Get price history error:', error);
    res.status(500).json({
      error: {
        code: 'GET_PRICE_HISTORY_FAILED',
        message: 'Failed to fetch price history',
        timestamp: new Date().toISOString()
      }
    });
  }
});

app.get('/api/markets/:id/comments', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('market_comments')
      .select('id, market_id, user_id, body, like_count, created_at')
      .eq('market_id', req.params.id)
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const userIds = Array.from(new Set((data || []).map((comment: any) => comment.user_id).filter(Boolean)));
    const { data: commentUsers } = userIds.length > 0
      ? await supabase.from('users').select('id, username').in('id', userIds)
      : { data: [] as any[] };
    const usernameById = new Map((commentUsers || []).map((commentUser: any) => [commentUser.id, commentUser.username]));

    res.json({
      comments: (data || []).map((comment: any) => ({
        id: comment.id,
        marketId: comment.market_id,
        userId: comment.user_id,
        user: usernameById.get(comment.user_id) || 'User',
        text: comment.body,
        likes: Number(comment.like_count || 0),
        createdAt: comment.created_at
      }))
    });
  } catch (error: any) {
    console.error('Get market comments error:', error);
    res.status(500).json({
      error: {
        code: 'GET_COMMENTS_FAILED',
        message: 'Failed to fetch comments',
        timestamp: new Date().toISOString()
      }
    });
  }
});

app.post('/api/markets/:id/comments', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const body = String(req.body.body || req.body.text || '').trim();

    if (body.length < 1) {
      return res.status(400).json({
        error: {
          code: 'COMMENT_REQUIRED',
          message: 'Write a comment first.',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (body.length > 500) {
      return res.status(400).json({
        error: {
          code: 'COMMENT_TOO_LONG',
          message: 'Comment must be 500 characters or less.',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (marketError || !market) {
      return res.status(404).json({
        error: {
          code: 'MARKET_NOT_FOUND',
          message: 'Market not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { data: comment, error } = await supabase
      .from('market_comments')
      .insert({
        market_id: req.params.id,
        user_id: user.id,
        body,
        like_count: 0
      })
      .select('id, market_id, user_id, body, like_count, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      comment: {
        id: comment.id,
        marketId: comment.market_id,
        userId: comment.user_id,
        user: user.username || 'User',
        text: comment.body,
        likes: Number(comment.like_count || 0),
        createdAt: comment.created_at
      }
    });
  } catch (error: any) {
    console.error('Create market comment error:', error);
    res.status(500).json({
      error: {
        code: 'CREATE_COMMENT_FAILED',
        message: 'Failed to save comment',
        timestamp: new Date().toISOString()
      }
    });
  }
});

app.post('/api/markets/:id/predictions', authenticate, async (req: Request, res: Response) => {
  try {
    const marketId = String(req.params.id);
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
      .eq('id', marketId)
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

    const currentMarket = await autoCloseExpiredMarket(market);
    const marketStatus = displayStatusForMarket(currentMarket);
    if (marketStatus !== 'active') {
      return res.status(422).json({
        error: {
          code: 'MARKET_NOT_ACTIVE',
          message: 'This market is not accepting predictions',
          timestamp: new Date().toISOString()
        }
      });
    }

    const minPosition = Number(currentMarket.min_position_smallest_unit || 0);
    const maxPosition = Number(currentMarket.max_position_smallest_unit || 0);
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

    const trade = calculateOwnershipTrade(currentMarket, side, amountSmallestUnit);
    const currentVolume = Number(currentMarket.total_volume_smallest_unit || 0);
    const nextTradeCount = Number(currentMarket.trade_count || 0) + 1;
    const pricesBefore = trade.before;
    const pricesAfter = trade.after;
    const entryPrice = trade.entryPrice;
    const priceChange = trade.priceChange;

    let positionResult = await supabase
      .from('positions')
      .insert({
        user_id: user.id,
        market_id: marketId,
        side,
        amount_smallest_unit: amountSmallestUnit,
        stake_amount: toAmount(amountSmallestUnit),
        currency,
        potential_return_smallest_unit: trade.positionValueSmallestUnit,
        estimated_payout_smallest_unit: null,
        estimated_profit_smallest_unit: null,
        estimated_payout_at_purchase: null,
        estimated_profit_at_purchase: null,
        shares_received: trade.sharesOwned,
        shares_owned: trade.sharesOwned,
        price_at_purchase: entryPrice,
        status: 'active',
        entry_price: entryPrice,
        current_price: trade.currentPrice,
        current_value_smallest_unit: trade.positionValueSmallestUnit,
        ownership_percent: trade.ownershipPercent,
        market_question_snapshot: currentMarket.question,
        market_category_snapshot: currentMarket.category || 'General'
      })
      .select()
      .single();

    if (positionResult.error?.message?.includes('entry_price')) {
      positionResult = await supabase
        .from('positions')
        .insert({
          user_id: user.id,
          market_id: marketId,
          side,
          amount_smallest_unit: amountSmallestUnit,
          stake_amount: toAmount(amountSmallestUnit),
          currency,
          shares_received: trade.sharesOwned,
          price_at_purchase: entryPrice,
          potential_return_smallest_unit: trade.positionValueSmallestUnit
        })
        .select()
        .single();
    }

    if (positionResult.error || !positionResult.data) throw positionResult.error;
    const position = { ...positionResult.data, entry_price: entryPrice };

    const { error: tradeError } = await supabase
      .from('market_trades')
      .insert({
        market_id: marketId,
        user_id: user.id,
        position_id: position.id,
        side,
        amount_smallest_unit: amountSmallestUnit,
        price_before: side === 'YES' ? pricesBefore.yesPrice : pricesBefore.noPrice,
        price_after: trade.currentPrice,
        yes_price_after: pricesAfter.yesPrice,
        no_price_after: pricesAfter.noPrice,
        currency
      });

    if (tradeError) throw tradeError;

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

    const { data: participantRows } = await supabase
      .from('positions')
      .select('user_id')
      .eq('market_id', marketId);
    const participantCount = new Set((participantRows || []).map((row) => row.user_id)).size;

    const { data: updatedMarket, error: marketUpdateError } = await supabase
      .from('markets')
      .update({
        yes_pool_smallest_unit: trade.nextYesVolume,
        no_pool_smallest_unit: trade.nextNoVolume,
        yes_volume_smallest_unit: trade.nextYesVolume,
        no_volume_smallest_unit: trade.nextNoVolume,
        total_yes_shares: trade.nextYesShares,
        total_no_shares: trade.nextNoShares,
        pool_amount_smallest_unit: trade.nextTotalVolume,
        settlement_pool_smallest_unit: trade.nextTotalVolume,
        yes_price: pricesAfter.yesPrice,
        no_price: pricesAfter.noPrice,
        pricing_model: 'ownership_shares',
        trade_count: nextTradeCount,
        participant_count: participantCount || Number(currentMarket.participant_count || 0),
        total_volume_smallest_unit: currentVolume + amountSmallestUnit,
        updated_at: new Date().toISOString()
      })
      .eq('id', marketId)
      .select()
      .single();

    if (marketUpdateError || !updatedMarket) throw marketUpdateError;

    await savePriceHistory(marketId, pricesAfter.yesPrice, pricesAfter.noPrice, trade.nextYesVolume, trade.nextNoVolume, currentVolume + amountSmallestUnit, nextTradeCount, side, amountSmallestUnit);
    await supabase.from('market_activity_events').insert({
      market_id: marketId,
      user_id: user.id,
      position_id: position.id,
      event_type: side === 'YES' ? 'bought_yes' : 'bought_no',
      side,
      amount_smallest_unit: amountSmallestUnit,
      price: trade.currentPrice,
      shares: trade.sharesOwned,
      position_value_smallest_unit: trade.positionValueSmallestUnit,
      metadata: {
        marketQuestion: updatedMarket.question || currentMarket.question || null,
        ownershipPercent: trade.ownershipPercent,
        yesPriceAfter: pricesAfter.yesPrice,
        noPriceAfter: pricesAfter.noPrice
      }
    });
    const priceHistory = await fetchPriceHistory(updatedMarket);

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
        market_id: marketId,
        position_id: position.id,
        status: 'completed',
        metadata: {
          marketId,
          marketQuestion: updatedMarket.question || currentMarket.question || null,
          category: updatedMarket.category || currentMarket.category || null,
          side,
          entryPrice,
          sharesOwned: trade.sharesOwned,
          positionValueSmallestUnit: trade.positionValueSmallestUnit,
          ownershipPercent: trade.ownershipPercent,
          yesPriceBefore: pricesBefore.yesPrice,
          noPriceBefore: pricesBefore.noPrice,
          yesPriceAfter: pricesAfter.yesPrice,
          noPriceAfter: pricesAfter.noPrice,
          priceChange
        }
      })
      .select()
      .single();

    await insertNotificationSafely({
      user_id: user.id,
      type: 'forecast_confirmed',
      title: 'Prediction placed',
      message: `Your ${side} prediction on "${updatedMarket.question || currentMarket.question}" is active.`,
      reference_id: marketId,
      reference_type: 'market',
      metadata: {
        marketId,
        marketQuestion: updatedMarket.question || currentMarket.question || null,
        side,
        amount: toAmount(amountSmallestUnit)
      }
    }, 'Prediction notification');

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
      market: normalizeMarket(updatedMarket, undefined, priceHistory),
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

    const positions = (data || []).map((position) => normalizePosition(position, position.markets));
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

    const resolvedPositions = (positions || []).filter((position) => position.resolved_at);
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
        winRate: resolvedPositions.length > 0 ? Math.round((wonPredictions / resolvedPositions.length) * 100) : 0,
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

    const activeUsersToday = new Set((volumeData || [])
      .filter((p) => new Date(p.created_at).getTime() >= startOfToday.getTime())
      .map((p) => p.user_id)
      .filter(Boolean)).size;

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

    const platformLiquidityDeployed = 0;

    if (usersError || forecastsError || predictionsTodayError || volumeError || activeError || resolvedError || pendingError) {
      console.error('Analytics query errors:', {
        usersError,
        forecastsError,
        predictionsTodayError,
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
      totalPredictions: totalForecasts || 0,
      predictionsToday: predictionsToday || 0,
      todayPredictions: predictionsToday || 0,
      totalVolume,
      todayVolume,
      activeMarkets: activeMarkets || 0,
      resolvedMarkets: resolvedMarkets || 0,
      pendingMarkets: pendingMarkets || 0,
      pendingResolution: pendingMarkets || 0,
      activeUsersToday,
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

const normalizeAdminMarket = (market: any) => ({
  id: market.id,
  question: market.question,
  description: market.description,
  category: market.category || 'General',
  status: displayStatusForMarket(market),
  market_type: market.market_type || 'binary',
  yes_label: market.yes_label || 'YES',
  no_label: market.no_label || 'NO',
  yes_price: Number(market.yes_price || 50),
  no_price: Number(market.no_price || 50),
  close_date: market.close_date || market.closes_at,
  resolution_date: market.resolution_date,
  resolution_source: market.resolution_source,
  resolution_instructions: market.resolution_instructions,
  rules: market.rules || market.resolution_instructions || market.description || '',
  outcome: market.outcome,
  resolved_outcome: market.resolved_outcome,
  winning_outcome: market.winning_outcome,
  pool_amount_smallest_unit: Number(market.pool_amount_smallest_unit || 0),
  total_volume_smallest_unit: Number(market.total_volume_smallest_unit || 0),
  seed_liquidity_yes_smallest_unit: Number(market.seed_liquidity_yes_smallest_unit || 0),
  seed_liquidity_no_smallest_unit: Number(market.seed_liquidity_no_smallest_unit || 0),
  yes_pool_smallest_unit: Number(market.yes_pool_smallest_unit || 0),
  no_pool_smallest_unit: Number(market.no_pool_smallest_unit || 0),
  participant_count: Number(market.participant_count || 0),
  trade_count: Number(market.trade_count || 0),
  currency: market.currency || 'NGN',
  image_url: market.image_url,
  video_url: market.video_url,
  is_trending: Boolean(market.is_trending),
  min_position_smallest_unit: Number(market.min_position_smallest_unit || 0),
  max_position_smallest_unit: Number(market.max_position_smallest_unit || 0),
  created_by: market.created_by,
  created_at: market.created_at,
  updated_at: market.updated_at
});

const canManageMarket = (user: any, market: any) => (
  user.role === 'super_admin' || market.created_by === user.id
);

const loadSettlementPositions = async (marketId: string) => {
  const { data: positions, error: positionsError } = await supabase
    .from('positions')
    .select('*')
    .eq('market_id', marketId);

  if (positionsError) throw positionsError;
  return positions || [];
};

const ownershipSettlementForPosition = (
  position: any,
  outcome: PredictionSide,
  totalWinningShares: number,
  totalLosingStakeSmallestUnit: number
) => {
  const stakeSmallestUnit = Number(position.amount_smallest_unit || Math.round(Number(position.stake_amount || 0) * 100) || 0);
  const won = position.side === outcome;
  const priceAtPurchase = Number(position.price_at_purchase || position.entry_price || 0);
  const storedShares = Number(position.shares_owned || position.shares_received || 0);
  const sharesReceived = storedShares > 0
    ? storedShares
    : priceAtPurchase > 0
      ? toAmount(stakeSmallestUnit) / priceAtPurchase
      : 0;
  // Pool-safe settlement: price is sentiment/entry math. Winners recover stake
  // plus pro-rata losing-pool profit, so payouts stay inside locked stakes.
  const ownershipShare = won && totalWinningShares > 0 ? sharesReceived / totalWinningShares : 0;
  const poolProfitSmallestUnit = Math.max(0, Math.round(ownershipShare * totalLosingStakeSmallestUnit));
  const payoutSmallestUnit = won ? stakeSmallestUnit + poolProfitSmallestUnit : 0;
  const profitSmallestUnit = won ? payoutSmallestUnit - stakeSmallestUnit : -stakeSmallestUnit;

  return {
    won,
    stakeSmallestUnit,
    priceAtPurchase,
    sharesReceived,
    ownershipShare,
    payoutSmallestUnit,
    profitSmallestUnit
  };
};

const buildSettlementPreview = (market: any, outcome: PredictionSide, allPositions: any[]) => {
  const winningPositions = allPositions.filter((position: any) => position.side === outcome);
  const losingPositions = allPositions.filter((position: any) => position.side !== outcome);
  const totalWinningShares = winningPositions.reduce((sum: number, position: any) => {
    const stakeSmallestUnit = Number(position.amount_smallest_unit || Math.round(Number(position.stake_amount || 0) * 100) || 0);
    const entryPrice = Number(position.price_at_purchase || position.entry_price || 0);
    const shares = Number(position.shares_owned || position.shares_received || 0) || (entryPrice > 0 ? toAmount(stakeSmallestUnit) / entryPrice : 0);
    return sum + shares;
  }, 0);
  const totalLosingStake = losingPositions.reduce((sum: number, position: any) => sum + Number(position.amount_smallest_unit || Math.round(Number(position.stake_amount || 0) * 100) || 0), 0);
  let settledPositions = allPositions.map((position: any) => {
    const settlement = ownershipSettlementForPosition(position, outcome, totalWinningShares, totalLosingStake);

    return {
      id: position.id,
      userId: position.user_id,
      username: position.username || position.user_id,
      side: position.side,
      status: settlement.won ? 'won' : 'lost',
      stakeSmallestUnit: settlement.stakeSmallestUnit,
      priceAtPurchase: settlement.priceAtPurchase,
      sharesReceived: settlement.sharesReceived,
      ownershipPercent: settlement.ownershipShare * 100,
      payoutSmallestUnit: settlement.payoutSmallestUnit,
      profitSmallestUnit: settlement.profitSmallestUnit,
      alreadySettled: Boolean(position.settled_at || position.resolved_at || ['won', 'lost', 'settled'].includes(String(position.status || ''))),
      stake: toAmount(settlement.stakeSmallestUnit),
      price: settlement.priceAtPurchase,
      shares: settlement.sharesReceived,
      payout: toAmount(settlement.payoutSmallestUnit),
      profit: toAmount(settlement.profitSmallestUnit)
    };
  });
  const totalWinningStake = winningPositions.reduce((sum: number, position: any) => sum + Number(position.amount_smallest_unit || Math.round(Number(position.stake_amount || 0) * 100) || 0), 0);
  const maxPayoutSmallestUnit = totalWinningStake + totalLosingStake;
  let payoutOverflow = settledPositions.reduce((sum: number, position: any) => sum + position.payoutSmallestUnit, 0) - maxPayoutSmallestUnit;

  if (payoutOverflow > 0) {
    settledPositions = settledPositions.map((position: any) => {
      if (payoutOverflow <= 0 || position.payoutSmallestUnit <= 0) return position;
      const reduction = Math.min(payoutOverflow, position.payoutSmallestUnit);
      payoutOverflow -= reduction;
      const payoutSmallestUnit = position.payoutSmallestUnit - reduction;
      const profitSmallestUnit = payoutSmallestUnit - position.stakeSmallestUnit;
      return {
        ...position,
        payoutSmallestUnit,
        profitSmallestUnit,
        payout: toAmount(payoutSmallestUnit),
        profit: toAmount(profitSmallestUnit)
      };
    });
  }

  return {
    marketId: market.id,
    marketQuestion: market.question,
    winningOutcome: outcome,
    totalYesStake: toAmount(allPositions.filter((position: any) => position.side === 'YES').reduce((sum: number, position: any) => sum + Number(position.amount_smallest_unit || 0), 0)),
    totalNoStake: toAmount(allPositions.filter((position: any) => position.side === 'NO').reduce((sum: number, position: any) => sum + Number(position.amount_smallest_unit || 0), 0)),
    totalWinningStake: toAmount(totalWinningStake),
    totalLosingStake: toAmount(totalLosingStake),
    totalWinningShares,
    totalWinners: winningPositions.length,
    totalLosers: losingPositions.length,
    totalPayout: toAmount(settledPositions.reduce((sum: number, position: any) => sum + position.payoutSmallestUnit, 0)),
    platformFee: 0,
    positions: settledPositions
  };
};

const resolveMarketWithPayouts = async (market: any, outcome: PredictionSide, adminUser: any) => {
  if (normalizeMarketStatus(market) === 'resolved' || market.resolved_at) {
    throw new Error('This market has already been resolved.');
  }

  const marketStatus = displayStatusForMarket(market);
  if (!['closed', 'pending_resolution'].includes(marketStatus)) {
    throw new Error('Market must be ended or pending resolution before settlement.');
  }

  const allPositions = await loadSettlementPositions(market.id);
  const preview = buildSettlementPreview(market, outcome, allPositions);
  const now = new Date().toISOString();

  for (const result of preview.positions) {
    const position = allPositions.find((candidate: any) => candidate.id === result.id);
    if (!position) continue;
    if (position.settled_at || position.resolved_at || ['won', 'lost', 'settled'].includes(String(position.status || ''))) {
      continue;
    }

    let { error: positionUpdateError } = await supabase
      .from('positions')
      .update({
        is_winner: result.status === 'won',
        payout_smallest_unit: result.payoutSmallestUnit,
        final_payout_smallest_unit: result.payoutSmallestUnit,
        profit_smallest_unit: result.profitSmallestUnit,
        settlement_payout_smallest_unit: result.payoutSmallestUnit,
        settlement_profit_smallest_unit: result.profitSmallestUnit,
        ownership_percent: result.ownershipPercent,
        status: result.status,
        resolved_at: now,
        settled_at: now,
        winning_outcome: outcome,
        market_question_snapshot: market.question,
        market_category_snapshot: market.category || 'General'
      })
      .eq('id', position.id);

    if (positionUpdateError && /profit_smallest_unit|settled_at|winning_outcome|market_question_snapshot|market_category_snapshot/i.test(positionUpdateError.message || '')) {
      const retry = await supabase
        .from('positions')
        .update({
          is_winner: result.status === 'won',
          payout_smallest_unit: result.payoutSmallestUnit,
          final_payout_smallest_unit: result.payoutSmallestUnit,
          status: result.status,
          resolved_at: now
        })
        .eq('id', position.id);
      positionUpdateError = retry.error;
    }
    if (positionUpdateError) throw positionUpdateError;

    if (result.payoutSmallestUnit > 0) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', position.user_id)
        .single();

      if (wallet) {
        const balanceField = position.currency === 'USD' ? 'available_usd_cents' : 'available_ngn_kobo';
        const totalBalanceField = position.currency === 'USD' ? 'balance_usd_cents' : 'balance_ngn_kobo';
        await supabase
          .from('wallets')
          .update({
            [balanceField]: Number(wallet[balanceField] || 0) + result.payoutSmallestUnit,
            [totalBalanceField]: Number(wallet[totalBalanceField] || 0) + Math.max(0, result.profitSmallestUnit),
            updated_at: now
          })
          .eq('id', wallet.id);

        await supabase
          .from('transactions')
          .insert({
            user_id: position.user_id,
            wallet_id: wallet.id,
            type: 'position_payout',
            amount_smallest_unit: result.payoutSmallestUnit,
            currency: position.currency || 'NGN',
            direction: 'IN',
            reference_id: position.id,
            reference_type: 'position',
            market_id: market.id,
            position_id: position.id,
            status: 'completed',
            metadata: {
              marketId: market.id,
              marketQuestion: market.question,
              outcome,
              description: `Payout for ${market.question}`,
              stake: result.stake,
              payout: result.payout,
              profit: result.profit
            }
          });

        await insertNotificationSafely({
          user_id: position.user_id,
          type: 'position_payout',
          title: 'Prediction won',
          message: `You won a payout from "${market.question}".`,
          reference_id: market.id,
          reference_type: 'market',
          metadata: {
            marketId: market.id,
            marketQuestion: market.question,
            outcome,
            payoutSmallestUnit: result.payoutSmallestUnit,
            profitSmallestUnit: result.profitSmallestUnit
          }
        }, 'Payout notification');
      }
    } else {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', position.user_id)
        .single();

      if (wallet) {
        const totalBalanceField = position.currency === 'USD' ? 'balance_usd_cents' : 'balance_ngn_kobo';
        await supabase
          .from('wallets')
          .update({
            [totalBalanceField]: Math.max(0, Number(wallet[totalBalanceField] || 0) - result.stakeSmallestUnit),
            updated_at: now
          })
          .eq('id', wallet.id);
      }
    }

    await insertNotificationSafely({
      user_id: position.user_id,
      type: 'market_resolved',
      title: result.status === 'won' ? 'Market resolved: you won' : 'Market resolved',
      message: `"${market.question}" resolved as ${outcome}.`,
      reference_id: market.id,
      reference_type: 'market',
      metadata: {
        marketId: market.id,
        marketQuestion: market.question,
        outcome,
        isWinner: result.status === 'won'
      }
    }, 'Resolution notification');
  }

  await supabase
    .from('market_resolution_logs')
    .insert({
      market_id: market.id,
      resolved_by: adminUser.id,
      outcome,
      winning_pool_smallest_unit: Math.round(preview.totalWinningStake * 100),
      losing_pool_smallest_unit: Math.round(preview.totalLosingStake * 100),
      payout_pool_smallest_unit: Math.round(preview.totalPayout * 100),
      resolved_position_count: allPositions.length,
      payout_summary: preview
    });

  let { data: updatedMarket, error: marketError }: { data: any; error: any } = await supabase
    .from('markets')
    .update({
      status: 'resolved',
      state: 'resolved',
      outcome,
      winning_outcome: outcome,
      resolved_outcome: outcome,
      resolved_at: now,
      resolved_by: adminUser.id,
      resolution_source: market.resolution_source || 'Admin resolution',
      updated_at: now
    })
    .eq('id', market.id)
    .neq('status', 'resolved')
    .select()
    .single();

  if (marketError && /resolved_by/i.test(marketError.message || '')) {
    const retry = await supabase
      .from('markets')
      .update({
        status: 'resolved',
        state: 'resolved',
        outcome,
        winning_outcome: outcome,
        resolved_outcome: outcome,
        resolved_at: now,
        resolution_source: market.resolution_source || 'Admin resolution',
        updated_at: now
      })
      .eq('id', market.id)
      .neq('status', 'resolved')
      .select()
      .single();
    updatedMarket = retry.data;
    marketError = retry.error;
  }

  if (marketError) throw marketError;
  return { market: updatedMarket, payoutSummary: preview };
};

/**
 * GET /api/admin/markets
 * List admin markets.
 */
app.get('/api/admin/markets', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    let query = supabase
      .from('markets')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('question', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const autoClosedMarkets = await Promise.all((data || []).map(autoCloseExpiredMarket));
    const markets = autoClosedMarkets.map(normalizeAdminMarket);
    res.json({
      success: true,
      markets,
      pagination: {
        total: markets.length,
        page: 1,
        limit: markets.length,
        pages: 1
      }
    });
  } catch (error: any) {
    console.error('Admin markets list error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADMIN_MARKETS_FAILED',
        message: 'Could not load admin markets',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/admin/markets/upload-media
 * Upload an admin market image or short video to Supabase Storage.
 */
app.post('/api/admin/markets/upload-media', authenticate, requireRole('admin'), (req: Request, res: Response, next: NextFunction) => {
  upload.single('media')(req, res, (uploadError: any) => {
    if (uploadError) {
      const isFileSizeError = uploadError.code === 'LIMIT_FILE_SIZE';
      return res.status(400).json({
        success: false,
        error: {
          code: isFileSizeError ? 'FILE_TOO_LARGE' : 'INVALID_FILE',
          message: isFileSizeError ? 'Media file must be under 30MB.' : uploadError.message,
          timestamp: new Date().toISOString()
        }
      });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'Choose an image or short video first.',
          timestamp: new Date().toISOString()
        }
      });
    }

    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    const bucket = mediaType === 'video' ? 'market-videos' : 'market-images';
    const extension = req.file.originalname.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
    const safeName = `${mediaType}-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(safeName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Admin media upload error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: `Could not upload ${mediaType}. Check the ${bucket} Supabase Storage bucket.`,
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(safeName);

    res.json({
      success: true,
      media_type: mediaType,
      url: publicUrlData.publicUrl,
      [`${mediaType}_url`]: publicUrlData.publicUrl
    });
  } catch (error: any) {
    console.error('Admin media upload route error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: 'Could not upload media',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/admin/markets
 * Create an admin market.
 */
app.post('/api/admin/markets', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const question = String(req.body.question || '').trim();
    const category = String(req.body.category || 'General').trim();
    const closeDate = req.body.close_date || req.body.closes_at;
    const status = String(req.body.status || 'active');
    const imageUrl = req.body.image_url || null;
    const videoUrl = req.body.video_url || null;
    const yesPrice = Number(req.body.starting_yes_price ?? req.body.yes_price ?? 50);
    const noPrice = Number(req.body.starting_no_price ?? req.body.no_price ?? (100 - yesPrice));
    const rules = String(req.body.resolution_instructions || req.body.rules || '').trim();
    const resolutionSource = String(req.body.resolution_source || '').trim();

    if (!question) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Question is required.' } });
    }

    if (!imageUrl && !videoUrl) {
      return res.status(400).json({ success: false, error: { code: 'MEDIA_REQUIRED', message: 'Add an image or short video before creating the market.' } });
    }

    if (!category) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Category is required.' } });
    }

    if (!Number.isFinite(yesPrice) || !Number.isFinite(noPrice) || yesPrice < 1 || noPrice < 1 || Math.round(yesPrice + noPrice) !== 100) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STARTING_PRICES', message: 'Starting YES and NO prices must be valid and add up to 100.' } });
    }

    if (!rules) {
      return res.status(400).json({ success: false, error: { code: 'RULES_REQUIRED', message: 'Rules / resolution criteria are required.' } });
    }

    if (!resolutionSource) {
      return res.status(400).json({ success: false, error: { code: 'RESOLUTION_SOURCE_REQUIRED', message: 'Resolution source is required.' } });
    }

    if (!closeDate || new Date(closeDate).getTime() <= Date.now()) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_CLOSE_DATE', message: 'End date must be in the future.' } });
    }

    const { data: market, error } = await supabase
      .from('markets')
      .insert({
        question,
        description: req.body.description || null,
        category,
        country_filter: req.body.country_filter || null,
        market_type: req.body.market_type || 'binary',
        yes_label: req.body.yes_label || 'YES',
        no_label: req.body.no_label || 'NO',
        yes_price: yesPrice,
        no_price: noPrice,
        close_date: closeDate,
        closes_at: closeDate,
        resolution_date: req.body.resolution_date || closeDate,
        resolution_source: resolutionSource,
        resolution_instructions: rules,
        status,
        state: legacyStateFor(status),
        currency: req.body.currency || 'NGN',
        image_url: imageUrl,
        video_url: videoUrl,
        is_trending: Boolean(req.body.is_trending),
        min_position_smallest_unit: Number(req.body.min_position_smallest_unit || 100),
        max_position_smallest_unit: Number(req.body.max_position_smallest_unit || 0) || null,
        created_by: user.id,
        pricing_model: 'ownership_shares',
        starting_yes_price: yesPrice,
        starting_no_price: noPrice,
        pool_amount_smallest_unit: 0,
        settlement_pool_smallest_unit: 0,
        seed_liquidity_yes_smallest_unit: 0,
        seed_liquidity_no_smallest_unit: 0,
        yes_pool_smallest_unit: 0,
        no_pool_smallest_unit: 0,
        yes_volume_smallest_unit: 0,
        no_volume_smallest_unit: 0,
        total_yes_shares: 0,
        total_no_shares: 0,
        participant_count: 0,
        trade_count: 0,
        total_volume_smallest_unit: 0,
        rules
      })
      .select()
      .single();

    if (error) throw error;

    await savePriceHistory(market.id, yesPrice, noPrice, 0, 0, 0, 0);

    res.status(201).json({
      success: true,
      market: normalizeAdminMarket(market)
    });
  } catch (error: any) {
    console.error('Admin market create error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_MARKET_FAILED',
        message: 'Could not create market',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

app.put('/api/admin/markets/:marketId', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { data: existingMarket, error: findError } = await supabase
      .from('markets')
      .select('*')
      .eq('id', req.params.marketId)
      .single();

    if (findError || !existingMarket) {
      return res.status(404).json({ success: false, error: { code: 'MARKET_NOT_FOUND', message: 'Market not found.' } });
    }

    if (!canManageMarket(user, existingMarket)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admins can only edit markets they created.' } });
    }

    const updateData: any = { ...req.body };
    if (updateData.close_date) updateData.closes_at = updateData.close_date;
    if (updateData.status) updateData.state = legacyStateFor(updateData.status);

    const { data: market, error } = await supabase
      .from('markets')
      .update(updateData)
      .eq('id', req.params.marketId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, market: normalizeAdminMarket(market) });
  } catch (error: any) {
    console.error('Admin market update error:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_MARKET_FAILED', message: 'Could not update market.' } });
  }
});

app.get('/api/admin/markets/:marketId/resolution-preview', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const marketId = String(req.params.marketId || '');
    const outcome = normalizePredictionSide(req.query.outcome);
    if (!outcome) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_OUTCOME', message: 'Choose YES or NO.' } });
    }
    if (user.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only super admins can resolve markets.' } });
    }

    const { data: market, error } = await supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (error || !market) return res.status(404).json({ success: false, error: { code: 'MARKET_NOT_FOUND', message: 'Market not found.' } });

    const positions = await loadSettlementPositions(marketId);
    res.json({ success: true, preview: buildSettlementPreview(market, outcome, positions) });
  } catch (error: any) {
    console.error('Resolution preview error:', error);
    res.status(500).json({ success: false, error: { code: 'RESOLUTION_PREVIEW_FAILED', message: error.message || 'Failed to preview settlement.' } });
  }
});

app.post('/api/admin/markets/:marketId/resolve', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const marketId = String(req.params.marketId || '');
    const outcome = normalizePredictionSide(req.body.winningOutcome || req.body.outcome);
    if (!outcome) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_OUTCOME', message: 'Choose YES or NO.' } });
    }
    if (user.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only super admins can resolve markets.' } });
    }

    const { data: market, error } = await supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (error || !market) return res.status(404).json({ success: false, error: { code: 'MARKET_NOT_FOUND', message: 'Market not found.' } });
    if (normalizeMarketStatus(market) === 'resolved' || market.resolved_at) {
      const positions = await loadSettlementPositions(marketId);
      return res.json({
        success: true,
        alreadyResolved: true,
        market: normalizeAdminMarket(market),
        summary: buildSettlementPreview(market, outcome, positions),
        message: 'Market is already resolved. No payouts were created.'
      });
    }

    const result = await resolveMarketWithPayouts(market, outcome, user);
    res.json({ success: true, market: normalizeAdminMarket(result.market), summary: result.payoutSummary });
  } catch (error: any) {
    console.error('Resolve market error:', error);
    res.status(500).json({ success: false, error: { code: 'RESOLVE_MARKET_FAILED', message: error.message || 'Failed to resolve market.' } });
  }
});

app.patch('/api/admin/markets/:marketId/status', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { data: existingMarket, error: findError } = await supabase
      .from('markets')
      .select('*')
      .eq('id', req.params.marketId)
      .single();

    if (findError || !existingMarket) {
      return res.status(404).json({ success: false, error: { code: 'MARKET_NOT_FOUND', message: 'Market not found.' } });
    }

    if (!canManageMarket(user, existingMarket)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admins can only change markets they created.' } });
    }

    if (req.body.status === 'resolved' && user.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only super admins can resolve markets.' } });
    }

    const requestedStatus = String(req.body.status || '').trim();
    const requestedOutcome = normalizePredictionSide(req.body.outcome);
    const allowedStatusUpdates = ['draft', 'active', 'closed', 'pending_resolution', 'resolved', 'archived'];
    if (!allowedStatusUpdates.includes(requestedStatus)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Choose a valid market status.' } });
    }

    if (requestedStatus === 'resolved') {
      if (!requestedOutcome) {
        return res.status(400).json({ success: false, error: { code: 'OUTCOME_REQUIRED', message: 'Choose YES or NO before resolving.' } });
      }

      const result = await resolveMarketWithPayouts(
        { ...existingMarket, resolution_source: req.body.resolution_source || existingMarket.resolution_source },
        requestedOutcome,
        user
      );

      return res.json({ success: true, market: normalizeAdminMarket(result.market), summary: result.payoutSummary });
    }

    if (requestedStatus === 'archived' && normalizeMarketStatus(existingMarket) !== 'resolved') {
      return res.status(422).json({ success: false, error: { code: 'ARCHIVE_REQUIRES_RESOLUTION', message: 'Only resolved markets can be archived.' } });
    }

    const updateData: any = {
      status: requestedStatus,
      state: legacyStateFor(requestedStatus),
      updated_at: new Date().toISOString()
    };
    if (requestedStatus === 'archived') updateData.archived_at = new Date().toISOString();

    const { data: market, error } = await supabase
      .from('markets')
      .update(updateData)
      .eq('id', req.params.marketId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, market: normalizeAdminMarket(market) });
  } catch (error: any) {
    console.error('Admin market status error:', error);
    res.status(500).json({ success: false, error: { code: 'STATUS_MARKET_FAILED', message: error.message || 'Could not change market status.' } });
  }
});

app.get('/api/admin/users', authenticate, requireRole('super_admin'), async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ users: data || [] });
  } catch (error: any) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: { code: 'ADMIN_USERS_FAILED', message: 'Could not load users.' } });
  }
});

app.get('/api/admin/transactions', authenticate, requireRole('super_admin'), async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({
      transactions: (data || []).map((tx) => ({
        id: tx.id,
        userId: tx.user_id,
        walletId: tx.wallet_id,
        type: tx.type,
        amount: toAmount(tx.amount_smallest_unit),
        amountSmallestUnit: tx.amount_smallest_unit,
        currency: tx.currency,
        direction: tx.direction,
        referenceId: tx.reference_id,
        referenceType: tx.reference_type,
        status: tx.status,
        metadata: tx.metadata,
        createdAt: tx.created_at
      }))
    });
  } catch (error: any) {
    console.error('Admin transactions error:', error);
    res.status(500).json({ error: { code: 'ADMIN_TRANSACTIONS_FAILED', message: 'Could not load transactions.' } });
  }
});

app.get('/api/admin/finance/overview', authenticate, requireRole('super_admin'), async (_req: Request, res: Response) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayIso = startOfToday.toISOString();
    const [walletsResult, depositsResult, withdrawalsResult, pendingDepositsResult, pendingWithdrawalsResult, todayDepositsResult, todayWithdrawalsResult, todayPredictionsResult, pendingPayoutsResult] = await Promise.all([
      supabase.from('wallets').select('balance_ngn_kobo, locked_ngn_kobo'),
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
    res.json({ overview: {
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
    } });
  } catch (error) {
    console.error('Finance overview error:', error);
    res.status(500).json({ error: { code: 'FINANCE_OVERVIEW_FAILED', message: 'Could not load finance overview.', timestamp: new Date().toISOString() } });
  }
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

app.get('/api/admin/finance/deposits', authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status || 'pending');
    let query = supabase.from('deposit_requests').select('*, users(email, username)').order('created_at', { ascending: false }).limit(200);
    if (status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ deposits: (data || []).map(serializeDepositRequest) });
  } catch (error) {
    console.error('Finance deposits error:', error);
    res.status(500).json({ error: { code: 'FINANCE_DEPOSITS_FAILED', message: 'Could not load deposit queue.', timestamp: new Date().toISOString() } });
  }
});

app.get('/api/admin/finance/withdrawals', authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status || 'pending');
    let query = supabase.from('withdrawal_requests').select('*, users(email, username)').order('created_at', { ascending: false }).limit(200);
    if (status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ withdrawals: (data || []).map(serializeWithdrawalRequest) });
  } catch (error) {
    console.error('Finance withdrawals error:', error);
    res.status(500).json({ error: { code: 'FINANCE_WITHDRAWALS_FAILED', message: 'Could not load withdrawal queue.', timestamp: new Date().toISOString() } });
  }
});

app.get('/api/admin/finance/transactions', authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const type = String(req.query.type || '');
    const status = String(req.query.status || '');
    const search = String(req.query.search || '').trim();
    let query = supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(300);
    if (type && type !== 'all') query = query.eq('type', type);
    if (status && status !== 'all') query = query.eq('status', status);
    if (search) query = query.or(`reference.ilike.%${search}%,description.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ transactions: (data || []).map(serializeFinanceTransaction) });
  } catch (error) {
    console.error('Finance transactions error:', error);
    res.status(500).json({ error: { code: 'FINANCE_TRANSACTIONS_FAILED', message: 'Could not load finance transactions.', timestamp: new Date().toISOString() } });
  }
});

app.post('/api/admin/finance/deposits/:id/approve', authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user;
    const { data: request, error: requestError } = await supabase.from('deposit_requests').select('*').eq('id', req.params.id).single();
    if (requestError || !request) return res.status(404).json({ error: { code: 'DEPOSIT_NOT_FOUND', message: 'Deposit request not found.', timestamp: new Date().toISOString() } });
    if (request.status !== 'pending') return res.status(409).json({ error: { code: 'DEPOSIT_ALREADY_HANDLED', message: 'This deposit request has already been handled.', timestamp: new Date().toISOString() } });
    const { data: wallet, error: walletError } = await supabase.from('wallets').select('*').eq('id', request.wallet_id).single();
    if (walletError || !wallet) throw walletError || new Error('Wallet not found');
    const approvedAt = new Date().toISOString();
    const { data: updatedWallet, error: updateError } = await supabase.from('wallets').update({
      balance_ngn_kobo: Number(wallet.balance_ngn_kobo || 0) + Number(request.amount_smallest_unit || 0),
      available_ngn_kobo: Number(wallet.available_ngn_kobo || 0) + Number(request.amount_smallest_unit || 0),
      total_deposited_ngn_kobo: Number(wallet.total_deposited_ngn_kobo || 0) + Number(request.amount_smallest_unit || 0),
      updated_at: approvedAt,
    }).eq('id', wallet.id).select().single();
    if (updateError || !updatedWallet) throw updateError || new Error('Wallet credit failed');
    await supabase.from('deposit_requests').update({ status: 'completed', approved_by: admin.id, approved_at: approvedAt, updated_at: approvedAt }).eq('id', request.id).eq('status', 'pending');
    if (request.transaction_id) await supabase.from('transactions').update({ status: 'completed', approved_by: admin.id, approved_at: approvedAt, updated_at: approvedAt }).eq('id', request.transaction_id);
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
      approved_by: admin.id,
      approved_at: approvedAt,
      description: `Approved deposit ${request.reference}`,
      metadata: { reference: request.reference, provider: request.provider }
    }).select().single();
    await insertNotificationSafely({ user_id: request.user_id, type: 'deposit_approved', title: 'Deposit approved', message: `₦${toAmount(request.amount_smallest_unit).toLocaleString()} has been added to your wallet.`, reference_id: request.id, reference_type: 'deposit_request', metadata: { reference: request.reference } }, 'Deposit approved notification');
    res.json({ success: true, wallet: serializeWalletV1(updatedWallet), transaction: approvedTx ? serializeFinanceTransaction(approvedTx) : null });
  } catch (error: any) {
    console.error('Approve deposit error:', error);
    res.status(500).json({ error: { code: 'APPROVE_DEPOSIT_FAILED', message: error.message || 'Could not approve deposit.', timestamp: new Date().toISOString() } });
  }
});

app.post('/api/admin/finance/deposits/:id/reject', authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user;
    const { data: request, error: requestError } = await supabase.from('deposit_requests').select('*').eq('id', req.params.id).single();
    if (requestError || !request) return res.status(404).json({ error: { code: 'DEPOSIT_NOT_FOUND', message: 'Deposit request not found.', timestamp: new Date().toISOString() } });
    if (request.status !== 'pending') return res.status(409).json({ error: { code: 'DEPOSIT_ALREADY_HANDLED', message: 'This deposit request has already been handled.', timestamp: new Date().toISOString() } });
    const rejectedAt = new Date().toISOString();
    await supabase.from('deposit_requests').update({ status: 'rejected', rejected_by: admin.id, rejected_at: rejectedAt, updated_at: rejectedAt }).eq('id', request.id).eq('status', 'pending');
    if (request.transaction_id) await supabase.from('transactions').update({ status: 'rejected', approved_by: admin.id, approved_at: rejectedAt, updated_at: rejectedAt }).eq('id', request.transaction_id);
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
      approved_by: admin.id,
      approved_at: rejectedAt,
      description: `Rejected deposit ${request.reference}`,
      metadata: { reason: req.body?.reason || 'Rejected by admin' }
    }).select().single();
    await insertNotificationSafely({ user_id: request.user_id, type: 'deposit_rejected', title: 'Deposit rejected', message: `Your ₦${toAmount(request.amount_smallest_unit).toLocaleString()} deposit request was rejected.`, reference_id: request.id, reference_type: 'deposit_request', metadata: { reference: request.reference } }, 'Deposit rejected notification');
    res.json({ success: true, transaction: rejectedTx ? serializeFinanceTransaction(rejectedTx) : null });
  } catch (error: any) {
    console.error('Reject deposit error:', error);
    res.status(500).json({ error: { code: 'REJECT_DEPOSIT_FAILED', message: error.message || 'Could not reject deposit.', timestamp: new Date().toISOString() } });
  }
});

app.post('/api/admin/finance/withdrawals/:id/approve', authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user;
    const { data: request, error: requestError } = await supabase.from('withdrawal_requests').select('*').eq('id', req.params.id).single();
    if (requestError || !request) return res.status(404).json({ error: { code: 'WITHDRAWAL_NOT_FOUND', message: 'Withdrawal request not found.', timestamp: new Date().toISOString() } });
    if (request.status !== 'pending') return res.status(409).json({ error: { code: 'WITHDRAWAL_ALREADY_HANDLED', message: 'This withdrawal request has already been handled.', timestamp: new Date().toISOString() } });
    const { data: wallet, error: walletError } = await supabase.from('wallets').select('*').eq('id', request.wallet_id).single();
    if (walletError || !wallet) throw walletError || new Error('Wallet not found');
    if (Number(wallet.locked_ngn_kobo || 0) < Number(request.amount_smallest_unit || 0)) throw new Error('Locked balance is lower than withdrawal amount.');
    const approvedAt = new Date().toISOString();
    const { data: updatedWallet, error: updateError } = await supabase.from('wallets').update({
      balance_ngn_kobo: Math.max(0, Number(wallet.balance_ngn_kobo || 0) - Number(request.amount_smallest_unit || 0)),
      locked_ngn_kobo: Math.max(0, Number(wallet.locked_ngn_kobo || 0) - Number(request.amount_smallest_unit || 0)),
      total_withdrawn_ngn_kobo: Number(wallet.total_withdrawn_ngn_kobo || 0) + Number(request.amount_smallest_unit || 0),
      updated_at: approvedAt,
    }).eq('id', wallet.id).select().single();
    if (updateError || !updatedWallet) throw updateError || new Error('Wallet withdrawal update failed');
    await supabase.from('withdrawal_requests').update({ status: 'completed', approved_by: admin.id, approved_at: approvedAt, updated_at: approvedAt }).eq('id', request.id).eq('status', 'pending');
    if (request.transaction_id) await supabase.from('transactions').update({ status: 'completed', approved_by: admin.id, approved_at: approvedAt, updated_at: approvedAt }).eq('id', request.transaction_id);
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
      approved_by: admin.id,
      approved_at: approvedAt,
      description: `Paid withdrawal ${request.reference}`,
      metadata: { bankName: request.bank_name, accountNumber: request.account_number, accountName: request.account_name }
    }).select().single();
    await insertNotificationSafely({ user_id: request.user_id, type: 'withdrawal_approved', title: 'Withdrawal paid', message: `Your ₦${toAmount(request.amount_smallest_unit).toLocaleString()} withdrawal has been marked paid.`, reference_id: request.id, reference_type: 'withdrawal_request', metadata: { reference: request.reference } }, 'Withdrawal approved notification');
    res.json({ success: true, wallet: serializeWalletV1(updatedWallet), transaction: approvedTx ? serializeFinanceTransaction(approvedTx) : null });
  } catch (error: any) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({ error: { code: 'APPROVE_WITHDRAWAL_FAILED', message: error.message || 'Could not approve withdrawal.', timestamp: new Date().toISOString() } });
  }
});

app.post('/api/admin/finance/withdrawals/:id/reject', authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const admin = (req as any).user;
    const { data: request, error: requestError } = await supabase.from('withdrawal_requests').select('*').eq('id', req.params.id).single();
    if (requestError || !request) return res.status(404).json({ error: { code: 'WITHDRAWAL_NOT_FOUND', message: 'Withdrawal request not found.', timestamp: new Date().toISOString() } });
    if (request.status !== 'pending') return res.status(409).json({ error: { code: 'WITHDRAWAL_ALREADY_HANDLED', message: 'This withdrawal request has already been handled.', timestamp: new Date().toISOString() } });
    const { data: wallet, error: walletError } = await supabase.from('wallets').select('*').eq('id', request.wallet_id).single();
    if (walletError || !wallet) throw walletError || new Error('Wallet not found');
    const rejectedAt = new Date().toISOString();
    const { data: updatedWallet, error: updateError } = await supabase.from('wallets').update({
      available_ngn_kobo: Number(wallet.available_ngn_kobo || 0) + Number(request.amount_smallest_unit || 0),
      locked_ngn_kobo: Math.max(0, Number(wallet.locked_ngn_kobo || 0) - Number(request.amount_smallest_unit || 0)),
      updated_at: rejectedAt,
    }).eq('id', wallet.id).select().single();
    if (updateError || !updatedWallet) throw updateError || new Error('Wallet release failed');
    await supabase.from('withdrawal_requests').update({ status: 'rejected', rejected_by: admin.id, rejected_at: rejectedAt, updated_at: rejectedAt }).eq('id', request.id).eq('status', 'pending');
    if (request.transaction_id) await supabase.from('transactions').update({ status: 'rejected', approved_by: admin.id, approved_at: rejectedAt, updated_at: rejectedAt }).eq('id', request.transaction_id);
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
      approved_by: admin.id,
      approved_at: rejectedAt,
      description: `Rejected withdrawal ${request.reference}`,
      metadata: { reason: req.body?.reason || 'Rejected by admin' }
    }).select().single();
    await insertNotificationSafely({ user_id: request.user_id, type: 'withdrawal_rejected', title: 'Withdrawal rejected', message: `Your ₦${toAmount(request.amount_smallest_unit).toLocaleString()} withdrawal was rejected and funds returned.`, reference_id: request.id, reference_type: 'withdrawal_request', metadata: { reference: request.reference } }, 'Withdrawal rejected notification');
    res.json({ success: true, wallet: serializeWalletV1(updatedWallet), transaction: rejectedTx ? serializeFinanceTransaction(rejectedTx) : null });
  } catch (error: any) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({ error: { code: 'REJECT_WITHDRAWAL_FAILED', message: error.message || 'Could not reject withdrawal.', timestamp: new Date().toISOString() } });
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
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
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

