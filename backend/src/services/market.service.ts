import { MarketRepository } from '../repositories/market.repository.js';
import { Market } from '../types/market.js';
import { supabase } from '../db/supabase-client.js';

export class MarketService {
  private marketRepository: MarketRepository;

  constructor(marketRepository?: MarketRepository) {
    this.marketRepository = marketRepository || new MarketRepository();
  }

  /**
   * Get all active markets
   * Requirement 7.1: Display active markets on homepage
   */
  async getActiveMarkets(): Promise<Market[]> {
    return await this.marketRepository.findAll({ state: 'active' });
  }

  /**
   * Get market by ID
   * Requirement 8.1: Display market information
   */
  async getMarketById(id: string): Promise<Market | null> {
    return await this.marketRepository.findById(id);
  }

  /**
   * Get popular markets (markets with more than 100 positions)
   * Requirement 19.1, 19.2: Display popularity indicator based on position count
   */
  async getPopularMarkets(): Promise<Market[]> {
    // Query to get markets with position count > 100
    const { data, error } = await supabase
      .from('markets')
      .select(`
        *,
        positions:positions(count)
      `)
      .eq('state', 'active');

    if (error) {
      throw new Error('Failed to fetch popular markets: ' + error.message);
    }

    if (!data) {
      return [];
    }

    // Filter markets with more than 100 positions
    const popularMarkets = data
      .filter((market: any) => {
        const positionCount = market.positions?.[0]?.count || 0;
        return positionCount > 100;
      })
      .map((market: any) => {
        // Remove the positions aggregation from the returned object
        const { positions, ...marketData } = market;
        return marketData as Market;
      });

    return popularMarkets;
  }

  /**
   * Get position count for a market
   * Helper method for popularity calculation
   */
  async getPositionCount(marketId: string): Promise<number> {
    const { count, error } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true })
      .eq('market_id', marketId);

    if (error) {
      throw new Error('Failed to get position count: ' + error.message);
    }

    return count || 0;
  }

  /**
   * Resolve a market with winner payouts
   * Requirements 22.1, 22.4, 22.5: Market resolution logic
   * 
   * This method:
   * 1. Transitions the market to resolved state
   * 2. Calculates payouts for winning positions
   * 3. Updates position records with winner status and payout amounts
   * 
   * @param marketId - The ID of the market to resolve
   * @param winningSide - The winning side (YES or NO)
   * @returns The resolved market
   */
  async resolveMarket(marketId: string, winningSide: 'YES' | 'NO'): Promise<Market> {
    // Get the market
    const market = await this.marketRepository.findById(marketId);
    if (!market) {
      throw new Error('Market not found');
    }

    // Validate market state
    if (market.state !== 'closed') {
      throw new Error('Market must be closed before it can be resolved');
    }

    // Transition market to resolved
    const resolvedMarket = await this.marketRepository.transitionToResolved(
      marketId,
      winningSide
    );

    // Calculate and update payouts for all positions
    await this.calculateAndUpdatePayouts(resolvedMarket);

    return resolvedMarket;
  }

  /**
   * Calculate and update payouts for all positions in a resolved market
   * 
   * Payout calculation:
   * - Winners share the entire pool proportionally to their stake
   * - Payout = (position_amount / winning_pool) * total_pool
   * 
   * @param market - The resolved market
   */
  private async calculateAndUpdatePayouts(market: Market): Promise<void> {
    if (!market.winning_side) {
      throw new Error('Market must have a winning side to calculate payouts');
    }

    // Get all positions for this market
    const { data: positions, error } = await supabase
      .from('positions')
      .select('*')
      .eq('market_id', market.id);

    if (error) {
      throw new Error('Failed to fetch positions: ' + error.message);
    }

    if (!positions || positions.length === 0) {
      return; // No positions to process
    }

    const winningPool = market.winning_side === 'YES' 
      ? market.yes_pool_smallest_unit 
      : market.no_pool_smallest_unit;

    // If no one bet on the winning side, no payouts
    if (winningPool === 0) {
      // Mark all positions as losers
      for (const position of positions) {
        await supabase
          .from('positions')
          .update({
            is_winner: false,
            payout_smallest_unit: 0,
            resolved_at: new Date().toISOString()
          })
          .eq('id', position.id);
      }
      return;
    }

    // Calculate and update payouts for each position
    for (const position of positions) {
      const isWinner = position.side === market.winning_side;
      let payoutAmount = 0;

      if (isWinner) {
        // Winner gets their proportional share of the total pool
        // Payout = (position_amount / winning_pool) * total_pool
        const shareRatio = position.amount_smallest_unit / winningPool;
        payoutAmount = Math.floor(shareRatio * market.pool_amount_smallest_unit);
      }

      // Update position with winner status and payout
      await supabase
        .from('positions')
        .update({
          is_winner: isWinner,
          payout_smallest_unit: payoutAmount,
          resolved_at: new Date().toISOString()
        })
        .eq('id', position.id);
    }
  }

  /**
   * Calculate pool percentages for a market
   * Returns the percentage distribution between YES and NO
   * 
   * @param market - The market to calculate percentages for
   * @returns Object with yesPercentage and noPercentage
   */
  calculatePoolPercentages(market: Market): { yesPercentage: number; noPercentage: number } {
    if (market.pool_amount_smallest_unit === 0) {
      return { yesPercentage: 50, noPercentage: 50 };
    }

    const yesPercentage = Math.round(
      (market.yes_pool_smallest_unit / market.pool_amount_smallest_unit) * 100
    );
    const noPercentage = 100 - yesPercentage;

    return { yesPercentage, noPercentage };
  }

  /**
   * Calculate potential return for a position
   * 
   * The potential return is calculated based on the current pool distribution:
   * potential_return = (amount * total_pool) / (current_side_pool + amount)
   * 
   * @param market - The market
   * @param side - The side (YES or NO)
   * @param amount - The position amount in smallest unit
   * @returns The potential return in smallest unit
   */
  calculatePotentialReturn(market: Market, side: 'YES' | 'NO', amount: number): number {
    const currentSidePool = side === 'YES' 
      ? market.yes_pool_smallest_unit 
      : market.no_pool_smallest_unit;

    const newTotalPool = market.pool_amount_smallest_unit + amount;
    const newSidePool = currentSidePool + amount;

    // If this is the first position, return the amount (1:1)
    if (market.pool_amount_smallest_unit === 0) {
      return amount;
    }

    // Calculate potential return: (amount / new_side_pool) * new_total_pool
    const shareRatio = amount / newSidePool;
    const potentialReturn = Math.floor(shareRatio * newTotalPool);

    return potentialReturn;
  }

  /**
   * Check if a market is popular (has more than 100 positions)
   * 
   * @param marketId - The market ID
   * @returns True if the market has more than 100 positions
   */
  async isMarketPopular(marketId: string): Promise<boolean> {
    const positionCount = await this.getPositionCount(marketId);
    return positionCount > 100;
  }

  /**
   * Get markets with their position counts
   * Useful for displaying popularity indicators
   * 
   * @returns Array of markets with position counts
   */
  async getMarketsWithPositionCounts(): Promise<Array<Market & { positionCount: number }>> {
    const { data, error } = await supabase
      .from('markets')
      .select(`
        *,
        positions:positions(count)
      `)
      .eq('state', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch markets with position counts: ' + error.message);
    }

    if (!data) {
      return [];
    }

    return data.map((market: any) => {
      const positionCount = market.positions?.[0]?.count || 0;
      const { positions, ...marketData } = market;
      return {
        ...marketData,
        positionCount
      } as Market & { positionCount: number };
    });
  }
}
