import { Router, Request, Response } from 'express';
import { MarketService } from '../services/market.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { supabase } from '../db/supabase-client.js';

const router = Router();
const marketService = new MarketService();

const toAmount = (smallestUnit: number | null | undefined) => Number(smallestUnit || 0) / 100;
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
    return {
      yesPrice: starting.yesPrice,
      noPrice: starting.noPrice,
      yesVolume,
      noVolume,
      totalVolume,
      yesShares,
      noShares
    };
  }

  const activityTargetYes = (yesVolume / totalVolume) * 100;
  const activityWeight = Math.min(0.95, totalVolume / (totalVolume + 500000)); // 500k kobo / ₦5,000 soft depth.
  const yesPrice = clampPrice((starting.yesPrice * (1 - activityWeight)) + (activityTargetYes * activityWeight));

  return {
    yesPrice,
    noPrice: roundPrice(100 - yesPrice),
    yesVolume,
    noVolume,
    totalVolume,
    yesShares,
    noShares
  };
};

const calculateOwnershipTrade = (market: any, side: 'YES' | 'NO', amountSmallestUnit: number) => {
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

const normalizePredictionSide = (side: unknown): 'YES' | 'NO' | null => {
  const normalizedSide = String(side || '').toUpperCase();
  if (normalizedSide === 'YES' || normalizedSide === 'UP') return 'YES';
  if (normalizedSide === 'NO' || normalizedSide === 'DOWN') return 'NO';
  return null;
};

type PriceHistoryPoint = {
  timestamp: string;
  yesPrice: number;
  noPrice: number;
  yesPool?: number;
  noPool?: number;
  volume?: number;
  tradeCount?: number;
  side?: 'YES' | 'NO' | null;
  amount?: number;
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

  // Older Supabase projects may not have the side/amount columns yet. Keep the
  // chart write durable and let the migration add richer metadata safely.
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

const getCloseTime = (market: any) => market.closes_at || market.close_date || market.close_time || '';

const isPastClose = (market: any) => {
  const closeTime = getCloseTime(market);
  return closeTime ? new Date(closeTime).getTime() <= Date.now() : false;
};

const autoCloseExpiredMarket = async (market: any) => {
  const status = market.status || market.state || 'active';
  if (!['active', 'open'].includes(status) || !isPastClose(market)) return market;

  const { data, error } = await supabase
    .from('markets')
    .update({ status: 'pending_resolution', state: 'closed', updated_at: new Date().toISOString() })
    .eq('id', market.id)
    .select()
    .single();

  if (error) {
    console.warn('Failed to auto-close expired market:', error.message);
    return { ...market, status: 'pending_resolution', state: 'closed' };
  }

  return data || { ...market, status: 'pending_resolution', state: 'closed' };
};

const fetchStoredPriceHistory = async (marketId: string): Promise<PriceHistoryPoint[]> => {
  const baseSelect = 'created_at, yes_price, no_price, yes_pool_smallest_unit, no_pool_smallest_unit, volume_smallest_unit, trade_count';
  const withTradeMetaSelect = `${baseSelect}, side, amount_smallest_unit`;

  let { data, error }: { data: any[] | null; error: any } = await supabase
    .from('market_price_history')
    .select(withTradeMetaSelect)
    .eq('market_id', marketId)
    .order('created_at', { ascending: true });

  if (error && /side|amount_smallest_unit/i.test(error.message || '')) {
    const retry = await supabase
      .from('market_price_history')
      .select(baseSelect)
      .eq('market_id', marketId)
      .order('created_at', { ascending: true });
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.warn('Failed to fetch market price history:', error.message);
    return [];
  }

  return (data || []).map((point: any) => ({
    timestamp: point.created_at,
    yesPrice: Number(point.yes_price),
    noPrice: Number(point.no_price),
    yesPool: toAmount(point.yes_pool_smallest_unit),
    noPool: toAmount(point.no_pool_smallest_unit),
    volume: toAmount(point.volume_smallest_unit),
    tradeCount: Number(point.trade_count || 0),
    side: normalizePredictionSide(point.side),
    amount: toAmount(point.amount_smallest_unit)
  }));
};

const buildTradeDerivedPriceHistory = async (market: any): Promise<PriceHistoryPoint[]> => {
  const marketId = market.id || market;
  const { data, error } = await supabase
    .from('market_trades')
    .select('created_at, side, amount_smallest_unit, price_before, price_after, yes_price_after, no_price_after')
    .eq('market_id', marketId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('Failed to fetch market trades for price history:', error.message);
    return [];
  }

  const trades = data || [];
  if (!trades.length) return [];

  const firstTrade = trades[0] as any;
  const firstSide = normalizePredictionSide(firstTrade.side) || 'YES';
  const sidePriceBefore = Number(firstTrade.price_before || 50);
  const startingYesPrice = firstSide === 'YES'
    ? sidePriceBefore
    : 100 - sidePriceBefore;
  const startingNoPrice = 100 - startingYesPrice;
  const firstTimestamp = new Date(firstTrade.created_at).getTime();
  const startTimestamp = Number.isFinite(firstTimestamp)
    ? new Date(firstTimestamp - 1000).toISOString()
    : (market.created_at || new Date().toISOString());

  let cumulativeVolume = 0;
  const points: PriceHistoryPoint[] = [{
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

const fetchPriceHistory = async (marketOrId: any): Promise<PriceHistoryPoint[]> => {
  const marketId = typeof marketOrId === 'string' ? marketOrId : marketOrId.id;
  const [storedHistory, tradeDerivedHistory] = await Promise.all([
    fetchStoredPriceHistory(marketId),
    typeof marketOrId === 'string' ? Promise.resolve([]) : buildTradeDerivedPriceHistory(marketOrId)
  ]);

  if (tradeDerivedHistory.length > storedHistory.length) {
    return tradeDerivedHistory;
  }

  return storedHistory;
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

const normalizeMarket = (market: any, positionCount = 0, priceHistory: Array<{ timestamp: string; yesPrice: number; noPrice: number; yesPool?: number; noPool?: number; volume?: number }> = []) => {
  const state = getOwnershipState(market);
  const totalPoolSmallestUnit = Number(
    market.total_volume_smallest_unit ?? market.pool_amount_smallest_unit ?? market.pool ?? state.totalVolume
  ) || state.totalVolume;
  const closeTime = getCloseTime(market);
  const status = market.status || market.state || 'active';

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
    tradeCount: Number(market.trade_count ?? market.tradeCount ?? priceHistory.length ?? 0),
    yesPrice: state.yesPrice,
    noPrice: state.noPrice,
    startingYesPrice: getStartingPrices(market).yesPrice,
    startingNoPrice: getStartingPrices(market).noPrice,
    closeTime,
    status: status === 'open' ? 'active' : status,
    rules: market.rules || market.resolution_instructions || '',
    minAmount: toAmount(market.min_position_smallest_unit),
    maxAmount: toAmount(market.max_position_smallest_unit),
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
  // Pool-safe projection: active positions estimate what this position would
  // receive if the market resolved now. Price is only sentiment/entry math.
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
    currentValue: finalPayout || projectedPayout || stake,
    positionValue: finalPayout || projectedPayout || stake,
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
    createdAt: position.created_at,
    isListed: false
  };
};

/**
 * GET /api/markets
 * Get all active markets
 * Requirements: 7.1, 8.1
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data: rawMarkets, error } = await supabase
      .from('markets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch markets: ' + error.message);
    }

    const normalizedRawMarkets = await Promise.all((rawMarkets || []).map(autoCloseExpiredMarket));
    const markets = normalizedRawMarkets.filter((market) => {
      const status = market.status || market.state || 'active';
      return (status === 'active' || status === 'open') && !isPastClose(market);
    });

    // Enrich markets with position counts for popularity indicators
    const marketsWithCounts = await Promise.all(
      markets.map(async (market) => {
        const [positionCount, priceHistory] = await Promise.all([
          marketService.getPositionCount(market.id),
          ensureInitialPriceHistory(market)
        ]);
        return normalizeMarket(market, positionCount, priceHistory);
      })
    );

    res.json({
      markets: marketsWithCounts,
      count: marketsWithCounts.length
    });
  } catch (error) {
    console.error('Get markets error:', error);
    
    res.status(500).json({
      error: {
        code: 'GET_MARKETS_FAILED',
        message: 'Failed to fetch markets. Please try again.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/markets/popular
 * Get popular markets (markets with more than 100 positions)
 * Requirements: 19.1
 */
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const popularMarkets = await marketService.getPopularMarkets();

    // Enrich with percentages
    const enrichedMarkets = popularMarkets.map((market) => normalizeMarket(market, 0));

    res.json({
      markets: enrichedMarkets,
      count: enrichedMarkets.length
    });
  } catch (error) {
    console.error('Get popular markets error:', error);
    
    res.status(500).json({
      error: {
        code: 'GET_POPULAR_MARKETS_FAILED',
        message: 'Failed to fetch popular markets. Please try again.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/markets/:id
 * Get market details by ID
 * Requirements: 8.1, 15.1
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const market = await marketService.getMarketById(id);

    if (!market) {
      return res.status(404).json({
        error: {
          code: 'MARKET_NOT_FOUND',
          message: 'Market not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Enrich with additional data
    const [positionCount, priceHistory] = await Promise.all([
      marketService.getPositionCount(market.id),
      ensureInitialPriceHistory(market)
    ]);
    res.json({
      market: normalizeMarket(market, positionCount, priceHistory)
    });
  } catch (error) {
    console.error('Get market error:', error);
    
    res.status(500).json({
      error: {
        code: 'GET_MARKET_FAILED',
        message: 'Failed to fetch market. Please try again.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

router.get('/:id/price-history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const market = await marketService.getMarketById(id);

    if (!market) {
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

/**
 * POST /api/markets/:id/predictions
 * Place a prediction through the backend only.
 */
router.post('/:id/predictions', authMiddleware.authenticate, async (req: Request, res: Response) => {
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

    const { id } = req.params as { id: string };
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

    const market = await marketService.getMarketById(id);

    if (!market) {
      return res.status(404).json({
        error: {
          code: 'MARKET_NOT_FOUND',
          message: 'Market not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const marketStatus = (market as any).status || (market as any).state || 'active';
    const closesAt = (market as any).closes_at || (market as any).close_time;
    const isClosedByTime = closesAt ? new Date(closesAt).getTime() <= Date.now() : false;
    if (!['active', 'open'].includes(marketStatus) || isClosedByTime) {
      if (isClosedByTime && ['active', 'open'].includes(marketStatus)) {
        await supabase
          .from('markets')
          .update({ status: 'pending_resolution', state: 'closed', updated_at: new Date().toISOString() })
          .eq('id', id);
      }
      return res.status(422).json({
        error: {
          code: 'MARKET_NOT_ACTIVE',
          message: 'This market is not accepting predictions',
          timestamp: new Date().toISOString()
        }
      });
    }

    const minPosition = Number((market as any).min_position_smallest_unit || 0);
    const maxPosition = Number((market as any).max_position_smallest_unit || 0);
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
      .eq('user_id', req.user.userId)
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

    const trade = calculateOwnershipTrade(market, side, amountSmallestUnit);
    const currentVolume = Number((market as any).total_volume_smallest_unit || 0);
    const nextTradeCount = Number((market as any).trade_count || 0) + 1;
    const entryPrice = trade.entryPrice;

    let positionResult = await supabase
      .from('positions')
      .insert({
        user_id: req.user.userId,
        market_id: id,
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
        current_price: trade.currentPrice,
        current_value_smallest_unit: trade.positionValueSmallestUnit,
        ownership_percent: trade.ownershipPercent,
        market_question_snapshot: (market as any).question || null,
        market_category_snapshot: (market as any).category || null,
        status: 'active',
        entry_price: entryPrice
      })
      .select()
      .single();

    if (positionResult.error?.message?.includes('entry_price')) {
      positionResult = await supabase
        .from('positions')
        .insert({
          user_id: req.user.userId,
          market_id: id,
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

    if (positionResult.error || !positionResult.data) {
      throw new Error(`Failed to create position: ${positionResult.error?.message || 'No data returned'}`);
    }
    const position = { ...positionResult.data, entry_price: entryPrice };

    const { data: updatedWallet, error: updateWalletError } = await supabase
      .from('wallets')
      .update({
        [balanceField]: Number(wallet[balanceField] || 0) - amountSmallestUnit,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id)
      .select()
      .single();

    if (updateWalletError || !updatedWallet) {
      throw new Error(`Failed to update wallet: ${updateWalletError?.message || 'No data returned'}`);
    }

    const { data: updatedMarket, error: updateMarketError } = await supabase
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
        yes_price: trade.after.yesPrice,
        no_price: trade.after.noPrice,
        trade_count: nextTradeCount,
        total_volume_smallest_unit: currentVolume + amountSmallestUnit,
        pricing_model: 'ownership_shares',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateMarketError || !updatedMarket) {
      throw new Error(`Failed to update market: ${updateMarketError?.message || 'No data returned'}`);
    }

    const { data: participantRows } = await supabase
      .from('positions')
      .select('user_id')
      .eq('market_id', id);
    const participantCount = new Set((participantRows || []).map((row: any) => row.user_id)).size;
    const { data: countedMarket } = await supabase
      .from('markets')
      .update({ participant_count: participantCount })
      .eq('id', id)
      .select()
      .single();
    const marketForResponse = countedMarket || updatedMarket;

    await supabase
      .from('market_trades')
      .insert({
        market_id: id,
        user_id: req.user.userId,
        position_id: position.id,
        side,
        amount_smallest_unit: amountSmallestUnit,
        price_before: entryPrice,
        price_after: trade.currentPrice,
        yes_price_after: trade.after.yesPrice,
        no_price_after: trade.after.noPrice,
        currency
      });

    await savePriceHistory(id, trade.after.yesPrice, trade.after.noPrice, trade.nextYesVolume, trade.nextNoVolume, currentVolume + amountSmallestUnit, nextTradeCount, side, amountSmallestUnit);
    await supabase.from('market_activity_events').insert({
      user_id: req.user.userId,
      market_id: id,
      position_id: position.id,
      event_type: side === 'YES' ? 'bought_yes' : 'bought_no',
      side,
      amount_smallest_unit: amountSmallestUnit,
      price: entryPrice,
      shares: trade.sharesOwned,
      position_value_smallest_unit: trade.positionValueSmallestUnit,
      metadata: {
        marketQuestion: (market as any).question || null,
        currentPrice: trade.currentPrice,
        ownershipPercent: trade.ownershipPercent
      }
    });
    const priceHistory = await fetchPriceHistory(marketForResponse);

    const { data: transaction } = await supabase
      .from('transactions')
      .insert({
        user_id: req.user.userId,
        wallet_id: wallet.id,
        type: 'position_entry',
        amount_smallest_unit: amountSmallestUnit,
        currency,
        direction: 'OUT',
        reference_id: position.id,
        reference_type: 'position',
        status: 'completed',
        metadata: {
          marketId: id,
          marketQuestion: (updatedMarket as any).question || (market as any).question || null,
          category: (updatedMarket as any).category || (market as any).category || null,
          side,
          entryPrice,
          sharesOwned: trade.sharesOwned,
          positionValueSmallestUnit: trade.positionValueSmallestUnit,
          ownershipPercent: trade.ownershipPercent,
          yesPriceBefore: trade.before.yesPrice,
          noPriceBefore: trade.before.noPrice,
          yesPriceAfter: trade.after.yesPrice,
          noPriceAfter: trade.after.noPrice,
          priceChange: trade.priceChange
        }
      })
      .select()
      .single();

    await insertNotificationSafely({
      user_id: req.user.userId,
      type: 'forecast_confirmed',
      title: 'Prediction placed',
      message: `Your ${side} prediction on "${(updatedMarket as any).question || (market as any).question}" is active.`,
      reference_id: id,
      reference_type: 'market',
      metadata: {
        marketId: id,
        marketQuestion: (updatedMarket as any).question || (market as any).question || null,
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
      market: {
        ...normalizeMarket(marketForResponse, 0, priceHistory),
      },
      wallet: {
        id: updatedWallet.id,
        userId: updatedWallet.user_id,
        balanceNgnKobo: updatedWallet.balance_ngn_kobo,
        balanceUsdCents: updatedWallet.balance_usd_cents,
        availableNgnKobo: updatedWallet.available_ngn_kobo,
        availableUsdCents: updatedWallet.available_usd_cents,
        balanceNgn: toAmount(updatedWallet.balance_ngn_kobo),
        balanceUsd: toAmount(updatedWallet.balance_usd_cents),
        availableNgn: toAmount(updatedWallet.available_ngn_kobo),
        availableUsd: toAmount(updatedWallet.available_usd_cents)
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
        message: 'Failed to place prediction. Please try again.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/markets/:id/positions
 * Get all positions for a specific market
 * Requirements: 15.1
 * Authentication required to see position details
 */
router.get('/:id/positions', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    // Verify market exists
    const market = await marketService.getMarketById(id);
    if (!market) {
      return res.status(404).json({
        error: {
          code: 'MARKET_NOT_FOUND',
          message: 'Market not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get all positions for this market
    const { data: positions, error } = await supabase
      .from('positions')
      .select(`
        id,
        user_id,
        market_id,
        side,
        amount_smallest_unit,
        currency,
        potential_return_smallest_unit,
        is_winner,
        payout_smallest_unit,
        created_at,
        resolved_at
      `)
      .eq('market_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch positions: ' + error.message);
    }

    res.json({
      positions: positions || [],
      count: positions?.length || 0,
      marketId: id
    });
  } catch (error) {
    console.error('Get market positions error:', error);
    
    res.status(500).json({
      error: {
        code: 'GET_POSITIONS_FAILED',
        message: 'Failed to fetch market positions. Please try again.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;

