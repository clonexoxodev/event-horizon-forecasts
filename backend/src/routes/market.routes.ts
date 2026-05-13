import { Router, Request, Response } from 'express';
import { MarketService } from '../services/market.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { supabase } from '../db/supabase-client.js';

const router = Router();
const marketService = new MarketService();

/**
 * GET /api/markets
 * Get all active markets
 * Requirements: 7.1, 8.1
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const markets = await marketService.getActiveMarkets();

    // Enrich markets with position counts for popularity indicators
    const marketsWithCounts = await Promise.all(
      markets.map(async (market) => {
        const positionCount = await marketService.getPositionCount(market.id);
        const percentages = marketService.calculatePoolPercentages(market);
        
        return {
          ...market,
          positionCount,
          yesPercentage: percentages.yesPercentage,
          noPercentage: percentages.noPercentage,
          isPopular: positionCount > 100
        };
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
    const enrichedMarkets = popularMarkets.map((market) => {
      const percentages = marketService.calculatePoolPercentages(market);
      return {
        ...market,
        yesPercentage: percentages.yesPercentage,
        noPercentage: percentages.noPercentage,
        isPopular: true
      };
    });

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
    const percentages = marketService.calculatePoolPercentages(market);

    res.json({
      market: {
        ...market,
        positionCount,
        yesPercentage: percentages.yesPercentage,
        noPercentage: percentages.noPercentage,
        isPopular: positionCount > 100
      }
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
