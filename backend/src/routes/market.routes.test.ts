import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import marketRoutes from './market.routes.js';
import { MarketService } from '../services/market.service.js';
import { supabase } from '../db/supabase-client.js';
import jwt from 'jsonwebtoken';

// Mock the dependencies
vi.mock('../services/market.service.js');
vi.mock('../db/supabase-client.js');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/markets', marketRoutes);

describe('Market Routes', () => {
  let mockMarketService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMarketService = {
      getActiveMarkets: vi.fn(),
      getMarketById: vi.fn(),
      getPopularMarkets: vi.fn(),
      getPositionCount: vi.fn(),
      calculatePoolPercentages: vi.fn()
    };
    
    // Replace the MarketService constructor to return our mock
    vi.mocked(MarketService).mockImplementation(() => mockMarketService);
  });

  describe('GET /api/markets', () => {
    it('should return all active markets with enriched data', async () => {
      const mockMarkets = [
        {
          id: 'market-1',
          question: 'Will it rain tomorrow?',
          currency: 'NGN',
          pool_amount_smallest_unit: 100000,
          yes_pool_smallest_unit: 60000,
          no_pool_smallest_unit: 40000,
          state: 'active',
          closes_at: new Date('2024-12-31'),
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockMarketService.getActiveMarkets.mockResolvedValue(mockMarkets);
      mockMarketService.getPositionCount.mockResolvedValue(50);
      mockMarketService.calculatePoolPercentages.mockReturnValue({
        yesPercentage: 60,
        noPercentage: 40
      });

      const response = await request(app).get('/api/markets');

      expect(response.status).toBe(200);
      expect(response.body.markets).toHaveLength(1);
      expect(response.body.markets[0]).toMatchObject({
        id: 'market-1',
        question: 'Will it rain tomorrow?',
        positionCount: 50,
        yesPercentage: 60,
        noPercentage: 40,
        isPopular: false
      });
      expect(mockMarketService.getActiveMarkets).toHaveBeenCalledOnce();
    });

    it('should mark markets with >100 positions as popular', async () => {
      const mockMarkets = [
        {
          id: 'market-1',
          question: 'Popular market?',
          currency: 'NGN',
          pool_amount_smallest_unit: 100000,
          yes_pool_smallest_unit: 60000,
          no_pool_smallest_unit: 40000,
          state: 'active',
          closes_at: new Date('2024-12-31'),
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockMarketService.getActiveMarkets.mockResolvedValue(mockMarkets);
      mockMarketService.getPositionCount.mockResolvedValue(150);
      mockMarketService.calculatePoolPercentages.mockReturnValue({
        yesPercentage: 60,
        noPercentage: 40
      });

      const response = await request(app).get('/api/markets');

      expect(response.status).toBe(200);
      expect(response.body.markets[0].isPopular).toBe(true);
      expect(response.body.markets[0].positionCount).toBe(150);
    });

    it('should handle errors gracefully', async () => {
      mockMarketService.getActiveMarkets.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get('/api/markets');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('GET_MARKETS_FAILED');
    });
  });

  describe('GET /api/markets/popular', () => {
    it('should return only popular markets', async () => {
      const mockPopularMarkets = [
        {
          id: 'market-1',
          question: 'Popular market?',
          currency: 'NGN',
          pool_amount_smallest_unit: 100000,
          yes_pool_smallest_unit: 60000,
          no_pool_smallest_unit: 40000,
          state: 'active',
          closes_at: new Date('2024-12-31'),
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockMarketService.getPopularMarkets.mockResolvedValue(mockPopularMarkets);
      mockMarketService.calculatePoolPercentages.mockReturnValue({
        yesPercentage: 60,
        noPercentage: 40
      });

      const response = await request(app).get('/api/markets/popular');

      expect(response.status).toBe(200);
      expect(response.body.markets).toHaveLength(1);
      expect(response.body.markets[0].isPopular).toBe(true);
      expect(mockMarketService.getPopularMarkets).toHaveBeenCalledOnce();
    });

    it('should handle errors gracefully', async () => {
      mockMarketService.getPopularMarkets.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get('/api/markets/popular');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('GET_POPULAR_MARKETS_FAILED');
    });
  });

  describe('GET /api/markets/:id', () => {
    it('should return market details with enriched data', async () => {
      const mockMarket = {
        id: 'market-1',
        question: 'Will it rain tomorrow?',
        currency: 'NGN',
        pool_amount_smallest_unit: 100000,
        yes_pool_smallest_unit: 60000,
        no_pool_smallest_unit: 40000,
        state: 'active',
        closes_at: new Date('2024-12-31'),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockMarketService.getMarketById.mockResolvedValue(mockMarket);
      mockMarketService.getPositionCount.mockResolvedValue(75);
      mockMarketService.calculatePoolPercentages.mockReturnValue({
        yesPercentage: 60,
        noPercentage: 40
      });

      const response = await request(app).get('/api/markets/market-1');

      expect(response.status).toBe(200);
      expect(response.body.market).toMatchObject({
        id: 'market-1',
        question: 'Will it rain tomorrow?',
        positionCount: 75,
        yesPercentage: 60,
        noPercentage: 40,
        isPopular: false
      });
      expect(mockMarketService.getMarketById).toHaveBeenCalledWith('market-1');
    });

    it('should return 404 when market not found', async () => {
      mockMarketService.getMarketById.mockResolvedValue(null);

      const response = await request(app).get('/api/markets/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('MARKET_NOT_FOUND');
    });

    it('should handle errors gracefully', async () => {
      mockMarketService.getMarketById.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get('/api/markets/market-1');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('GET_MARKET_FAILED');
    });
  });

  describe('GET /api/markets/:id/positions', () => {
    const validToken = jwt.sign(
      { userId: 'user-1', username: 'testuser', email: 'test@example.com' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );

    it('should return positions for a market when authenticated', async () => {
      const mockMarket = {
        id: 'market-1',
        question: 'Will it rain tomorrow?',
        currency: 'NGN',
        state: 'active',
        closes_at: new Date('2024-12-31'),
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockPositions = [
        {
          id: 'pos-1',
          user_id: 'user-1',
          market_id: 'market-1',
          side: 'YES',
          amount_smallest_unit: 10000,
          currency: 'NGN',
          potential_return_smallest_unit: 15000,
          created_at: new Date()
        }
      ];

      mockMarketService.getMarketById.mockResolvedValue(mockMarket);
      
      // Mock Supabase query
      const mockSupabaseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPositions, error: null })
      };
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseQuery as any);

      const response = await request(app)
        .get('/api/markets/market-1/positions')
        .set('Cookie', [`auth_token=${validToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.positions).toHaveLength(1);
      expect(response.body.positions[0].id).toBe('pos-1');
      expect(response.body.marketId).toBe('market-1');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/markets/market-1/positions');

      expect(response.status).toBe(401);
    });

    it('should return 404 when market not found', async () => {
      mockMarketService.getMarketById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/markets/nonexistent/positions')
        .set('Cookie', [`auth_token=${validToken}`]);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('MARKET_NOT_FOUND');
    });

    it('should handle database errors gracefully', async () => {
      const mockMarket = {
        id: 'market-1',
        question: 'Will it rain tomorrow?',
        currency: 'NGN',
        state: 'active',
        closes_at: new Date('2024-12-31'),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockMarketService.getMarketById.mockResolvedValue(mockMarket);
      
      // Mock Supabase query with error
      const mockSupabaseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database error' } 
        })
      };
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseQuery as any);

      const response = await request(app)
        .get('/api/markets/market-1/positions')
        .set('Cookie', [`auth_token=${validToken}`]);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('GET_POSITIONS_FAILED');
    });
  });
});
