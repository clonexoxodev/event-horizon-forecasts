import { Router, Request, Response } from 'express';
import { MarketService } from '../services/market.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { supabase } from '../db/supabase-client.js';

const router = Router();
const marketService = new MarketService();

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
  const closeTime = market.closes_at || market.close_date || market.close_time || '';
  const status = market.status || market.state || 'active';

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

    const markets = (rawMarkets || []).filter((market) => {
      const status = market.status || market.state || 'active';
      return status === 'active' || status === 'open';
    });

    // Enrich markets with position counts for popularity indicators
    const marketsWithCounts = await Promise.all(
      markets.map(async (market) => {
        const positionCount = await marketService.getPositionCount(market.id);
        return normalizeMarket(market, positionCount);
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
    const { id } = req.params;

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
    const positionCount = await marketService.getPositionCount(market.id);
    res.json({
      market: normalizeMarket(market, positionCount)
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

    const { id } = req.params;
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

    const marketStatus = (market as any).state || (market as any).status || 'active';
    const closesAt = (market as any).closes_at || (market as any).close_time;
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

    const yesPool = Number((market as any).yes_pool_smallest_unit ?? (market as any).yes_pool ?? 0);
    const noPool = Number((market as any).no_pool_smallest_unit ?? (market as any).no_pool ?? 0);
    const currentTotal = Number((market as any).pool_amount_smallest_unit ?? (market as any).pool ?? yesPool + noPool);
    const nextYesPool = side === 'YES' ? yesPool + amountSmallestUnit : yesPool;
    const nextNoPool = side === 'NO' ? noPool + amountSmallestUnit : noPool;
    const nextTotal = currentTotal + amountSmallestUnit;
    const pricesBefore = calculateBoundedPrices(yesPool, noPool);
    const pricesAfter = calculateBoundedPrices(nextYesPool, nextNoPool);
    const entryPrice = side === 'YES' ? pricesAfter.yesPrice : pricesAfter.noPrice;
    const potentialReturn = calculatePotentialReturn(amountSmallestUnit, entryPrice);
    const priceChange = (side === 'YES' ? pricesAfter.yesPrice - pricesBefore.yesPrice : pricesAfter.noPrice - pricesBefore.noPrice);

    let positionResult = await supabase
      .from('positions')
      .insert({
        user_id: req.user.userId,
        market_id: id,
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
          user_id: req.user.userId,
          market_id: id,
          side,
          amount_smallest_unit: amountSmallestUnit,
          currency,
          potential_return_smallest_unit: potentialReturn
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
        yes_pool_smallest_unit: nextYesPool,
        no_pool_smallest_unit: nextNoPool,
        pool_amount_smallest_unit: nextTotal
      })
      .eq('id', id)
      .select()
      .single();

    if (updateMarketError || !updatedMarket) {
      throw new Error(`Failed to update market: ${updateMarketError?.message || 'No data returned'}`);
    }

    await savePriceHistory(id, pricesAfter.yesPrice, pricesAfter.noPrice, nextYesPool, nextNoPool);

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
        ...normalizeMarket(updatedMarket, 0),
        priceHistory: [{
          timestamp: new Date().toISOString(),
          yesPrice: pricesAfter.yesPrice,
          noPrice: pricesAfter.noPrice
        }]
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
    const { id } = req.params;

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
