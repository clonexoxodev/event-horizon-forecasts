import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CurrencyService } from './currency.service.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('CurrencyService', () => {
  let currencyService: CurrencyService;
  let mockFetch: any;

  beforeEach(() => {
    currencyService = new CurrencyService();
    mockFetch = vi.mocked(fetch);
    currencyService.clearCache(); // Clear cache before each test
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getExchangeRate', () => {
    it('should return 1 for same currency conversion', async () => {
      const rate = await currencyService.getExchangeRate('NGN', 'NGN');
      expect(rate).toBe(1);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch rate from API for different currencies', async () => {
      const mockResponse = {
        success: true,
        rates: {
          USD: 0.0013
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const rate = await currencyService.getExchangeRate('NGN', 'USD');
      
      expect(rate).toBe(0.0013);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/NGN')
      );
    });

    it('should use cached rate when available and fresh', async () => {
      const mockResponse = {
        success: true,
        rates: { USD: 0.0013 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // First call - should fetch from API
      const rate1 = await currencyService.getExchangeRate('NGN', 'USD');
      expect(rate1).toBe(0.0013);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const rate2 = await currencyService.getExchangeRate('NGN', 'USD');
      expect(rate2).toBe(0.0013);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
    });

    it('should throw error when API fails and no cache', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      await expect(currencyService.getExchangeRate('NGN', 'USD'))
        .rejects.toThrow('Exchange rate API unavailable');
    });

    it('should use expired cache when API fails', async () => {
      const mockResponse = {
        success: true,
        rates: { USD: 0.0015 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // First call to populate cache
      await currencyService.getExchangeRate('NGN', 'USD');

      // Mock time passage to expire cache
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 10 * 60 * 1000); // 10 minutes later

      // Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const rate = await currencyService.getExchangeRate('NGN', 'USD');
      
      expect(rate).toBe(0.0015); // Should use expired cache
      
      // Restore Date.now
      Date.now = originalNow;
    });

    it('should throw error when API returns error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(currencyService.getExchangeRate('NGN', 'USD'))
        .rejects.toThrow('Exchange rate API unavailable');
    });

    it('should throw error for invalid API response format', async () => {
      const mockResponse = {
        success: false,
        rates: {}
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(currencyService.getExchangeRate('NGN', 'USD'))
        .rejects.toThrow('Exchange rate API unavailable');
    });
  });

  describe('convert', () => {
    it('should return same amount for same currency', async () => {
      const result = await currencyService.convert(100000, 'NGN', 'NGN');
      expect(result).toBe(100000);
    });

    it('should convert amount using exchange rate', async () => {
      const mockResponse = {
        success: true,
        rates: { USD: 0.0013 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await currencyService.convert(100000, 'NGN', 'USD');
      
      expect(result).toBe(130); // 100000 * 0.0013 = 130
    });
  });

  describe('convertBalance', () => {
    it('should return same balance for same currency', async () => {
      const result = await currencyService.convertBalance(50000, 'NGN', 'NGN');
      expect(result).toBe(50000);
    });

    it('should convert balance using exchange rate', async () => {
      const mockResponse = {
        success: true,
        rates: { NGN: 770 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await currencyService.convertBalance(10000, 'USD', 'NGN');
      
      expect(result).toBe(7700000); // 10000 * 770 = 7,700,000
    });
  });

  describe('formatBalance', () => {
    it('should format NGN balance correctly', () => {
      const result = currencyService.formatBalance(150000, 'NGN');
      expect(result).toBe('₦1500.00');
    });

    it('should format USD balance correctly', () => {
      const result = currencyService.formatBalance(250000, 'USD');
      expect(result).toBe('$2500.00');
    });

    it('should handle zero balance', () => {
      const result = currencyService.formatBalance(0, 'NGN');
      expect(result).toBe('₦0.00');
    });

    it('should handle small amounts', () => {
      const result = currencyService.formatBalance(1, 'USD');
      expect(result).toBe('$0.01');
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      const mockResponse = {
        success: true,
        rates: { USD: 0.0013 }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Populate cache
      await currencyService.getExchangeRate('NGN', 'USD');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear cache
      currencyService.clearCache();

      // Should fetch again after cache clear
      await currencyService.getExchangeRate('NGN', 'USD');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockResponse = {
        success: true,
        rates: { USD: 0.0013 }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Initially empty
      let stats = currencyService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);

      // After adding to cache
      await currencyService.getExchangeRate('NGN', 'USD');
      stats = currencyService.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toEqual(['NGN_USD']);
    });
  });

  describe('fallback rates', () => {
    it('should throw error for unsupported currency pair', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      await expect(currencyService.getExchangeRate('USD', 'EUR' as any))
        .rejects.toThrow('No fallback rate available');
    });

    it('should throw error instead of using stale fallback rates', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      await expect(currencyService.getExchangeRate('NGN', 'USD'))
        .rejects.toThrow('Exchange rate API unavailable');

      await expect(currencyService.getExchangeRate('USD', 'NGN'))
        .rejects.toThrow('Exchange rate API unavailable');
    });
  });
});