import { describe, it, beforeEach, expect, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { CurrencyService } from '../services/currency.service.js';

/**
 * Property Test: Currency Conversion Display
 * 
 * **Validates: Requirements 3.4**
 * 
 * Property 3: Currency Conversion Display
 * The currency conversion service SHALL correctly convert amounts between NGN and USD
 * across all possible inputs, maintaining mathematical properties such as:
 * - Same currency conversion returns the same amount
 * - Converting back and forth returns approximately the same value (accounting for rounding)
 * - Conversion accuracy is maintained across various amount ranges
 * - Exchange rates are positive and non-zero
 */

// Mock fetch globally
global.fetch = vi.fn();

describe('Feature: prediction-platform-overhaul, Property 3: Currency Conversion Display', () => {
  let currencyService: CurrencyService;
  let mockFetch: any;

  beforeEach(() => {
    currencyService = new CurrencyService();
    mockFetch = vi.mocked(fetch);
    currencyService.clearCache();

    // Set up default mock response for exchange rates
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        rates: {
          NGN: 770,    // 1 USD = 770 NGN
          USD: 0.0013  // 1 NGN = 0.0013 USD
        }
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return the same amount when converting to the same currency', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various amounts in smallest unit (kobo/cents)
        fc.integer({ min: 0, max: 1000000000 }), // Up to 10 million in main currency
        fc.constantFrom('NGN' as const, 'USD' as const),
        async (amount, currency) => {
          const result = await currencyService.convert(amount, currency, currency);
          
          // Same currency conversion should return exact same amount
          expect(result).toBe(amount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain approximate round-trip conversion (convert forth and back)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate amounts that won't cause extreme rounding errors
        // Start from 10000 kobo (100 NGN) to avoid extreme rounding with very small amounts
        fc.integer({ min: 10000, max: 100000000 }), // At least 100 NGN, up to 1 million NGN
        async (amount) => {
          // Convert NGN -> USD -> NGN
          const usdAmount = await currencyService.convert(amount, 'NGN', 'USD');
          const backToNgn = await currencyService.convert(usdAmount, 'USD', 'NGN');
          
          // Due to rounding in integer arithmetic, we allow small deviation
          // The deviation should be less than 1% for reasonable amounts
          const deviation = Math.abs(backToNgn - amount);
          const percentDeviation = (deviation / amount) * 100;
          
          expect(percentDeviation).toBeLessThan(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain approximate round-trip conversion (USD -> NGN -> USD)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate USD amounts in cents
        fc.integer({ min: 100, max: 10000000 }), // At least $1, up to $100,000
        async (amount) => {
          // Convert USD -> NGN -> USD
          const ngnAmount = await currencyService.convert(amount, 'USD', 'NGN');
          const backToUsd = await currencyService.convert(ngnAmount, 'NGN', 'USD');
          
          // Allow small deviation due to rounding
          const deviation = Math.abs(backToUsd - amount);
          const percentDeviation = (deviation / amount) * 100;
          
          expect(percentDeviation).toBeLessThan(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return positive non-zero exchange rates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          ['NGN' as const, 'USD' as const],
          ['USD' as const, 'NGN' as const]
        ),
        async ([from, to]) => {
          const rate = await currencyService.getExchangeRate(from, to);
          
          // Exchange rates must be positive and non-zero
          expect(rate).toBeGreaterThan(0);
          expect(Number.isFinite(rate)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle zero amount conversion correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('NGN' as const, 'USD' as const),
        fc.constantFrom('NGN' as const, 'USD' as const),
        async (from, to) => {
          const result = await currencyService.convert(0, from, to);
          
          // Converting zero should always return zero
          expect(result).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should produce consistent results for the same input (idempotency)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1000, max: 1000000 }),
        fc.constantFrom(
          ['NGN' as const, 'USD' as const],
          ['USD' as const, 'NGN' as const]
        ),
        async (amount, [from, to]) => {
          // Convert the same amount twice
          const result1 = await currencyService.convert(amount, from, to);
          const result2 = await currencyService.convert(amount, from, to);
          
          // Results should be identical (using cache)
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should scale linearly (converting 2x amount gives approximately 2x result)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1000, max: 500000 }), // Base amount
        fc.constantFrom(
          ['NGN' as const, 'USD' as const],
          ['USD' as const, 'NGN' as const]
        ),
        async (baseAmount, [from, to]) => {
          const result1x = await currencyService.convert(baseAmount, from, to);
          const result2x = await currencyService.convert(baseAmount * 2, from, to);
          
          // Due to rounding, we check approximate doubling
          // The 2x result should be within 1 unit of 2 * 1x result
          const expected2x = result1x * 2;
          const deviation = Math.abs(result2x - expected2x);
          
          expect(deviation).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should format balance correctly with proper currency symbols', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 100000000 }),
        fc.constantFrom('NGN' as const, 'USD' as const),
        async (amount, currency) => {
          const formatted = currencyService.formatBalance(amount, currency);
          
          // Check format structure
          if (currency === 'NGN') {
            expect(formatted).toMatch(/^₦\d+\.\d{2}$/);
          } else {
            expect(formatted).toMatch(/^\$\d+\.\d{2}$/);
          }
          
          // Verify the numeric value is correct
          const numericPart = formatted.substring(1); // Remove currency symbol
          const expectedValue = (amount / 100).toFixed(2);
          expect(numericPart).toBe(expectedValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case amounts correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          0,           // Zero
          1,           // Minimum unit (1 kobo/cent)
          100,         // 1 main currency unit
          999999999,   // Large amount
          2147483647   // Near max 32-bit integer
        ),
        fc.constantFrom(
          ['NGN' as const, 'USD' as const],
          ['USD' as const, 'NGN' as const]
        ),
        async (amount, [from, to]) => {
          const result = await currencyService.convert(amount, from, to);
          
          // Result should be a valid number
          expect(Number.isFinite(result)).toBe(true);
          expect(result).toBeGreaterThanOrEqual(0);
          
          // Result should be an integer (no fractional cents/kobo)
          expect(Number.isInteger(result)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should use fallback rates when API fails', async () => {
    // Mock API failure
    mockFetch.mockRejectedValue(new Error('API Error'));

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 1000000 }),
        fc.constantFrom(
          ['NGN' as const, 'USD' as const],
          ['USD' as const, 'NGN' as const]
        ),
        async (amount, [from, to]) => {
          // Clear cache to force API call
          currencyService.clearCache();
          
          const result = await currencyService.convert(amount, from, to);
          
          // Should still return a valid result using fallback rates
          expect(Number.isFinite(result)).toBe(true);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(result)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain reciprocal relationship between exchange rates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // No input needed, just test the rates
        async () => {
          const ngnToUsd = await currencyService.getExchangeRate('NGN', 'USD');
          const usdToNgn = await currencyService.getExchangeRate('USD', 'NGN');
          
          // The rates should be approximately reciprocal
          // ngnToUsd * usdToNgn should be close to 1
          const product = ngnToUsd * usdToNgn;
          
          // Allow small deviation due to API rounding
          expect(product).toBeGreaterThan(0.99);
          expect(product).toBeLessThan(1.01);
        }
      ),
      { numRuns: 50 }
    );
  });
});
