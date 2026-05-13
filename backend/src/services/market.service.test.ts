import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MarketService } from './market.service.js';
import { MarketRepository } from '../repositories/market.repository.js';
import { Market } from '../types/market.js';
import { supabase } from '../db/supabase-client.js';

// Mock the supabase client
vi.mock('../db/supabase-client.js', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('MarketService', () => {
  let marketService: MarketService;
  let mockMarketRepository: MarketRepository;

  beforeEach(() => {
    // Create a mock repository
    mockMarketRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      updatePoolAmounts: vi.fn(),
      transitionToClosed: vi.fn(),
      transitionToResolved: vi.fn(),
      updateState: vi.fn(),
      findByIdInTransaction: vi.fn(),
      updatePoolAmountsInTransaction: vi.fn()
    } as any;

    marketService = new MarketService(mockMarketRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveMarkets', () => {
    it('should return all active markets', async () => {
      const mockMarkets: Market[] = [
        {
          id: '1',
          question: 'Will it rain tomorrow?',
          currency: 'NGN',
          pool_amount_smallest_unit: 100000,
          yes_pool_smallest_unit: 60000,
          no_pool_smallest_unit: 40000,
          min_position_smallest_unit: 1000,
          state: 'active',
          closes_at: new Date('2024-12-31'),
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      vi.mocked(mockMarketRepository.findAll).mockResolvedValue(mockMarkets);

      const result = await marketService.getActiveMarkets();

      expect(mockMarketRepository.findAll).toHaveBeenCalledWith({ state: 'active' });
      expect(result).toEqual(mockMarkets);
    });

    it('should return empty array when no active markets exist', async () => {
      vi.mocked(mockMarketRepository.findAll).mockResolvedValue([]);

      const result = await marketService.getActiveMarkets();

      expect(result).toEqual([]);
    });
  });

  describe('getMarketById', () => {
    it('should return market when found', async () => {
      const mockMarket: Market = {
        id: '1',
        question: 'Will it rain tomorrow?',
        currency: 'NGN',
        pool_amount_smallest_unit: 100000,
        yes_pool_smallest_unit: 60000,
        no_pool_smallest_unit: 40000,
        min_position_smallest_unit: 1000,
        state: 'active',
        closes_at: new Date('2024-12-31'),
        created_at: new Date(),
        updated_at: new Date()
      };

      vi.mocked(mockMarketRepository.findById).mockResolvedValue(mockMarket);

      const result = await marketService.getMarketById('1');

      expect(mockMarketRepository.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockMarket);
    });

    it('should return null when market not found', async () => {
      vi.mocked(mockMarketRepository.findById).mockResolvedValue(null);

      const result = await marketService.getMarketById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getPopularMarkets', () => {
    it('should return markets with more than 100 positions', async () => {
      const mockData = [
        {
          id: '1',
          question: 'Popular market',
          currency: 'NGN',
          pool_amount_smallest_unit: 500000,
          yes_pool_smallest_unit: 300000,
          no_pool_smallest_unit: 200000,
          min_position_smallest_unit: 1000,
          state: 'active',
          closes_at: new Date('2024-12-31'),
          created_at: new Date(),
          updated_at: new Date(),
          positions: [{ count: 150 }]
        },
        {
          id: '2',
          question: 'Unpopular market',
          currency: 'NGN',
          pool_amount_smallest_unit: 50000,
          yes_pool_smallest_unit: 30000,
          no_pool_smallest_unit: 20000,
          min_position_smallest_unit: 1000,
          state: 'active',
          closes_at: new Date('2024-12-31'),
          created_at: new Date(),
          updated_at: new Date(),
          positions: [{ count: 50 }]
        }
      ];

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockData, error: null })
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any);

      const result = await marketService.getPopularMarkets();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].question).toBe('Popular market');
    });

    it('should return empty array when no popular markets exist', async () => {
      const mockData = [
        {
          id: '1',
          question: 'Unpopular market',
          currency: 'NGN',
          pool_amount_smallest_unit: 50000,
          yes_pool_smallest_unit: 30000,
          no_pool_smallest_unit: 20000,
          min_position_smallest_unit: 1000,
          state: 'active',
          closes_at: new Date('2024-12-31'),
          created_at: new Date(),
          updated_at: new Date(),
          positions: [{ count: 50 }]
        }
      ];

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockData, error: null })
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any);

      const result = await marketService.getPopularMarkets();

      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database error' } 
        })
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any);

      await expect(marketService.getPopularMarkets()).rejects.toThrow(
        'Failed to fetch popular markets: Database error'
      );
    });
  });

  describe('getPositionCount', () => {
    it('should return the correct position count', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 150, error: null })
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any);

      const result = await marketService.getPositionCount('market-1');

      expect(result).toBe(150);
    });

    it('should return 0 when no positions exist', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: null, error: null })
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any);

      const result = await marketService.getPositionCount('market-1');

      expect(result).toBe(0);
    });
  });

  describe('resolveMarket', () => {
    it('should resolve market and calculate payouts', async () => {
      const mockMarket: Market = {
        id: '1',
        question: 'Will it rain?',
        currency: 'NGN',
        pool_amount_smallest_unit: 100000,
        yes_pool_smallest_unit: 60000,
        no_pool_smallest_unit: 40000,
        min_position_smallest_unit: 1000,
        state: 'closed',
        closes_at: new Date('2024-12-31'),
        created_at: new Date(),
        updated_at: new Date()
      };

      const resolvedMarket: Market = {
        ...mockMarket,
        state: 'resolved',
        winning_side: 'YES',
        resolved_at: new Date()
      };

      const mockPositions = [
        {
          id: 'pos-1',
          user_id: 'user-1',
          market_id: '1',
          side: 'YES',
          amount_smallest_unit: 30000,
          currency: 'NGN',
          potential_return_smallest_unit: 50000
        },
        {
          id: 'pos-2',
          user_id: 'user-2',
          market_id: '1',
          side: 'NO',
          amount_smallest_unit: 40000,
          currency: 'NGN',
          potential_return_smallest_unit: 0
        }
      ];

      vi.mocked(mockMarketRepository.findById).mockResolvedValue(mockMarket);
      vi.mocked(mockMarketRepository.transitionToResolved).mockResolvedValue(resolvedMarket);

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockPositions, error: null }),
        update: vi.fn().mockReturnThis()
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any);

      const result = await marketService.resolveMarket('1', 'YES');

      expect(result.state).toBe('resolved');
      expect(result.winning_side).toBe('YES');
      expect(mockMarketRepository.transitionToResolved).toHaveBeenCalledWith('1', 'YES');
    });

    it('should throw error when market not found', async () => {
      vi.mocked(mockMarketRepository.findById).mockResolvedValue(null);

      await expect(marketService.resolveMarket('nonexistent', 'YES')).rejects.toThrow(
        'Market not found'
      );
    });

    it('should throw error when market is not closed', async () => {
      const mockMarket: Market = {
        id: '1',
        question: 'Will it rain?',
        currency: 'NGN',
        pool_amount_smallest_unit: 100000,
        yes_pool_smallest_unit: 60000,
        no_pool_smallest_unit: 40000,
        min_position_smallest_unit: 1000,
        state: 'active',
        closes_at: new Date('2024-12-31'),
        created_at: new Date(),
        updated_at: new Date()
      };

      vi.mocked(mockMarketRepository.findById).mockResolvedValue(mockMarket);

      await expect(marketService.resolveMarket('1', 'YES')).rejects.toThrow(
        'Market must be closed before it can be resolved'
      );
    });
  });

  describe('calculatePoolPercentages', () => {
    it('should calculate correct percentages', () => {
      const market: Market = {
        id: '1',
        question: 'Test',
        currency: 'NGN',
        pool_amount_smallest_unit: 100000,
        yes_pool_smallest_unit: 60000,
        no_pool_smallest_unit: 40000,
        min_position_smallest_unit: 1000,
        state: 'active',
        closes_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = marketService.calculatePoolPercentages(market);

      expect(result.yesPercentage).toBe(60);
      expect(result.noPercentage).toBe(40);
    });

    it('should return 50/50 when pool is empty', () => {
      const market: Market = {
        id: '1',
        question: 'Test',
        currency: 'NGN',
        pool_amount_smallest_unit: 0,
        yes_pool_smallest_unit: 0,
        no_pool_smallest_unit: 0,
        min_position_smallest_unit: 1000,
        state: 'active',
        closes_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = marketService.calculatePoolPercentages(market);

      expect(result.yesPercentage).toBe(50);
      expect(result.noPercentage).toBe(50);
    });
  });

  describe('calculatePotentialReturn', () => {
    it('should calculate potential return correctly', () => {
      const market: Market = {
        id: '1',
        question: 'Test',
        currency: 'NGN',
        pool_amount_smallest_unit: 100000,
        yes_pool_smallest_unit: 60000,
        no_pool_smallest_unit: 40000,
        min_position_smallest_unit: 1000,
        state: 'active',
        closes_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = marketService.calculatePotentialReturn(market, 'YES', 10000);

      // New total pool: 110000
      // New YES pool: 70000
      // Share ratio: 10000 / 70000 = 0.142857
      // Potential return: 0.142857 * 110000 = 15714
      expect(result).toBe(15714);
    });

    it('should return amount for first position (empty pool)', () => {
      const market: Market = {
        id: '1',
        question: 'Test',
        currency: 'NGN',
        pool_amount_smallest_unit: 0,
        yes_pool_smallest_unit: 0,
        no_pool_smallest_unit: 0,
        min_position_smallest_unit: 1000,
        state: 'active',
        closes_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = marketService.calculatePotentialReturn(market, 'YES', 10000);

      expect(result).toBe(10000);
    });
  });

  describe('isMarketPopular', () => {
    it('should return true when market has more than 100 positions', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 150, error: null })
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any);

      const result = await marketService.isMarketPopular('market-1');

      expect(result).toBe(true);
    });

    it('should return false when market has 100 or fewer positions', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 100, error: null })
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any);

      const result = await marketService.isMarketPopular('market-1');

      expect(result).toBe(false);
    });
  });

  describe('getMarketsWithPositionCounts', () => {
    it('should return markets with their position counts', async () => {
      const mockData = [
        {
          id: '1',
          question: 'Market 1',
          currency: 'NGN',
          pool_amount_smallest_unit: 100000,
          yes_pool_smallest_unit: 60000,
          no_pool_smallest_unit: 40000,
          min_position_smallest_unit: 1000,
          state: 'active',
          closes_at: new Date('2024-12-31'),
          created_at: new Date(),
          updated_at: new Date(),
          positions: [{ count: 150 }]
        },
        {
          id: '2',
          question: 'Market 2',
          currency: 'USD',
          pool_amount_smallest_unit: 50000,
          yes_pool_smallest_unit: 30000,
          no_pool_smallest_unit: 20000,
          min_position_smallest_unit: 500,
          state: 'active',
          closes_at: new Date('2024-12-31'),
          created_at: new Date(),
          updated_at: new Date(),
          positions: [{ count: 75 }]
        }
      ];

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null })
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any);

      const result = await marketService.getMarketsWithPositionCounts();

      expect(result).toHaveLength(2);
      expect(result[0].positionCount).toBe(150);
      expect(result[1].positionCount).toBe(75);
    });

    it('should handle markets with no positions', async () => {
      const mockData = [
        {
          id: '1',
          question: 'Market 1',
          currency: 'NGN',
          pool_amount_smallest_unit: 0,
          yes_pool_smallest_unit: 0,
          no_pool_smallest_unit: 0,
          min_position_smallest_unit: 1000,
          state: 'active',
          closes_at: new Date('2024-12-31'),
          created_at: new Date(),
          updated_at: new Date(),
          positions: []
        }
      ];

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null })
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any);

      const result = await marketService.getMarketsWithPositionCounts();

      expect(result).toHaveLength(1);
      expect(result[0].positionCount).toBe(0);
    });
  });
});
