/**
 * Currency conversion service with caching
 * Handles NGN/USD conversion with external API integration
 */

interface ExchangeRate {
  rate: number;
  timestamp: number;
}

interface CurrencyConversionResponse {
  success: boolean;
  rates: {
    [key: string]: number;
  };
}

export class CurrencyService {
  private cache: Map<string, ExchangeRate> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly API_URL = process.env.EXCHANGE_API_URL || 'https://api.exchangerate-api.io/v4/latest';
  
  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(from: 'NGN' | 'USD', to: 'NGN' | 'USD'): Promise<number> {
    // Same currency conversion
    if (from === to) {
      return 1;
    }

    const cacheKey = `${from}_${to}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached rate if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.rate;
    }

    try {
      // Fetch fresh rate from API
      const rate = await this.fetchFromAPI(from, to);
      
      // Cache the rate
      this.cache.set(cacheKey, { 
        rate, 
        timestamp: Date.now() 
      });
      
      return rate;
    } catch (error) {
      // If API fails and we have cached data (even expired), use it
      if (cached) {
        console.warn('Using expired exchange rate due to API failure:', error);
        return cached.rate;
      }
      
      // Fallback rates if no cache and API fails
      console.error('Exchange rate API failed, using fallback rates:', error);
      return this.getFallbackRate(from, to);
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convert(
    amount: number, 
    from: 'NGN' | 'USD', 
    to: 'NGN' | 'USD'
  ): Promise<number> {
    if (from === to) {
      return amount;
    }

    const rate = await this.getExchangeRate(from, to);
    return Math.round(amount * rate);
  }

  /**
   * Convert wallet balance for display
   */
  async convertBalance(
    balanceSmallestUnit: number,
    fromCurrency: 'NGN' | 'USD',
    toCurrency: 'NGN' | 'USD'
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return balanceSmallestUnit;
    }

    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return Math.round(balanceSmallestUnit * rate);
  }

  /**
   * Format balance for display with currency symbol
   */
  formatBalance(amountSmallestUnit: number, currency: 'NGN' | 'USD'): string {
    const divisor = 100;
    const amount = amountSmallestUnit / divisor;
    const symbol = currency === 'NGN' ? '₦' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  }

  /**
   * Fetch exchange rate from external API
   */
  private async fetchFromAPI(from: 'NGN' | 'USD', to: 'NGN' | 'USD'): Promise<number> {
    const response = await fetch(`${this.API_URL}/${from}`);
    
    if (!response.ok) {
      throw new Error(`Exchange API returned ${response.status}: ${response.statusText}`);
    }

    const data: CurrencyConversionResponse = await response.json();
    
    if (!data.success || !data.rates[to]) {
      throw new Error(`Invalid exchange rate response for ${from} to ${to}`);
    }

    return data.rates[to];
  }

  /**
   * Get fallback exchange rates when API is unavailable
   */
  private getFallbackRate(from: 'NGN' | 'USD', to: 'NGN' | 'USD'): number {
    // No hardcoded fallback rates. In production, stale rates can cause
    // significant financial loss. Always require live API rates.
    throw new Error(
      `Exchange rate API unavailable for ${from} to ${to}. ` +
      `Set EXCHANGE_API_URL environment variable or check API status. ` +
      `No fallback rates are used to prevent financial loss from stale data.`
    );
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const currencyService = new CurrencyService();