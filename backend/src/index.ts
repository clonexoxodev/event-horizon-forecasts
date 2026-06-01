import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { supabase, testSupabaseConnection } from './db/supabase-client.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import authRoutes from './routes/auth.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import marketRoutes from './routes/market.routes.js';
import adminRoutes from './routes/admin.routes.js';
import adminMarketRoutes from './routes/admin-market.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import usersRoutes from './routes/users.routes.js';
import profileRoutes from './routes/profile.routes.js';

dotenv.config();

const app = express();
const defaultAllowedOrigins = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8082',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://event-horizon-forecasts.vercel.app',
];
const configuredAllowedOrigins = `${process.env.FRONTEND_URL || ''},${process.env.FRONTEND_URLS || ''}`;
const allowedOrigins = `${defaultAllowedOrigins.join(',')},${configuredAllowedOrigins}`
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .filter((origin, index, origins) => origins.indexOf(origin) === index);

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/markets', adminMarketRoutes);

const toAmount = (smallestUnit: number | null | undefined) => Number(smallestUnit || 0) / 100;

const normalizePosition = (position: any) => {
  const market = position.markets || {};
  const yesPool = Number(market.yes_pool_smallest_unit ?? market.yes_pool ?? 0);
  const noPool = Number(market.no_pool_smallest_unit ?? market.no_pool ?? 0);
  const totalPool = Number(market.pool_amount_smallest_unit ?? market.pool ?? yesPool + noPool);
  const yesPrice = totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : Number(market.yes_price ?? 50);
  const currentPrice = position.side === 'YES' ? yesPrice : 100 - yesPrice;
  const stake = toAmount(position.amount_smallest_unit ?? position.stake);
  const sharesReceived = Number(position.shares_received || 0);
  const finalPayout = toAmount(position.final_payout_smallest_unit ?? position.payout_smallest_unit);
  const liveValue = sharesReceived > 0 ? (sharesReceived * currentPrice) : 0;
  const status = position.status || (position.resolved_at ? (position.is_winner ? 'won' : 'lost') : 'active');

  return {
    id: position.id,
    userId: position.user_id,
    marketId: position.market_id,
    side: position.side,
    stake,
    entryPrice: Number(position.entry_price ?? currentPrice),
    currentPrice,
    sharesReceived,
    currentValue: finalPayout || liveValue || toAmount(position.estimated_payout_smallest_unit ?? position.potential_return_smallest_unit) || stake,
    estimatedPayout: toAmount(position.estimated_payout_smallest_unit ?? position.potential_return_smallest_unit),
    estimatedProfit: toAmount(position.estimated_profit_smallest_unit),
    finalPayout,
    payout: toAmount(position.payout_smallest_unit),
    profit: toAmount(position.profit_smallest_unit),
    status,
    isWinner: position.is_winner,
    marketQuestion: market.question || position.market_question_snapshot || 'Market unavailable',
    marketIcon: market.icon || '',
    category: market.category || position.market_category_snapshot || 'General',
    marketStatus: market.state || market.status || 'active',
    resolvedAt: position.resolved_at || position.settled_at || null,
    createdAt: position.created_at,
    isListed: false
  };
};

app.get('/api/positions', authMiddleware.authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
    }

    const { data, error } = await supabase
      .from('positions')
      .select('*, markets (*)')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const positions = (data || []).map(normalizePosition);
    res.json({ positions, count: positions.length });
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ error: { code: 'GET_POSITIONS_FAILED', message: 'Failed to fetch positions' } });
  }
});

app.get('/api/activity', authMiddleware.authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const activity = (data || []).map((tx) => ({
      id: tx.id,
      type: tx.type,
      label: String(tx.type).replace(/_/g, ' '),
      amount: toAmount(tx.amount_smallest_unit),
      currency: tx.currency,
      direction: tx.direction,
      status: tx.status,
      createdAt: tx.created_at
    }));

    res.json({ activity });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: { code: 'GET_ACTIVITY_FAILED', message: 'Failed to fetch activity' } });
  }
});

app.get('/api/profile/stats', authMiddleware.authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
    }

    const { data: positions, error: positionsError } = await supabase
      .from('positions')
      .select('amount_smallest_unit, payout_smallest_unit, is_winner, resolved_at')
      .eq('user_id', req.user.userId);

    if (positionsError) throw positionsError;

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
    res.status(500).json({ error: { code: 'GET_PROFILE_STATS_FAILED', message: 'Failed to fetch profile stats' } });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Prediction Platform API', 
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      wallet: '/api/wallet/*',
      markets: '/api/markets/*',
      admin: '/api/admin/*'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Prediction Platform API is running' });
});

const PORT = process.env.PORT || 5000;

// Start server first so local health checks work even if Supabase is slow.
async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Supabase client ready`);
    });

    void testSupabaseConnection().then((dbConnected) => {
      if (!dbConnected) {
        console.error('Failed to connect to Supabase. Please check your Supabase configuration.');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if not in serverless environment
if (process.env.VERCEL !== '1') {
  startServer();
}

export { app };
