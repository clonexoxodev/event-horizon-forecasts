import { supabase } from '../db/supabase-client.js';
import { Market, CreateMarketRequest, MarketFilters } from '../types/market.js';

export class MarketRepository {
  /**
   * Find all markets with optional filtering
   */
  async findAll(filters?: MarketFilters): Promise<Market[]> {
    let query = supabase
      .from('markets')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.state) {
      query = query.eq('state', filters.state);
    }

    if (filters?.currency) {
      query = query.eq('currency', filters.currency);
    }

    // Apply pagination
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to fetch markets: ' + error.message);
    }

    return data || [];
  }

  /**
   * Find market by ID
   */
  async findById(id: string): Promise<Market | null> {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error('Failed to find market: ' + error.message);
    }

    return data;
  }

  /**
   * Create a new market
   */
  async create(marketData: CreateMarketRequest): Promise<Market> {
    const { data, error } = await supabase
      .from('markets')
      .insert({
        question: marketData.question,
        description: marketData.description,
        currency: marketData.currency,
        pool_amount_smallest_unit: 0,
        yes_pool_smallest_unit: 0,
        no_pool_smallest_unit: 0,
        min_position_smallest_unit: marketData.min_position_smallest_unit,
        max_position_smallest_unit: marketData.max_position_smallest_unit,
        state: 'active',
        closes_at: marketData.closes_at
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create market: ' + error.message);
    }

    return data;
  }

  /**
   * Update pool amounts atomically
   * This method increments the pool amounts based on a new position
   */
  async updatePoolAmounts(
    marketId: string,
    side: 'YES' | 'NO',
    amount: number
  ): Promise<Market> {
    // First get the current market
    const market = await this.findById(marketId);
    if (!market) {
      throw new Error('Market not found');
    }

    // Calculate new pool amounts
    const newPoolAmount = market.pool_amount_smallest_unit + amount;
    const newYesPool = side === 'YES' 
      ? market.yes_pool_smallest_unit + amount 
      : market.yes_pool_smallest_unit;
    const newNoPool = side === 'NO' 
      ? market.no_pool_smallest_unit + amount 
      : market.no_pool_smallest_unit;

    // Update the market
    const { data, error } = await supabase
      .from('markets')
      .update({
        pool_amount_smallest_unit: newPoolAmount,
        yes_pool_smallest_unit: newYesPool,
        no_pool_smallest_unit: newNoPool,
        updated_at: new Date().toISOString()
      })
      .eq('id', marketId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update pool amounts: ' + error.message);
    }

    return data;
  }

  /**
   * Transition market from active to closed
   */
  async transitionToClosed(marketId: string): Promise<Market> {
    const market = await this.findById(marketId);
    if (!market) {
      throw new Error('Market not found');
    }

    if (market.state !== 'active') {
      throw new Error(`Cannot transition market from ${market.state} to closed`);
    }

    const { data, error } = await supabase
      .from('markets')
      .update({
        state: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('id', marketId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to transition market to closed: ' + error.message);
    }

    return data;
  }

  /**
   * Transition market from closed to resolved
   */
  async transitionToResolved(
    marketId: string,
    winningSide: 'YES' | 'NO'
  ): Promise<Market> {
    const market = await this.findById(marketId);
    if (!market) {
      throw new Error('Market not found');
    }

    if (market.state !== 'closed') {
      throw new Error(`Cannot transition market from ${market.state} to resolved`);
    }

    const { data, error } = await supabase
      .from('markets')
      .update({
        state: 'resolved',
        winning_side: winningSide,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', marketId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to transition market to resolved: ' + error.message);
    }

    return data;
  }

  /**
   * Update market state directly (for admin operations)
   */
  async updateState(
    marketId: string,
    state: 'active' | 'closed' | 'resolved',
    winningSide?: 'YES' | 'NO'
  ): Promise<Market> {
    const updateData: any = {
      state,
      updated_at: new Date().toISOString()
    };

    if (state === 'resolved') {
      if (!winningSide) {
        throw new Error('Winning side is required when resolving a market');
      }
      updateData.winning_side = winningSide;
      updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('markets')
      .update(updateData)
      .eq('id', marketId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update market state: ' + error.message);
    }

    return data;
  }

  /**
   * Transaction support methods (for use with Supabase transactions)
   */
  async findByIdInTransaction(client: any, id: string): Promise<Market | null> {
    return await this.findById(id);
  }

  async updatePoolAmountsInTransaction(
    client: any,
    marketId: string,
    side: 'YES' | 'NO',
    amount: number
  ): Promise<Market> {
    return await this.updatePoolAmounts(marketId, side, amount);
  }
}
