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
import orderRoutes from './routes/order.routes.js';
import { normalizeMarketCategory } from './validation/market.validation.js';

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
app.use(express.json({
  verify: (req, _res, buf) => {
    // Capture raw body for webhook signature verification
    (req as any).rawBody = buf;
  },
}));
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
app.use('/api/markets', orderRoutes);

const toAmount = (smallestUnit: number | null | undefined) => Number(smallestUnit || 0) / 100;

const LEADERBOARD_LEVELS = [
  { name: 'Rookie', score: 0 },
  { name: 'Sharp Thinker', score: 5 },
  { name: 'Analyst', score: 18 },
  { name: 'Expert', score: 40 },
  { name: 'Elite Forecaster', score: 70 },
  { name: 'Market Master', score: 120 }
];

const getLeaderboardScore = (totalPredictions: number, wins: number) => totalPredictions + wins * 2;

const getLeaderboardLevel = (totalPredictions: number, wins: number) => {
  const score = getLeaderboardScore(totalPredictions, wins);
  return [...LEADERBOARD_LEVELS].reverse().find((level) => score >= level.score)?.name || 'Rookie';
};

const buildRealLeaderboard = async (limit = 10) => {
  const { data: positions, error: positionsError } = await supabase
    .from('positions')
    .select('user_id, amount_smallest_unit, is_winner, resolved_at, status, created_at');

  if (positionsError) throw positionsError;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*');

  const profileByUserId = new Map<string, any>();
  for (const profile of profiles || []) {
    profileByUserId.set(profile.user_id || profile.id, profile);
  }

  const byUser = new Map<string, {
    userId: string;
    totalPredictions: number;
    resolvedPredictions: number;
    wins: number;
    losses: number;
    totalStakedSmallestUnit: number;
    lastPredictionAt: string | null;
  }>();

  for (const position of positions || []) {
    if (!position.user_id) continue;
    const current = byUser.get(position.user_id) || {
      userId: position.user_id,
      totalPredictions: 0,
      resolvedPredictions: 0,
      wins: 0,
      losses: 0,
      totalStakedSmallestUnit: 0,
      lastPredictionAt: null
    };

    current.totalPredictions += 1;
    current.totalStakedSmallestUnit += Number(position.amount_smallest_unit || 0);
    if (!current.lastPredictionAt || new Date(position.created_at).getTime() > new Date(current.lastPredictionAt).getTime()) {
      current.lastPredictionAt = position.created_at;
    }

    const isResolved = Boolean(position.resolved_at) || ['won', 'lost', 'settled'].includes(String(position.status || '').toLowerCase());
    if (isResolved) {
      current.resolvedPredictions += 1;
      if (position.is_winner) current.wins += 1;
      else current.losses += 1;
    }

    byUser.set(position.user_id, current);
  }

  const ranked = [...byUser.values()]
    .map((row) => {
      const profile = profileByUserId.get(row.userId);
      const accuracy = row.resolvedPredictions > 0 ? Math.round((row.wins / row.resolvedPredictions) * 100) : 0;
      const score = getLeaderboardScore(row.totalPredictions, row.wins);
      return {
        userId: row.userId,
        username: profile?.username || profile?.display_name || profile?.email?.split('@')[0] || 'Forecaster',
        displayName: profile?.display_name || profile?.username || profile?.email?.split('@')[0] || 'Forecaster',
        avatarUrl: profile?.avatar_url || profile?.profile_image_url || null,
        rank: 0,
        level: getLeaderboardLevel(row.totalPredictions, row.wins),
        score,
        totalPredictions: row.totalPredictions,
        resolvedPredictions: row.resolvedPredictions,
        wins: row.wins,
        losses: row.losses,
        accuracy,
        totalStaked: toAmount(row.totalStakedSmallestUnit),
        lastPredictionAt: row.lastPredictionAt
      };
    })
    .sort((a, b) => (
      b.score - a.score ||
      b.accuracy - a.accuracy ||
      b.totalPredictions - a.totalPredictions ||
      b.totalStaked - a.totalStaked
    ))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return {
    entries: ranked.slice(0, Math.max(1, Math.min(100, limit))),
    allEntries: ranked,
    totalRankedUsers: ranked.length
  };
};

const normalizePosition = (position: any) => {
  const market = position.markets || {};
  const yesPrice = Number(market.yes_price ?? market.starting_yes_price ?? 50);
  const noPrice = Number(market.no_price ?? market.starting_no_price ?? (100 - yesPrice));
  const currentPrice = position.side === 'YES' ? yesPrice : noPrice;
  const stake = toAmount(position.amount_smallest_unit ?? position.stake);
  const sharesReceived = Number(position.shares_owned || position.shares_received || 0);
  const finalPayout = toAmount(position.settlement_payout_smallest_unit ?? position.final_payout_smallest_unit ?? position.payout_smallest_unit);
  const liveValue = sharesReceived > 0 ? (sharesReceived * currentPrice) : 0;
  const status = position.status || (position.resolved_at ? (position.is_winner ? 'won' : 'lost') : 'active');
  const sideShares = position.side === 'YES'
    ? Number(market.total_yes_shares || 0)
    : Number(market.total_no_shares || 0);
  const currentValue = finalPayout || liveValue || toAmount(position.current_value_smallest_unit) || stake;

  return {
    id: position.id,
    userId: position.user_id,
    marketId: position.market_id,
    side: position.side,
    stake,
    entryPrice: Number(position.entry_price ?? currentPrice),
    currentPrice,
    sharesReceived,
    sharesOwned: sharesReceived,
    ownershipPercent: Number(position.ownership_percent || (sideShares > 0 ? (sharesReceived / sideShares) * 100 : 0)),
    currentValue,
    positionValue: currentValue,
    unrealizedPnl: currentValue - stake,
    finalPayout,
    payout: toAmount(position.payout_smallest_unit),
    profit: toAmount(position.profit_smallest_unit),
    status,
    isWinner: position.is_winner,
    marketQuestion: market.question || position.market_question_snapshot || 'Market unavailable',
    marketIcon: market.icon || '',
    category: normalizeMarketCategory(market.category || position.market_category_snapshot),
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
    return res.json({ positions, count: positions.length });
  } catch (error) {
    console.error('Get positions error:', error);
    return res.status(500).json({ error: { code: 'GET_POSITIONS_FAILED', message: 'Failed to fetch positions' } });
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

    return res.json({ activity });
  } catch (error) {
    console.error('Get activity error:', error);
    return res.status(500).json({ error: { code: 'GET_ACTIVITY_FAILED', message: 'Failed to fetch activity' } });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 10);
    const leaderboard = await buildRealLeaderboard(limit);
    return res.json({
      leaderboard: leaderboard.entries,
      totalRankedUsers: leaderboard.totalRankedUsers
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return res.status(500).json({ error: { code: 'GET_LEADERBOARD_FAILED', message: 'Failed to fetch leaderboard' } });
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
    const leaderboard = await buildRealLeaderboard(100);
    const currentRank = leaderboard.allEntries.find((entry) => entry.userId === req.user?.userId) || null;

    return res.json({
      stats: {
        totalPredictions,
        activePredictions,
        wonPredictions,
        winRate: totalPredictions > 0 ? Math.round((wonPredictions / totalPredictions) * 100) : 0,
        totalStaked,
        totalEarnings,
        rank: currentRank?.rank || null,
        score: currentRank?.score || getLeaderboardScore(totalPredictions, wonPredictions),
        level: currentRank?.level || getLeaderboardLevel(totalPredictions, wonPredictions),
        totalRankedUsers: leaderboard.totalRankedUsers
      }
    });
  } catch (error) {
    console.error('Get profile stats error:', error);
    return res.status(500).json({ error: { code: 'GET_PROFILE_STATS_FAILED', message: 'Failed to fetch profile stats' } });
  }
});

// Root endpoint
app.get('/', (_req, res) => {
  return res.json({
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
app.get('/api/health', (_req, res) => {
  return res.json({ status: 'ok', message: 'Prediction Platform API is running' });
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
